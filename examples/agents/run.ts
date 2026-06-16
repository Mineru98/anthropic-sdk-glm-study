/**
 * 공통 CLI 러너.
 *
 *   bun run examples/agents/run.ts list
 *   bun run examples/agents/run.ts <name> [--input "..."] [--eval] [--json]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createEmitter, runSample, type RunEvent } from "./_shared/runtime";
import { evaluate, renderReport } from "./_shared/rubric";
import { loadSample, loadAvailableSamples, sampleNames } from "./_shared/registry";

const ARTIFACTS = join(dirname(fileURLToPath(import.meta.url)), "artifacts");

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else flags[key] = true;
    } else positional.push(a);
  }
  return { positional, flags };
}

async function cmdList() {
  const samples = await loadAvailableSamples();
  console.log(`등록된 샘플 ${sampleNames.length}개 (구현됨 ${samples.length}개):\n`);
  const byTier = { light: [] as string[], medium: [] as string[], heavy: [] as string[] };
  for (const s of samples) {
    byTier[s.tier].push(`  ${s.name.padEnd(20)} ${s.industry.padEnd(12)} ${s.pattern}`);
  }
  for (const [tier, rows] of Object.entries(byTier)) {
    if (rows.length) {
      console.log(`[${tier}]`);
      console.log(rows.join("\n"));
    }
  }
  const missing = sampleNames.filter((n) => !samples.find((s) => s.name === n));
  if (missing.length) console.log(`\n미구현: ${missing.join(", ")}`);
}

function attachConsole(emitter: ReturnType<typeof createEmitter>) {
  emitter.on("event", (e: RunEvent) => {
    switch (e.kind) {
      case "start":
        console.log(`▶ [${e.sample}] 실행 시작`);
        break;
      case "task_started":
        console.log(`  ├─ task_started: ${e.description}`);
        break;
      case "subagent_call":
        console.log(`  ├─ ▸ 서브에이전트 호출: ${e.subagent}`);
        break;
      case "task_progress":
        console.log(
          `  │  …${e.toolUses} tool_uses, ${e.tokens} tokens, ${e.seconds.toFixed(1)}s`
        );
        break;
      case "task_notification":
        console.log(`  ├─ ${e.status}: ${e.summary.slice(0, 70)}`);
        break;
      case "done":
        console.log(`  └─ done: ${e.subtype}`);
        break;
    }
  });
}

async function cmdRun(name: string, flags: Record<string, string | boolean>) {
  const sample = await loadSample(name);
  const input =
    typeof flags.input === "string" ? flags.input : sample.defaultInput;

  const emitter = createEmitter();
  if (!flags.json) attachConsole(emitter);

  const run = await runSample(sample, input, emitter);

  if (!flags.json) {
    console.log("\n=== 최종 출력 ===\n");
    console.log(run.output);
    console.log(
      `\n(${run.subagentCalls.length} 서브에이전트 호출, ${(run.durationMs / 1000).toFixed(1)}s)`
    );
  }

  if (flags.eval) {
    console.log("\n=== 루브릭 평가 중 (실제 GLM 호출) ===");
    const result = await evaluate(sample, run, input);
    const dir = join(ARTIFACTS, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "eval-report.json"), JSON.stringify(result, null, 2));
    writeFileSync(join(dir, "eval-report.md"), renderReport(sample, result));
    console.log(result.summary);
    console.log(`리포트 저장: ${join(dir, "eval-report.md")}`);
    if (flags.json) console.log(JSON.stringify(result, null, 2));
    process.exit(result.passed ? 0 : 1);
  }

  if (flags.json) {
    console.log(JSON.stringify({ output: run.output, subagentCalls: run.subagentCalls }, null, 2));
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const cmd = positional[0];
  if (!cmd || cmd === "list") return cmdList();
  return cmdRun(cmd, flags);
}

main().catch((err) => {
  console.error("실행 오류:", err);
  process.exit(1);
});
