# ko-spellcheck — 한글 맞춤법 교정기

| 항목 | 값 |
|------|-----|
| 산업 | 콘텐츠/퍼블리싱 |
| 패턴 | Prompt Chaining |
| 티어 | light (경량 단일 워크플로우) |

한국어 텍스트를 **detector → corrector → explainer** 3단계 체인으로 교정하고 교정 이유까지 설명한다.

## 런타임 서브에이전트
- `spell-detector` — 맞춤법/띄어쓰기/문법 오류 탐지
- `corrector` — 오류 반영 교정문 생성
- `explainer` — 교정 이유 설명

## 실행
```bash
bun run examples/agents/run.ts ko-spellcheck
bun run examples/agents/run.ts ko-spellcheck --input "교정할 텍스트"
bun run examples/agents/run.ts ko-spellcheck --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)
- **L1**: trace 이벤트 수신, 3개 서브에이전트 호출, `## 교정문`/`## 오류` 섹션 존재
- **L2 (judge)**: accuracy / completeness / format 0–5 채점
- **L3 (golden)**: `일것다→읽었다`, `재미있엇다→재미있었다` 교정 확인
