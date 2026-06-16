import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Prompt Chaining).
 * 오케스트레이터가 summarizer → decision-logger → action-extractor 순으로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  "summarizer": {
    description: "회의록 원문을 받아 핵심만 추린 요약문을 생성할 때 사용",
    prompt: `당신은 비즈니스 회의 요약 전문가입니다. 주어진 회의록을 읽고 논의된 핵심 내용을 간결하게 3–5문장으로 요약하세요. 원문에서 언급된 주제·배경·맥락을 빠짐없이 반영하되 중복·잡담은 제거하세요. 요약문만 출력하고 다른 말은 붙이지 마세요.`,
    tools: [],
    maxTurns: 2,
  },
  "decision-logger": {
    description: "회의 요약과 원문을 받아 확정된 결정사항 목록을 생성할 때 사용",
    prompt: `당신은 회의 기록 전문가입니다. 주어진 회의 요약과 원문을 바탕으로 이번 회의에서 확정된 결정사항을 목록으로 정리하세요. 보류된 항목은 '(보류)' 표시를 붙여 포함하세요. 결정사항이 없으면 '결정사항 없음'이라고 출력하세요. '- 결정내용' 형식의 목록만 출력합니다.`,
    tools: [],
    maxTurns: 2,
  },
  "action-extractor": {
    description: "회의 내용에서 담당자·기한과 함께 액션 아이템을 추출할 때 사용",
    prompt: `당신은 프로젝트 관리 전문가입니다. 주어진 회의 내용에서 액션 아이템을 빠짐없이 추출하세요. 각 항목은 '- [담당자]: [할 일] (기한: [날짜 또는 기간])' 형식으로 출력하세요. 기한이 언급되지 않은 경우 '(기한: 미정)'으로 표기하세요. 담당자가 팀인 경우 팀 이름을 사용하세요. 목록만 출력합니다.`,
    tools: [],
    maxTurns: 2,
  },
};

export const sample: AgentSample = {
  name: "meeting-notes",
  title: "회의록 요약·액션아이템 추출",
  industry: "생산성",
  pattern: "prompt-chaining",
  tier: "medium",
  description:
    "회의록을 summarizer→decision-logger→action-extractor 체인으로 분석해 요약·결정사항·액션 아이템을 자동 정리하는 워크플로우.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 회의록을 분석하라. 반드시 아래 순서로 서브에이전트를 호출하라:

1) summarizer 서브에이전트에 회의록 원문을 전달해 핵심 요약을 받는다.
2) decision-logger 서브에이전트에 원문과 summarizer의 요약 결과를 전달해 결정사항 목록을 받는다.
3) action-extractor 서브에이전트에 원문, 요약, 결정사항 목록을 모두 전달해 액션 아이템 목록을 받는다.

그 후 정확히 아래 마크다운 형식으로만 최종 정리하라:

## 요약
(summarizer 결과)

## 결정사항
(decision-logger 결과)

## 액션 아이템
(action-extractor 결과)

[회의록]
${input}`,
  defaultInput:
    "회의록: 다음 분기 마케팅 예산을 20% 늘리기로 했다. 민수가 다음 주 금요일까지 광고 후보 3개를 정리한다. 디자인팀은 5월 말까지 배너 시안을 준비한다. 가격 인상은 보류.",
  rubric: {
    expectedSubagents: ["summarizer", "decision-logger", "action-extractor"],
    requiredSections: ["## 요약", "## 결정사항", "## 액션 아이템"],
    criteria: [
      {
        key: "summary_fidelity",
        description: "요약이 원문의 주요 내용을 충실히 반영했는가",
      },
      {
        key: "action_completeness",
        description: "액션 아이템의 담당자와 기한을 빠짐없이 뽑았는가",
      },
      {
        key: "structure",
        description: "요약/결정사항/액션 아이템 구분이 명료하고 형식을 준수했는가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "deadline",
        input:
          "회의록: 신규 기능 출시일을 6월 30일로 확정. 지영이 QA 계획을 6월 10일까지 수립. 서버 증설은 인프라팀이 담당.",
        expect: (o) =>
          o.includes("## 액션 아이템") && (o.includes("지영") || o.includes("QA")),
        note: "## 액션 아이템 섹션 존재 + 지영/QA 언급 확인",
      },
    ],
  },
};

export default { sample };
