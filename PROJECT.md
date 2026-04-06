# 부동산 매물 관리 CRM — 프로젝트 문서

이모(비개발자)가 사용할 개인용 부동산 매물 관리 CRM.

## 1. 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | realestate-crm |
| 사용자 | 비개발자 1명 (개인용) |
| 지역 범위 | 서울시 마포구 |
| 매물 범위 | 상가 / 사무실 / 건물 (상업용) |
| 거래 유형 | 매매 / 전세 / 월세 / 단기임대 |
| 데이터 출처 | 네이버 부동산 (fin.land.naver.com) |
| GitHub | https://github.com/junbbbb/realestate-crm |

## 2. 기술 스택

### Frontend
- **Next.js 16** (App Router, TypeScript)
- **shadcn/ui** + **Tailwind CSS v4**
- **Lucide** 아이콘
- **Pretendard Variable** 폰트
- **Zustand** 클라이언트 상태 관리

### Backend / 인프라
- **Supabase** (PostgreSQL, anon key 기반)
- **Supabase CLI** (마이그레이션 관리)
- **Vercel** (배포 예정)

### 크롤링
- **Python 3** + **Scrapling** + **curl_cffi**
- `fin.land.naver.com/front-api/v1/article/*` API 역공학

## 3. 디자인 규칙 (DESIGN.md 참고)

**5색 팔레트만 사용** (Tailwind Stone scale):
- `#1c1917` — 텍스트, primary
- `#78716c` — 보조 텍스트
- `#a8a29e` — 아이콘, focus ring
- `#e0ddd8` — 테두리
- `#dc2626` — destructive

**Surface 5단계**: `#ffffff` → `#f8f7f5` → `#f3f1ee` → `#f0eeeb` → `#e7e5e0`

**원칙**:
- 그라디언트, 네온, glow 금지
- 색상 추가 금지
- 깊이감은 배경색 차이로 표현
- 그림자 최소화

## 4. 디렉터리 구조

```
realestate-crm/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # 사이드바 + 메인 레이아웃
│   │   │   ├── page.tsx           # 대시보드
│   │   │   ├── properties/        # 매물 목록 (핵심)
│   │   │   ├── collections/       # 컬렉션 (저장한 매물)
│   │   │   ├── favorites/         # 즐겨찾기 (레거시)
│   │   │   ├── my-listings/       # 내 매물
│   │   │   └── customers/         # 고객 관리
│   │   ├── layout.tsx
│   │   └── globals.css            # Tailwind + Stone palette
│   ├── components/ui/             # shadcn/ui 컴포넌트
│   ├── hooks/
│   │   └── use-scroll-reveal.ts
│   ├── lib/
│   │   ├── supabase.ts            # Supabase 클라이언트 + 타입
│   │   ├── store.ts               # Zustand (서버사이드 쿼리)
│   │   ├── format.ts              # 가격 포맷
│   │   └── mock-data.ts           # 고객 목데이터
│   └── types/index.ts
├── scripts/                       # 크롤링
├── supabase/
│   └── migrations/                # SQL 마이그레이션 3개
├── data/                          # 크롤링 결과 JSON (gitignored)
├── .env.local                     # Supabase URL/KEY, NAVER_COOKIE (gitignored)
├── .env.example
├── DESIGN.md
├── README.md
└── PROJECT.md                     # 이 파일
```

## 5. DB 스키마 (Supabase)

### `properties` 테이블
Primary key: `id` (네이버 articleNumber)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | text | 네이버 articleNumber (PK) |
| article_no | text | 동일 (중복) |
| article_name | text | 매물 이름 |
| real_estate_type | text | 네이버 코드 (D02, D03 등) |
| real_estate_type_name | text | 상가/사무실/건물 |
| trade_type | text | A1/B1/B2/B3 |
| trade_type_name | text | 매매/전세/월세/단기임대 |
| dong | text | 동 이름 |
| address | text |  |
| price | bigint | 가격 (원 단위) |
| deal_or_warrant_price | text | 표시용 가격 |
| warrant_price | bigint | 보증금 |
| monthly_rent | bigint | 월세 |
| area1, area2 | numeric | 공급/전용 면적 |
| floor_info | text | "1/5" 형태 |
| direction | text | 방향 |
| description | text | 상세 설명 |
| tag_list | text[] | 태그 배열 |
| latitude, longitude | numeric | 좌표 |
| realtor_name | text | 중개사 |
| confirm_date | text | 확인일 |
| source_url | text | 네이버 링크 |
| is_favorite | boolean | 즐겨찾기 |
| is_my_listing | boolean | 내 매물 |
| is_active | boolean | 활성 여부 (7일 미확인 시 false) |
| first_seen_at | timestamptz | 최초 수집 |
| last_seen_at | timestamptz | 마지막 확인 |
| raw_data | jsonb | 네이버 원본 |

인덱스: dong, trade_type_name, real_estate_type_name, is_favorite, is_active, last_seen_at

### `price_history` 테이블
가격 변동 이력

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigserial | PK |
| article_no | text | → properties.id (FK) |
| deal_or_warrant_price | text | 표시용 |
| warrant_price | bigint | 보증금 |
| monthly_rent | bigint | 월세 |
| price | bigint | |
| change_type | text | 'initial' / 'increase' / 'decrease' |
| recorded_at | timestamptz | |

### `customers` 테이블
| 컬럼 | 타입 |
|---|---|
| id | uuid PK |
| name, phone, email | text |
| memo | text |
| interested_in | text[] |
| budget_min, budget_max | integer |
| preferred_area, preferred_floor, business_type | text |
| premium_budget | integer |
| history | jsonb |

**RLS**: 모든 테이블에 `using (true) with check (true)` (혼자 쓰는 서비스라 오픈)

## 6. 크롤링 파이프라인

### 발견한 API 엔드포인트
네이버 부동산은 **fin.land.naver.com**으로 이관됐음. 구버전 new.land.naver.com API는 거래유형 필터가 제대로 작동하지 않음.

- `POST /front-api/v1/article/map/articleClusters` — 지도 클러스터 목록 (boundingBox 기반)
- `POST /front-api/v1/article/clusteredArticles` — 클러스터 내 매물 리스트 (페이지네이션)

### 인증
`NAVER_COOKIE` 환경변수 (브라우저에서 로그인 후 쿠키 복사). 쿠키 필요한 이유는 직접 요청 시 429/401 방어 때문.

### 주요 파라미터
- `realEstateTypes`: `["D02","D03","D04","E01","Z00"]` — 상가+사무실+건물 카테고리
- `tradeTypes`: `["A1","B1","B2","B3"]` — 매매/전세/월세/단기임대
- `legalDivisionNumbers`: 동 코드 (예: `1144012300` = 망원동)
- `legalDivisionType`: `"EUP"`
- 페이지네이션: `lastInfo` + `seed` 커서 방식 (hasNextPage 플래그)

### 스크립트
| 파일 | 역할 |
|---|---|
| `scripts/crawl-fin-api.py` | 특정 동 1개 크롤링 (기본 망원동) |
| `scripts/crawl-mapo-fin.py` | 마포구 26개 동 전체 순회 |
| `scripts/sync-to-supabase.py` | JSON → Supabase upsert + 가격 히스토리 |
| `data/regions.json` | 마포구 26개 동 코드 (cortarNo + 좌표) |

### 업데이트 전략
1. **Upsert**: `articleNumber` 기준으로 update-or-insert
2. **가격 변경 감지**: 기존 DB의 price vs 새 데이터 비교 → `price_history`에 기록
3. **last_seen_at 갱신**: 크롤링마다 최신 시각
4. **소프트 삭제**: `last_seen_at`이 7일 이상 오래된 매물은 `is_active=false`

### 수집 결과 (2026-04-05 기준)
- **망원동 단독 크롤링**: 1,664건 (상가 + 건물)
- **마포구 전체 크롤링**: 20,725건 (상가 + 사무실 + 건물, 26개 동)
- **동별 TOP**: 서교동 6,514 / 연남동 3,149 / 동교동 1,688 / 망원동 1,664 / 합정동 1,584

## 7. 페이지별 기능

### `/` 대시보드 (`src/app/(dashboard)/page.tsx`)
- 전체 매물 / 즐겨찾기 / 내 매물 / 고객 수 통계
- 매매 총액 합계
- 최근 매물 5건
- ⚠️ **주의**: 현재 store의 `properties`에 의존 (매물 목록 페이지 방문 후에만 데이터 있음). 독립 쿼리 미구현.

### `/properties` 매물 목록 (핵심)
- **서버사이드 페이지네이션**: 건당 50건, 처음/이전/다음/끝 버튼
- **필터**:
  - 검색 (매물명/주소/설명 ilike)
  - 동 필터 (마포구 26개 동)
  - 유형 필터 (상가/사무실/건물)
  - 거래 필터 (매매/전세/월세/단기임대)
  - 층 필터 (전체/1층/지하/2층 이상)
  - 정렬 (최신순/가격 낮은순/높은순)
  - 초기화 버튼
- **테이블**: 체크박스 / 북마크(컬렉션 저장) / 매물명 / 동 / 거래 / 가격 / 면적 / 층
- **컬렉션 저장**: 하트(즐겨찾기) 대신 북마크 아이콘 → 컬렉션 팝업으로 매물 저장/관리
- **하단 플로팅 액션바**: 다중 선택 시 하단에 표시 — "컬렉션에 저장" + "비교하기" 버튼
- **매물 비교**: 최대 5개 체크 → "비교하기" 버튼 → 비교 테이블 표시 (X 버튼으로 개별 해제)
- **상세 패널** (우측, 고정 너비 380px):
  - 기본 탭: 가격/수익률, 면적/방/층/등록일, 주소, 지도 placeholder, 설명, 특징, 연락처
  - 상권 탭: 유동인구/상권/공실률 placeholder, 개발 호재 메모
  - 권리 탭: 등기부등본, 층별 임차인, 건물 메모
  - 비용 탭: 권리금+보증금+인테리어 시뮬레이션, 실거래가 비교 placeholder
  - 수익률 자동 계산 (월세 매물만): `(monthlyRent * 12) / deposit * 100`

### `/collections` 저장한 매물 (컬렉션)
- 사이드바 "저장한 매물" (기존 "즐겨찾기"에서 이름 변경)
- 컬렉션별 매물 그룹 관리 (북마크/저장 기능)
- 매물 목록에서 개별 또는 다중 선택으로 컬렉션에 저장

### `/favorites` 즐겨찾기 (레거시)
- 즐겨찾기 표시된 매물 목록
- ⚠️ 현재 `useMemo`로 `properties` 필터링 (매물 목록 방문 후에만 동작)

### `/my-listings` 내 매물
- `is_my_listing = true` 매물 목록
- ⚠️ 즐겨찾기와 동일한 문제 (독립 쿼리 미구현)

### `/customers` 고객 관리
- 고객 카드 목록
- 고객 클릭 → 우측에 조건 매칭 매물 추천 패널
  - 매칭 조건: 거래유형, 예산, 선호지역, 희망층수, 권리금 예산
- 추천 히스토리
- ⚠️ 현재 고객은 mockCustomers에서 로드 (DB 연동 미구현)

## 8. 작동하는 기능 (완료)

- [x] Supabase 테이블 스키마 + 마이그레이션 3개
- [x] 20,725건 마포구 매물 데이터 적재
- [x] 매물 목록 서버사이드 페이지네이션
- [x] 매물 목록 필터 (동/유형/거래/정렬/검색)
- [x] 매물 상세 패널 (4탭)
- [x] 매물 비교 기능
- [x] 즐겨찾기 토글 (Supabase sync)
- [x] 크롤링 → Supabase 동기화 파이프라인
- [x] 가격 변동 히스토리 기록
- [x] 7일 소프트 삭제 로직
- [x] 사이드바 반응형 (xl 이상 풀, 이하 아이콘만)
- [x] 다크 모드 토큰 (CSS 변수)
- [x] 컬렉션 기능 (북마크/저장 → 즐겨찾기 하트 대체)
- [x] 사이드바 "즐겨찾기" → "저장한 매물" 이름 변경
- [x] 상세 패널 너비 380px 고정
- [x] 하단 플로팅 액션바 (다중 선택 시 컬렉션 저장 + 비교)
- [x] 층 필터 (전체/1층/지하/2층 이상) — floor_info 컬럼 기반 서버사이드 필터
- [x] 크롤링 자동화 (GitHub Actions workflow, 스크립트, 문서)

## 9. 미완료 (TODO)

### 데이터 연동
- [ ] 대시보드 페이지 — 현재 매물 목록 방문 후에만 데이터 보임. 별도 Supabase count 쿼리로 전환 필요
- [ ] 즐겨찾기 페이지 — 독립 Supabase 쿼리 (is_favorite=true)
- [ ] 내 매물 페이지 — 독립 Supabase 쿼리 (is_my_listing=true)
- [ ] 고객 페이지 — mockCustomers → Supabase customers 테이블
- [ ] 고객 추가/편집 UI

### 크롤링 자동화
- [x] GitHub Actions workflow — 매일 새벽 자동 크롤링
- [ ] 크롤링 쿠키 만료 감지 + 알림
- [ ] 크롤링 실패 시 재시도 / 알림

### 기능 확장
- [ ] 지도 연동 (상세 패널) — 현재 placeholder. 카카오/네이버 지도 API
- [ ] 유동인구 데이터 — 서울 열린데이터 API
- [ ] 상권 정보 — 소상공인시장진흥공단 API
- [ ] 공실률 데이터 — 한국부동산원 API
- [ ] 실거래가 비교 — 국토부 API
- [ ] 등기부등본 메모 저장 (UI만 있고 저장 미구현)
- [ ] 층별 임차인 데이터 저장 (UI만 있고 저장 미구현)
- [ ] 비용 시뮬레이션 결과 저장

### 배포
- [ ] Vercel 배포
- [ ] Supabase 환경변수 Vercel에 등록
- [ ] 크롤링 쿠키를 GitHub Secrets에 등록

### 디자인/UX
- [ ] 페이지 로딩 스켈레톤
- [ ] 에러 상태 UI (Supabase 연결 실패 시)
- [ ] 무한 스크롤 (현재 숫자 페이지네이션)
- [ ] 모바일 최적화

## 10. 디자인 체크리스트 (DESIGN.md 참고)

매 작업 후 확인:
- [ ] 텍스트/배경 대비 WCAG AA (4.5:1)
- [ ] 색상 5개 팔레트 외 사용 금지
- [ ] 그라디언트, 보라색, 네온, glow 없음
- [ ] border-radius 8px (rounded-lg)
- [ ] 베이지 톤 과다 사용 금지 (zinc/stone 중립)
- [ ] 여백: 카드 p-5~6, 섹션 space-y-6~8
- [ ] 페이지 패딩: py-8 px-10
- [ ] 아이콘 Lucide만, h-4 w-4 기본

## 11. 작업 히스토리 핵심

1. **디자인 탐색** → shadcn/ui + Tailwind Stone 팔레트로 최종 확정
2. **크롤링 1차** (new.land.naver.com) — 일부 거래유형 필터 실패, ~1,300건만 수집
3. **크롤링 2차** (fin.land.naver.com 발견) — 브라우저 네트워크 분석으로 POST API 역공학, 쿠키 기반 인증
4. **클러스터 + 페이지네이션** 구조 파악 → `articleClusters` + `clusteredArticles` 조합
5. **1,664건 망원동 전체** 수집 성공 (totalCount 100% 일치)
6. **20,725건 마포구 전체** 수집 + Supabase 적재
7. **Supabase 서버사이드 페이지네이션** 연동
8. **GitHub 업로드** (쿠키/키 환경변수 분리)

## 12. 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NAVER_COOKIE="NNB=...; NID_SES=...; BUC=..."
```

`NAVER_COOKIE`: fin.land.naver.com 로그인 후 브라우저 DevTools → Network → 아무 요청이나 → cookie 헤더 전체 복사

## 13. 관련 문서

- `README.md` — 설치/실행 가이드
- `DESIGN.md` — 색상/여백/타이포 체크리스트
- `AGENTS.md` — Next.js 버전 주의사항
