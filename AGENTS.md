<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BEST MOUNTAIN — 부동산 매물 관리 CRM

## Overview
부동산 중개인을 위한 매물 관리 CRM. 네이버 부동산 크롤링, 매물 검색/필터링/비교, 컬렉션 저장, 고객 관리, 거래(딜) 칸반 관리. 멀티유저 (Google OAuth + PIN fallback).

## Tech Stack
- Next.js 16.2.2 (App Router) + React 19.2.4 + TypeScript
- shadcn/ui + Tailwind CSS v4 (UI)
- Lucide React (아이콘)
- Zustand 5.0.12 (Client State)
- Supabase (PostgreSQL + RLS)
- Supabase Auth (Google OAuth) + PIN fallback
- lz-string (네이버 지도 layer 인코딩)
- Python curl_cffi (크롤링 + 네이버 API 프록시, Chrome TLS 지문 위장)
- Decodo 프록시 (gate.decodo.com:10001, 한국 주거 IP — Vercel 해외 서버에서 네이버 접근용)

## Architecture — Strict Layered (AI 특화)

의존성 방향: Types -> Config -> Repo -> Service -> Runtime -> UI (한 방향만 허용)

```
src/
  types/          <- 1. 순수 타입 (import 없음)
  config/         <- 2. 상수, Supabase 클라이언트 (types만 import)
  repos/          <- 3. 데이터 접근 = Supabase 쿼리 (types + config만 import)
  services/       <- 4. 비즈니스 로직 (types + config + repos만 import)
  runtime/        <- 5. Zustand Store + Context Provider (위 전부 import 가능)
    stores/
    providers/
  lib/            <- 5. Store 래퍼 + 유틸 (runtime과 동일 레벨)
  components/     <- 6. UI 컴포넌트 (runtime/lib만 import)
  app/            <- 6. 페이지 (runtime/lib/components만 import)
```

### 금지 규칙 (절대 위반 금지)
- UI/컴포넌트에서 `supabase.from(...)` 직접 호출 금지 -> repo 통해서만
- Repo에서 Zustand store import 금지 -> repo는 순수 데이터 접근만
- Store에서 `supabase.from(...)` 직접 호출 금지 -> repo 함수 호출만
- 하위 레이어가 상위 레이어 import 금지 (types가 repo를 import하면 안됨)

### 교차 관심사 (Providers)
- Auth: `src/runtime/providers/auth-provider.tsx` -> 어떤 레이어든 주입 가능
- Toast: `src/lib/toast-store.ts` -> UI 전용, 레이어 규칙 예외

## Directory Structure (상세)

```
src/
  types/index.ts            -- Property, Customer, Deal, Collection, PropertyFilters 등
  config/constants.ts       -- PAGE_SIZE, MAX_COMPARE, PIN_USER_ID 등
  repos/                    -- property-repo, collection-repo, customer-repo, deal-repo, user-repo
  services/                 -- (확장 예정)
  runtime/
    stores/auth-store.ts    -- useAuthStore (userId, user, isLoading)
    providers/auth-provider.tsx  -- Google OAuth / PIN 해석
  lib/
    store.ts                -- useStore (매물 목록/필터/페이지네이션)
    collection-store.ts     -- useCollectionStore (컬렉션 CRUD)
    customer-store.ts       -- useCustomerStore (고객 CRUD)
    deal-store.ts           -- useDealStore (거래 칸반)
    settings-store.ts       -- useSettingsStore (표시설정)
    toast-store.ts          -- useToastStore (토스트)
    supabase.ts             -- Supabase 브라우저 클라이언트
    supabase-auth.ts        -- Supabase Auth 브라우저 클라이언트
    supabase-server.ts      -- Supabase 서버 클라이언트
    auth.ts                 -- PIN 인증 유틸
    format.ts               -- formatMoney, 면적 포맷
    naver-detail.ts         -- 네이버 상세 API 호출 + 캐시
    utils.ts                -- cn() 등
  components/               -- shadcn/ui, naver-map, toast, collection-popup
  app/
    login/page.tsx           -- 로그인 (Google OAuth / PIN)
    (dashboard)/
      layout.tsx             -- 인증 gate + 사이드바/탭바 레이아웃
      shell.tsx              -- 사이드바 + 모바일 탭바 + AuthProvider
      page.tsx               -- 대시보드
      properties/            -- 매물 목록 (탭: 전체/네이버/개인매물)
      favorites/             -- 저장한 매물 (컬렉션)
      my-listings/           -- 거래 관리 (칸반)
      customers/             -- 고객 관리
      settings/              -- 설정
    api/
      auth/                  -- PIN 로그인 API
      naver-detail/          -- 네이버 상세 API 프록시
scripts/                     -- 크롤링 (crawl-mapo-fin.py, sync-to-supabase.py, run-crawl.sh 등)
supabase/migrations/         -- DB 마이그레이션 SQL (23개)
docs/                        -- 프로젝트 문서
```

## DB 테이블

### 공유 데이터 (모든 유저 공통)
- `properties` -- 매물 (크롤링 + 개인등록)
- `price_history` -- 가격 변동 추적 (trade_type 포함, 변동 시에만 기록)
- `price_change_rankings` -- 가격 변동 TOP 6 상승/하락 (환산보증금 기준, 보증금/월세 상세 포함)
- `naver_detail_cache` -- 네이버 상세 API 캐시 (24h TTL)
- `crawl_logs` -- 크롤링 로그

### 유저별 데이터 (user_id 필터, RLS 적용)
- `collections` -- 저장 폴더 (user_id, 소프트삭제)
- `customers` -- 고객 (user_id, buyer/seller/both)
- `deals` -- 거래 (user_id, 칸반: 거래전/거래중/거래완료)
- `user_memos` -- 유저별 매물 메모 (user_id + property_id)
- `user_favorites` -- 유저별 즐겨찾기 (user_id + property_id)
- `user_listings` -- 유저별 내 매물 (user_id + property_id)
- `user_settings` -- 유저별 설정 (페이지 크기, 수익률 계산법 등)

## 인증 구조

1. **Google OAuth** (Supabase Auth) -- 메인 인증
   - `auth-provider.tsx`에서 `supabase.auth.getSession()` 확인
   - 성공 시 `userId = auth.uid()`
2. **PIN fallback** -- 단일 사용자 호환
   - PIN_USER_ID (`02e4efdf-0453-5d57-ba66-dc6e9506bd21`) 고정 UUID
   - Google 세션 없을 때 자동 할당
3. **RLS** -- 유저별 데이터 격리
   - `auth.uid() = user_id` 조건
   - PIN 유저는 `auth.uid() IS NULL AND user_id = PIN_UUID` 허용

## 핵심 문서
- `docs/PROJECT_STATUS.md` -- 프로젝트 전체 현황, DB 구조, 데이터 흐름
- `docs/decisions/design-decisions.md` -- 설계 결정 + 시행착오
- `docs/decisions/naver-detail-api.md` -- 네이버 API 선택 과정
- `docs/DOCUMENTATION.md` -- 각 문서의 역할과 갱신 시점

## 가격 비교 로직 (환산보증금)

가격 변동 감지 시 거래유형별 비교 기준:
- **매매(A1)**: 매매가 그대로
- **전세(B1)**: 보증금 그대로
- **월세(B2)/단기(B3)**: 환산보증금 = 보증금 + (월세 × 12 ÷ 0.06) — 전환율 6% (마포구 상업용 기준)

### 가격 변동 감지 규칙
- DB 현재값(직전 크롤링) vs 이번 크롤링값 비교
- **거래유형 변경**(전세→매매 등): `type_change`로 분류, 랭킹 제외
- **환산보증금 변동**: `increase`/`decrease`로 분류
- **변동 없음**: price_history에 기록하지 않음 (last_seen_at만 갱신)
- **비활성화**: 7일 미확인 매물 → is_active=false (1000건씩 배치)

### 크롤링 파이프라인 (run-crawl.sh)
1. Chrome 네이버 쿠키 자동 추출 → .env.local
2. crawl-mapo-fin.py → 매물 목록 크롤링 (상세 조회 없음, 별도 API로 처리)
3. sync-to-supabase.py → DB upsert + 가격 변동 감지 + 랭킹 갱신 + 비활성화

## 가격 단위 주의
- DB: 원 단위 (500000000 = 5억)
- UI 필터: 만원 단위 (50000 = 5억) -> 쿼리 시 x10000
- formatMoney(): 원 단위 -> "5억", "1,200만" 한글 변환

## Context Injection Rules
- DB/데이터 변경 -> docs/PROJECT_STATUS.md
- 외부 서비스 연동 -> docs/PROJECT_STATUS.md
- UI 변경 -> PROJECT.md + DESIGN.md
- 새 기능 -> PROJECT.md + docs/PROJECT_STATUS.md
- 그 외 -> 이 파일로 충분

## Work Rules
- 이 프로젝트의 사용자는 비개발자. 코드/diff/기술 용어로 소통하지 않는다
- 변경 결과를 "사용자가 보는 동작 변화"로 설명
- 기술 결정은 에이전트가 자율적으로 결정하고 docs/decisions/에 기록
- 사용자에게는 제품/비즈니스 결정만 질문
