import type { AgentSample, RubricCheck, RubricResult, RunResult } from "./types";
import { judge } from "./judge";
import { runSample } from "./runtime";

/** L1: trace/스키마/서브에이전트/섹션 결정론적 검증 */
function evaluateL1(sample: AgentSample, run: RunResult): RubricCheck[] {
  const checks: RubricCheck[] = [];
  const has = (subtype: string) =>
    run.trace.some((e) => e.type === "system" && e.subtype === subtype);

  checks.push({ layer: "L1", name: "trace:task_started", passed: has("task_started") });
  // task_progress는 장시간 작업에서만 주기적으로 발생 → 보고만 하고 합격 판정에서 제외
  checks.push({
    layer: "L1",
    name: "trace:task_progress",
    passed: has("task_progress"),
    informational: true,
  });
  checks.push({
    layer: "L1",
    name: "trace:task_notification",
    passed: has("task_notification"),
  });
  checks.push({
    layer: "L1",
    name: "result:success",
    passed: run.trace.some((e) => e.type === "result" && e.subtype === "success"),
  });
  checks.push({
    layer: "L1",
    name: "output:non-empty",
    passed: run.output.trim().length > 0,
    detail: `${run.output.length} chars`,
  });

  for (const sub of sample.rubric.expectedSubagents) {
    const called = run.subagentCalls.includes(sub);
    checks.push({
      layer: "L1",
      name: `subagent:${sub}`,
      passed: called,
      detail: called ? "호출됨" : "미호출",
    });
  }

  for (const section of sample.rubric.requiredSections ?? []) {
    const present = run.output.includes(section);
    checks.push({
      layer: "L1",
      name: `section:${section}`,
      passed: present,
    });
  }

  return checks;
}

/** L3: 골든셋 회귀 — 각 케이스를 실제 실행해 술어 검증 */
async function evaluateL3(sample: AgentSample): Promise<RubricCheck[]> {
  const checks: RubricCheck[] = [];
  for (const g of sample.rubric.golden) {
    try {
      const run = await runSample(sample, g.input);
      const passed = g.expect(run.output);
      checks.push({
        layer: "L3",
        name: `golden:${g.name}`,
        passed,
        detail: g.note,
      });
    } catch (err) {
      checks.push({
        layer: "L3",
        name: `golden:${g.name}`,
        passed: false,
        detail: `오류: ${(err as Error).message}`,
      });
    }
  }
  return checks;
}

/**
 * 3계층 종합 평가. 합격 = L1 전부 ∧ L2 평균≥임계 ∧ L3 전부.
 * @param run 이미 실행된 기본 입력의 결과 (L1/L2 평가 대상)
 */
export async function evaluate(
  sample: AgentSample,
  run: RunResult,
  input: string
): Promise<RubricResult> {
  const l1 = evaluateL1(sample, run);

  const threshold = sample.rubric.judgeThreshold ?? 4.0;
  const judged = await judge(sample.rubric.criteria, run.output, {
    task: `${sample.title} (${sample.industry}, ${sample.pattern})`,
    input,
  });
  const l2checks: RubricCheck[] = sample.rubric.criteria.map((c) => ({
    layer: "L2" as const,
    name: `judge:${c.key}`,
    passed: (judged.scores[c.key] ?? 0) >= threshold,
    score: judged.scores[c.key],
  }));

  const l3 = await evaluateL3(sample);

  const l1pass = l1.filter((c) => !c.informational).every((c) => c.passed);
  const l2pass = judged.average >= threshold;
  const l3pass = l3.every((c) => c.passed);
  const passed = l1pass && l2pass && l3pass;

  return {
    sample: sample.name,
    passed,
    l1,
    l2: { average: judged.average, threshold, checks: l2checks, rationale: judged.rationale },
    l3,
    summary: `L1 ${l1pass ? "PASS" : "FAIL"} · L2 평균 ${judged.average.toFixed(2)}/${threshold} ${l2pass ? "PASS" : "FAIL"} · L3 ${l3pass ? "PASS" : "FAIL"} → ${passed ? "✅ PASS" : "❌ FAIL"}`,
  };
}

/** 평가 결과를 마크다운 리포트로 직렬화 */
export function renderReport(sample: AgentSample, result: RubricResult): string {
  const line = (c: RubricCheck) =>
    `- ${c.informational ? "ℹ️" : c.passed ? "✅" : "❌"} \`${c.name}\`${c.informational ? " (참고)" : ""}${c.score !== undefined ? ` — ${c.score}/5` : ""}${c.detail ? ` (${c.detail})` : ""}`;
  return `# 평가 리포트 — ${sample.title}

- **샘플**: \`${sample.name}\` · ${sample.industry} · ${sample.pattern} · tier=${sample.tier}
- **결과**: ${result.passed ? "✅ PASS" : "❌ FAIL"}
- ${result.summary}

## L1 — 결정론적 체크
${result.l1.map(line).join("\n")}

## L2 — LLM-as-judge (임계 ${result.l2.threshold}/5, 평균 ${result.l2.average.toFixed(2)})
${result.l2.checks.map(line).join("\n")}

> 근거: ${result.l2.rationale}

## L3 — 골든셋 회귀
${result.l3.map(line).join("\n")}
`;
}
