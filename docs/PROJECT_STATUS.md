# 베스트공인중개 CRM 프로젝트 현황 (2026-04-06)

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
| real_estate_type | text | D01(사무실), D02(상가), D03/D04(건물), D05(상가주택) |
| real_estate_type_name | text | 한글 유형명 |
| trade_type | text | A1(매매), B1(전세), B2(월세), B3(단기임대) |
| trade_type_name | text | 한글 거래유�� |
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
| raw_data | jsonb | ���이버 API 원본 |
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
| useCollectionStore | collection-store.ts | 컬���션 CRUD + 소프트삭제 | Supabase |
| useCustomerStore | customer-store.ts | 고객 CRUD | Supabase |
| useDealStore | deal-store.ts | 거래 칸반 + 드래그정렬 | Supabase |
| useSettingsStore | settings-store.ts | 표시설정 + 크롤링로그 | LocalStorage |
| useToastStore | toast-store.ts | 토스트 알림 | 메모리 |

---

## 크롤링 흐름

```
1. crawl-mapo-fin.py — 마포��� 26개 동 순회, fin.land API 호출
   → data/crawled-mapo-fin-YYYY-MM-DD.json (~20,000건)

2. sync-to-supabase.py — JSON → Supabase upsert
   → 가격 변동 감지 → price_history 기록
   → 7일 미확인 → is_active=false

크롤링 코드: D01,D02,D03,D04,D05,E01,Z00 전부 수집
거래유형: A1(매매), B1(전세), B2(월세), B3(단기임대) 전부
```

## API 흐름

```
매물 클릭 → /api/naver-detail?articleNumber=...&realEstateType=...&tradeType=...
  → fin.land basicInfo + agent API 병렬 호출 (NAVER_COOKIE 사용)
  → 주차, 욕실, 건축물용도, 중개사 연락처 등 반환
  → 클라이언트 5분 캐시
```

## 네이�� 지도 링크 (layer 파라미터)

fin.land의 layer 파라미터는 lz-string으로 압축된 JSON:
```json
[
  {"id":"article_list","searchParams":{"type":"CLUSTER","clusterId":"zoom/x/y"}},
  {"id":"article_detail","params":{"articleId":"매물번호"}}
]
```
좌표 → Slippy map 타일 좌표(zoom 19) 변환 → lz-string compress.

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=...
NAVER_COOKIE=...
```

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
