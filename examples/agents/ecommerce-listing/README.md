# ecommerce-listing — 상품 등록 카피 생성기

| 항목 | 값 |
|------|-----|
| 산업 | 이커머스 |
| 패턴 | Prompt Chaining |
| 티어 | light (경량 단일 워크플로우) |

원시 상품 정보를 **attribute-extractor → copywriter → seo-tagger** 3단계 체인으로 처리해 판매 제목·상품 설명·SEO 해시태그를 한 번에 생성한다.

## 런타임 서브에이전트
- `attribute-extractor` — 원시 상품정보에서 핵심 속성/스펙 추출
- `copywriter` — 매력적인 제목(30자 이내)과 상품 설명(3~5줄) 작성
- `seo-tagger` — 검색 최적화용 해시태그 5개 이상 생성

## 실행
```bash
bun run examples/agents/run.ts ecommerce-listing
bun run examples/agents/run.ts ecommerce-listing --input "상품 정보 텍스트"
bun run examples/agents/run.ts ecommerce-listing --eval   # 루브릭 평가 (실제 GLM 호출)
```

## 루브릭 (합격 = L1 전부 ∧ L2 평균≥4.0 ∧ L3 전부)
- **L1**: trace 이벤트 수신, 3개 서브에이전트 호출, `## 제목`/`## 상품 설명`/`## SEO 태그` 섹션 존재
- **L2 (judge)**: attractiveness / completeness / seo_quality 0–5 채점
- **L3 (golden)**: 텀블러 입력에 대해 `## SEO 태그` 섹션과 `#` 해시태그 형식 존재 확인
