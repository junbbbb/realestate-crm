# BEST MOUNTAIN 프로젝트 현황 (2026-04-13)

## 개요
부동산 중개인을 위한 서울시 마포구 상업용 부동산 매물 관리 CRM.
네이버 부동산 크롤링 -> Supabase 저장 -> Next.js 프론트엔드.

**배포**: https://realestate-crm-eosin.vercel.app
**인증**: Google OAuth (Supabase Auth) + PIN fallback

## Tech Stack
- Next.js 16.2.2 (App Router) + React 19.2.4 + TypeScript
- Zustand 5.0.12 (상태관리)
- Supabase (PostgreSQL + RLS, Seoul 리전)
- Supabase Auth (Google OAuth)
- shadcn/ui + Tailwind CSS v4
- Python (curl_cffi) -- 크롤링
- Decodo 프록시 -- 한국 주거 IP (Vercel 해외 서버용)
- Vercel (배포)
- GitHub Actions (self-hosted macOS runner, 크롤링 자동화)

---

## 아키텍처

### Layered Architecture (완료)
```
Types -> Config -> Repo -> Service -> Runtime -> UI
```
- `src/types/` -- 순수 타입
- `src/config/` -- 상수, 클라이언트
- `src/repos/` -- Supabase 쿼리 (property, collection, customer, deal, user)
- `src/services/` -- 비즈니스 로직 (확장 예정)
- `src/runtime/` -- Zustand store + Auth provider
- `src/lib/` -- Store 래퍼 + 유틸
- `src/components/` + `src/app/` -- UI

### 인증 구조
1. Google OAuth (Supabase Auth) -- 메인
2. PIN fallback -- 단일 사용자 호환 (PIN_USER_ID 고정 UUID)
3. AuthProvider가 mount 시 세션 확인 -> userId 세팅
4. RLS로 유저별 데이터 격리

---

## DB 테이블 구조

### properties (매물) -- 공유
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text PK | 네이버 articleNumber |
| article_no, article_name | text | 문서번호, 제목 |
| real_estate_type | text | D01~D05, E01, Z00 |
| real_estate_type_name | text | 한글 유형명 |
| trade_type | text | A1/B1/B2/B3 |
| trade_type_name | text | 한글 거래유형 |
| dong, address | text | 동, 주소 |
| price | bigint | 매매가/보증금 (원 단위) |
| warrant_price | bigint | 보증금 (원 단위) |
| monthly_rent | bigint | 월세 (원 단위) |
| area1, area2 | numeric | 계약면적, 전용면적 |
| floor_info | text | "1/5" 형식 |
| is_active | boolean | 소프트 삭제 (7일 미확인 시 false) |
| is_my_listing | boolean | 개인 등록 매물 |
| trade_status | text | active/sold |
| price_change | text | none/increase/decrease/new |
| prev_price | bigint | 이전 가격 |
| memo | text | 사용자 메모 (레거시, user_memos로 이관) |
| raw_data | jsonb | 네이버 API 원본 |
| last_seen_at, first_seen_at | timestamptz | 크롤링 타임스탬프 |

### deals (거래) -- 유저별
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK->auth.users | 소유자 |
| property_id | text FK->properties | 매물 |
| seller_id | uuid FK->customers | 임대인/매도인 |
| buyer_id | uuid FK->customers | 임차인/매수인 |
| deal_type | text | 매매/전세/월세/단기임대 |
| status | text | 거래전/거래중/거래완료 |
| position | float | 칸반 정렬 순서 |
| memo | text | |

### customers (고객) -- 유저별
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK->auth.users | 소유자 |
| name, phone, email | text | 연락처 |
| role | text | buyer/seller/both |
| interested_in | text[] | 관심 거래유형 |
| budget_min, budget_max | bigint | 예산 (원 단위) |
| preferred_area, preferred_floor | text | 선호 |
| business_type | text | 업종 |
| premium_budget | bigint | 권리금 예산 |

### collections (컬렉션) -- 유저별
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text PK | |
| user_id | uuid FK->auth.users | 소유자 |
| name | text | 폴더명 |
| property_ids | text[] | 매물 ID 배열 |
| entries | jsonb | [{propertyId, addedAt}] |
| is_deleted | boolean | 소프트 삭제 |

### user_memos (유저별 매물 메모)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK | |
| property_id | text FK | |
| memo | text | |
| UNIQUE | (user_id, property_id) | |

### user_favorites (유저별 즐겨찾기)
PK: (user_id, property_id)

### user_listings (유저별 내 매물)
PK: (user_id, property_id)

### user_settings (유저별 설정)
PK: user_id -- page_size, yield_calc_method, default_dong/property_type/deal_type

### price_history (가격 변동) -- 공유
article_no FK, price, warrant_price, monthly_rent, trade_type, change_type (initial/increase/decrease/type_change)
- 가격 변동이 있을 때만 기록 (변동 없으면 기록 안 함)
- 환산보증금 기준 비교: 보증금 + (월세 × 12 ÷ 0.06) — 전환율 6%
- 거래유형 변경(전세→매매 등)은 type_change로 별도 분류

### price_change_rankings (가격 변동 랭킹) -- 공유
article_no, change_type (increase/decrease), prev_price, current_price, rate, dong
trade_type_code, warrant_price, monthly_rent, prev_warrant_price, prev_monthly_rent
- 환산보증금 기준 상승/하락률 정렬, 거래유형 변경은 제외

### naver_detail_cache (상세 캐시) -- 공유
article_number PK, data (jsonb), fetched_at -- 24h TTL

### crawl_logs (크롤링 로그) -- 공유
status, total_count, new_count, updated_count, duration, message

---

## 페이지 구조

```
/login               로그인 (Google OAuth / PIN)
/                    대시보드 (통계, 가격변동 TOP(환산보증금+툴팁), 최근매물/저장)
/properties          매물 목록 (탭: 전체/네이버/개인매물, 상세: 기본/상권/비용/변동)
/favorites           저장한 매물 (컬렉션 카드, 삭제됨 탭)
/my-listings         거래 관리 (칸반 드래그앤드롭)
/customers           고객 관리 (역할: buyer/seller/both)
/settings            설정 (표시설정, 크롤링 로그, 로그아웃)
```

## 매물 목록 탭 동작
- 전체: 네이버 + 개인매물 통합, 필터 적용
- 네이버: 크롤링 매물만, 필터 적용
- 개인매물: 직접 등록 매물만, 필터 숨김 (전체 표시)
- 탭별 필터 상태 독립 저장/복원
- 크로스탭 비교 가능 (compareCache)

## Store 구조

| Store | 파일 | 역할 | 저장소 |
|-------|------|------|--------|
| useAuthStore | runtime/stores/auth-store.ts | 인증 상태 | 메모리 |
| useStore | lib/store.ts | 매물 목록/필터/페이지네이션 | Supabase |
| useCollectionStore | lib/collection-store.ts | 컬렉션 CRUD + 소프트삭제 | Supabase |
| useCustomerStore | lib/customer-store.ts | 고객 CRUD | Supabase |
| useDealStore | lib/deal-store.ts | 거래 칸반 + 드래그정렬 | Supabase |
| useSettingsStore | lib/settings-store.ts | 표시설정 + 크롤링로그 | LocalStorage |
| useToastStore | lib/toast-store.ts | 토스트 알림 | 메모리 |

---

## 크롤링 흐름

```
1. crawl-mapo-fin.py -- 마포구 26개 동 순회, fin.land API 호출
   -> data/crawled-mapo-fin-YYYY-MM-DD.json (~20,000건)

2. sync-to-supabase.py -- JSON -> Supabase upsert
   -> 환산보증금 기준 가격 변동 감지 -> price_history 기록
   -> 거래유형 변경 감지 -> type_change 기록 (랭킹 제외)
   -> 7일 미확인 -> is_active=false (1000건씩 배치)
   -> 가격 변동 랭킹 계산 -> price_change_rankings 갱신 (보증금/월세 상세 포함)
```

### 매물 유형 7종 (realEstateTypes)

| 코드 | 한글명 | CRM 분류 |
|------|--------|----------|
| D01 | 사무실 | 사무실 |
| D02 | 상가/상가점포 | 상가 |
| D03 | 상가건물 | 건물 |
| D04 | 건물 계열 | 건물 |
| D05 | 상가주택 | 상가주택 |
| E01 | 오피스 | 건물 |
| Z00 | 기타/토지 | 건물 |

### 거래유형 4종 (tradeTypes)

| 코드 | 한글명 |
|------|--------|
| A1 | 매매 |
| B1 | 전세 |
| B2 | 월세 |
| B3 | 단기임대 |

---

## 네이버 상세 API 프록시 체인

```
브라우저 -> /api/naver-proxy (Vercel Python runtime)
  -> Decodo 프록시 (한국 주거 IP)
    -> curl_cffi (impersonate="chrome")
      -> fin.land.naver.com basicInfo + agent API (병렬)
```

Fallback 순서 (`src/lib/naver-detail.ts` ENDPOINTS):
1. `/api/naver-proxy` (Python proxy, 12초) -- 메인
2. `localhost:4000/naver-detail` (로컬 개발, 3초)
3. `/api/naver-detail` (Next.js API route, 10초) -- 최후 수단

캐시: 인메모리 5분 (Map 200항목) + DB 24시간 (naver_detail_cache)

---

## 칸반 정렬 로직

- 각 deal에 `position: float` 저장
- 새 거래 -> 컬럼 맨 위 (min position - 1024)
- 드래그앤드롭 -> (앞 카드 + 뒤 카드) / 2
- 상태 변경 -> 이동 컬럼 맨 위
- 모두 optimistic update

---

## 환경변수

### 로컬 개발 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=...
NAVER_COOKIE=...
```

### Vercel 프로덕션 (추가)
```
NAVER_COOKIE=...
PROXY_USER=...    # Decodo 프록시
PROXY_PASS=...    # Decodo 프록시
```

---

## 가격 단위 규칙

- **DB**: 원 단위 (500000000 = 5억)
- **UI 필터**: 만원 단위 (50000 = 5억) -> 쿼리 시 x 10000
- **formatMoney()**: 원 단위 -> "5억", "1억 2,000만" 한글 변환

## 면적 표시 규칙

- 상가/사무실: "계약 100m2 / 전용 33m2"
- 상가건물: supply=0 -> "대지 104m2 / 연 195m2"
- 동일하면: "67m2"
- 필터링 기준: area2 (전용면적/연면적)

---

## 완료된 기능

- [x] 레이어드 아키텍처 (Types/Config/Repo/Service/Runtime/UI)
- [x] 멀티유저 (Google OAuth + PIN fallback)
- [x] RLS 유저별 데이터 격리
- [x] 20,000건+ 마포구 매물 데이터
- [x] 매물 목록 서버사이드 페이지네이션 + 필터 (동/유형/거래/층/면적/가격/정렬/검색)
- [x] 매물 상세 패널 (4탭: 기본/상권/권리/비용)
- [x] 매물 비교 (최대 5개)
- [x] 컬렉션 (북마크/폴더 저장, 소프트삭제/복원)
- [x] 거래 관리 칸반 (3단계, 드래그앤드롭)
- [x] 고객 관리 (CRUD, 역할, 매물 매칭)
- [x] 가격 변동 히스토리 + 대시보드 랭킹
- [x] 네이버 상세 API (프록시 체인, 캐시)
- [x] 크롤링 자동화 (GitHub Actions, self-hosted runner, 텔레그램 알림)
- [x] Vercel 배포 + Supabase Seoul
- [x] 모바일 반응형 (하단 탭 바, safe area)
- [x] 대시보드 (통계, 가격변동 TOP, 최근매물/저장)
- [x] 설정 페이지 (표시설정, 크롤링 로그, 로그아웃)
- [x] 네이버 지도 링크 (lz-string layer 파라미터)
- [x] 유저별 메모/즐겨찾기/내매물 테이블 분리

## 알려진 이슈

- `price_change_rankings`의 `dong` 필드: sync 코드에서 INSERT에 포함하지 않아 null 표시
- `price_change_rankings`의 `property_type`: row dict에서 키 불일치 (`real_estate_type_name` vs `property_type`)
- `naver_detail_cache` DB 레벨 자동 삭제 미구현 (fetched_at 인덱스 존재, cron 추가 예정)

## 향후 TODO

- [ ] naver_detail_cache 7일 초과 행 정리 (cron 또는 확률적)
- [ ] 크롤링 쿠키 만료 자동 감지 + 갱신
- [ ] 지도 연동 (상세 패널, 현재 네이버 링크만)
- [ ] 유동인구/상권/공실률 외부 데이터 연동
- [ ] 실거래가 비교 (국토부 API)
- [ ] 등기부등본/임차인/비용 시뮬레이션 저장
