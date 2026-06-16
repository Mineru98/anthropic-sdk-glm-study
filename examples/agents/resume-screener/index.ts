import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Routing).
 * 오케스트레이터가 jd-parser → matcher → rubric-scorer 순으로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  "jd-parser": {
    description: "채용공고(JD) 원문에서 필수 요건과 우대 요건을 구조화된 목록으로 추출할 때 사용",
    prompt: `당신은 채용공고 분석 전문가입니다. 주어진 채용공고(JD) 원문에서 요건을 정확히 추출하세요.

출력 규칙:
- "필수 요건" 블록과 "우대 요건" 블록만 출력합니다. 다른 말은 붙이지 않습니다.
- 각 요건을 "항목명: 설명" 형식으로 간결하게 나열합니다.
- 모호한 표현(예: "관련 경험")은 꺾쇠 없이 그대로 기록합니다.
- 성별, 나이, 출신, 외모, 사진 등 직무와 무관한 요소는 절대 요건으로 포함하지 않습니다.
- 이력서 평가나 해석은 하지 않습니다. 오직 JD에서 요건만 추출합니다.

출력 형식:
**필수 요건**
- 항목명: 설명
...

**우대 요건**
- 항목명: 설명
...`,
    tools: [],
    maxTurns: 2,
  },
  matcher: {
    description:
      "jd-parser가 추출한 요건 목록과 이력서 원문을 대조해 요건별 매칭 상태를 판정할 때 사용",
    prompt: `당신은 채용 매칭 전문가입니다. 전달받은 요건 목록과 이력서 원문을 대조해 각 요건의 충족 여부를 판정하세요.

판정 기준:
- 충족: 이력서에 해당 요건이 명확히 기술되어 있으며 완전히 충족함
- 부분 충족: 요건을 일부 충족하거나 유사한 기술/경험이 이력서에 있음
- 미충족: 이력서에 해당 요건 관련 내용이 전혀 언급되지 않음

출력 규칙:
- 요건별 "항목명: 판정 (근거)" 형식의 목록만 출력합니다. 다른 말은 붙이지 않습니다.
- 이력서에 명시된 사실만 근거로 사용합니다. 추측하지 않습니다.
- 응시자의 이름, 나이, 성별, 학교, 출신지 등 직무 무관 정보는 판정 근거로 절대 사용하지 않습니다.
- 필수 요건과 우대 요건 구분을 유지하여 출력합니다.

출력 형식:
**필수 요건 매칭**
- 항목명: 판정 (근거 한 줄)
...

**우대 요건 매칭**
- 항목명: 판정 (근거 한 줄)
...`,
    tools: [],
    maxTurns: 2,
  },
  "rubric-scorer": {
    description:
      "matcher의 매칭 결과를 바탕으로 가중 점수를 산정하고 합격/보류/불합격 판정을 내릴 때 사용",
    prompt: `당신은 채용 평가 전문가입니다. 전달받은 요건별 매칭 결과를 기반으로 가중 점수를 산정하고 최종 판정을 내리세요.

가중치 기준:
- 필수 요건: 충족 각 20점, 부분 충족 각 10점, 미충족 0점
- 우대 요건: 충족 각 10점, 부분 충족 각 5점, 미충족 0점

판정 기준:
- 합격: 필수 요건을 모두 충족(충족 판정)한 경우
- 보류: 필수 요건에 부분 충족 항목이 있고, 우대 요건 실적이 있는 경우
- 불합격: 필수 요건 중 하나 이상이 미충족인 경우

출력 규칙:
- 필수 요건 항목별 점수, 우대 요건 항목별 점수, 총점(숫자), 최종 판정을 반드시 출력합니다.
- 총점은 0 이상의 정수로 명시합니다.
- 최종 판정은 반드시 "합격", "보류", "불합격" 세 문자열 중 정확히 하나로만 표기합니다.
- 편향(성별, 나이, 출신, 외모, 학력 간판 등 직무 무관 요소)은 점수 산정 및 판정 근거에 절대 포함하지 않습니다.

출력 형식:
**필수 요건 점수**
- 항목명: N점 (판정)
...

**우대 요건 점수**
- 항목명: N점 (판정)
...

**총점**: N점
**최종 판정**: 합격 / 보류 / 불합격 중 하나`,
    tools: [],
    maxTurns: 2,
  },
};

export const sample: AgentSample = {
  name: "resume-screener",
  title: "이력서 스크리닝",
  industry: "HR/채용",
  pattern: "routing",
  tier: "medium",
  description:
    "채용공고와 이력서를 jd-parser→matcher→rubric-scorer 3단계 라우팅으로 분석해 공정한 합격/보류/불합격 판정을 내리는 에이전트.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 채용공고와 이력서를 분석하라. 반드시 아래 순서로 서브에이전트를 호출하라:

1) jd-parser 서브에이전트에 채용공고 원문을 넘겨 필수/우대 요건 목록을 받는다.
2) matcher 서브에이전트에 (1)의 요건 목록과 이력서 원문을 함께 넘겨 요건별 매칭 결과를 받는다.
3) rubric-scorer 서브에이전트에 (2)의 매칭 결과를 넘겨 가중 점수와 합격/보류/불합격 판정을 받는다.

그 후 정확히 아래 마크다운 형식으로만 최종 정리하라
(다른 섹션을 추가하거나 순서를 바꾸지 말 것):

## 요건
(jd-parser 결과: 필수 요건 목록 + 우대 요건 목록)

## 매칭
(matcher 결과: 요건별 판정 목록)

## 점수 및 판정
(rubric-scorer 결과: 항목별 점수, 총점 숫자, 최종 판정 — "합격"/"보류"/"불합격" 중 하나)

편향(성별/나이/출신/학력 간판 등 직무 무관 요소) 배제를 각 서브에이전트에 명시적으로 지시하라.

[입력]
${input}`,
  defaultInput:
    "[JD] 백엔드 개발자. 필수: Node.js 3년+, SQL, REST API. 우대: AWS, Docker.\n[이력서] 김OO. Node.js 4년, PostgreSQL 사용, REST/GraphQL API 설계. Docker 경험 있음. AWS 미사용.",
  rubric: {
    expectedSubagents: ["jd-parser", "matcher", "rubric-scorer"],
    requiredSections: ["## 요건", "## 매칭", "## 점수 및 판정"],
    criteria: [
      {
        key: "matching_accuracy",
        description: "요건-이력서 매칭이 정확한가",
      },
      {
        key: "scoring_justification",
        description: "점수/판정 근거가 명확한가",
      },
      {
        key: "fairness",
        description: "직무무관 편향 요소를 배제했는가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "score-verdict",
        input:
          "[JD] 프론트엔드. 필수: React 2년+, TypeScript.\n[이력서] 이OO. React 3년, TypeScript 능숙, Next.js 경험.",
        expect: (output: string) =>
          /\d+/.test(output) &&
          (output.includes("합격") || output.includes("보류") || output.includes("불합격")),
        note: "React/TypeScript 완전 충족 → 숫자 점수 및 합격/보류/불합격 판정 포함 확인",
      },
    ],
  },
};

export default { sample };
