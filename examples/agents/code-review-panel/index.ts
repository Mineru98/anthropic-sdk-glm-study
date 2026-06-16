import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Parallelization).
 * 오케스트레이터가 security-reviewer / performance-reviewer / style-reviewer를
 * 병렬로 호출한 뒤 aggregator로 통합한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  "security-reviewer": {
    description: "코드에서 보안 취약점을 찾을 때 사용",
    prompt: `당신은 보안 전문가입니다. 주어진 코드에서 인젝션(SQL/Command/코드), eval 사용, 시크릿 하드코딩, 인증·권한 누락, 입력 미검증 등 보안 취약점을 모두 찾으세요.
각 취약점을 \`[심각도: HIGH/MED/LOW] 문제: ... / 위치: ... / 권장 수정: ...\` 형식의 목록으로 출력하세요. 취약점이 없으면 "취약점 없음"이라고 답하세요.
목록만 출력하고 다른 설명은 붙이지 마세요.`,
    tools: [],
    maxTurns: 2,
  },
  "performance-reviewer": {
    description: "코드에서 성능 문제를 찾을 때 사용",
    prompt: `당신은 성능 최적화 전문가입니다. 주어진 코드에서 불필요한 반복·중첩 루프, 메모리 낭비, 비효율적 자료구조 사용, 동기 블로킹, N+1 쿼리 등 성능 문제를 찾으세요.
각 문제를 \`[영향도: HIGH/MED/LOW] 문제: ... / 위치: ... / 권장 수정: ...\` 형식의 목록으로 출력하세요. 문제가 없으면 "성능 이슈 없음"이라고 답하세요.
목록만 출력하세요.`,
    tools: [],
    maxTurns: 2,
  },
  "style-reviewer": {
    description: "코드의 가독성·네이밍·스타일을 검토할 때 사용",
    prompt: `당신은 코드 품질 전문가입니다. 주어진 코드에서 불명확한 변수·함수 네이밍, 과도한 중첩, 주석 누락, 일관성 없는 스타일, 코드 중복, 너무 긴 함수 등 가독성·유지보수성 문제를 찾으세요.
각 항목을 \`[우선순위: HIGH/MED/LOW] 문제: ... / 위치: ... / 권장 수정: ...\` 형식의 목록으로 출력하세요. 문제가 없으면 "스타일 이슈 없음"이라고 답하세요.
목록만 출력하세요.`,
    tools: [],
    maxTurns: 2,
  },
  aggregator: {
    description: "보안·성능·스타일 리뷰를 통합해 우선순위 요약을 만들 때 사용",
    prompt: `당신은 시니어 개발자입니다. 전달받은 보안·성능·스타일 리뷰 결과를 종합해 다음을 수행하세요: (1) 각 영역의 핵심 이슈를 요약하고, (2) 전체 이슈를 심각도 기준으로 우선순위화하여 "즉시 수정 필요 / 조기 개선 권장 / 장기 개선 고려" 3단계로 분류하세요. 전달받은 내용을 그대로 반환하지 말고 반드시 통합·재해석하여 실행 가능한 개선 로드맵을 제시하세요.`,
    tools: [],
    maxTurns: 3,
  },
};

export const sample: AgentSample = {
  name: "code-review-panel",
  title: "코드 리뷰 패널",
  industry: "소프트웨어",
  pattern: "parallelization",
  tier: "medium",
  description:
    "코드를 보안·성능·스타일 세 전문가가 병렬 검토한 뒤 aggregator가 통합 우선순위 요약을 생성하는 멀티 리뷰어 에이전트.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 코드를 코드 리뷰하라. 반드시 아래 순서로 서브에이전트를 호출하라:

1) security-reviewer 서브에이전트를 호출해 보안 취약점 목록을 받는다.
2) performance-reviewer 서브에이전트를 호출해 성능 문제 목록을 받는다.
3) style-reviewer 서브에이전트를 호출해 가독성·스타일 문제 목록을 받는다.
   (1~3은 독립적이므로 가능하면 병렬로 실행하라)
4) aggregator 서브에이전트에 위 세 결과를 모두 넘겨 종합 요약을 받는다.

모든 서브에이전트 호출이 완료된 후, 정확히 아래 마크다운 형식으로만 최종 정리하라
(형식 외 추가 텍스트 불가):

## 보안
(security-reviewer 결과 그대로)

## 성능
(performance-reviewer 결과 그대로)

## 스타일
(style-reviewer 결과 그대로)

## 종합
(aggregator 결과 그대로)

[코드]
${input}`,
  defaultInput:
    'function run(input){ let out=""; for(let i=0;i<items.length;i++){ out+=items[i]; } return eval(input); }',
  rubric: {
    expectedSubagents: [
      "security-reviewer",
      "performance-reviewer",
      "style-reviewer",
      "aggregator",
    ],
    requiredSections: ["## 보안", "## 성능", "## 스타일", "## 종합"],
    criteria: [
      {
        key: "issue_coverage",
        description: "주요 이슈를 폭넓게 찾았는가",
      },
      {
        key: "accuracy",
        description: "지적이 정확한가(오탐 적은가)",
      },
      {
        key: "actionability",
        description: "수정 제안이 실행 가능한가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "eval-danger",
        input: `app.get("/u",(req,res)=>{ db.query("SELECT * FROM u WHERE id="+req.query.id); eval(req.query.cmd); });`,
        expect: (o) => (o.includes("eval") || o.includes("보안")) && o.includes("## 종합"),
        note: "eval 코드 인젝션 및 SQL 인젝션 탐지 + 종합 섹션 존재 확인",
      },
    ],
  },
};

export default { sample };
