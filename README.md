# anthropic-sdk-glm-study

Claude Agent SDK(`query()` + 서브에이전트 `AgentDefinition`)를 **GLM(z.ai)** 백엔드 위에서 돌려보는 학습용 저장소.
실행 런타임은 [Bun](https://bun.sh)이다.

핵심 산출물은 [`examples/agents/`](./examples/agents/) — 경량(단일 워크플로우)부터 헤비(다단계 오케스트레이션)까지
다양한 산업 도메인을 다루는 **멀티에이전트 샘플 12종** 컬렉션이다. 각 샘플은 `.claude/agents/*.md`로 정의된
서브에이전트들을 조합해 하나의 워크플로우를 구성한다.

## 추가된 에이전트 (12종)

| 티어 | 샘플 | 산업 | 오케스트레이션 패턴 | 한 줄 설명 |
|------|------|------|------|------|
| 경량 | `ko-spellcheck` | 콘텐츠/퍼블리싱 | Prompt Chaining | 한글 맞춤법 교정기 |
| 경량 | `support-triage` | 고객지원(CS) | Routing | 고객지원 티켓 트리아지 |
| 경량 | `ecommerce-listing` | 이커머스 | Prompt Chaining | 상품 등록 카피 생성기 |
| 경량 | `sql-analyst` | 데이터 분석 | Prompt Chaining | 자연어 → SQL 어시스턴트 |
| 중간 | `code-review-panel` | 소프트웨어 | Parallelization | 병렬 3-리뷰어 코드 리뷰 패널 |
| 중간 | `copy-optimizer` | 마케팅 | Evaluator-Optimizer | 카피라이팅 평가-최적화 루프 |
| 중간 | `resume-screener` | HR/채용 | Routing + Scoring | 이력서 스크리닝 |
| 중간 | `meeting-notes` | 생산성 | Prompt Chaining | 회의록 요약 · 액션아이템 추출 |
| 헤비 | `research-report` | 리서치 | Orchestrator-Workers | 리서치 리포트 멀티에이전트 |
| 헤비 | `contract-review` | 법률 | Orchestrator-Workers | 계약서 조항 검토(4단계) |
| 헤비 | `incident-response` | DevOps/SRE | Orchestrator-Workers | 인시던트 대응 오케스트레이션 |
| 헤비 | `finance-report` | 금융 | Orchestrator-Workers | 금융 리포트 분석(5단계) |

> 각 샘플의 상세 설명·서브에이전트 구성·루브릭은 `examples/agents/<name>/README.md` 참고.
> 컬렉션 전체 개요는 [`examples/agents/README.md`](./examples/agents/README.md)에 있다.

## 빠른 시작

### 1. 의존성 설치

```bash
bun install
```

### 2. 환경 변수 설정

`.env.example`를 복사해 `.env`를 만들고 z.ai 토큰을 채운다.

```bash
cp .env.example .env
```

```dotenv
ANTHROPIC_AUTH_TOKEN=<z.ai 토큰>
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
Z_AI_MODEL=glm-5.2
API_TIMEOUT_MS=3000000
```

### 3. 샘플 실행

```bash
# 사용 가능한 샘플 목록
bun run agents:list

# 샘플 1회 실행 (샘플 내장 기본 입력 사용)
bun run agents <name>

# 직접 입력을 넣어 실행
bun run agents <name> --input "사용자 입력"

# 예시
bun run agents ko-spellcheck --input "안되요 라고 적엇습니다"
```

## 그 외 실행 방법

```bash
# 루브릭 평가 — 실제 GLM 호출, 결과 리포트를 artifacts/에 저장
bun run agents <name> --eval

# React(Ink) 기반 TUI 런타임
bun run agents:tui <name>

# 데모 영상 녹화 (xterm.js → Playwright 녹화 → ffmpeg .mp4 + .vtt 자막)
bun run agents:demo <name>
bun run agents:demo:all          # 전체 샘플

# artifacts 갤러리 인덱스 갱신
bun run agents:index

# 타입체크
bun run agents:typecheck
```

> **참고:** z.ai 엔드포인트는 병렬 부하에서 529(과부하)를 반환할 수 있으므로
> `--eval`·데모 녹화 등 다회 호출 작업은 직렬로 실행하는 것을 권장한다.

## 디렉터리 구조

```
.
├── packages/core/        # GLM(z.ai) 설정·클라이언트 (@core, .env 로드)
├── examples/
│   ├── orchestrator.ts   # 단독 오케스트레이터 예제 (bun run orchestrator)
│   └── agents/           # 멀티에이전트 샘플 컬렉션 (위 12종)
│       ├── _shared/      # 공통 런타임·루브릭·judge·registry·types
│       ├── run.ts        # 공통 CLI 러너
│       ├── tui/          # Ink TUI 런타임
│       ├── demo/         # 녹화 파이프라인
│       ├── artifacts/    # 평가 리포트·데모 영상·자막
│       └── {sample}/     # 각 샘플 (.claude/agents, .claude/skills, index.ts, fixtures)
└── .env.example
```
