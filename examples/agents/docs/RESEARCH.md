# 리서치 기록 — 멀티에이전트 샘플 컬렉션 설계 근거

> deep-research 워크플로우(106 sub-agents, 24 sources fetched, 118 claims → 25 verified → **24 confirmed / 1 killed**)로 수집·적대적 검증한 결과를 정리한 문서. 각 결론은 1차 출처(primary)를 우선 인용한다.

## 1. 오케스트레이션 설계 패턴 (검증됨, confidence: high)

Anthropic "Building Effective Agents" + Cloudflare reference repo가 동일한 **5대 정규 패턴**을 정의한다:

| 패턴 | 정의 | 본 컬렉션 매핑 |
|------|------|----------------|
| **Prompt Chaining** | 순차 처리, 각 단계가 이전 출력을 입력으로 | 경량 샘플 (맞춤법, 상품설명) |
| **Routing** | 입력을 분류해 전문 경로로 분기 | 트리아지, 이력서 스크리닝 |
| **Parallelization** | 작업을 분할(sectioning)/투표(voting) 병렬 실행 후 종합 | 코드리뷰 패널 |
| **Orchestrator-Workers** | 중앙 LLM이 동적으로 하위 작업을 분배·종합 | 리서치/법률/DevOps/금융 (헤비) |
| **Evaluator-Optimizer** | 한 LLM이 생성, 다른 LLM이 평가·피드백하는 반복 루프 | 카피 최적화, 문장 검사 |

- **워크플로 vs 에이전트 분류법**: Anthropic은 *워크플로(미리 정의된 코드 경로)* 와 *에이전트(동적으로 스스로 방향을 정함)* 를 구분 → 본 컬렉션의 **경량→헤비 그라데이션**의 근거.
- 출처: https://www.anthropic.com/research/building-effective-agents (primary), https://github.com/cloudflare/agents/blob/main/guides/anthropic-patterns/README.md (primary)

## 2. Claude Agent SDK 서브에이전트 (검증됨, high)

- `AgentDefinition`은 **`description`, `prompt` 필수**, 나머지(`tools`, `model`, `skills`, `memory`, `mcpServers`, `effort`, `permissionMode` 등)는 선택.
- 서브에이전트의 3대 이점: **컨텍스트 격리 / 병렬화 / 도구 제한**.
- Claude는 각 서브에이전트의 `description` 필드를 매칭해 **자동 라우팅**한다. 이름으로 명시 호출하면 자동 매칭을 우회.
- 출처: https://code.claude.com/docs/en/agent-sdk/subagents (primary)
- → 본 저장소 기존 패턴(`examples/lib/agents.ts`의 `subagentDefinitions`)과 정확히 일치하므로 그대로 확장한다.

## 3. 평가(eval) 루브릭 방법론 (검증됨, high)

- **MCP-Bench**(arXiv 2508.20453): 다층(multi-faceted) 평가 프레임워크.
  - tool-level **스키마 이해/사용**
  - trajectory-level **계획(planning)**
  - **task completion**
  - **결정론적 규칙 기반 체크 + LLM-as-judge** 혼합
  - 명시적 도구명 없이 *모호한 지시로부터 도구를 검색*하는 능력 평가
- rubric 기반 채점 + LLM-as-judge 실무 방법론 다수 확인.
- 출처: https://arxiv.org/pdf/2508.20453 (primary), https://www.anthropic.com/research/building-effective-agents (primary)
- → 본 컬렉션 루브릭을 **3계층(L1 결정론적 / L2 LLM-as-judge / L3 골든셋 회귀)** 으로 설계.

## 4. React 기반 TUI 런타임 (검증됨, high)

- **Ink** = production "React for CLIs" 렌더러. Yoga(Flexbox) 레이아웃, `useInput`/`useApp`/`useFocus` 훅. Claude Code·Gatsby·Prisma·Shopify 사용.
- **@inkjs/ui**: `Spinner`, `ProgressBar`(0–100), `Badge`(상태색), `StatusMessage`(success/error/warning/info), `Alert` → 멀티에이전트 진행상황 표시에 바로 사용.
- 출처: https://github.com/vadimdemedes/ink (primary), https://vadimdemedes.com/posts/ink-3 (primary), https://github.com/vadimdemedes/ink-ui (primary)

## 5. 터미널 앱 브라우저 녹화 + 자막 (검증됨, high / 자막은 부분 검증)

- **xterm.js**: 브라우저에서 bash/vim/tmux/curses/mouse 지원 풀 터미널 렌더링, 선택적 WebGL(GPU) 렌더러.
- **node-pty**: `forkpty(3)` 바인딩 → 실제 프로세스를 PTY로 띄워 xterm.js에 연결.
- **Playwright video**: `browser.newContext({ recordVideo: { dir } })` → `context.close()` 시 저장. 테스트 모드 4종(off/on/retain-on-failure/on-first-retry).
- 아키텍처: `node-pty`로 CLI/TUI 프로세스 → WebSocket → 브라우저 `xterm.js` 렌더 → Playwright가 화면 녹화(.webm).
- **자막**: WebVTT 트랙 + DOM 오버레이 동기화 방식은 부분 검증 → 구현 시 (a) 타임스탬프 기반 `.vtt` 생성 + (b) 페이지 내 자막 오버레이 div를 단계 이벤트에 동기화하는 이중 방식 채택.
- 출처: https://github.com/xtermjs/xterm.js/ (primary), https://www.npmjs.com/package/node-pty (primary), https://playwright.dev/docs/videos (primary)
- **기각된 주장(killed, 1-2 vote)**: "cli-screencast가 xterm.js+Playwright의 완전한 비브라우저 대체재"라는 framing은 과장 → 사용자 요구사항(브라우저 녹화)에 맞춰 xterm.js+Playwright 경로를 채택.

## 6. 산업별 유스케이스 (경량→헤비 후보)

리서치/CS/이커머스/데이터/소프트웨어/마케팅/HR/생산성/법률/DevOps/금융 등에서 에이전트 적용 사례 확인. 구체 선정은 PLAN.md 참조.

- 출처: https://www.zenml.io/llmops-database/building-a-multi-agent-research-system-for-complex-information-tasks, https://airbyte.com/agentic-data/legal-ai-agent, https://onereach.ai/blog/ai-agents-in-legal-services-automating-review-and-contracts/ 외
