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

## Directory Structure
- `src/app/(dashboard)/` — 대시보드, 매물목록, 저장매물, 거래관리, 고객, 설정
- `api/` — Vercel Python runtime (naver-proxy.py: curl_cffi + Decodo 프록시)
- `src/app/api/naver-detail/` — 네이버 상세 API 프록시 (Next.js fallback)
- `src/components/ui/` — shadcn/ui 컴포넌트
- `src/components/` — naver-map, toast, collection-popup
- `src/lib/` — store, collection-store, customer-store, deal-store, settings-store, toast-store, format, naver-detail, supabase
- `src/types/` — TypeScript 타입
- `scripts/` — 크롤링 (crawl-mapo-fin.py, sync-to-supabase.py)
- `supabase/migrations/` — DB 마이그레이션 SQL
- `docs/` — 프로젝트 문서

## DB 테이블
- `properties` — 매물 (크롤링 + 개인등록)
- `deals` — 거래 (칸반: 거래전→거래중→거래완료)
- `customers` — 고객 (buyer/seller/both)
- `collections` — 저장 폴더 (소프트삭제)
- `price_history` — 가격 변동 추적
- `crawl_logs` — 크롤링 로그
- `naver_detail_cache` — 네이버 상세 API 응답 DB 캐시 (인메모리 5분 + DB 24시간 TTL)
- `price_change_rankings` — 가격 변동 TOP 6 상승/하락 (sync 시 사전 계산, 대시보드용)

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
