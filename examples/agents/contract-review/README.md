# contract-review — 계약서 조항 검토

| 항목 | 값 |
|------|-----|
| 산업 | 법률 |
| 패턴 | Orchestrator-Workers |
| 티어 | heavy (4단계 멀티에이전트 워크플로우) |

계약서 조항을 **clause-extractor → risk-analyst(반복) → cross-checker → summary-writer** 4단계로 분석해 법적·상업적 리스크와 협상 포인트를 도출한다.

## 런타임 서브에이전트
- `clause-extractor` — 계약서에서 핵심 조항 식별·분해
- `risk-analyst` — 조항별 법적/상업적 리스크 분석 (조항마다 별도 호출)
- `cross-checker` — 조항 간 상충/누락을 교차검증
- `summary-writer` — 리스크 요약 및 협상 포인트 의견 작성

## 실행
```bash
bun run examples/agents/run.ts contract-review
bun run examples/agents/run.ts contract-review --input "제1조(계약금액) ... 제2조(지체상금) ..."
bun run examples/agents/run.ts contract-review --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)
- **L1**: trace 이벤트 수신, 4개 서브에이전트 호출, `## 핵심 조항`/`## 리스크 분석`/`## 교차검증`/`## 요약 의견` 섹션 존재
- **L2 (judge)**: risk_identification / legal_soundness / completeness 0–5 채점
- **L3 (golden)**: `penalty` 케이스 — "리스크" 또는 "위험" 포함 및 `## 요약 의견` 섹션 존재 확인

> 이 샘플의 출력은 법률 자문이 아닌 참고용입니다.
