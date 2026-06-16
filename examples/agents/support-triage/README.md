# support-triage — 고객지원 티켓 트리아지

| 항목 | 값 |
|------|-----|
| 산업 | 고객지원(CS) |
| 패턴 | Routing |
| 티어 | medium (3단계 직렬 routing) |

고객 문의를 **classifier → priority-scorer → router** 3단계로 처리해 카테고리 분류, 긴급도 산정, 담당 팀 배정을 수행한다.

## 런타임 서브에이전트
- `classifier` — 문의를 결제/배송/계정/기술/환불/기타 6개 카테고리로 분류
- `priority-scorer` — P1~P4 긴급도와 산정 근거 출력
- `router` — 담당 팀(결제팀/물류팀/계정팀/기술지원팀/환불처리팀/일반상담팀)과 다음 조치 결정

## 실행
```bash
bun run examples/agents/run.ts support-triage
bun run examples/agents/run.ts support-triage --input "배송이 일주일째 안 와요."
bun run examples/agents/run.ts support-triage --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)
- **L1**: trace 이벤트 수신, 3개 서브에이전트 호출, `## 분류`/`## 우선순위`/`## 라우팅` 섹션 존재
- **L2 (judge)**: classification_accuracy / priority_justification / routing_appropriateness 0–5 채점
- **L3 (golden)**: 이중결제·환불 요청 → 결제/환불 카테고리 + P1/P2 이상 긴급도 확인
