import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Orchestrator-Workers).
 * 오케스트레이터가 data-extractor → metric-analyst → risk-assessor → number-verifier → opinion-writer
 * 순서로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  "data-extractor": {
    description: "자연어 형태의 재무 데이터를 받아 정형화된 수치 목록으로 변환할 때 사용",
    prompt: `당신은 재무 데이터 추출 전문가입니다. 주어진 재무 텍스트에서 매출, 영업이익, 영업이익률, 순이익, 부채비율, 영업현금흐름, PER 등 모든 핵심 수치를 빠짐없이 추출하세요.
각 수치를 "항목: 값 (단위·변화율)" 형식의 줄 목록으로만 출력하세요. 해석이나 의견은 붙이지 마세요.`,
    tools: [],
    maxTurns: 2,
  },
  "metric-analyst": {
    description: "추출된 재무 수치를 바탕으로 성장성/수익성/안정성 3개 축 지표를 분석할 때 사용",
    prompt: `당신은 기업 재무 분석가입니다. 전달받은 수치를 성장성, 수익성, 안정성 3개 축으로 분석하세요.
각 축에 대해 수치 근거와 함께 2-3문장으로 평가하세요. 분석 텍스트만 출력하고 최종 투자 의견은 포함하지 마세요.`,
    tools: [],
    maxTurns: 2,
  },
  "risk-assessor": {
    description: "재무 수치와 지표 분석을 바탕으로 재무·시장 리스크를 평가할 때 사용",
    prompt: `당신은 재무 리스크 평가 전문가입니다. 전달받은 수치와 분석을 바탕으로 재무 리스크(부채비율, 유동성, 현금흐름 등)와 시장 리스크(성장 둔화, 수익성 악화 등)를 구분하여 평가하세요.
각 리스크를 "리스크명: 근거 수치 및 이유" 형식의 목록으로 출력하세요.`,
    tools: [],
    maxTurns: 2,
  },
  "number-verifier": {
    description: "앞 단계에서 언급된 모든 수치와 계산 비율의 일관성을 교차 검증할 때 사용",
    prompt: `당신은 재무 수치 검증 전문가입니다. 전달받은 수치와 분석 전반에서 계산 오류, 비율 불일치, 수치 모순을 검토하세요.
예: 영업이익률 = 영업이익/매출 × 100이 언급된 수치와 일치하는지 확인. 검증 결과를 "항목: 확인결과" 목록으로 출력하고, 마지막 줄에 "전반적 수치 신뢰도: 높음/보통/낮음"을 명시하세요.`,
    tools: [],
    maxTurns: 2,
  },
  "opinion-writer": {
    description: "전체 분석·리스크·검증 결과를 종합해 투자 의견을 근거와 함께 작성할 때 사용",
    prompt: `당신은 투자 리서치 애널리스트입니다. 전달받은 분석, 리스크, 수치 검증 결과를 종합하여 투자 의견을 작성하세요.
의견은 반드시 "매수", "중립", "매도", "보유", "주의" 중 하나로 시작하고, 핵심 근거 3가지를 나열하세요. 마지막에 "본 리포트는 투자 권유가 아닌 참고용입니다."를 반드시 포함하세요.`,
    tools: [],
    maxTurns: 3,
  },
};

export const sample: AgentSample = {
  name: "finance-report",
  title: "금융 리포트 분석",
  industry: "금융",
  pattern: "orchestrator-workers",
  tier: "heavy",
  description:
    "기업 재무 데이터를 data-extractor→metric-analyst→risk-assessor→number-verifier→opinion-writer 5단계 체인으로 분석하고 투자 의견까지 도출하는 헤비 오케스트레이션 에이전트.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 재무 데이터를 분석하라. 반드시 아래 순서로 서브에이전트를 호출하라:

1) data-extractor 서브에이전트에 아래 재무 텍스트를 전달하여 정형화된 수치 목록을 받는다.
2) metric-analyst 서브에이전트에 data-extractor 결과를 전달하여 성장성/수익성/안정성 분석을 받는다.
3) risk-assessor 서브에이전트에 data-extractor 결과와 metric-analyst 결과를 함께 전달하여 리스크 평가를 받는다.
4) number-verifier 서브에이전트에 data-extractor 수치, metric-analyst 분석, risk-assessor 리스크를 모두 전달하여 수치 일관성 검증 결과를 받는다.
5) opinion-writer 서브에이전트에 1~4단계 결과 전체를 전달하여 투자 의견을 받는다.

그 후 정확히 아래 마크다운 형식으로만 최종 정리하라. 다른 텍스트나 섹션을 추가하지 마라:

## 핵심 지표
(data-extractor 결과: 수치 목록)

## 분석
(metric-analyst 결과: 성장성/수익성/안정성 분석)

## 리스크
(risk-assessor 결과: 리스크 항목 목록, number-verifier의 수치 신뢰도 포함)

## 투자 의견
(opinion-writer 결과: 의견 + 근거 + "본 리포트는 투자 권유가 아닌 참고용입니다." 문구 포함)

[재무 데이터]
${input}`,
  defaultInput:
    "기업 A 연간 실적: 매출 1000억(+20% YoY), 영업이익 120억(영업이익률 12%, 전년 9%), 순이익 90억, 부채비율 80%, 영업현금흐름 150억, PER 15배.",
  rubric: {
    expectedSubagents: [
      "data-extractor",
      "metric-analyst",
      "risk-assessor",
      "number-verifier",
      "opinion-writer",
    ],
    requiredSections: ["## 핵심 지표", "## 분석", "## 리스크", "## 투자 의견"],
    criteria: [
      {
        key: "analytical_rigor",
        description: "지표 분석이 깊이 있는가",
      },
      {
        key: "number_consistency",
        description: "수치 검증 단계가 반영되었는가",
      },
      {
        key: "actionable_opinion",
        description: "투자 의견이 근거와 함께 명확한가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "recommendation",
        input:
          "기업 B: 매출 500억(-5% YoY), 영업손실 -30억, 부채비율 220%, 영업현금흐름 -10억, 현금성자산 20억.",
        expect: (output: string) =>
          output.includes("## 투자 의견") &&
          (output.includes("매수") ||
            output.includes("매도") ||
            output.includes("보유") ||
            output.includes("중립") ||
            output.includes("주의")),
        note: "기업 B는 매출 역성장+영업손실+고부채 구조이므로 의견 단어가 출력에 반드시 등장해야 함",
      },
    ],
  },
};

export default { sample };
