# BEST MOUNTAIN

부동산 매물 관리 CRM (Real Estate Listing Management CRM)

## 이런 문제를 해결합니다

개인 부동산 중개인이 매물을 체계적으로 관리하기 어렵습니다. 네이버 부동산에서 매물을 하나하나 확인하고, 엑셀이나 메모장에 옮겨 적고, 고객에게 맞는 매물을 기억에 의존해 추천해야 합니다.

**BEST MOUNTAIN**은 네이버 부동산 매물을 자동으로 수집하고, 검색/필터/비교/저장/고객 관리까지 한 곳에서 할 수 있는 CRM입니다.

## 주요 기능

| 기능 | 설명 |
|---|---|
| 매물 목록 | 2만건+ 매물 검색, 동/유형/거래/층/면적/가격 필터, 정렬 |
| 컬렉션 | 매물을 폴더별로 저장, 다중 선택 저장 |
| 거래 관리 | 칸반 보드 (거래전 -> 거래중 -> 거래완료), 드래그앤드롭 |
| 고객 관리 | 고객별 예산/선호 조건 저장, 매물 매칭 추천 |
| 가격 변동 추적 | 매일 크롤링으로 가격 변동 감지, 대시보드 TOP 상승/하락 |
| 크롤링 자동화 | GitHub Actions 매일 새벽 자동 수집, 텔레그램 알림 |
| 매물 상세 | 네이버 상세 정보 실시간 조회 (주차, 욕실, 건축일, 중개사) |
| 멀티 유저 | Google 로그인, 유저별 데이터 격리 (RLS) |

## Tech Stack

| 영역 | 기술 |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 + Lucide Icons |
| State | Zustand 5 |
| DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (Google OAuth) + PIN fallback |
| 크롤링 | Python 3 + curl_cffi (Chrome TLS 지문) |
| 프록시 | Decodo (한국 주거 IP, Vercel 해외 서버용) |
| 배포 | Vercel (Seoul) + Supabase (Seoul) |
| 자동화 | GitHub Actions (self-hosted macOS runner) |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

필수 값:
- `NEXT_PUBLIC_SUPABASE_URL` -- Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- Supabase anon key
- `NAVER_COOKIE` -- 네이버 부동산 로그인 쿠키 (크롤링 시)

### 3. Supabase 마이그레이션

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속

## 크롤링 한 줄 실행

```bash
bash scripts/run-crawl.sh
```

이 스크립트가 Chrome 쿠키 추출 -> 마포구 26개 동 크롤링 -> Supabase 업로드까지 전부 수행합니다.

자세한 운영 가이드: [`docs/CRAWLING.md`](./docs/CRAWLING.md)

## 아키텍처

의존성 방향: Types -> Config -> Repo -> Service -> Runtime -> UI (단방향)

```
src/
  types/       -- 순수 타입 (import 없음)
  config/      -- 상수, Supabase 클라이언트
  repos/       -- 데이터 접근 (Supabase 쿼리)
  services/    -- 비즈니스 로직 (확장 예정)
  runtime/     -- Zustand Store + Auth Provider
  lib/         -- Store 래퍼 + 유틸리티
  components/  -- UI 컴포넌트
  app/         -- 페이지 (Next.js App Router)
```

## 페이지 구조

| 경로 | 기능 |
|---|---|
| `/login` | 로그인 (Google OAuth / PIN) |
| `/` | 대시보드 (통계, 가격 변동 TOP, 최근 매물/저장) |
| `/properties` | 매물 목록 (탭: 전체/네이버/개인매물) |
| `/favorites` | 저장한 매물 (컬렉션 관리, 삭제됨 복원) |
| `/my-listings` | 거래 관리 (칸반 보드) |
| `/customers` | 고객 관리 (역할: 매수인/매도인/겸용) |
| `/settings` | 설정 (표시 설정, 크롤링 로그, 로그아웃) |

## DB 스키마 (주요 테이블)

**공유 데이터**: `properties`, `price_history`, `price_change_rankings`, `naver_detail_cache`, `crawl_logs`

**유저별 데이터** (RLS): `collections`, `customers`, `deals`, `user_memos`, `user_favorites`, `user_listings`, `user_settings`

## 문서 목록

| 문서 | 내용 |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | AI 에이전트 지시사항 |
| [`PROJECT.md`](./PROJECT.md) | 전체 프로젝트 스펙 |
| [`DESIGN.md`](./DESIGN.md) | 디자인 시스템 |
| [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) | 현재 상태 |
| [`docs/CRAWLING.md`](./docs/CRAWLING.md) | 크롤링 운영 가이드 |
| [`docs/CRAWL_FILTERS.md`](./docs/CRAWL_FILTERS.md) | 크롤링 필터 레퍼런스 |
| [`docs/NAVER_FIN_API.md`](./docs/NAVER_FIN_API.md) | 네이버 API 명세 |
| [`docs/WEB_SECURITY.md`](./docs/WEB_SECURITY.md) | 웹 보안 배경지식 |
| [`docs/decisions/`](./docs/decisions/) | 설계 결정 기록 |
| [`docs/DOCUMENTATION.md`](./docs/DOCUMENTATION.md) | 문서 메타 가이드 |
