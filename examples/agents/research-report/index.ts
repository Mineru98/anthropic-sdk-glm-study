import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Orchestrator-Workers).
 * 오케스트레이터가 researcher(복수)→fact-verifier→report-writer→sentence-checker→ko-spellchecker 순으로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  researcher: {
    description: "주어진 하위 주제를 모델 지식으로 조사·정리할 때 사용",
    prompt: `당신은 리서치 전문가입니다. 웹 검색 없이 모델이 보유한 지식만으로 주어진 하위 주제를 조사합니다.

출력은 주요 사실·현황·통계·전망을 번호 목록 또는 단락 형태로 구조적으로 정리하십시오.

추측은 '~로 알려져 있음', '~로 추정됨' 등 불확실성을 명시하고, 출처로 추정되는 기관명·문헌명·연도를 가능하면 함께 기재하십시오.

하위 주제 외의 내용은 포함하지 마십시오. 간결하고 정보 밀도 높은 조사 결과물을 출력하십시오.`,
    tools: [],
    maxTurns: 3,
  },
  "fact-verifier": {
    description: "조사 내용의 사실성과 내적 일관성을 검증하고 의심 항목을 표시할 때 사용",
    prompt: `당신은 사실 검증 전문가입니다. 전달받은 리서치 결과물을 분석하여 다음 세 범주로 구분해 표시하십시오.

(1) 명백히 오류이거나 과장된 주장
(2) 상호 모순된 내용
(3) 확인이 어려워 추가 주의가 필요한 항목

출력 형식: '⚠️ [의심 항목]: 사유' 목록으로 출력하십시오.

문제가 없으면 '검증 이상 없음'으로 답하십시오. 추가 설명 없이 목록 또는 '검증 이상 없음'만 출력하십시오.`,
    tools: [],
    maxTurns: 2,
  },
  "report-writer": {
    description: "검증된 리서치 자료를 종합해 구조적 보고서를 작성할 때 사용",
    prompt: `당신은 전문 리포트 작성자입니다. 전달받은 하위 주제별 조사 내용과 검증 노트를 바탕으로 다음 네 섹션의 한국어 보고서를 작성하십시오.

섹션명은 정확히 아래와 같아야 합니다:

## 개요
(주제 소개, 웹 접근 없이 모델 지식 기반으로 종합한 보고서임을 명시, 2~4문장)

## 본문
(하위 주제별 상세 내용을 소제목을 활용하여 구조적으로 서술)

## 검증 노트
(fact-verifier가 표시한 의심 항목 목록, 또는 '특이 사항 없음')

## 출처
(조사 중 언급된 기관명·문헌명·연도를 목록으로 정리. 웹 검색 없이 모델 지식 기반이므로 '추정 출처'임을 명시)

섹션 순서와 섹션명을 변경하지 마십시오. 보고서는 한국어로 작성하십시오.`,
    tools: [],
    maxTurns: 3,
  },
  "sentence-checker": {
    description: "보고서 문장의 명료성과 논리적 흐름을 검사할 때 사용",
    prompt: `당신은 문장 교열 전문가입니다. 전달받은 보고서의 각 문장을 검토하여 다음 세 항목을 발견하면 개선안을 제시하십시오.

(1) 모호하거나 이중 해석이 가능한 표현
(2) 논리 비약이나 흐름 단절
(3) 불필요하게 복잡한 구조

수정 제안은 '원문 → 제안문 (이유)' 형식으로 출력하십시오.

수정이 불필요하면 '문장 검토 이상 없음'으로 답하십시오. 보고서의 ## 개요, ## 본문, ## 검증 노트, ## 출처 섹션 구조는 그대로 유지하면서 필요한 부분만 수정 제안하십시오.`,
    tools: [],
    maxTurns: 2,
  },
  "ko-spellchecker": {
    description: "한국어 보고서의 맞춤법·띄어쓰기를 최종 교정할 때 사용",
    prompt: `당신은 한국어 맞춤법 교정 전문가입니다. 전달받은 보고서 전문을 검토하여 맞춤법·띄어쓰기 오류를 모두 수정한 최종본을 출력하십시오.

원래의 ## 개요, ## 본문, ## 검증 노트, ## 출처 섹션 구조를 그대로 유지하면서 교정된 전체 본문을 출력하십시오.

교정 내역은 본문 뒤에 '### 교정 내역' 소섹션으로 간략히 덧붙이십시오.

오류가 없으면 원문을 그대로 출력하고 '### 교정 내역'에 '교정 사항 없음'이라고 기재하십시오.`,
    tools: [],
    maxTurns: 3,
  },
};

export const sample: AgentSample = {
  name: "research-report",
  title: "리서치 리포트 멀티에이전트",
  industry: "리서치/지식노동",
  pattern: "orchestrator-workers",
  tier: "heavy",
  description:
    "주제를 하위 주제로 분해 후 researcher(복수 호출)→fact-verifier→report-writer→sentence-checker→ko-spellchecker 파이프라인으로 검증된 한국어 보고서를 생성하는 헤비 오케스트레이터-워커 샘플.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 주제로 리서치 보고서를 작성하라: "${input}"

반드시 아래 순서로 서브에이전트를 호출하라:

1) 주제를 2~3개 하위 주제로 분해한다.
   예: 주제가 "전기차 배터리 재활용"이면 ① 현황 ② 주요 기술 ③ 전망 등으로 분해한다.

2) researcher 서브에이전트를 각 하위 주제에 대해 순차적으로(또는 병렬로) 호출한다.
   각 호출 시 프롬프트: "다음 하위 주제를 모델 지식으로 조사·정리하라: [하위 주제명]"
   (하위 주제가 2개면 2회, 3개면 3회 호출)

3) fact-verifier 서브에이전트를 1회 호출한다.
   프롬프트: "다음 리서치 결과물의 사실성과 일관성을 검증하라:\\n[researcher 결과 전부 합산]"

4) report-writer 서브에이전트를 1회 호출한다.
   프롬프트: "다음 조사 자료와 검증 노트를 바탕으로 보고서를 작성하라:\\n조사 내용: [researcher 결과]\\n검증 노트: [fact-verifier 결과]"

5) sentence-checker 서브에이전트를 1회 호출한다.
   프롬프트: "다음 보고서의 문장 명료성과 논리 흐름을 검사하라:\\n[report-writer 결과]"

6) ko-spellchecker 서브에이전트를 1회 호출한다.
   프롬프트: "다음 보고서의 맞춤법과 띄어쓰기를 최종 교정하라. 섹션 구조를 유지하면서 교정된 전체 본문을 출력하라:\\n[sentence-checker 수정 제안을 반영한 report-writer 보고서 최종본]"

모든 서브에이전트 호출이 완료된 후, ko-spellchecker가 출력한 최종 교정 보고서를 그대로 최종 답변으로 출력하라.
최종 출력은 반드시 다음 4개 섹션을 포함해야 한다:
## 개요
## 본문
## 검증 노트
## 출처`,
  defaultInput: "전기차 배터리 재활용 기술의 현황과 전망",
  rubric: {
    expectedSubagents: [
      "researcher",
      "fact-verifier",
      "report-writer",
      "sentence-checker",
      "ko-spellchecker",
    ],
    requiredSections: ["## 개요", "## 본문", "## 검증 노트", "## 출처"],
    criteria: [
      {
        key: "depth",
        description: "보고서 내용이 하위 주제별로 충분한 깊이와 구조를 갖추고 있는가",
      },
      {
        key: "accuracy",
        description: "fact-verifier 검증 단계가 반영되어 의심 항목이 적절히 처리되었는가",
      },
      {
        key: "coherence",
        description: "개요→본문→검증 노트→출처로 이어지는 보고서 흐름이 일관적인가",
      },
      {
        key: "korean_quality",
        description: "한국어 표현이 자연스럽고 맞춤법·띄어쓰기 오류가 없는가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "structured",
        input: "재생에너지 저장을 위한 그린수소 기술 개요",
        expect: (output: string) =>
          output.includes("## 본문") &&
          output.includes("## 출처") &&
          output.length >= 500,
        note: "## 본문과 ## 출처 섹션 존재, 전체 길이 500자 이상 확인",
      },
    ],
  },
};

export default { sample };
