---
name: nl-to-sql
description: 자연어 질문을 SQL로 변환하는 워크플로우 — 의도 파싱→SQL 생성→문법·안전성 검증을 순차 수행
---

# nl-to-sql 스킬

자연어 데이터 질문을 검증된 SQL SELECT 문으로 변환하는 3단계 prompt-chaining 워크플로우.

## 절차

1. `nl-parser`로 자연어 질문에서 의도·테이블·조건·집계 정보를 구조화된 명세로 파싱한다.
2. `sql-generator`로 파싱 명세를 받아 ANSI SQL 표준에 맞는 SELECT 문을 생성한다.
3. `query-validator`로 생성된 SQL의 문법 정확성과 안전성(DELETE·DROP 등 위험 구문 여부)을 검증한다.

## 단계 간 데이터 전달

- 1→2단계: nl-parser의 네 항목(의도/테이블·컬럼/조건/집계)을 sql-generator에 그대로 전달
- 2→3단계: sql-generator가 생성한 SQL 코드 블록을 query-validator에 전달

## 출력 형식

`## 해석` / `## SQL` / `## 검증` 세 섹션의 마크다운.

- `## 해석`: nl-parser가 분석한 의도·테이블·조건·집계 항목별 정리
- `## SQL`: sql-generator가 생성한 SQL 코드 블록
- `## 검증`: query-validator의 문법·안전성 검증 결과

## 적용 범위

- SELECT 조회 쿼리 생성에만 적합
- DML(INSERT·UPDATE·DELETE) 또는 DDL(CREATE·DROP) 생성은 이 워크플로우의 대상이 아님
