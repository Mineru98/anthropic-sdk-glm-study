# meeting-notes — 회의록 요약·액션아이템 추출

| 항목 | 값 |
|------|-----|
| 산업 | 생산성 |
| 패턴 | Prompt Chaining |
| 티어 | medium |

회의록을 **summarizer → decision-logger → action-extractor** 3단계 체인으로 분석해 요약·결정사항·액션 아이템을 자동 정리한다.

## 런타임 서브에이전트
- `summarizer` — 회의록 원문을 핵심 위주로 3–5문장 요약
- `decision-logger` — 확정 결정사항을 목록화 (보류 항목 포함)
- `action-extractor` — 담당자·기한이 포함된 액션 아이템 추출

## 실행
```bash
bun run examples/agents/run.ts meeting-notes
bun run examples/agents/run.ts meeting-notes --input "회의록 텍스트"
bun run examples/agents/run.ts meeting-notes --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)
- **L1**: trace 이벤트 수신, 3개 서브에이전트 호출, `## 요약`/`## 결정사항`/`## 액션 아이템` 섹션 존재
- **L2 (judge)**: summary_fidelity / action_completeness / structure 0–5 채점
- **L3 (golden)**: `## 액션 아이템` 섹션 존재 + `지영` 또는 `QA` 언급 확인
