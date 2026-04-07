<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 부동산 매물 관리 CRM (Real Estate CRM)

## Overview
이모를 위한 부동산 매물 관리 CRM. 네이버 부동산 크롤링, 매물 검색/필터링/비교, 컬렉션 저장, 고객 관리, 거래(딜) 칸반 관리 기능 제공.

## Tech Stack
- Next.js 16.2.2 (App Router) + React 19.2.4 + TypeScript
- shadcn/ui + Tailwind CSS v4 (UI)
- Lucide React (아이콘)
- Zustand 5.0.12 (Client State)
- Supabase (PostgreSQL + RLS)
- lz-string (네이버 지도 layer 인코딩)
- Python curl_cffi (크롤링 + 네이버 API 프록시, Chrome TLS 지문 위장)
- Decodo 프록시 (gate.decodo.com:10001, 한국 주거 IP — Vercel 해외 서버에서 네이버 접근용)

## Architecture — Strict Layered (AI 특화)

의존성 방향: Types → Config → Repo → Service → Runtime → UI (한 방향만 허용)

```
src/
├── types/          ← 1. 순수 타입 (import 없음)
├── config/         ← 2. 상수, Supabase 클라이언트 (types만 import)
├── repos/          ← 3. 데이터 접근 = Supabase 쿼리 (types + config만 import)
├── services/       ← 4. 비즈니스 로직 (types + config + repos만 import)
├── runtime/        ← 5. Zustand Store + Context Provider (위 전부 import 가능)
│   ├── stores/
│   └── providers/
├── lib/            ← 5. Store 래퍼 + 유틸 (runtime과 동일 레벨)
├── components/     ← 6. UI 컴포넌트 (runtime/lib만 import)
└── app/            ← 6. 페이지 (runtime/lib/components만 import)
```

### 금지 규칙 (절대 위반 금지)
- UI/컴포넌트에서 `supabase.from(...)` 직접 호출 금지 → repo 통해서만
- Repo에서 Zustand store import 금지 → repo는 순수 데이터 접근만
- Store에서 `supabase.from(...)` 직접 호출 금지 → repo 함수 호출만
- 하위 레이어가 상위 레이어 import 금지 (types가 repo를 import하면 안됨)

### 교차 관심사 (Providers)
- Auth: `src/runtime/providers/auth-provider.tsx` → 어떤 레이어든 주입 가능
- Toast: `src/lib/toast-store.ts` → UI 전용, 레이어 규칙 예외

## Directory Structure (상세)
- `src/types/` — 순수 타입 (Property, Customer, Deal, Collection 등)
- `src/config/` — Supabase 클라이언트, 상수, 코드 매핑
- `src/repos/` — 데이터 접근 (property-repo, collection-repo, customer-repo, deal-repo, user-repo)
- `src/services/` — 비즈니스 로직 (추후 확장)
- `src/runtime/stores/` — auth-store
- `src/runtime/providers/` — auth-provider
- `src/lib/` — Zustand store 래퍼 (store, collection-store 등) + format, naver-detail, utils
- `src/app/(dashboard)/` — 대시보드, 매물목록, 저장매물, 거래관리, 고객, 설정
- `src/app/api/` — API 라우트 (auth, naver-detail)
- `src/components/` — UI 컴포넌트 (shadcn/ui, naver-map, toast, collection-popup)
- `scripts/` — 크롤링 (crawl-mapo-fin.py, sync-to-supabase.py)
- `supabase/migrations/` — DB 마이그레이션 SQL
- `docs/` — 프로젝트 문서

## DB 테이블

### 공유 데이터 (모든 유저 공통)
- `properties` — 매물 (크롤링 + 개인등록)
- `price_history` — 가격 변동 추적
- `price_change_rankings` — 가격 변동 TOP 6 상승/하락
- `naver_detail_cache` — 네이버 상세 API 캐시 (24h TTL)
- `crawl_logs` — 크롤링 로그

### 유저별 데이터 (user_id 필터, RLS 적용)
- `collections` — 저장 폴더 (user_id, 소프트삭제)
- `customers` — 고객 (user_id, buyer/seller/both)
- `deals` — 거래 (user_id, 칸반: 거래전→거래중→거래완료)
- `user_memos` — 유저별 매물 메모 (user_id + property_id)
- `user_favorites` — 유저별 즐겨찾기 (user_id + property_id)
- `user_listings` — 유저별 내 매물 (user_id + property_id)
- `user_settings` — 유저별 설정 (페이지 크기, 수익률 계산법 등)

## 핵심 문서
- `docs/PROJECT_STATUS.md` — 프로젝트 전체 현황, DB 구조, 데이터 흐름
- `docs/decisions/design-decisions.md` — 설계 결정 + 시행착오
- `docs/decisions/naver-detail-api.md` — 네이버 API 선택 과정

## 가격 단위 주의
- DB: 원 단위 (500000000 = 5억)
- UI 필터: 만원 단위 (50000 = 5억) → 쿼리 시 ×10000
- formatMoney(): 원 단위 → "5억", "1,200만" 한글 변환

## Context Injection Rules
- DB/데이터 변경 → docs/architecture.md
- 외부 서비스 연동 → docs/architecture.md
- UI 변경 → docs/product-spec.md + DESIGN.md
- 새 기능 → docs/product-spec.md + docs/architecture.md
- 그 외 → 이 파일로 충분

## Change Risk Classification
See docs/blast-radius.md
- Core: 사용자 확인 필수
- Shell: 테스트 통과 시 자율 진행

## Work Rules
- 이 프로젝트의 사용자는 비개발자. 코드/diff/기술 용어로 소통하지 않는다
- 변경 결과를 "사용자가 보는 동작 변화"로 설명
- 기술 결정은 에이전트가 자율적으로 결정하고 docs/decisions/에 기록
- 사용자에게는 제품/비즈니스 결정만 질문
