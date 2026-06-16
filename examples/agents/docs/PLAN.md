# 빌드 계획서 — examples/agents 멀티에이전트 샘플 컬렉션

> 상태: **승인 대기**. 본 문서 승인 후 Phase 2(빌드)를 진행한다.
> 근거: [RESEARCH.md](./RESEARCH.md)

## 0. 확정된 범위 (사용자 결정)

- 진행: **리서치+계획 먼저 → 승인 후 빌드** (현재 계획 단계)
- 구현 깊이: **12개 전부 동일 수준 완전 구현**
- API: **실제 GLM API 호출, 풀 규모** (루브릭 평가 + 데모 모두 실제 호출)
- 데모: **CLI/TUI를 웹 터미널(xterm.js)로 띄워 Playwright 녹화 + 자막**

## 1. 디렉터리 구조

```
examples/agents/
├── docs/
│   ├── RESEARCH.md            # 리서치 근거 (작성 완료)
│   └── PLAN.md                # 본 문서
├── _shared/                   # 공통 런타임 인프라
│   ├── runtime.ts             # query() 래퍼 + trace 수집기 + 이벤트 emitter
│   ├── rubric.ts              # 3계층 루브릭 프레임워크
│   ├── judge.ts               # LLM-as-judge 헬퍼 (GLM 호출)
│   ├── registry.ts            # 12개 샘플 메타데이터 레지스트리
│   └── types.ts               # AgentSample, RubricResult 등 공통 타입
├── run.ts                     # 공통 CLI 러너: bun run examples/agents/run.ts <name> [--eval]
├── tui/                       # React(Ink) 기반 TUI 런타임 (별도 에이전트 런타임)
│   ├── index.tsx              # Ink 앱 엔트리
│   └── components/            # Spinner/ProgressBar/StatusMessage 진행 표시
├── demo/                      # xterm.js + node-pty + Playwright 녹화 파이프라인
│   ├── server.ts             # node-pty ↔ WebSocket 브릿지
│   ├── terminal.html          # xterm.js 렌더 페이지 + 자막 오버레이
│   ├── record.ts              # Playwright 녹화 + WebVTT 자막 생성
│   └── subtitles/             # 샘플별 자막 스크립트(JSON: {t, text})
├── artifacts/                 # ★ 모든 산출물 정리 폴더
│   ├── INDEX.md               # 갤러리(샘플별 영상/평가 링크)
│   └── {agent-name}/
│       ├── eval-report.json   # 루브릭 채점 결과
│       ├── eval-report.md     # 사람이 읽는 평가 리포트
│       ├── demo.webm          # 데모 영상
│       ├── demo.vtt           # 자막
│       └── screenshots/
└── {agent-name}/              # 12개 샘플 (아래 §3)
    ├── .claude/agents/*.md    # 런타임 서브에이전트 정의 (description+prompt+tools)
    ├── .claude/skills/*/SKILL.md  # 샘플 전용 스킬
    ├── index.ts               # 샘플 실행 진입점 (query 오케스트레이션)
    ├── rubric.ts              # 이 샘플의 합격 기준
    ├── fixtures/              # 골든셋 입력
    └── README.md              # 설명/패턴/실행법/루브릭
```

## 2. 두 가지 "멀티에이전트" 축 (혼동 방지)

1. **런타임 축** — 각 샘플 *내부*가 여러 서브에이전트로 구성 (예: 리서치 샘플 = researcher×N → verifier → reporter → sentence-checker → ko-spellchecker).
2. **빌드 축** — 각 샘플을 *만들 때* **계획→구현→검증→테스트→검수** 5단계 에이전트 파이프라인으로 제작 (사용자 요구). Phase 2에서 Workflow 파이프라인으로 실행.

## 3. 12개 샘플 (경량 → 헤비, 산업 다양화, 5대 패턴 매핑)

### Tier A — 경량 (단일 워크플로우 / Prompt Chaining·Routing)
| # | 이름 | 산업 | 패턴 | 런타임 서브에이전트 |
|---|------|------|------|---------------------|
| 1 | `ko-spellcheck` | 콘텐츠/퍼블리싱 | Prompt Chaining | spell-detector → corrector → explainer |
| 2 | `support-triage` | 고객지원(CS) | Routing | classifier → priority-scorer → router |
| 3 | `ecommerce-listing` | 이커머스 | Prompt Chaining | attribute-extractor → copywriter → seo-tagger |
| 4 | `sql-analyst` | 데이터 분석 | Prompt Chaining | nl-parser → sql-generator → query-validator |

### Tier B — 중간 (Parallelization / Evaluator-Optimizer)
| # | 이름 | 산업 | 패턴 | 런타임 서브에이전트 |
|---|------|------|------|---------------------|
| 5 | `code-review-panel` | 소프트웨어 | Parallelization | security/perf/style 리뷰어(병렬) → aggregator |
| 6 | `copy-optimizer` | 마케팅 | Evaluator-Optimizer | writer ↔ critic 루프 → finalizer |
| 7 | `resume-screener` | HR/채용 | Routing+Scoring | jd-parser → matcher → rubric-scorer |
| 8 | `meeting-notes` | 생산성 | Prompt Chaining | transcriber → summarizer → action-extractor |

### Tier C — 헤비 (Orchestrator-Workers + Evaluator)
| # | 이름 | 산업 | 패턴 | 런타임 서브에이전트 |
|---|------|------|------|---------------------|
| 9 | `research-report` | 리서치/지식노동 | Orchestrator-Workers | orchestrator → researcher×N(병렬) → fact-verifier → report-writer → sentence-checker → ko-spellchecker |
| 10 | `contract-review` | 법률 | Orchestrator + Evaluator | clause-extractor → risk-analyst×N(병렬) → cross-checker → summary-writer |
| 11 | `incident-response` | DevOps/SRE | Orchestrator-Workers | log-analyzer → hypothesis-tracer×N(병렬) → mitigation-planner → postmortem-writer |
| 12 | `finance-report` | 금융 | Orchestrator + Verifier | data-extractor → metric-analyst → risk-assessor → number-verifier → opinion-writer |

> 9번 `research-report`가 사용자가 예시로 든 시스템(조사→검증→취합/보고서→문장검사→한글맞춤법)을 그대로 구현한다.

## 4. 평가 루브릭 (3계층, 모든 샘플 공통 프레임 + 샘플별 기준)

- **L1 결정론적 (자동, 무비용에 가까움)**: trace 이벤트(task_started/progress/notification) 수신, 기대 서브에이전트 호출 발생, 출력이 zod 스키마 통과, 필수 섹션 존재.
- **L2 LLM-as-judge (GLM 실호출)**: 정확성·완전성·형식준수·도메인적합성을 0–5로 채점.
- **L3 골든셋 회귀**: `fixtures/` 입력에 대해 기대 속성 검사(예: 맞춤법 샘플은 의도적 오타가 교정됐는가).
- **합격 기준**: L1 전부 통과 **AND** L2 평균 ≥ 4.0/5 **AND** L3 통과.
- 산출물: `artifacts/{name}/eval-report.{json,md}`.

## 5. 공통 CLI 러너
`bun run examples/agents/run.ts <name> [--input <file>] [--eval]`
- 레지스트리에서 샘플 로드 → `index.ts` 실행 → trace 스트리밍 출력. `--eval` 시 루브릭 채점까지.

## 6. React TUI 런타임 (별도 에이전트 런타임)
- Ink + @inkjs/ui. 좌측 서브에이전트 트리(상태 Badge), 우측 스트리밍 로그, 하단 ProgressBar.
- 동일 `_shared/runtime.ts` 이벤트 emitter를 구독 → CLI와 런타임 공유, 표현만 다름.
- `bun run examples/agents/tui/index.tsx <name>`

## 7. 데모 녹화 파이프라인 (xterm.js + Playwright)
1. `demo/server.ts`: node-pty로 `run.ts`/`tui`를 PTY 실행 → WebSocket.
2. `demo/terminal.html`: xterm.js가 출력 렌더 + 자막 오버레이 div.
3. `demo/record.ts`: Playwright가 페이지 열고 `recordVideo`로 .webm 캡처, 단계 이벤트에 맞춰 자막 표시 + `.vtt` 동시 생성.
4. 결과 → `artifacts/{name}/demo.webm` + `demo.vtt`.

## 8. Phase 2 빌드 실행 방식 (per-project 5단계 파이프라인)
각 샘플마다 Workflow로 **plan → implement → verify → test → review** 에이전트 체인 실행:
- **plan**: 서브에이전트 구성·루브릭 기준 확정
- **implement**: `.claude/agents`, `index.ts`, `rubric.ts`, `README.md`, fixtures 작성
- **verify**: 타입체크(`tsc --noEmit`)·구조·스키마 정적 검증
- **test**: 실제 GLM API로 실행 + 루브릭 평가 통과 확인
- **review**: 코드 품질·문서·일관성 최종 검수
- 12개를 pipeline으로 처리(공통 인프라 `_shared`/`tui`/`demo`는 먼저 구축).

## 9. 산출물 위치
모든 결과물은 `examples/agents/artifacts/` 아래에 샘플별로 정리되고 `artifacts/INDEX.md`가 갤러리 역할(영상·평가 리포트 링크).

## 10. 의존성 추가 예정
`ink`, `react`, `@inkjs/ui`, `node-pty`, `ws`, `@xterm/xterm`, `playwright`, (dev) `@playwright/test`, `@types/react`, `@types/ws`.

## 11. 리스크 / 가정
- 실제 GLM 호출이므로 12개 × (테스트+데모) 토큰 비용 발생 → 루브릭 입력은 작게 유지.
- 자막-영상 동기화(WebVTT)는 부분 검증 영역 → 오버레이 div + .vtt 이중 방식으로 안정화.
- Playwright 브라우저 바이너리 설치 필요(`playwright install chromium`).
