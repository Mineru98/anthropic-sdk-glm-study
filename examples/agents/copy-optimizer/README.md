# copy-optimizer — 카피라이팅 최적화기

| 항목 | 값 |
|------|-----|
| 산업 | 마케팅 |
| 패턴 | Evaluator-Optimizer |
| 티어 | medium (평가-최적화 루프) |

광고 카피를 **writer → critic → finalizer** 3단계 평가-최적화 루프로 다듬어 설득력과 브랜드 적합성을 높인다.

## 런타임 서브에이전트
- `writer` — 제품/타깃/채널 정보를 바탕으로 카피 초안 작성
- `critic` — 초안을 설득력·브랜드적합성 기준으로 평가하고 개선점 제시
- `finalizer` — 피드백을 반영한 최종 카피 확정 (개선 근거 병기)

## 실행
```bash
bun run examples/agents/run.ts copy-optimizer
bun run examples/agents/run.ts copy-optimizer --input "신제품: 제로웨이스트 고체 샴푸바. 타깃: 30대 직장인. 채널: 네이버 검색광고 카피"
bun run examples/agents/run.ts copy-optimizer --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)
- **L1**: trace 이벤트 수신, 3개 서브에이전트(writer/critic/finalizer) 호출, `## 초안`/`## 피드백`/`## 최종 카피` 섹션 존재
- **L2 (judge)**: persuasiveness / brand_fit / improvement_evidence 0–5 채점
- **L3 (golden)**: `## 피드백`과 `## 최종 카피` 섹션 동시 존재로 루프 전체 실행 확인
