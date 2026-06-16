# code-review-panel — 코드 리뷰 패널

| 항목 | 값 |
|------|-----|
| 산업 | 소프트웨어 |
| 패턴 | Parallelization |
| 티어 | medium (병렬 3-리뷰어 + 통합) |

코드를 **security-reviewer / performance-reviewer / style-reviewer** 세 전문가가 병렬로 검토한 뒤, **aggregator**가 통합 우선순위 요약을 생성한다.

## 런타임 서브에이전트
- `security-reviewer` — 인젝션/eval/시크릿 등 보안 취약점 탐지
- `performance-reviewer` — 루프/메모리/N+1 등 성능 문제 탐지
- `style-reviewer` — 네이밍/가독성/스타일 문제 탐지
- `aggregator` — 세 리뷰를 통합해 우선순위 요약 생성

## 실행
```bash
bun run examples/agents/run.ts code-review-panel
bun run examples/agents/run.ts code-review-panel --input "리뷰할 코드"
bun run examples/agents/run.ts code-review-panel --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)
- **L1**: trace 이벤트 수신, 4개 서브에이전트 호출, `## 보안`/`## 성능`/`## 스타일`/`## 종합` 섹션 존재
- **L2 (judge)**: issue_coverage / accuracy / actionability 0–5 채점
- **L3 (golden)**: eval 코드 인젝션 및 SQL 인젝션 탐지 + 종합 섹션 존재 확인
