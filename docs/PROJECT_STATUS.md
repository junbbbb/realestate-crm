# 베스트공인중개 CRM 프로젝트 현황 (2026-04-07)

## 개요
이모를 위한 서울시 마포구 상업용 부동산 매물 관리 CRM.
네이버 부동산 크롤링 → Supabase 저장 → Next.js 프론트엔드.
**배포**: https://realestate-crm-eosin.vercel.app (PIN: 0641)

## Tech Stack
- Next.js 16.2.2 (App Router) + React 19.2.4 + TypeScript
- Zustand 5.0.12 (상태관리)
- Supabase (PostgreSQL + RLS)
- shadcn/ui + Tailwind CSS v4
- Python (curl_cffi) — 크롤링

---

## DB 테이블 구조

### properties (매물)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text PK | 네이버 articleNumber |
| article_no, article_name | text | 문서번호, 제목 |
| real_estate_type | text | D01(사무실), D02(상가), D03/D04(건물), D05(상가주택), E01(오피스→건물), Z00(기타→건물) |
| real_estate_type_name | text | 한글 유형명 |
| trade_type | text | A1(매매), B1(전세), B2(월세), B3(단기임대) |
| trade_type_name | text | 한글 거래유형 |
| dong, address | text | 동, 주소 |
| price | bigint | 매매가 또는 보증금 (원 단위) |
| warrant_price | bigint | 보증금 (원 단위) |
| monthly_rent | bigint | 월세 (원 단위) |
| area1, area2 | numeric | 계약면적, 전용면적 (상가건물은 대지/연면적) |
| floor_info | text | "1/5" 형식 |
| is_active | boolean | 소프트 삭제 (7일 미확인 시 false) |
| is_my_listing | boolean | 개인 등록 매물 |
| trade_status | text | active/sold |
| price_change | text | none/increase/decrease/new |
| prev_price | bigint | 이전 가격 |
| memo | text | 사용자 메모 |
| raw_data | jsonb | 네이버 API 원본 |
| last_seen_at, first_seen_at | timestamptz | 크롤링 타임스탬프 |

### deals (거래)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| property_id | text FK→properties | 매물 |
| seller_id | uuid FK→customers | 임대인/매도인 |
| buyer_id | uuid FK→customers | 임차인/매수인 |
| deal_type | text | 매매/전세/월세/단기임대 |
| status | text | 거래전/거래중/거래완료 |
| position | float | 칸반 정렬 순서 |
| memo | text | |

### customers (고객)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| name, phone, email | text | 연락처 |
| role | text | buyer/seller/both |
| interested_in | text[] | 관심 거래유형 |
| budget_min, budget_max | bigint | 예산 (원 단위) |
| preferred_area, preferred_floor | text | 선호 |
| business_type | text | 업종 |
| premium_budget | bigint | 권리금 예산 |

### collections (컬렉션/폴더)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text PK | |
| name | text | 폴더명 |
| property_ids | text[] | 매물 ID 배열 |
| entries | jsonb | [{propertyId, addedAt}] 저장 시간 추적 |
| is_deleted | boolean | 소프트 삭제 |

### price_history (가격 변동)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | bigserial PK | |
| article_no | text FK→properties | |
| price, warrant_price, monthly_rent | integer | 당시 가격 |
| change_type | text | initial/increase/decrease |

### crawl_logs (크롤링 로그)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| status | text | success/error |
| total_count, new_count, updated_count | integer | |
| duration, message | text | |

---

## 인증
- PIN 4자리 (0641) -> HMAC-SHA256 토큰 -> httpOnly 쿠키 30일
- dashboard layout (서버 컴포넌트)에서 쿠키 검증
- API 라우트도 쿠키 검증

## 페이지 구조

```
/login               로그인 (PIN 4자리)
/                    대시보드 (통계, 최근매물, 최근저장)
/properties          매물 목록 (탭: 전체/네이버/개인매물)
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
| useStore | store.ts | 매물 목록/필터/페이지네이션 | Supabase |
| useCollectionStore | collection-store.ts | 컬렉션 CRUD + 소프트삭제 | Supabase |
| useCustomerStore | customer-store.ts | 고객 CRUD | Supabase |
| useDealStore | deal-store.ts | 거래 칸반 + 드래그정렬 | Supabase |
| useSettingsStore | settings-store.ts | 표시설정 + 크롤링로그 | LocalStorage |
| useToastStore | toast-store.ts | 토스트 알림 | 메모리 |

---

## 크롤링 흐름

```
1. crawl-mapo-fin.py — 마포구 26개 동 순회, fin.land API 호출
   → data/crawled-mapo-fin-YYYY-MM-DD.json (~20,000건)

2. sync-to-supabase.py — JSON → Supabase upsert
   → 가격 변동 감지 → price_history 기록
   → 7일 미확인 → is_active=false
   → 가격 변동 랭킹 계산 → price_change_rankings 갱신 (상승 TOP 6 + 하락 TOP 6)
```

### 매물 유형 7종 (realEstateTypes)

| 코드 | 한글명 | CRM 분류 (sync 매핑) |
|------|--------|---------------------|
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

## API 흐름

```
매물 클릭 → /api/naver-detail?articleNumber=...&realEstateType=...&tradeType=...
  → fin.land basicInfo + agent API 병렬 호출 (NAVER_COOKIE 사용)
  → 주차, 욕실, 건축물용도, 중개사 연락처 등 반환
  → 클라이언트 5분 캐시
```

## 네이버 상세 API 프록시 체인 (2026-04-07)

```
클라이언트 (브라우저)
  → /api/naver-proxy (Vercel Python runtime)
    → Decodo 프록시 (gate.decodo.com:10001, 한국 주거 IP)
      → curl_cffi (impersonate="chrome", Chrome TLS 지문 위장)
        → fin.land.naver.com basicInfo + agent API (ThreadPoolExecutor 병렬)
```

- `api/naver-proxy.py`: Vercel serverless Python, curl_cffi + `impersonate="chrome"`
- Decodo: 한국 주거 IP 프록시 (PROXY_USER/PROXY_PASS 환경변수)
- fallback 순서 (`src/lib/naver-detail.ts` ENDPOINTS):
  1. `/api/naver-proxy` (Python proxy, 12초 타임아웃) — 메인
  2. `localhost:4000/naver-detail` (로컬 개발 프록시, 3초 타임아웃)
  3. `/api/naver-detail` (Next.js API route, 10초 타임아웃) — 최후 수단

### Naver API 접근 시행착오 (전체 기록)

프로덕션(Vercel)에서 네이버 fin.land API에 접근하기까지의 시도 순서:

| 순서 | 방법 | 결과 | 원인 |
|------|------|------|------|
| 1 | Vercel 직접 fetch (Next.js API route) | 403/429 | Vercel 해외 IP + TLS 지문 = 즉시 차단 |
| 2 | Oracle Cloud (한국 리전 VM) | 차단 | 데이터센터 IP 대역 → 네이버가 봇으로 분류 |
| 3 | Bright Data (주거 프록시) | 429 rate limit | 요청은 통과하나 rate limit 공격적 |
| 4 | Decodo 프록시 + Python requests | 403 | 프록시 IP는 통과, 하지만 TLS 지문이 Python → 차단 |
| 5 | Decodo 프록시 + curl_cffi impersonate="chrome" | **성공** | 한국 주거 IP + Chrome TLS 지문 = 진짜 브라우저로 인식 |

**핵심 교훈**: 네이버는 IP와 TLS 지문을 **둘 다** 검사한다. 프록시로 IP만 바꿔도 TLS 지문이 Python/curl이면 차단. curl_cffi의 `impersonate="chrome"`이 진짜 Chrome의 JA3 지문을 복제하여 해결.

## Supabase 네이버 상세 캐시 (2026-04-07)

### naver_detail_cache
| 컬럼 | 타입 | 설명 |
|------|------|------|
| article_number | text PK | 매물번호 |
| data | jsonb | 상세 정보 (주차, 욕실, 건축일, 중개사 등) |
| fetched_at | timestamptz | 캐시 저장 시각 |

- **TTL**: 인메모리 5분 (Map, 최대 200항목), DB 24시간 (조회 시 age 체크)
- **정리**: DB 레벨 자동 삭제는 미구현. `fetched_at` 인덱스 존재하여 향후 확률적 정리 또는 cron 추가 가능
- `src/lib/naver-detail.ts`에서 관리 (getDbCache/setDbCache/fetchWithTimeout)
- **fallback 순서**: ENDPOINTS 배열 — Python proxy(12s) → localhost:4000(3s) → Next.js API(10s)

## 가격 변동 랭킹 시스템 (2026-04-07)

### price_change_rankings
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| article_no | text | 매물번호 |
| article_name | text | 제목 |
| property_type | text | 유형 |
| trade_type | text | 거래유형 (한글) |
| change_type | text | increase / decrease |
| prev_price | bigint | 이전 가격 |
| current_price | bigint | 현재 가격 |
| rate | numeric(8,2) | 변동률 % |
| dong | text | 동 (20260407120000 마이그레이션으로 추가) |
| updated_at | timestamptz | 갱신 시각 (default now()) |

- **계산 시점**: sync-to-supabase.py 실행 시 (크롤링 후)
- **로직**: prev_price >= 100만원 필터 → 변동률 순 정렬 → 상승 TOP 6 + 하락 TOP 6
- **갱신 방식**: 전체 삭제 후 재삽입 (매 동기화)
- **알려진 이슈**: sync 코드에서 `dong` 필드를 rankings INSERT에 포함하지 않음 (대시보드에서 dong이 null로 표시됨). 또한 `property_type`은 `r.get("property_type")` 조회하나 row dict에는 `real_estate_type_name` 키로 저장되어 빈 문자열이 됨

## 대시보드 (src/app/(dashboard)/page.tsx)

### 통계 카드 (상단)
- 마포구 전체매물 수, 컬렉션 수, 내 매물 수, 고객 수

### 가격 변동 카드 (2026-04-07)
- price_change_rankings 테이블에서 전체 조회 → 상승/하락 분리
- 상승 TOP (빨간색), 하락 TOP (파란색) 2열 카드
- 변동률 % + 이전→현재 가격 표시
- 클릭 시 가로형 모달: 왼쪽 DetailPanel(매물 상세) + 오른쪽 PriceHistoryPanel(가격 변동 이력)
- 로딩 중 스켈레톤 UI (5행 펄스 애니메이션)

### 하단 2열
- 최근 매물 (최신 5개)
- 최근 저장 (컬렉션 entries에서 최신 5개, 폴더명 + 시간 표시)

---

## 네이버 지도 링크 (layer 파라미터)

fin.land의 layer 파라미터는 lz-string으로 압축된 JSON:
```json
[
  {"id":"article_list","searchParams":{"type":"CLUSTER","clusterId":"zoom/x/y"}},
  {"id":"article_detail","params":{"articleId":"매물번호"}}
]
```
좌표 → Slippy map 타일 좌표(zoom 19) 변환 → lz-string compress.

---

## 환경변수

### 로컬 개발 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=...
NAVER_COOKIE=...               # 네이버 로그인 쿠키 (크롤링 + API용)
```

### Vercel 프로덕션 (추가)
```
NAVER_COOKIE=...               # 네이버 로그인 쿠키
PROXY_USER=...                 # Decodo 프록시 사용자명
PROXY_PASS=...                 # Decodo 프록시 비밀번호
```

> Vercel에서는 `api/naver-proxy.py`가 NAVER_COOKIE, PROXY_USER, PROXY_PASS 세 개를 모두 사용한다. 하나라도 빠지면 500 에러를 반환.

## 칸반 정렬 로직

- 각 deal에 `position: float` 저장
- 새 거래 → 컬럼 맨 위 (min position - 1024)
- 드래그앤드롭 → (앞 카드 + 뒤 카드) / 2
- 버튼 상태 변경 → 이동 컬럼 맨 위
- 메모/고객 수정 → 위치 그대로
- 모두 optimistic update (깜빡임 없음)

## 가격 단위 규칙

- **DB**: 원 단위 (예: 500000000 = 5억)
- **UI 필터**: 만원 단위 (예: 50000 = 5억) → 쿼리 시 × 10000
- **formatMoney()**: 원 단위 입력 → "5억", "1억 2,000만" 등 한글 변환

## 면적 표시 규칙

- 상가/사무실: 계약면적 ≠ 전용면적 → "계약 100m² / 전용 33m²"
- 상가건물: supply=0 → "대지 104m² / 연 195m²"
- 동일하면: "67m²"
- 필터링 기준: area2 (전용면적/연면적)
