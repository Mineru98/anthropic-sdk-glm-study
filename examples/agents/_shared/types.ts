import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

/** 샘플 난이도 티어 (경량 → 헤비) */
export type Tier = "light" | "medium" | "heavy";

/** Anthropic "Building Effective Agents"의 5대 정규 패턴 */
export type Pattern =
  | "prompt-chaining"
  | "routing"
  | "parallelization"
  | "orchestrator-workers"
  | "evaluator-optimizer";

/** LLM-as-judge가 채점하는 단일 기준 (L2) */
export interface RubricCriterion {
  /** 점수 맵의 키 */
  key: string;
  /** 무엇을 평가하는지 — judge 프롬프트에 그대로 들어감 */
  description: string;
}

/** 골든셋 회귀 케이스 (L3) */
export interface GoldenCase {
  name: string;
  /** 이 케이스로 샘플을 한 번 더 실행한다 */
  input: string;
  /** 최종 출력 텍스트에 대한 결정론적 합격 술어 */
  expect: (output: string) => boolean;
  note?: string;
}

/** 샘플별 3계층 루브릭 정의 */
export interface SampleRubric {
  /** L1: 호출되어야 하는 런타임 서브에이전트 이름 */
  expectedSubagents: string[];
  /** L1: 최종 출력에 반드시 포함되어야 하는 문자열/섹션 */
  requiredSections?: string[];
  /** L2: judge 채점 기준 */
  criteria: RubricCriterion[];
  /** L2: 합격 임계 평균 (기본 4.0/5) */
  judgeThreshold?: number;
  /** L3: 골든셋 회귀 케이스 */
  golden: GoldenCase[];
}

/** examples/agents 하위 모든 샘플이 따르는 공통 계약 */
export interface AgentSample {
  /** 디렉터리명과 동일한 식별자 (kebab-case) */
  name: string;
  /** 사람이 읽는 제목 */
  title: string;
  /** 대상 산업 */
  industry: string;
  /** 오케스트레이션 패턴 */
  pattern: Pattern;
  /** 난이도 티어 */
  tier: Tier;
  /** 한 줄 설명 */
  description: string;
  /** 런타임 서브에이전트 정의 (description+prompt 필수) */
  subagents: Record<string, AgentDefinition>;
  /** 오케스트레이터가 사용할 도구 (기본 ["Agent"]) */
  allowedTools?: string[];
  /** 사용자 입력으로부터 오케스트레이터 프롬프트 생성 */
  buildPrompt: (input: string) => string;
  /** 데모/기본 실행 입력 */
  defaultInput: string;
  /** 평가 루브릭 */
  rubric: SampleRubric;
}

/** runtime이 수집하는 trace 이벤트 (orchestrator.ts와 동일 형태) */
export interface TraceEvent {
  type: string;
  subtype?: string;
}

/** 샘플 1회 실행 결과 */
export interface RunResult {
  /** 최종 종합 텍스트 */
  output: string;
  /** 수집된 trace 이벤트 */
  trace: TraceEvent[];
  /** 호출된 서브에이전트 타입 목록 (중복 포함) */
  subagentCalls: string[];
  /** 전체 소요 시간(ms) */
  durationMs: number;
  /** 토큰 사용량 추정 (가능 시) */
  totalTokens?: number;
}

/** 루브릭 개별 체크 결과 */
export interface RubricCheck {
  layer: "L1" | "L2" | "L3";
  name: string;
  passed: boolean;
  detail?: string;
  score?: number;
  /** true면 보고만 하고 합격 판정에는 포함하지 않음 */
  informational?: boolean;
}

/** 평가 종합 결과 */
export interface RubricResult {
  sample: string;
  passed: boolean;
  l1: RubricCheck[];
  l2: { average: number; threshold: number; checks: RubricCheck[]; rationale?: string };
  l3: RubricCheck[];
  summary: string;
}
