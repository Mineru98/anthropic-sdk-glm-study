import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Prompt Chaining).
 * 오케스트레이터가 detector → corrector → explainer 순으로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  "spell-detector": {
    description: "한국어 텍스트에서 맞춤법·띄어쓰기·문법 오류를 찾아낼 때 사용",
    prompt: `당신은 한국어 교정 전문가입니다. 주어진 텍스트에서 맞춤법, 띄어쓰기, 문법 오류를 모두 찾으세요.
각 오류를 "원래표현 → 올바른표현 (유형)" 형식의 목록으로 출력하세요. 오류가 없으면 "오류 없음"이라고 답하세요.
설명은 붙이지 말고 목록만 출력합니다.`,
    tools: [],
    maxTurns: 2,
  },
  corrector: {
    description: "발견된 오류를 반영해 교정된 전체 문장을 생성할 때 사용",
    prompt: `당신은 한국어 교정 전문가입니다. 전달받은 원문과 오류 목록을 바탕으로,
오류를 모두 반영한 자연스러운 교정문 전체를 출력하세요. 교정문 본문만 출력하고 다른 말은 붙이지 마세요.`,
    tools: [],
    maxTurns: 2,
  },
  explainer: {
    description: "각 교정 사항에 대해 왜 고쳤는지 한국어로 설명할 때 사용",
    prompt: `당신은 한국어 교육자입니다. 각 교정 항목에 대해 "원래표현 → 교정표현: 이유" 형식으로
간결하게 한 줄씩 설명하세요. 어문 규범(맞춤법/띄어쓰기 규정)을 근거로 들어주세요.`,
    tools: [],
    maxTurns: 2,
  },
};

export const sample: AgentSample = {
  name: "ko-spellcheck",
  title: "한글 맞춤법 교정기",
  industry: "콘텐츠/퍼블리싱",
  pattern: "prompt-chaining",
  tier: "light",
  description:
    "한국어 텍스트를 detector→corrector→explainer 체인으로 교정하고 이유까지 설명하는 경량 단일 워크플로우 에이전트.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 한국어 텍스트를 교정하라. 반드시 아래 순서로 서브에이전트를 호출하라:
1) spell-detector 서브에이전트로 오류 목록을 받는다.
2) corrector 서브에이전트에 원문과 오류 목록을 넘겨 교정문을 받는다.
3) explainer 서브에이전트에 오류 목록을 넘겨 교정 이유를 받는다.

그 후 정확히 아래 마크다운 형식으로만 최종 정리하라:

## 원문
(원문 그대로)

## 교정문
(corrector 결과)

## 오류 및 설명
(explainer 결과를 줄 목록으로)

[텍스트]
${input}`,
  defaultInput:
    "오늘 날씨가 너무 춥어서 옷을 따뜻하게 입엇다. 학교에 갈때 친구를 만났는대 정말 반가웠다.",
  rubric: {
    expectedSubagents: ["spell-detector", "corrector", "explainer"],
    requiredSections: ["## 교정문", "## 오류"],
    criteria: [
      {
        key: "accuracy",
        description: "명백한 맞춤법·띄어쓰기 오류를 올바르게 교정했는가",
      },
      {
        key: "completeness",
        description: "원문의 주요 오류를 빠짐없이 다뤘는가",
      },
      {
        key: "format",
        description: "원문/교정문/오류설명 섹션 형식을 정확히 지켰는가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "obvious-typos",
        input: "나는 어제 책을 일것다. 그책은 매우 재미있엇다.",
        expect: (o) => o.includes("읽었다") && o.includes("재미있었다"),
        note: "일것다→읽었다, 재미있엇다→재미있었다 교정 확인",
      },
    ],
  },
};

export default { sample };
