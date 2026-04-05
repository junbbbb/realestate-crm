<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 부동산 매물 관리 CRM (Real Estate CRM)

## Overview
이모를 위한 부동산 매물 관리 CRM. 네이버 부동산 크롤링, 매물 검색/필터링/비교, 즐겨찾기, 고객 관리, 수익률 분석 기능 제공.

## Tech Stack
- Next.js (App Router) + TypeScript
- shadcn/ui + Tailwind CSS v4 (UI)
- Lucide React (아이콘)
- Zustand (Client State)
- Pretendard Variable (폰트)

## Directory Structure
- `src/app/` — Next.js App Router pages
- `src/app/(dashboard)/` — 대시보드, 매물목록, 즐겨찾기, 내매물, 고객
- `src/components/ui/` — shadcn/ui 컴포넌트
- `src/lib/` — store, mock-data, format, utils
- `src/types/` — TypeScript 타입
- `src/hooks/` — 커스텀 훅
- `scripts/` — 크롤링 등 스크립트
- `docs/` — 프로젝트 문서
- `commands/` — Harness 커맨드

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
