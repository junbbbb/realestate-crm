# Documentation Guide

각 문서의 역할과 갱신 시점.

## 문서 목록

| 문서 | 역할 | 대상 | 갱신 시점 |
|---|---|---|---|
| `README.md` | 첫인상. 제품 소개, 설치, 빠른 시작 | 신규 사용자/개발자 | 주요 기능 추가, 스택 변경, 설치 방법 변경 시 |
| `AGENTS.md` | AI 에이전트 지시사항. 아키텍처, DB, 규칙 | AI 에이전트 (매 대화 시 읽힘) | 아키텍처 변경, DB 테이블 추가, 규칙 변경 시 |
| `PROJECT.md` | 전체 프로젝트 스펙. 기능 목록, TODO | 개발자 | 기능 완료/추가, TODO 변경 시 |
| `DESIGN.md` | 디자인 시스템. 브랜드, 색상, 여백 | 개발자/디자이너 | 브랜드/색상/레이아웃 변경 시 |
| `CLAUDE.md` | Claude Code 전용 설정 | Claude Code | AGENTS.md 대리 참조 (내용: `@AGENTS.md`) |

## docs/ 하위 문서

| 문서 | 역할 | 갱신 시점 |
|---|---|---|
| `docs/PROJECT_STATUS.md` | 현재 프로젝트 상태 스냅샷 | DB 변경, 배포, 주요 기능 완료 시 |
| `docs/CRAWLING.md` | 크롤링 운영 가이드 | 크롤링 스크립트/자동화 변경 시 |
| `docs/CRAWL_FILTERS.md` | 크롤링 필터 레퍼런스 | 크롤링 필터 조건 변경 시 |
| `docs/NAVER_FIN_API.md` | 네이버 fin.land API 명세 | API 스키마 변경 발견 시 |
| `docs/WEB_SECURITY.md` | 웹 보안 배경지식 | 보안 관련 시행착오 추가 시 |
| `docs/decisions/design-decisions.md` | 설계 결정 기록 (ADR) | 주요 기술 결정 시 |
| `docs/decisions/naver-detail-api.md` | 네이버 API 선택 과정 | 네이버 API 관련 변경 시 |
| `docs/DOCUMENTATION.md` | 이 문서. 문서 메타 가이드 | 문서 추가/삭제 시 |

## 작성 원칙

1. **한 문서 = 한 역할**. 중복 작성하지 않고 다른 문서를 링크한다.
2. **AGENTS.md가 최우선**. AI 에이전트가 매번 읽으므로 항상 최신 상태 유지.
3. **PROJECT_STATUS.md는 스냅샷**. 현재 상태만 반영, 히스토리는 decisions/에.
4. **기술 문서는 영어 OK**. 사용자 대면 문서(README)는 한국어.
5. **TODO는 PROJECT.md에 집중**. 여기저기 흩어뜨리지 않는다.

## 갱신 체크리스트

기능을 추가했을 때:
- [ ] AGENTS.md -- DB 테이블/디렉터리 변경 반영
- [ ] PROJECT.md -- 완료 항목 체크, TODO 갱신
- [ ] PROJECT_STATUS.md -- 현재 상태 반영

아키텍처를 변경했을 때:
- [ ] AGENTS.md -- 아키텍처 섹션
- [ ] PROJECT_STATUS.md -- 아키텍처 섹션
- [ ] docs/decisions/ -- 결정 기록 추가

브랜드/디자인을 변경했을 때:
- [ ] DESIGN.md
- [ ] README.md -- 스크린샷/설명 (해당 시)

크롤링을 변경했을 때:
- [ ] docs/CRAWLING.md
- [ ] docs/CRAWL_FILTERS.md (필터 변경 시)
- [ ] docs/NAVER_FIN_API.md (API 변경 시)
