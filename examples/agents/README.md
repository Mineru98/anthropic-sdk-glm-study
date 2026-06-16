# examples/agents — 멀티에이전트 샘플 컬렉션

경량(단일 워크플로우)부터 헤비(다단계 멀티에이전트)까지, 다양한 산업의 에이전트 시스템 샘플 모음.
모든 샘플은 Claude Agent SDK의 `query()` + 서브에이전트(`AgentDefinition`)로 구현되며 백엔드는 GLM(z.ai)이다.

## 설계 근거 / 계획
- [docs/RESEARCH.md](./docs/RESEARCH.md) — 5대 오케스트레이션 패턴, 평가 방법론, TUI/녹화 기법의 검증된 근거
- [docs/PLAN.md](./docs/PLAN.md) — 전체 빌드 계획

## 샘플 (12개)

| 티어 | 샘플 | 산업 | 패턴 |
|------|------|------|------|
| 경량 | `ko-spellcheck` | 콘텐츠/퍼블리싱 | Prompt Chaining |
| 경량 | `support-triage` | 고객지원 | Routing |
| 경량 | `ecommerce-listing` | 이커머스 | Prompt Chaining |
| 경량 | `sql-analyst` | 데이터 | Prompt Chaining |
| 중간 | `code-review-panel` | 소프트웨어 | Parallelization |
| 중간 | `copy-optimizer` | 마케팅 | Evaluator-Optimizer |
| 중간 | `resume-screener` | HR/채용 | Routing+Scoring |
| 중간 | `meeting-notes` | 생산성 | Prompt Chaining |
| 헤비 | `research-report` | 리서치 | Orchestrator-Workers |
| 헤비 | `contract-review` | 법률 | Orchestrator-Workers |
| 헤비 | `incident-response` | DevOps/SRE | Orchestrator-Workers |
| 헤비 | `finance-report` | 금융 | Orchestrator-Workers |

## 구조

```
examples/agents/
├── _shared/        # 공통 런타임(runtime/rubric/judge/registry/types)
├── run.ts          # 공통 CLI 러너
├── gen-index.ts    # artifacts/INDEX.md 생성기
├── tui/            # React(Ink) TUI 런타임
├── demo/           # xterm.js + Playwright 녹화 파이프라인
├── artifacts/      # 평가 리포트 · 데모 영상 · 자막 (INDEX.md 갤러리)
└── {sample}/       # 각 샘플 (.claude/agents, .claude/skills, index.ts, rubric, fixtures, README)
```

## 실행

```bash
# 샘플 목록
bun run examples/agents/run.ts list

# 실행 (CLI)
bun run examples/agents/run.ts <name>
bun run examples/agents/run.ts <name> --input "사용자 입력"

# 루브릭 평가 (실제 GLM 호출, artifacts에 리포트 저장)
bun run examples/agents/run.ts <name> --eval

# React TUI 런타임
bun run examples/agents/tui/index.tsx <name>

# 데모 영상 녹화 (xterm.js를 Playwright로 녹화 → ffmpeg로 .mp4 변환 + 자막 .vtt)
bun run examples/agents/demo/record.ts <name>
bun run examples/agents/demo/record-all.ts      # 전체

# 산출물 인덱스 갱신
bun run examples/agents/gen-index.ts
```

## 평가 루브릭 (3계층)
- **L1 결정론적** — trace 이벤트, 기대 서브에이전트 호출, 출력 섹션 존재
- **L2 LLM-as-judge** — 샘플별 기준 0–5 채점 (GLM 실호출), 평균 ≥ 4.0 합격
- **L3 골든셋 회귀** — 고정 입력에 대한 결정론적 술어 검증

합격 = L1 전부 ∧ L2 평균≥임계 ∧ L3 전부.

## 두 가지 "멀티에이전트" 축
1. **런타임축** — 각 샘플 내부가 여러 서브에이전트로 구성 (`.claude/agents/*.md`).
2. **빌드축** — 각 샘플을 계획→구현→검증→테스트→검수 5단계 에이전트 파이프라인으로 제작.
