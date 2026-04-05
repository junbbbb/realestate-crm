# 부동산 매물 관리 CRM

이모를 위한 부동산 매물 관리 CRM. 네이버 부동산 크롤링 + 매물 검색/필터링/비교 + 고객 관리.

## Tech Stack
- **Framework**: Next.js (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS v4 + Lucide 아이콘
- **State**: Zustand
- **DB**: Supabase (PostgreSQL)
- **Font**: Pretendard Variable
- **크롤링**: Python + Scrapling + curl_cffi

## 주요 기능
- 네이버 부동산 마포구 전체 매물 크롤링 (상가/사무실/건물 × 매매/전세/월세/단기임대)
- 동별/유형별/거래별 서버사이드 필터링
- 페이지네이션 (건당 50건)
- 매물 상세 패널 (기본/상권/권리/비용 탭)
- 매물 비교 (최대 5개)
- 즐겨찾기 / 내 매물
- 고객 관리 + 조건 기반 매물 매칭
- 가격 변동 히스토리 추적

## 시작하기

### 1. 환경변수 설정

`.env.example`을 `.env.local`로 복사하고 값 채우기:

```bash
cp .env.example .env.local
```

필요한 값:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NAVER_COOKIE` — 네이버 부동산 로그인 쿠키 (크롤링 시)

### 2. 의존성 설치

```bash
npm install
```

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

## 크롤링

네이버 부동산(`fin.land.naver.com`)에서 마포구 상업용 매물(약 2만건)을 수집.

**한 줄 실행:**
```bash
bash scripts/run-crawl.sh
```

이 래퍼가 Chrome 쿠키 자동 추출 → 크롤링 → 로그 저장까지 전부 수행한다.

**수동 단계별 실행:**
```bash
# 1. Chrome Default 프로파일에서 네이버 쿠키 추출 → .env.local 에 기록
python3 scripts/extract-naver-cookie.py

# 2. 마포구 26개 동 × 5개 매물유형 × 4개 거래유형 크롤링
python3 scripts/crawl-mapo-fin.py

# 3. Supabase 업로드
python3 scripts/sync-to-supabase.py data/crawled-mapo-fin-YYYY-MM-DD.json
```

**사전 준비 한 번만:**
1. Chrome Default 프로파일로 https://fin.land.naver.com 로그인
2. `pip3 install --user pycryptodome curl_cffi python-dotenv`

자세한 동작 원리·장애 대응·자동화 설정은 [`docs/CRAWLING.md`](./docs/CRAWLING.md) 참고.

## 프로젝트 구조
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # 사이드바 + 메인
│   │   ├── page.tsx            # 대시보드
│   │   ├── properties/         # 매물 목록
│   │   ├── favorites/          # 즐겨찾기
│   │   ├── my-listings/        # 내 매물
│   │   └── customers/          # 고객 관리
│   ├── layout.tsx
│   └── globals.css
├── components/ui/              # shadcn/ui 컴포넌트
├── lib/
│   ├── supabase.ts             # Supabase 클라이언트
│   ├── store.ts                # Zustand 스토어
│   └── format.ts
└── types/

scripts/
├── crawl-mapo-fin.py           # 마포구 전체 크롤링
├── crawl-fin-api.py            # 특정 동 크롤링
├── sync-to-supabase.py         # Supabase 업로드
└── seed-supabase.py

supabase/
└── migrations/                 # DB 스키마
```

## DB 스키마
- `properties`: 매물 (articleNumber = primary key)
- `price_history`: 가격 변동 히스토리
- `customers`: 고객

## 디자인 원칙
- **색상 5개 고정** — Tailwind Stone scale
- **모던 미니멀** — 장식 없음, 타이포그래피 중심
- **접근성** — WCAG AA 이상 대비율
- 자세한 내용은 `DESIGN.md` 참고
