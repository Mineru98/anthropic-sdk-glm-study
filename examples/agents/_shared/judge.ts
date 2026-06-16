import { createClient, agentConfig } from "@core";
import type { RubricCriterion } from "./types";

export interface JudgeResult {
  scores: Record<string, number>;
  average: number;
  rationale: string;
}

/** 응답 텍스트에서 첫 JSON 객체를 견고하게 추출 */
function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("judge: JSON 없음");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * LLM-as-judge (L2). GLM을 실제 호출해 각 기준을 0–5로 채점한다.
 */
export async function judge(
  criteria: RubricCriterion[],
  output: string,
  context: { task: string; input: string }
): Promise<JudgeResult> {
  const client = createClient(agentConfig);

  const criteriaList = criteria
    .map((c, i) => `${i + 1}. "${c.key}": ${c.description}`)
    .join("\n");

  const prompt = `당신은 엄격한 에이전트 출력 평가자입니다. 아래 기준을 각각 0–5점으로 채점하세요.
0=완전 실패, 3=수용 가능, 5=탁월. 후하게 주지 마세요.

[과제]
${context.task}

[사용자 입력]
${context.input}

[평가할 에이전트 출력]
${output.slice(0, 6000)}

[채점 기준]
${criteriaList}

다음 JSON만 출력하세요(설명/마크다운 금지):
{"scores": {${criteria.map((c) => `"${c.key}": <0-5>`).join(", ")}}, "rationale": "<2-3문장 근거>"}`;

  const msg = await client.messages.create({
    model: agentConfig.model || "glm-5.2",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");

  const parsed = extractJson(text) as { scores: Record<string, number>; rationale: string };
  const scores: Record<string, number> = {};
  for (const c of criteria) {
    const v = Number(parsed.scores?.[c.key]);
    scores[c.key] = Number.isFinite(v) ? Math.max(0, Math.min(5, v)) : 0;
  }
  const vals = Object.values(scores);
  const average = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

  return { scores, average, rationale: parsed.rationale ?? "" };
}
