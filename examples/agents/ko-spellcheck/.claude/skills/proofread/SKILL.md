---
name: proofread
description: 한국어 텍스트 교정 워크플로우 — 오류 탐지→교정→이유 설명을 순차 수행
---

# proofread 스킬

한국어 텍스트를 교정하는 3단계 prompt-chaining 워크플로우.

## 절차
1. `spell-detector`로 맞춤법·띄어쓰기·문법 오류 목록을 만든다.
2. `corrector`로 오류를 반영한 교정문 전체를 만든다.
3. `explainer`로 각 교정의 이유를 어문 규범 근거와 함께 설명한다.

## 출력 형식
`## 원문` / `## 교정문` / `## 오류 및 설명` 세 섹션의 마크다운.
