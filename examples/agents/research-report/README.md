# research-report — 리서치 리포트 멀티에이전트

| 항목 | 값 |
|------|-----|
| 산업 | 리서치/지식노동 |
| 패턴 | Orchestrator-Workers |
| 티어 | heavy (헤비 멀티에이전트 파이프라인) |

주어진 주제를 2~3개 하위 주제로 분해한 뒤, **researcher(복수 호출) → fact-verifier → report-writer → sentence-checker → ko-spellchecker** 5단계 파이프라인으로 검증된 한국어 리서치 보고서를 생성한다.

웹 접근이 없으므로 모델 지식 기반 종합 보고서임을 개요에 명시한다.

## 런타임 서브에이전트

| 서브에이전트 | 역할 | maxTurns |
|---|---|---|
| `researcher` | 하위 주제를 모델 지식으로 조사·정리 (하위 주제 수만큼 복수 호출) | 3 |
| `fact-verifier` | 조사 내용의 사실성/일관성 검증 및 의심 항목 표시 | 2 |
| `report-writer` | 검증된 자료를 종합해 4섹션 보고서 작성 | 3 |
| `sentence-checker` | 보고서 문장의 명료성·논리 흐름 검사 | 2 |
| `ko-spellchecker` | 최종 보고서 맞춤법·띄어쓰기 교정 | 3 |

## 실행

```bash
bun run examples/agents/run.ts research-report
bun run examples/agents/run.ts research-report --input "그린수소 기술의 현황과 전망"
bun run examples/agents/run.ts research-report --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 출력 형식

최종 출력은 ko-spellchecker가 교정한 보고서이며 반드시 아래 4개 섹션을 포함한다:

- `## 개요` — 주제 소개 및 모델 지식 기반 보고서임 명시
- `## 본문` — 하위 주제별 상세 내용 (소제목 활용)
- `## 검증 노트` — fact-verifier 의심 항목 또는 '특이 사항 없음'
- `## 출처` — 추정 출처 기관명·문헌명·연도 목록

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)

- **L1**: trace 이벤트 수신, 5개 서브에이전트 호출, `## 개요`/`## 본문`/`## 검증 노트`/`## 출처` 섹션 존재
- **L2 (judge)**: depth / accuracy / coherence / korean_quality 0–5 채점
- **L3 (golden)**: `재생에너지 저장을 위한 그린수소 기술 개요` 입력 시 `## 본문`·`## 출처` 섹션 존재 및 전체 길이 500자 이상 확인
