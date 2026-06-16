import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Prompt Chaining).
 * 오케스트레이터가 attribute-extractor → copywriter → seo-tagger 순으로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  "attribute-extractor": {
    description: "원시 상품정보에서 제품명·핵심 기능·스펙·가격 등 핵심 속성을 추출할 때 사용",
    prompt: `당신은 이커머스 상품 MD입니다. 주어진 원시 상품 정보에서 제품명, 핵심 기능, 스펙, 가격 등 판매에 중요한 속성을 빠짐없이 추출하세요.
각 항목을 "속성: 값" 형식의 마크다운 목록으로만 출력하세요. 부가 설명은 붙이지 마세요.`,
    tools: [],
    maxTurns: 2,
  },
  copywriter: {
    description: "추출된 속성 목록을 바탕으로 매력적인 상품 제목과 상품 설명을 작성할 때 사용",
    prompt: `당신은 이커머스 전문 카피라이터입니다. 전달받은 상품 속성 목록을 바탕으로, 첫 줄에 클릭을 유도하는 매력적인 상품 제목(30자 이내)을, 이어서 주요 스펙과 혜택을 자연스럽게 녹인 3~5줄의 상품 설명을 작성하세요.
제목과 설명 본문만 출력하고 다른 말은 붙이지 마세요.`,
    tools: [],
    maxTurns: 2,
  },
  "seo-tagger": {
    description: "상품 속성과 카피를 분석해 검색 최적화용 해시태그를 생성할 때 사용",
    prompt: `당신은 이커머스 SEO 전문가입니다. 전달받은 상품 속성과 카피를 분석해, 소비자가 검색할 법한 키워드를 #해시태그 형식으로 5개 이상 생성하세요.
제품 카테고리, 핵심 기능, 용도, 가격대 등 다양한 각도의 태그를 포함하고, 태그 목록만 출력하세요.`,
    tools: [],
    maxTurns: 2,
  },
};

export const sample: AgentSample = {
  name: "ecommerce-listing",
  title: "상품 등록 카피 생성기",
  industry: "이커머스",
  pattern: "prompt-chaining",
  tier: "light",
  description:
    "원시 상품 정보를 attribute-extractor→copywriter→seo-tagger 체인으로 처리해 판매 제목·설명·SEO 태그를 생성하는 경량 이커머스 카피 워크플로우 에이전트.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 상품 정보로 판매 카피를 생성하라. 반드시 아래 순서로 서브에이전트를 호출하라:
1) attribute-extractor 서브에이전트에 상품 정보를 넘겨 핵심 속성/스펙 목록을 받는다.
2) copywriter 서브에이전트에 속성 목록을 넘겨 상품 제목과 설명을 받는다.
3) seo-tagger 서브에이전트에 속성 목록과 카피 결과를 넘겨 SEO 태그를 받는다.

그 후 정확히 아래 마크다운 형식으로만 최종 정리하라:

## 제목
(copywriter가 생성한 제목 한 줄)

## 상품 설명
(copywriter가 생성한 상품 설명)

## SEO 태그
(seo-tagger가 생성한 해시태그 목록)

[상품 정보]
${input}`,
  defaultInput:
    "무선 블루투스 이어폰, 액티브 노이즈캔슬링, 30시간 재생, IPX4 생활방수, 블랙, 가격 79000원",
  rubric: {
    expectedSubagents: ["attribute-extractor", "copywriter", "seo-tagger"],
    requiredSections: ["## 제목", "## 상품 설명", "## SEO 태그"],
    criteria: [
      {
        key: "attractiveness",
        description: "제목과 상품 설명이 매력적이고 구매를 유도하는가",
      },
      {
        key: "completeness",
        description: "입력에 포함된 주요 스펙(용량, 기능, 방수 등급 등)을 빠짐없이 반영했는가",
      },
      {
        key: "seo_quality",
        description: "SEO 태그가 상품 검색 의도에 적합하고 충분한 수(5개 이상)인가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "has-tags",
        input: "스테인리스 텀블러, 보온 12시간 보냉 24시간, 500ml, 식기세척기 사용가능",
        expect: (o) => o.includes("## SEO 태그") && o.includes("#"),
        note: "SEO 태그 섹션 존재 및 해시태그 형식(#) 확인",
      },
    ],
  },
};

export default { sample };
