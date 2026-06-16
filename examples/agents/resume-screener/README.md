# resume-screener — 이력서 스크리닝

| 항목 | 값 |
|------|-----|
| 산업 | HR/채용 |
| 패턴 | Routing |
| 티어 | medium (3단계 라우팅 워크플로우) |

채용공고(JD)와 이력서를 **jd-parser → matcher → rubric-scorer** 3단계 라우팅으로 분석해
공정한 합격/보류/불합격 판정을 내린다. 성별·나이·출신 등 직무 무관 편향 요소를 배제한다.

## 런타임 서브에이전트

- `jd-parser` — 채용공고에서 필수/우대 요건 추출
- `matcher` — 이력서를 요건별로 충족/부분 충족/미충족 매칭
- `rubric-scorer` — 가중 점수 산정 및 합격/보류/불합격 판정

## 실행

```bash
bun run examples/agents/run.ts resume-screener
bun run examples/agents/run.ts resume-screener --input "[JD] ... [이력서] ..."
bun run examples/agents/run.ts resume-screener --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)

- **L1**: trace 이벤트 수신, 3개 서브에이전트 호출, `## 요건`/`## 매칭`/`## 점수 및 판정` 섹션 존재
- **L2 (judge)**: matching_accuracy / scoring_justification / fairness 0–5 채점
- **L3 (golden)**: React/TypeScript 완전 충족 케이스에서 숫자 점수 및 합격/보류/불합격 판정 포함 확인
