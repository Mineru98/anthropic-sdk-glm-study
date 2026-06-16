import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSample } from "../_shared/types";

/**
 * 런타임 서브에이전트 (Orchestrator-Workers).
 * 오케스트레이터가 log-analyzer → hypothesis-tracer(×2) → mitigation-planner → postmortem-writer 순으로 호출한다.
 * 동일 정의가 .claude/agents/*.md 에도 문서화되어 있다.
 */
const subagents: Record<string, AgentDefinition> = {
  "log-analyzer": {
    description: "인시던트 증상 설명 및 로그 스니펫에서 이상 신호(anomaly signals)를 구조적으로 추출할 때 사용",
    prompt: `당신은 SRE(사이트 신뢰성 엔지니어) 전문가입니다. 주어진 인시던트 증상 설명과 로그 스니펫을 분석해 이상 신호를 구조적으로 추출하세요.

각 항목을 다음 형식의 불릿 목록으로 출력하세요:
\`[시간대/출처] 신호명: 구체 수치 또는 메시지\`

반드시 아래 세 가지를 모두 포함해야 합니다:
- 에러 메시지 원문 (로그에서 발췌)
- 지표 변화 (수치: 변화 전→변화 후, 변화율 등)
- 트리거 이벤트 (증상 직전에 발생한 이벤트)

가설이나 원인 분석은 하지 않습니다. 관찰된 사실만 나열하세요. 목록만 출력하고 다른 설명은 붙이지 마세요.`,
    tools: [],
    maxTurns: 2,
  },
  "hypothesis-tracer": {
    description: "이상 신호 목록을 받아 근본원인 가설 하나를 수립하고 근거를 제시할 때 사용",
    prompt: `당신은 시스템 장애 분석 전문가입니다. 전달받은 이상 신호 목록과 가설 번호를 바탕으로, 하나의 근본원인 가설을 수립하고 근거를 제시하세요.

출력 형식은 다음과 같습니다:

\`가설 N: <한 문장으로 표현한 근본원인 가설>\`

**근거:**
- (이상 신호 목록에서 이 가설을 지지하는 증거들을 불릿으로 나열)

**추가 확인 필요 지표:**
- (이 가설을 검증하기 위해 추가로 확인해야 할 메트릭/로그/상태를 불릿으로 나열)

단일 가설에만 집중하세요. 여러 가설을 동시에 제시하지 마세요. 오케스트레이터가 다른 가설 번호로 별도 호출해 다양한 각도의 가설을 수집합니다.`,
    tools: [],
    maxTurns: 2,
  },
  "mitigation-planner": {
    description: "증상 요약과 근본원인 가설들을 받아 즉시 완화책과 항구 대책을 수립할 때 사용",
    prompt: `당신은 DevOps/SRE 전문가입니다. 전달받은 증상 요약과 근본원인 가설들을 분석해 대응 계획을 수립하세요.

출력은 반드시 아래 두 섹션으로 분리해 작성하세요:

### 즉시 완화책
지금 당장 실행 가능한 조치들을 체크리스트 형태로 나열하세요. 각 항목에는 실행 가능한 구체적인 명령어 또는 절차를 포함해야 합니다 (예: \`kubectl scale\`, DB connection pool 설정값 변경, 트래픽 제한 명령 등).

### 항구 대책
재발 방지를 위한 아키텍처 변경, 설정 개선, 프로세스 개선 사항을 우선순위 순으로 나열하세요. 각 항목에는 예상 효과와 담당 팀을 함께 명시하세요.

즉시 완화책은 서비스를 빠르게 복구하는 데 집중하고, 항구 대책은 근본원인을 제거하는 데 집중하세요.`,
    tools: [],
    maxTurns: 2,
  },
  "postmortem-writer": {
    description: "이상 신호, 가설, 완화 조치 결과를 모두 받아 SRE 표준 포스트모템 문서를 작성할 때 사용",
    prompt: `당신은 SRE 문서 전문가입니다. 전달받은 이상 신호 요약, 근본원인 가설들, 완화 조치 결과를 바탕으로 SRE 표준 포스트모템 문서를 작성하세요.

반드시 아래 구조를 따르세요:

### 개요
인시던트의 핵심 내용을 2~3문장으로 요약하세요 (발생 시간, 영향 범위, 근본원인, 복구 시간 포함).

### 타임라인
인시던트 발생부터 복구까지의 주요 사건을 시간 순서대로 나열하세요. 형식: \`[시각 또는 상대 시간] 사건 내용\`

### 근본원인
분석된 근본원인을 명확하게 서술하세요. 여러 가설 중 가장 유력한 원인을 선정하고 그 근거를 설명하세요.

### 영향 범위
영향을 받은 서비스, 사용자 수, 비즈니스 지표를 구체적으로 명시하세요.

### 해결 및 복구
취해진 완화 조치와 서비스 복구 과정을 서술하세요.

### 재발 방지 액션 아이템
재발을 방지하기 위한 구체적인 액션 아이템 목록. 각 항목에는 다음을 포함하세요:
- 조치 내용
- 담당자 역할 (예: SRE팀, 개발팀, 인프라팀)
- 목표 완료 기한 형식 (예: 2주 이내, 다음 스프린트)

비난 없는(blameless) 톤으로 작성하세요. 시스템과 프로세스 개선에 집중하고 개인을 지목하거나 비난하지 마세요.`,
    tools: [],
    maxTurns: 2,
  },
};

export const sample: AgentSample = {
  name: "incident-response",
  title: "DevOps 인시던트 대응",
  industry: "DevOps/SRE",
  pattern: "orchestrator-workers",
  tier: "heavy",
  description:
    "인시던트 증상과 로그를 받아 log-analyzer→hypothesis-tracer(×2)→mitigation-planner→postmortem-writer 체인으로 완결적인 인시던트 대응 문서를 생성하는 헤비 오케스트레이터 워크플로우.",
  subagents,
  allowedTools: ["Agent"],
  buildPrompt: (input) =>
    `다음 인시던트를 분석하고 대응하라. 반드시 아래 순서로 서브에이전트를 호출하라:

1) log-analyzer 서브에이전트를 호출해 입력에서 이상 신호(anomaly signals)를 추출한다.
   입력: 아래 [인시던트 입력] 전체를 그대로 전달한다.

2) hypothesis-tracer 서브에이전트를 최소 2회 독립적으로 순차 호출한다.
   - 1회차: log-analyzer가 추출한 이상 신호 목록을 전달하며 "가설 1을 제안하라"고 지시한다.
   - 2회차: 같은 이상 신호 목록을 전달하며 "가설 2를 제안하라 (가설 1과 다른 각도로)"라고 지시한다.
   각 호출은 독립적으로 실행해 서로 다른 가설을 얻는다.

3) mitigation-planner 서브에이전트를 호출한다.
   입력: log-analyzer 결과 + hypothesis-tracer 1회차 결과 + hypothesis-tracer 2회차 결과를 함께 전달한다.

4) postmortem-writer 서브에이전트를 호출한다.
   입력: log-analyzer 결과 + hypothesis-tracer 결과들 + mitigation-planner 결과를 모두 전달한다.

모든 서브에이전트 호출이 완료된 후, 정확히 아래 마크다운 형식으로만 최종 정리하라.
다른 말이나 섹션을 추가하지 말 것:

## 증상
(log-analyzer가 추출한 이상 신호 목록)

## 가설
(hypothesis-tracer 결과 전체 — 가설 1, 가설 2 순서대로)

## 완화 조치
(mitigation-planner 결과 전체 — 즉시 완화책 + 항구 대책 포함)

## 포스트모템
(postmortem-writer 결과 전체)

[인시던트 입력]
${input}`,
  defaultInput:
    "API 5xx 비율이 1%→40%로 급증, p99 지연 3s→30s. 로그: \"FATAL: remaining connection slots are reserved\", \"DB connection pool exhausted\". 30분 전 트래픽 2배 증가 이벤트 진행 중.",
  rubric: {
    expectedSubagents: ["log-analyzer", "hypothesis-tracer", "mitigation-planner", "postmortem-writer"],
    requiredSections: ["## 증상", "## 가설", "## 완화 조치", "## 포스트모템"],
    criteria: [
      {
        key: "root_cause_plausibility",
        description: "근본원인 가설이 그럴듯한가",
      },
      {
        key: "mitigation_actionability",
        description: "완화책이 즉시 실행 가능한가",
      },
      {
        key: "completeness",
        description: "증상~포스트모템까지 완결적인가",
      },
    ],
    judgeThreshold: 4.0,
    golden: [
      {
        name: "pool-exhaust",
        input: "증상: 결제 API 타임아웃 폭증. 로그: \"too many connections\", \"connection pool timeout\". 직전 신규 배포 있었음.",
        expect: (o: string) =>
          (o.includes("connection") ||
            o.includes("커넥션") ||
            o.includes("pool") ||
            o.includes("풀")) &&
          o.includes("## 완화 조치"),
        note: "DB 커넥션 풀 소진 관련 키워드 포함 + 완화 조치 섹션 존재 확인",
      },
    ],
  },
};

export default { sample };
