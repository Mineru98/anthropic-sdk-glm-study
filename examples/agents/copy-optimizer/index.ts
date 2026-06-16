import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Evaluator-Optimizer).
 * 오케스트레이터가 writer → critic → finalizer 순으로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  writer: {
    description: "광고 카피 초안 작성이 필요할 때 사용",
    prompt: `당신은 창의적인 광고 카피라이터입니다. 전달받은 제품 정보(제품명, 타깃, 채널)를 바탕으로 광고 카피 초안을 작성하세요.
지정된 수량(보통 3개)의 카피를 번호 목록으로 출력하세요. 각 카피는 채널 특성(인스타그램, 네이버 등)과 타깃 페르소나에 맞게 톤을 조율하세요.
추가 해설이나 설명 없이 카피 번호 목록만 출력합니다.`,
    tools: [],
    maxTurns: 2,
  },
  critic: {
    description: "카피 초안을 설득력·브랜드적합성 기준으로 평가하고 개선점을 제시할 때 사용",
    prompt: `당신은 마케팅 전략가이자 카피라이팅 평론가입니다. writer가 작성한 카피 초안을 받아 두 가지 기준으로 각 카피를 평가하세요.
평가 기준:
1. 설득력: 소비자의 행동을 유도할 만한 감성적 호소와 메시지 명확성
2. 브랜드/타깃 적합성: 타깃 페르소나와 채널 특성에 맞는 톤과 메시지

각 카피마다 "강점:", "개선점:", "방향:" 레이블을 사용해 구조화된 피드백을 출력하세요.
각 방향은 1~2문장으로 간결하게 제시합니다.`,
    tools: [],
    maxTurns: 2,
  },
  finalizer: {
    description: "critic의 피드백을 반영해 최종 카피를 확정할 때 사용",
    prompt: `당신은 숙련된 카피라이터입니다. 초안과 critic의 피드백을 모두 받아 피드백을 충실히 반영한 최종 카피를 작성하세요.
최종 카피 번호 목록을 출력하고, 각 카피 뒤에 "(개선: …)" 형식으로 어떤 피드백을 반영했는지 한 줄 병기하세요.
초안 대비 개선된 부분이 명확히 드러나야 합니다. 최종 카피 목록만 출력합니다.`,
    tools: [],
    maxTurns: 2,
  },
};

export const sample: AgentSample = {
  name: "copy-optimizer",
  title: "카피라이팅 최적화기",
  industry: "마케팅",
  pattern: "evaluator-optimizer",
  tier: "medium",
  description:
    "광고 카피를 writer→critic→finalizer 평가-최적화 루프로 다듬어 설득력과 브랜드 적합성을 높이는 마케팅 에이전트.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 마케팅 요청에 대해 반드시 아래 순서로 서브에이전트를 호출하라:
1) writer 서브에이전트를 호출해 카피 초안(번호 목록)을 받는다. input에서 제품/타깃/채널 정보를 그대로 전달한다.
2) critic 서브에이전트에 초안 전체를 넘겨 설득력·브랜드적합성 피드백과 개선점을 받는다.
3) finalizer 서브에이전트에 초안과 critic 피드백을 모두 넘겨 피드백이 반영된 최종 카피를 받는다.

그 후 정확히 아래 마크다운 형식으로만 최종 정리하라:

## 초안
(writer 결과를 그대로)

## 피드백
(critic 결과를 그대로)

## 최종 카피
(finalizer 결과를 그대로)

이 세 섹션 외에 다른 헤딩이나 추가 설명을 붙이지 않는다.

[요청]
${input}`,
  defaultInput:
    "신제품: 친환경 대나무 칫솔. 타깃: 2030 환경의식 소비자. 채널: 인스타그램 광고 한 줄 카피 3개 제안",
  rubric: {
    expectedSubagents: ["writer", "critic", "finalizer"],
    requiredSections: ["## 초안", "## 피드백", "## 최종 카피"],
    criteria: [
      {
        key: "persuasiveness",
        description: "최종 카피가 소비자를 설득할 만한 표현과 감성적 호소력을 갖추고 있는가",
      },
      {
        key: "brand_fit",
        description: "최종 카피의 톤·메시지가 지정된 타깃 페르소나와 채널에 적합한가",
      },
      {
        key: "improvement_evidence",
        description:
          "## 피드백 섹션의 지적사항이 ## 최종 카피에 실제로 반영되어 초안 대비 개선이 이루어졌는가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "loop-evidence",
        input: "신제품: 제로웨이스트 고체 샴푸바. 타깃: 30대 직장인. 채널: 네이버 검색광고 카피",
        expect: (o) => o.includes("## 피드백") && o.includes("## 최종 카피"),
        note: "평가-최적화 루프 전체 실행 증거: 피드백 섹션과 최종 카피 섹션 동시 존재 확인",
      },
    ],
  },
};

export default { sample };
