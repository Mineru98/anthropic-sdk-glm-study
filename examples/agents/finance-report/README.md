# finance-report — 금융 리포트 분석

| 항목 | 값 |
|------|-----|
| 산업 | 금융 |
| 패턴 | Orchestrator-Workers |
| 티어 | heavy (5단계 순차 오케스트레이션) |

기업 재무 데이터를 **data-extractor → metric-analyst → risk-assessor → number-verifier → opinion-writer** 5단계 체인으로 분석하고 투자 의견까지 도출한다.

## 런타임 서브에이전트

| 서브에이전트 | 역할 |
|---|---|
| `data-extractor` | 자연어 재무 텍스트에서 핵심 수치 추출·정규화 |
| `metric-analyst` | 성장성/수익성/안정성 지표 분석 |
| `risk-assessor` | 재무·시장 리스크 평가 |
| `number-verifier` | 계산/비율 수치의 일관성 검증 |
| `opinion-writer` | 투자 의견(매수/중립/매도/보유/주의) 작성 |

## 실행

```bash
bun run examples/agents/run.ts finance-report
bun run examples/agents/run.ts finance-report --input "기업명: 매출 ..."
bun run examples/agents/run.ts finance-report --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)

- **L1**: trace 이벤트 수신, 5개 서브에이전트 호출, `## 핵심 지표` / `## 분석` / `## 리스크` / `## 투자 의견` 섹션 존재
- **L2 (judge)**: analytical_rigor / number_consistency / actionable_opinion 0–5 채점
- **L3 (golden)**: 기업 B(역성장+영업손실+고부채) 입력 시 `## 투자 의견` 섹션 및 투자 의견 단어(매수/매도/보유/중립/주의) 포함 확인
