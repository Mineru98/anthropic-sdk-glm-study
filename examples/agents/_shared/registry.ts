import type { AgentSample } from "./types";

/**
 * 12개 샘플 레지스트리. 템플릿 리터럴 동적 import를 사용해
 * (미구현 샘플이 있어도 타입체크/실행에 지장 없도록) 지연 로드한다.
 */
export const sampleNames = [
  // Tier A — 경량
  "ko-spellcheck",
  "support-triage",
  "ecommerce-listing",
  "sql-analyst",
  // Tier B — 중간
  "code-review-panel",
  "copy-optimizer",
  "resume-screener",
  "meeting-notes",
  // Tier C — 헤비
  "research-report",
  "contract-review",
  "incident-response",
  "finance-report",
] as const;

export type SampleName = (typeof sampleNames)[number];

export async function loadSample(name: string): Promise<AgentSample> {
  if (!(sampleNames as readonly string[]).includes(name)) {
    throw new Error(
      `알 수 없는 샘플: "${name}". 사용 가능: ${sampleNames.join(", ")}`
    );
  }
  // 템플릿 리터럴 → TS가 정적 해석하지 않음, bun이 런타임에 해석.
  const mod = (await import(`../${name}/index.ts`)) as { sample: AgentSample };
  return mod.sample;
}

/** 구현 완료되어 실제 로드 가능한 샘플만 반환 */
export async function loadAvailableSamples(): Promise<AgentSample[]> {
  const out: AgentSample[] = [];
  for (const name of sampleNames) {
    try {
      out.push(await loadSample(name));
    } catch {
      // 아직 미구현 — 건너뜀
    }
  }
  return out;
}
