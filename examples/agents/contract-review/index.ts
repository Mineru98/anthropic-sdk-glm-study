import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Orchestrator-Workers).
 * 오케스트레이터가 clause-extractor → risk-analyst(반복) → cross-checker → summary-writer
 * 순서로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  "clause-extractor": {
    description: "계약서 텍스트에서 핵심 조항을 식별하고 구조화된 목록으로 분해할 때 사용",
    prompt: `당신은 법률 문서 분석 전문가입니다. 입력된 계약서 전체에서 각 조항을 파싱하여 구조화된 목록으로 출력합니다.

출력 규칙:
- 조항마다 한 줄씩 '제N조(제목): 내용' 형식으로만 나열하라.
- 조항 번호나 제목이 명시되지 않은 경우 순서대로 번호를 부여하라.
- 평가, 의견, 해석은 절대 붙이지 마라.
- 목록 외 다른 텍스트는 출력하지 마라.`,
    tools: [],
    maxTurns: 2,
  },
  "risk-analyst": {
    description: "계약 조항 하나의 법적·상업적 리스크를 분석할 때 사용 (조항마다 별도 호출)",
    prompt: `당신은 기업법무 전문 리스크 분석가입니다. 단일 계약 조항을 받아 법적·상업적 리스크를 분석합니다.

출력 규칙:
- 반드시 다음 세 항목만 출력하라:
  리스크 유형: (독소 조항·불균형·법적 유효성·기타 중 해당 항목)
  심각도: (상/중/하)
  근거: (구체적인 법적·상업적 근거 1~2문장)
- 세 항목 외 다른 텍스트는 출력하지 마라.
- 이 분석은 법률 자문이 아닌 참고용이다.`,
    tools: [],
    maxTurns: 2,
  },
  "cross-checker": {
    description: "여러 조항 간 상충 관계나 누락된 보호 조항을 교차검증할 때 사용",
    prompt: `당신은 계약서 교차검증 전문가입니다. 조항 목록 전체와 각 조항의 리스크 분석 결과를 받아 조항 간 논리적 모순, 상충, 누락을 식별합니다.

출력 규칙:
- 충돌이 있는 조항 쌍은 '제A조 ↔ 제B조: 충돌 이유' 형식으로 나열하라.
- 누락된 일반 보호 조항(준거법·분쟁해결·계약 기간·면책 한도 등)은 '누락: 항목명' 형식으로 나열하라.
- 충돌도 누락도 없으면 각각 '없음'이라고 명시하라.
- 형식 외 다른 텍스트는 출력하지 마라.`,
    tools: [],
    maxTurns: 2,
  },
  "summary-writer": {
    description: "리스크 분석과 교차검증 결과를 종합해 협상 포인트를 포함한 요약 의견을 작성할 때 사용",
    prompt: `당신은 법무팀 수석 자문역입니다. 조항 목록, 각 조항의 리스크 분석, 교차검증 결과를 모두 받아 종합 의견을 작성합니다.

출력 규칙:
- Top 3 리스크: 가장 위험한 조항 3개를 순위별로 기술하라.
- 협상 포인트: 각 위험 조항에 대한 구체적인 수정 제안을 기술하라.
- 전체 위험도 총평: 계약 전반의 위험 수준을 한 단락으로 평가하라.
- 마지막 줄에 반드시 다음 문구를 포함하라: "이 분석은 법률 자문이 아닌 참고용입니다."`,
    tools: [],
    maxTurns: 3,
  },
};

export const sample: AgentSample = {
  name: "contract-review",
  title: "계약서 조항 검토",
  industry: "법률",
  pattern: "orchestrator-workers",
  tier: "heavy",
  description:
    "계약서 조항을 clause-extractor→risk-analyst(반복)→cross-checker→summary-writer 4단계로 분석해 리스크와 협상 포인트를 도출하는 오케스트레이터-워커 에이전트.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 계약 조항을 검토하라. 반드시 아래 순서로 서브에이전트를 호출하고, 지정된 섹션 형식으로만 최종 결과를 정리하라.

[호출 순서]
1) clause-extractor 서브에이전트를 호출해 계약서의 핵심 조항 목록을 추출하라.
   입력: 아래 계약 원문 전체.
   결과: 조항 번호·제목·내용 구조 목록 (이를 '조항목록'이라 한다).

2) risk-analyst 서브에이전트를 조항목록의 각 조항에 대해 한 번씩 호출하라 (조항마다 별도 호출).
   입력: 해당 조항 1건의 내용.
   결과: 리스크 유형/심각도/근거 3항목 (이를 '리스크결과'라 한다).

3) cross-checker 서브에이전트를 호출해 조항 간 상충과 누락을 검증하라.
   입력: 조항목록 전체 + 리스크결과 전체.
   결과: 충돌 쌍과 누락 항목 목록 (이를 '교차결과'라 한다).

4) summary-writer 서브에이전트를 호출해 종합 의견을 작성하라.
   입력: 조항목록 + 리스크결과 + 교차결과 전체.
   결과: Top 3 리스크, 협상 포인트, 총평.

[최종 출력 형식 — 반드시 이 네 섹션만 순서대로 출력하라]

## 핵심 조항
(clause-extractor 결과를 조항별 목록으로)

## 리스크 분석
(각 조항에 대한 risk-analyst 결과를 조항별 소제목과 함께 나열)

## 교차검증
(cross-checker 결과: 충돌 쌍, 누락 항목)

## 요약 의견
(summary-writer 결과: Top 3 리스크, 협상 포인트, 총평, "이 분석은 법률 자문이 아닌 참고용입니다." 문구 포함)

[계약 원문]
${input}`,
  defaultInput:
    "계약 조항: 제5조(손해배상) 을의 귀책으로 손해 발생 시 을은 계약금액의 300%를 배상한다. 제8조(해지) 갑은 사유 없이 즉시 해지할 수 있다. 제10조(비밀유지) 기한 정함 없이 영구히 유지한다.",
  rubric: {
    expectedSubagents: ["clause-extractor", "risk-analyst", "cross-checker", "summary-writer"],
    requiredSections: ["## 핵심 조항", "## 리스크 분석", "## 교차검증", "## 요약 의견"],
    criteria: [
      {
        key: "risk_identification",
        description: "독소/리스크 조항을 잘 식별했는가",
      },
      {
        key: "legal_soundness",
        description: "분석이 법적으로 타당한가",
      },
      {
        key: "completeness",
        description: "주요 조항을 빠짐없이 다뤘는가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "penalty",
        input:
          "계약 조항: 제3조 지연 시 일당 계약금의 10%를 위약금으로 부과한다. 제7조 모든 분쟁은 갑의 본사 소재지 법원만 관할한다.",
        expect: (output: string) =>
          (output.includes("리스크") || output.includes("위험")) &&
          output.includes("## 요약 의견"),
        note: "리스크/위험 식별 여부 및 '## 요약 의견' 섹션 존재 확인",
      },
    ],
  },
};

export default { sample };
