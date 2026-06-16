# anthropic-sdk-glm-study

Claude Agent SDK(`query()` + 서브에이전트 `AgentDefinition`)를 **GLM(z.ai)** 백엔드 위에서 실행해 보는 학습용 저장소입니다.
실행 런타임으로는 [Bun](https://bun.sh)을 사용합니다.

핵심 산출물은 [`examples/agents/`](./examples/agents/)입니다. 경량(단일 워크플로우)부터 헤비(다단계 오케스트레이션)까지
다양한 산업 도메인을 다루는 **멀티에이전트 샘플 12종**을 제공합니다. 각 샘플은 `.claude/agents/*.md`로 정의된
서브에이전트들을 조합하여 하나의 워크플로우를 구성합니다.

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

> 컬렉션 전체 개요는 [`examples/agents/README.md`](./examples/agents/README.md)에서 확인하실 수 있습니다.

## 빠른 시작

### 1. 의존성 설치

```bash
bun install
```

### 2. 환경 변수 설정

`.env.example`를 복사하여 `.env`를 만든 뒤 z.ai 토큰을 입력해 주세요.

```bash
cp .env.example .env
```

```dotenv
ANTHROPIC_AUTH_TOKEN=<z.ai 토큰>
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
Z_AI_MODEL=glm-5.2
API_TIMEOUT_MS=3000000
```

### 3. 공통 실행 방법

모든 샘플은 아래와 같은 동일한 형태로 실행하실 수 있습니다.

```bash
# 사용 가능한 샘플 목록 보기
bun run agents:list

# 샘플 1회 실행 (샘플 내장 기본 입력 사용)
bun run agents <name>

# 직접 입력을 넣어 실행
bun run agents <name> --input "사용자 입력"

# 루브릭 평가 (실제 GLM 호출, 결과 리포트를 artifacts/에 저장)
bun run agents <name> --eval
```

## 에이전트별 사용법

아래 각 항목을 펼치시면 해당 에이전트의 스킬과 서브에이전트 구성, 모든 사용 예시를 확인하실 수 있습니다.

<details>
<summary><b>📝 ko-spellcheck</b> — 한글 맞춤법 교정기 (콘텐츠/퍼블리싱 · Prompt Chaining)</summary>

한국어 텍스트를 **spell-detector → corrector → explainer** 3단계 체인으로 교정하고 교정 이유까지 설명합니다.

**스킬**
- `proofread` — 한국어 텍스트 교정 워크플로우 (오류 탐지→교정→이유 설명 순차 수행)

**서브에이전트**
- `spell-detector` — 맞춤법/띄어쓰기/문법 오류 탐지
- `corrector` — 오류를 반영한 교정문 생성
- `explainer` — 교정 이유 설명

**사용 예시**
```bash
# 기본 입력으로 실행
bun run agents ko-spellcheck

# 직접 텍스트를 교정
bun run agents ko-spellcheck --input "오늘 날씨가 너무 춥어서 옷을 따뜻하게 입엇다."
bun run agents ko-spellcheck --input "회의 자료를 금요일까지 준비할께요. 잘 부탁드림니다."

# 루브릭 평가
bun run agents ko-spellcheck --eval
```

**활용 사례** — 블로그/문서 교정, 고객 응대문 검수, 사내 공지 맞춤법 점검 등
</details>

<details>
<summary><b>🎫 support-triage</b> — 고객지원 티켓 트리아지 (고객지원 · Routing)</summary>

고객 문의를 **classifier → priority-scorer → router** 3단계로 처리하여 카테고리 분류, 긴급도 산정, 담당 팀 배정을 수행합니다.

**스킬**
- `triage` — 고객 문의를 분류→우선순위→라우팅 3단계 routing 워크플로우로 처리

**서브에이전트**
- `classifier` — 결제/배송/계정/기술/환불/기타 6개 카테고리로 분류
- `priority-scorer` — P1~P4 긴급도와 산정 근거 출력
- `router` — 담당 팀(결제팀/물류팀/계정팀/기술지원팀/환불처리팀/일반상담팀)과 다음 조치 결정

**사용 예시**
```bash
bun run agents support-triage

# 배송 지연 문의
bun run agents support-triage --input "배송이 일주일째 안 와요."
# 결제·환불 복합 문의 (높은 긴급도)
bun run agents support-triage --input "결제했는데 주문이 안 들어갔어요. 카드 승인 문자는 왔는데 주문내역엔 없습니다. 빨리 안 되면 환불해주세요."

bun run agents support-triage --eval
```

**활용 사례** — CS 인입 티켓 자동 분류, 긴급도 기반 우선 처리, 담당 팀 자동 배정 등
</details>

<details>
<summary><b>🛒 ecommerce-listing</b> — 상품 등록 카피 생성기 (이커머스 · Prompt Chaining)</summary>

원시 상품 정보를 **attribute-extractor → copywriter → seo-tagger** 3단계 체인으로 처리하여 판매 제목·상품 설명·SEO 해시태그를 한 번에 생성합니다.

**스킬**
- `ecommerce-listing` — 이커머스 상품 등록 카피 생성 워크플로우 (속성 추출→카피 작성→SEO 태깅 순차 수행)

**서브에이전트**
- `attribute-extractor` — 원시 상품정보에서 핵심 속성/스펙 추출
- `copywriter` — 매력적인 제목(30자 이내)과 상품 설명(3~5줄) 작성
- `seo-tagger` — 검색 최적화용 해시태그 5개 이상 생성

**사용 예시**
```bash
bun run agents ecommerce-listing

# 이어폰 상품 정보
bun run agents ecommerce-listing --input "무선 블루투스 이어폰, 액티브 노이즈캔슬링, 30시간 재생, IPX4 생활방수, 블랙, 가격 79000원"
# 텀블러 상품 정보
bun run agents ecommerce-listing --input "스테인리스 보온 텀블러 500ml, 12시간 보온/보냉, 진공 이중구조, 가격 29000원"

bun run agents ecommerce-listing --eval
```

**활용 사례** — 오픈마켓 상품 등록 자동화, 상세페이지 카피 초안 작성, SEO 해시태그 일괄 생성 등
</details>

<details>
<summary><b>🗄️ sql-analyst</b> — 자연어 SQL 어시스턴트 (데이터 분석 · Prompt Chaining)</summary>

자연어 데이터 질문을 **nl-parser → sql-generator → query-validator** 3단계 체인으로 SQL로 변환하고 문법·안전성 검증까지 수행합니다.

**스킬**
- `nl-to-sql` — 자연어 질문을 SQL로 변환하는 워크플로우 (의도 파싱→SQL 생성→문법·안전성 검증 순차 수행)

**서브에이전트**
- `nl-parser` — 자연어 질문에서 의도/대상 테이블/조건/집계 파싱
- `sql-generator` — 파싱 결과로 표준 SQL SELECT 문 생성
- `query-validator` — SQL 문법·안전성(DELETE/DROP 위험 등) 검증

**사용 예시**
```bash
bun run agents sql-analyst

# 일자별 집계 쿼리
bun run agents sql-analyst --input "지난 30일간 일자별 신규 가입자 수를 보여줘. 테이블: users(id BIGINT, created_at TIMESTAMP)"
# 그룹별 합계 쿼리
bun run agents sql-analyst --input "일별 매출 합계를 보여줘. 테이블: sales(id, amount, created_at)"

bun run agents sql-analyst --eval
```

**활용 사례** — 비개발자 셀프 데이터 조회, SQL 초안 생성, 위험 쿼리(DELETE/DROP) 사전 검증 등
</details>

<details>
<summary><b>🔍 code-review-panel</b> — 코드 리뷰 패널 (소프트웨어 · Parallelization)</summary>

코드를 **security-reviewer / performance-reviewer / style-reviewer** 세 전문가가 병렬로 검토한 뒤, **aggregator**가 통합 우선순위 요약을 생성합니다.

**스킬**
- `code-review-panel` — 코드 리뷰 패널 워크플로우 (보안·성능·스타일 검토를 병렬 수행한 뒤 통합 요약)

**서브에이전트**
- `security-reviewer` — 인젝션/eval/시크릿 등 보안 취약점 탐지
- `performance-reviewer` — 루프/메모리/N+1 등 성능 문제 탐지
- `style-reviewer` — 네이밍/가독성/스타일 문제 탐지
- `aggregator` — 세 리뷰를 통합하여 우선순위 요약 생성

**사용 예시**
```bash
bun run agents code-review-panel

# 보안 취약점이 있는 코드
bun run agents code-review-panel --input 'function run(input){ let out=""; for(let i=0;i<items.length;i++){ out+=items[i]; } return eval(input); }'

bun run agents code-review-panel --eval
```

**활용 사례** — PR 사전 셀프 리뷰, 보안·성능·스타일 다관점 점검, 리뷰 우선순위 요약 등
</details>

<details>
<summary><b>✍️ copy-optimizer</b> — 카피라이팅 최적화기 (마케팅 · Evaluator-Optimizer)</summary>

광고 카피를 **writer → critic → finalizer** 3단계 평가-최적화 루프로 다듬어 설득력과 브랜드 적합성을 높입니다.

**스킬**
- `copy-optimize` — 광고 카피 평가-최적화 워크플로우 (초안 작성→피드백→최종 카피 확정 순차 수행)

**서브에이전트**
- `writer` — 제품/타깃/채널 정보를 바탕으로 카피 초안 작성
- `critic` — 초안을 설득력·브랜드적합성 기준으로 평가하고 개선점 제시
- `finalizer` — 피드백을 반영한 최종 카피 확정 (개선 근거 병기)

**사용 예시**
```bash
bun run agents copy-optimizer

# 인스타그램 광고 카피
bun run agents copy-optimizer --input "신제품: 친환경 대나무 칫솔. 타깃: 2030 환경의식 소비자. 채널: 인스타그램 광고 한 줄 카피 3개 제안"
# 네이버 검색광고 카피
bun run agents copy-optimizer --input "신제품: 제로웨이스트 고체 샴푸바. 타깃: 30대 직장인. 채널: 네이버 검색광고 카피"

bun run agents copy-optimizer --eval
```

**활용 사례** — 채널별 광고 문구 다듬기, A/B 테스트용 카피 변형 생성, 브랜드 톤 검수 등
</details>

<details>
<summary><b>📄 resume-screener</b> — 이력서 스크리닝 (HR/채용 · Routing + Scoring)</summary>

채용공고(JD)와 이력서를 **jd-parser → matcher → rubric-scorer** 3단계 라우팅으로 분석하여 공정한 합격/보류/불합격 판정을 내립니다. 성별·나이·출신 등 직무 무관 편향 요소는 배제합니다.

**스킬**
- `resume-screen` — 채용공고와 이력서를 3단계 라우팅 워크플로우로 분석해 합격/보류/불합격 판정

**서브에이전트**
- `jd-parser` — 채용공고에서 필수/우대 요건 추출
- `matcher` — 이력서를 요건별로 충족/부분 충족/미충족 매칭
- `rubric-scorer` — 가중 점수 산정 및 합격/보류/불합격 판정

**사용 예시**
```bash
bun run agents resume-screener

# JD + 이력서 입력
bun run agents resume-screener --input "[JD] 백엔드 개발자. 필수: Node.js 3년+, SQL, REST API. 우대: AWS, Docker. [이력서] 김OO. Node.js 4년, PostgreSQL 사용, REST/GraphQL API 설계. Docker 경험 있음. AWS 미사용."

bun run agents resume-screener --eval
```

**활용 사례** — 1차 서류 스크리닝, 요건 매칭 근거 기록, 편향 배제 점수화 등
</details>

<details>
<summary><b>🗒️ meeting-notes</b> — 회의록 요약·액션아이템 추출 (생산성 · Prompt Chaining)</summary>

회의록을 **summarizer → decision-logger → action-extractor** 3단계 체인으로 분석하여 요약·결정사항·액션 아이템을 자동 정리합니다.

**스킬**
- `meeting-pipeline` — 회의록 분석 워크플로우 (요약→결정사항 기록→액션 아이템 추출 순차 수행)

**서브에이전트**
- `summarizer` — 회의록 원문을 핵심 위주로 3–5문장 요약
- `decision-logger` — 확정 결정사항을 목록화 (보류 항목 포함)
- `action-extractor` — 담당자·기한이 포함된 액션 아이템 추출

**사용 예시**
```bash
bun run agents meeting-notes

# 회의록 텍스트 입력
bun run agents meeting-notes --input "회의록: 다음 분기 마케팅 예산을 20% 늘리기로 했다. 민수가 다음 주 금요일까지 광고 후보 3개를 정리한다. 디자인팀은 5월 말까지 배너 시안을 준비한다. 가격 인상은 보류."

bun run agents meeting-notes --eval
```

**활용 사례** — 회의 직후 요약/결정사항 정리, 담당자·기한별 액션아이템 추출, 보류 항목 추적 등
</details>

<details>
<summary><b>📚 research-report</b> — 리서치 리포트 멀티에이전트 (리서치 · Orchestrator-Workers)</summary>

주어진 주제를 2~3개 하위 주제로 분해한 뒤, **researcher(복수 호출) → fact-verifier → report-writer → sentence-checker → ko-spellchecker** 5단계 파이프라인으로 검증된 한국어 리서치 보고서를 생성합니다. 웹 접근이 없으므로 모델 지식 기반 종합 보고서임을 개요에 명시합니다.

**스킬**
- `research-report` — 주제를 하위 주제로 분해 후 다단계 서브에이전트 파이프라인으로 검증된 한국어 리서치 보고서 생성

**서브에이전트**
- `researcher` — 하위 주제를 모델 지식으로 조사·정리 (하위 주제 수만큼 복수 호출)
- `fact-verifier` — 조사 내용의 사실성/일관성 검증 및 의심 항목 표시
- `report-writer` — 검증된 자료를 종합하여 4섹션 보고서 작성
- `sentence-checker` — 보고서 문장의 명료성·논리 흐름 검사
- `ko-spellchecker` — 최종 보고서 맞춤법·띄어쓰기 교정

**출력 형식** — `## 개요` / `## 본문` / `## 검증 노트` / `## 출처` 4개 섹션

**사용 예시**
```bash
bun run agents research-report

bun run agents research-report --input "전기차 배터리 재활용 기술의 현황과 전망"
bun run agents research-report --input "그린수소 기술의 현황과 전망"

bun run agents research-report --eval
```

**활용 사례** — 주제 리서치 초안 작성, 사실성 검증 노트 포함 보고서, 한국어 품질 교정까지 일괄 처리 등
</details>

<details>
<summary><b>⚖️ contract-review</b> — 계약서 조항 검토 (법률 · Orchestrator-Workers)</summary>

계약서 조항을 **clause-extractor → risk-analyst(반복) → cross-checker → summary-writer** 4단계로 분석하여 법적·상업적 리스크와 협상 포인트를 도출합니다.

**스킬**
- `contract-review` — 계약서 조항 검토 워크플로우 (조항 추출→리스크 분석→교차검증→종합 의견 순차 수행)

**서브에이전트**
- `clause-extractor` — 계약서에서 핵심 조항 식별·분해
- `risk-analyst` — 조항별 법적/상업적 리스크 분석 (조항마다 별도 호출)
- `cross-checker` — 조항 간 상충/누락을 교차검증
- `summary-writer` — 리스크 요약 및 협상 포인트 의견 작성

**사용 예시**
```bash
bun run agents contract-review

# 손해배상·해지·비밀유지 조항 검토
bun run agents contract-review --input "제5조(손해배상) 을의 귀책으로 손해 발생 시 을은 계약금액의 300%를 배상한다. 제8조(해지) 갑은 사유 없이 즉시 해지할 수 있다. 제10조(비밀유지) 기한 정함 없이 영구히 유지한다."

bun run agents contract-review --eval
```

**활용 사례** — 계약서 리스크 사전 점검, 조항 간 상충/누락 교차검증, 협상 포인트 도출 등

> 이 샘플의 출력은 법률 자문이 아닌 참고용입니다.
</details>

<details>
<summary><b>🚨 incident-response</b> — DevOps 인시던트 대응 (DevOps/SRE · Orchestrator-Workers)</summary>

인시던트 증상과 로그를 입력받아 **log-analyzer → hypothesis-tracer(×2) → mitigation-planner → postmortem-writer** 순서로 호출하여 완결적인 인시던트 대응 문서를 생성합니다.

**스킬**
- `incident-response` — DevOps 인시던트 대응 워크플로우 (로그 분석→가설 수립→완화 조치→포스트모템 순차 수행)

**서브에이전트**
- `log-analyzer` — 증상/로그에서 이상 신호(anomaly signals) 추출
- `hypothesis-tracer` — 근본원인 가설 수립 (2회 독립 호출로 서로 다른 각도의 가설 생성)
- `mitigation-planner` — 즉시 완화책과 항구 대책 수립
- `postmortem-writer` — SRE 표준 포스트모템 문서 작성

**사용 예시**
```bash
bun run agents incident-response

# DB 커넥션 풀 소진 인시던트
bun run agents incident-response --input 'API 5xx 비율이 1%→40%로 급증, p99 지연 3s→30s. 로그: "FATAL: remaining connection slots are reserved", "DB connection pool exhausted". 30분 전 트래픽 2배 증가 이벤트 진행 중.'

bun run agents incident-response --eval
```

**활용 사례** — 장애 초기 가설 수립, 즉시 완화책/항구 대책 정리, 포스트모템 초안 작성 등
</details>

<details>
<summary><b>💰 finance-report</b> — 금융 리포트 분석 (금융 · Orchestrator-Workers)</summary>

기업 재무 데이터를 **data-extractor → metric-analyst → risk-assessor → number-verifier → opinion-writer** 5단계 체인으로 분석하고 투자 의견까지 도출합니다.

**스킬**
- `finance-analysis` — 금융 리포트 분석 워크플로우 (데이터 추출→지표 분석→리스크 평가→수치 검증→투자 의견 순차 수행)

**서브에이전트**
- `data-extractor` — 자연어 재무 텍스트에서 핵심 수치 추출·정규화
- `metric-analyst` — 성장성/수익성/안정성 지표 분석
- `risk-assessor` — 재무·시장 리스크 평가
- `number-verifier` — 계산/비율 수치의 일관성 검증
- `opinion-writer` — 투자 의견(매수/중립/매도/보유/주의) 작성

**사용 예시**
```bash
bun run agents finance-report

# 성장 기업 재무 데이터
bun run agents finance-report --input "기업 A 연간 실적: 매출 1000억(+20% YoY), 영업이익 120억(영업이익률 12%, 전년 9%), 순이익 90억, 부채비율 80%, 영업현금흐름 150억, PER 15배."
# 부실 기업 재무 데이터 (역성장+영업손실+고부채)
bun run agents finance-report --input "기업 B 연간 실적: 매출 800억(-15% YoY), 영업손실 -50억, 순손실 -80억, 부채비율 250%."

bun run agents finance-report --eval
```

**활용 사례** — 재무 수치 추출/정규화, 지표·리스크 분석, 수치 일관성 검증 후 투자 의견 도출 등

> 이 샘플의 출력은 투자 자문이 아닌 참고용입니다.
</details>

## 그 외 실행 방법

```bash
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

> **참고:** z.ai 엔드포인트는 병렬 부하에서 529(과부하)를 반환할 수 있으므로,
> `--eval`·데모 녹화 등 다회 호출 작업은 직렬로 실행하시는 것을 권장합니다.

## 평가 루브릭 (3계층)

각 샘플은 `--eval` 실행 시 아래 3계층 루브릭으로 채점되며, 결과 리포트는 `examples/agents/artifacts/`에 저장됩니다.

- **L1 결정론적** — trace 이벤트, 기대 서브에이전트 호출, 출력 섹션 존재 여부 확인
- **L2 LLM-as-judge** — 샘플별 기준을 0–5점으로 채점(실제 GLM 호출), 평균 4.0 이상이면 합격
- **L3 골든셋 회귀** — 고정 입력에 대한 결정론적 술어 검증

합격 조건은 **L1 전부 ∧ L2 평균 ≥ 임계 ∧ L3 전부**입니다.

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
