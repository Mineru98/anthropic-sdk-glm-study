# sql-analyst — 자연어 SQL 어시스턴트

| 항목 | 값 |
|------|-----|
| 산업 | 데이터 분석 |
| 패턴 | Prompt Chaining |
| 티어 | light (경량 단일 워크플로우) |

자연어 데이터 질문을 **nl-parser → sql-generator → query-validator** 3단계 체인으로 SQL로 변환하고 문법·안전성 검증까지 수행한다.

## 런타임 서브에이전트

- `nl-parser` — 자연어 질문에서 의도/대상 테이블/조건/집계 파싱
- `sql-generator` — 파싱 결과로 표준 SQL SELECT 문 생성
- `query-validator` — SQL 문법·안전성(DELETE/DROP 위험 등) 검증

## 실행

```bash
bun run examples/agents/run.ts sql-analyst
bun run examples/agents/run.ts sql-analyst --input "일별 매출 합계를 보여줘. 테이블: sales(id, amount, created_at)"
bun run examples/agents/run.ts sql-analyst --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)

- **L1**: trace 이벤트 수신, 3개 서브에이전트 호출, `## 해석`/`## SQL`/`## 검증` 섹션 존재
- **L2 (judge)**: sql_correctness / intent_match / safety 0–5 채점
- **L3 (golden)**: `orders` 테이블에 대한 국가별 금액 합계 쿼리(`sum-by-country`)에서 `SELECT`·`ORDERS`·`GROUP BY` 포함 확인
