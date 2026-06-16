# incident-response — DevOps 인시던트 대응

| 항목 | 값 |
|------|-----|
| 산업 | DevOps/SRE |
| 패턴 | Orchestrator-Workers |
| 티어 | heavy (다단계 오케스트레이션) |

인시던트 증상과 로그를 입력받아 **log-analyzer → hypothesis-tracer(×2) → mitigation-planner → postmortem-writer** 순서로 서브에이전트를 호출해 완결적인 인시던트 대응 문서를 생성한다.

## 런타임 서브에이전트
- `log-analyzer` — 증상/로그에서 이상 신호(anomaly signals) 추출
- `hypothesis-tracer` — 근본원인 가설 수립 (2회 독립 호출로 서로 다른 각도의 가설 생성)
- `mitigation-planner` — 즉시 완화책과 항구 대책 수립
- `postmortem-writer` — SRE 표준 포스트모템 문서 작성

## 실행
```bash
bun run examples/agents/run.ts incident-response
bun run examples/agents/run.ts incident-response --input "API 5xx 비율이 급증..."
bun run examples/agents/run.ts incident-response --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)
- **L1**: trace 이벤트 수신, 4개 서브에이전트 호출, `## 증상`/`## 가설`/`## 완화 조치`/`## 포스트모템` 섹션 존재
- **L2 (judge)**: root_cause_plausibility / mitigation_actionability / completeness 0–5 채점
- **L3 (golden)**: DB 커넥션 풀 소진 관련 키워드(`connection`, `커넥션`, `pool`, `풀`) 포함 + `## 완화 조치` 섹션 존재 확인
