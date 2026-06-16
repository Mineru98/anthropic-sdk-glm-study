---
name: incident-response
description: DevOps 인시던트 대응 워크플로우 — 로그 분석→가설 수립→완화 조치→포스트모템을 순차 수행
---

# incident-response 스킬

DevOps/SRE 인시던트를 분석하고 대응하는 4단계 orchestrator-workers 워크플로우.

## 절차
1. `log-analyzer`로 증상 설명과 로그 스니펫에서 이상 신호(anomaly signals)를 구조적으로 추출한다.
2. `hypothesis-tracer`를 최소 2회 독립 호출해 서로 다른 각도의 근본원인 가설을 수립한다.
   - 1회차: "가설 1을 제안하라"
   - 2회차: "가설 2를 제안하라 (가설 1과 다른 각도로)"
3. `mitigation-planner`로 증상 요약과 수립된 가설들을 바탕으로 즉시 완화책과 항구 대책을 수립한다.
4. `postmortem-writer`로 앞 세 단계의 결과를 모두 통합해 SRE 표준 포스트모템 문서를 작성한다.

## 출력 형식
`## 증상` / `## 가설` / `## 완화 조치` / `## 포스트모템` 네 섹션의 마크다운.

## 설계 원칙
- hypothesis-tracer는 순차 2회 호출로 가설 간 중복을 방지하며, 2회차에 "다른 각도"를 명시한다.
- 각 단계의 결과가 다음 단계의 입력으로 명시적으로 연결되는 prompt-chaining within orchestrator 패턴을 따른다.
- 포스트모템은 blameless(비난 없는) 원칙으로 작성된다.
