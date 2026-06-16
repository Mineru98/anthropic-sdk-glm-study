import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Routing 패턴).
 * 오케스트레이터가 classifier → priority-scorer → router 순으로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  classifier: {
    description: "고객 문의를 카테고리(결제/배송/계정/기술/환불/기타)로 분류할 때 사용",
    prompt: `당신은 고객지원 분류 전문가입니다. 입력된 고객 문의를 다음 카테고리 중 정확히 하나로 분류하세요: 결제 / 배송 / 계정 / 기술 / 환불 / 기타.
출력 형식: "카테고리: <값>" 첫 줄, 두 번째 줄에 한 줄 근거. 그 외 텍스트는 출력하지 마세요.
복합 문의는 가장 핵심 불만 유형을 기준으로 분류하세요.`,
    tools: [],
    maxTurns: 2,
  },
  "priority-scorer": {
    description: "고객 문의의 긴급도를 P1~P4와 근거로 산정할 때 사용",
    prompt: `당신은 고객지원 우선순위 산정 전문가입니다. 고객 문의 원문과 카테고리를 분석해 P1~P4 긴급도를 산정하세요.
P1: 즉시 처리 (금전 피해·결제 이중청구·강한 감정 표현), P2: 당일 처리 (명확한 서비스 오류), P3: 48시간 내 (일반 불편), P4: 72시간 내 (단순 정보 문의).
출력: "우선순위: P<N>" 첫 줄, 이후 두 줄 이내 근거. 다른 텍스트 금지.`,
    tools: [],
    maxTurns: 2,
  },
  router: {
    description: "담당 팀과 다음 조치를 결정할 때 사용",
    prompt: `당신은 고객지원 라우팅 전문가입니다. 고객 문의 원문, 분류 카테고리, 우선순위를 모두 고려해 담당 팀과 즉각 취해야 할 다음 조치를 결정하세요.
담당팀: 결제팀 / 물류팀 / 계정팀 / 기술지원팀 / 환불처리팀 / 일반상담팀 중 선택.
출력: "담당팀: <팀명>" 첫 줄, "다음 조치: <구체적 조치>" 둘째 줄, 필요 시 "주의사항: <한 줄>" 셋째 줄. 그 외 텍스트 금지.`,
    tools: [],
    maxTurns: 2,
  },
};

export const sample: AgentSample = {
  name: "support-triage",
  title: "고객지원 티켓 트리아지",
  industry: "고객지원(CS)",
  pattern: "routing",
  tier: "medium",
  description:
    "고객 문의를 classifier→priority-scorer→router 3단계 routing 워크플로우로 분류·우선순위 산정·담당 팀 배정하는 중급 트리아지 에이전트.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 고객 문의를 트리아지하라. 반드시 아래 순서로 서브에이전트를 호출하라:
1) classifier 서브에이전트에 문의 원문을 전달해 카테고리 분류 결과를 받는다.
2) priority-scorer 서브에이전트에 원문과 분류 결과를 함께 전달해 우선순위와 근거를 받는다.
3) router 서브에이전트에 원문, 분류 결과, 우선순위를 모두 전달해 담당 팀과 다음 조치를 받는다.

각 서브에이전트 호출이 완료된 후, 정확히 아래 마크다운 형식으로만 최종 정리하라.
다른 텍스트나 섹션을 추가하지 마라:

## 분류
(classifier 결과: 카테고리와 근거)

## 우선순위
(priority-scorer 결과: P1~P4와 근거)

## 라우팅
(router 결과: 담당 팀, 다음 조치, 주의사항)

[고객 문의]
${input}`,
  defaultInput:
    "결제했는데 주문이 안 들어갔어요. 카드는 승인됐다고 문자 왔는데 주문내역에는 아무것도 없습니다. 빨리 처리 안되면 환불해주세요.",
  rubric: {
    expectedSubagents: ["classifier", "priority-scorer", "router"],
    requiredSections: ["## 분류", "## 우선순위", "## 라우팅"],
    criteria: [
      {
        key: "classification_accuracy",
        description: "카테고리 분류가 정확한가",
      },
      {
        key: "priority_justification",
        description: "우선순위 산정 근거가 타당한가",
      },
      {
        key: "routing_appropriateness",
        description: "담당 팀/조치 라우팅이 적절한가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "billing-urgent",
        input: "카드 두 번 결제됐어요! 당장 환불해주세요. 너무 화가 납니다.",
        expect: (o) =>
          (o.includes("결제") || o.includes("환불")) &&
          (o.includes("P1") || o.includes("P2") || o.includes("높음") || o.includes("긴급")),
        note: "이중결제·환불 요청 → 결제/환불 카테고리 + P1/P2 이상 긴급도 확인",
      },
    ],
  },
};

export default { sample };
