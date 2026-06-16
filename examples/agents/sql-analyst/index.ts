import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Prompt Chaining).
 * 오케스트레이터가 nl-parser → sql-generator → query-validator 순으로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  "nl-parser": {
    description: "자연어 질문에서 의도/대상 테이블/조건/집계를 파싱할 때 사용",
    prompt: `당신은 데이터 쿼리 분석 전문가입니다. 주어진 자연어 질문에서 다음 네 항목을 분석하여 항목별 목록으로 출력하세요.

1. 의도: 질문이 원하는 결과를 한 줄로 요약
2. 테이블·컬럼: 사용할 테이블과 관련 컬럼 목록
3. 조건: WHERE 절에 해당하는 필터·기간 조건
4. 집계: GROUP BY·집계함수(COUNT, SUM 등)·정렬 방식

추가 설명 없이 항목만 출력합니다.`,
    tools: [],
    maxTurns: 2,
  },
  "sql-generator": {
    description: "파싱된 쿼리 명세를 받아 표준 SQL SELECT 문을 생성할 때 사용",
    prompt: `당신은 SQL 작성 전문가입니다. 전달받은 쿼리 명세(의도/테이블·컬럼/조건/집계)를 기반으로 ANSI SQL 표준에 맞는 SELECT 문을 작성하세요.

SQL 코드 블록만 출력하고 설명은 붙이지 마세요. 테이블·컬럼명은 명세에 주어진 것을 그대로 사용하세요.`,
    tools: [],
    maxTurns: 2,
  },
  "query-validator": {
    description: "생성된 SQL의 문법 정확성과 안전성(위험 구문 포함 여부)을 검증할 때 사용",
    prompt: `당신은 SQL 검토 전문가입니다. 전달받은 SQL에 대해 다음 두 가지를 수행하세요.

1. 문법 검증: SELECT·FROM·WHERE·GROUP BY·ORDER BY 구조의 정확성 확인
2. 안전성 검증: DELETE·DROP·TRUNCATE·UPDATE·INSERT 등 파괴적 구문 포함 여부 확인

결과를 아래 형식으로 출력하세요:
- 문법: 정상 / 오류(이유)
- 안전성: 안전 / 위험(이유)

개선 제안이 있으면 한 줄로 덧붙이세요.`,
    tools: [],
    maxTurns: 2,
  },
};

export const sample: AgentSample = {
  name: "sql-analyst",
  title: "자연어 SQL 어시스턴트",
  industry: "데이터 분석",
  pattern: "prompt-chaining",
  tier: "light",
  description:
    "자연어 질문을 nl-parser→sql-generator→query-validator 체인으로 SQL로 변환하고 문법·안전성 검증까지 수행하는 경량 단일 워크플로우 에이전트.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 자연어 질문을 SQL로 변환하라. 반드시 아래 순서로 서브에이전트를 호출하라:
1) nl-parser 서브에이전트에 질문 전문을 넘겨 쿼리 명세(의도/테이블·컬럼/조건/집계)를 받는다.
2) sql-generator 서브에이전트에 원래 질문과 nl-parser 결과를 넘겨 SQL을 받는다.
3) query-validator 서브에이전트에 생성된 SQL을 넘겨 문법·안전성 검증을 받는다.

그 후 정확히 아래 마크다운 형식으로만 최종 정리하라:

## 해석
(nl-parser가 분석한 의도·테이블·조건·집계를 항목별로 정리)

## SQL
(sql-generator가 생성한 SQL 코드 블록)

## 검증
(query-validator의 문법·안전성 검증 결과)

[질문]
${input}`,
  defaultInput:
    "지난 30일간 일자별 신규 가입자 수를 보여줘. 테이블: users(id BIGINT, created_at TIMESTAMP)",
  rubric: {
    expectedSubagents: ["nl-parser", "sql-generator", "query-validator"],
    requiredSections: ["## 해석", "## SQL", "## 검증"],
    criteria: [
      {
        key: "sql_correctness",
        description: "SQL이 문법적으로 올바르고 자연어 의도를 반영하는가",
      },
      {
        key: "intent_match",
        description: "자연어 질문의 의도를 정확히 해석했는가",
      },
      {
        key: "safety",
        description: "생성된 SQL에 대한 위험 쿼리(DELETE/DROP 등) 여부를 점검했는가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "sum-by-country",
        input: "국가별 총 주문 금액 합계를 큰 순서로. 테이블: orders(id, country, amount, created_at)",
        expect: (output: string) => {
          const upper = output.toUpperCase();
          return upper.includes("SELECT") && upper.includes("ORDERS") && upper.includes("GROUP BY");
        },
        note: "SELECT·orders·GROUP BY 세 키워드 포함 확인 (대소문자 무관)",
      },
    ],
  },
};

export default { sample };
