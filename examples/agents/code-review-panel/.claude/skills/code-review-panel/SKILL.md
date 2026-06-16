---
name: code-review-panel
description: 코드 리뷰 패널 워크플로우 — 보안·성능·스타일 검토를 병렬 수행한 뒤 통합 요약
---

# code-review-panel 스킬

코드를 보안·성능·스타일 세 관점에서 병렬 검토한 뒤, 통합 우선순위 요약을 생성하는 parallelization 워크플로우.

## 절차
1. `security-reviewer`로 인젝션·eval·시크릿 하드코딩 등 보안 취약점 목록을 만든다.
2. `performance-reviewer`로 루프·메모리·N+1 등 성능 문제 목록을 만든다.
3. `style-reviewer`로 네이밍·가독성·스타일 문제 목록을 만든다.
   (1~3은 독립적이므로 가능하면 병렬로 실행한다)
4. `aggregator`로 세 리뷰 결과를 통합하여 실행 가능한 우선순위 요약을 만든다.

## 출력 형식
`## 보안` / `## 성능` / `## 스타일` / `## 종합` 네 섹션의 마크다운.
