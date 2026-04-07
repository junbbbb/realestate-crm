# BEST MOUNTAIN — 프로젝트 문서

부동산 중개인을 위한 매물 관리 CRM.

## 1. 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | BEST MOUNTAIN (realestate-crm) |
| 사용자 | 부동산 중개인 (멀티유저) |
| 지역 범위 | 서울시 마포구 |
| 매물 범위 | 사무실 / 상가 / 건물 / 상가주택 (상업용 7종) |
| 거래 유형 | 매매 / 전세 / 월세 / 단기임대 |
| 데이터 출처 | 네이버 부동산 (fin.land.naver.com) |
| 배포 | https://realestate-crm-eosin.vercel.app |
| GitHub | https://github.com/junbbbb/realestate-crm |

## 2. 기술 스택

### Frontend
- **Next.js 16.2.2** (App Router, TypeScript)
- **React 19.2.4**
- **shadcn/ui** + **Tailwind CSS v4**
- **Lucide React** 아이콘
- **Pretendard Variable** 폰트 (본문)
- **Montserrat 900** 폰트 (로고)
- **Zustand 5.0.12** 상태 관리
- **lz-string** (네이버 지도 layer 인코딩)
- **canvas-confetti** (거래 완료 효과)

### Backend / 인프라
- **Supabase** (PostgreSQL + RLS, Seoul 리전)
- **Supabase Auth** (Google OAuth)
- **Supabase CLI** (마이그레이션 관리, 21개 마이그레이션)
- **Vercel** (배포, Seoul 리전)

### 크롤링
- **Python 3** + **curl_cffi** (Chrome TLS 지문 위장)
- **Decodo 프록시** (한국 주거 IP)
- `fin.land.naver.com/front-api/v1/article/*` API 역공학

### 자동화
- **GitHub Actions** (self-hosted macOS runner, 매일 새벽 5시 KST)
- **텔레그램 알림** (크롤링 실패 시)

## 3. 디자인 규칙 (DESIGN.md 참고)

**브랜드**: BEST MOUNTAIN
- 로고: `/public/logo.svg` + Montserrat 900
- Primary: `#000000`

**5색 팔레트** (Tailwind Stone scale):
- `#1c1917` -- 텍스트, primary
- `#78716c` -- 보조 텍스트
- `#a8a29e` -- 아이콘, focus ring
- `#e0ddd8` -- 테두리
- `#dc2626` -- destructive

**Surface 5단계**: `#ffffff` -> `#f8f7f5` -> `#f3f1ee` -> `#f0eeeb` -> `#e7e5e0`

## 4. 디렉터리 구조

```
realestate-crm/
  src/
    types/index.ts             # 순수 타입 정의
    config/constants.ts        # 상수 (PAGE_SIZE, PIN_USER_ID 등)
    repos/                     # Supabase 쿼리
      property-repo.ts
      collection-repo.ts
      customer-repo.ts
      deal-repo.ts
      user-repo.ts
    services/                  # 비즈니스 로직 (확장 예정)
    runtime/
      stores/auth-store.ts     # useAuthStore
      providers/auth-provider.tsx  # Google OAuth / PIN 해석
    lib/
      store.ts                 # useStore (매물 목록)
      collection-store.ts      # useCollectionStore
      customer-store.ts        # useCustomerStore
      deal-store.ts            # useDealStore
      settings-store.ts        # useSettingsStore
      toast-store.ts           # useToastStore
      supabase.ts              # 브라우저 클라이언트
      supabase-auth.ts         # Auth 브라우저 클라이언트
      supabase-server.ts       # 서버 클라이언트
      auth.ts                  # PIN 인증 유틸
      format.ts                # formatMoney, 면적 포맷
      naver-detail.ts          # 네이버 상세 API + 캐시
      utils.ts                 # cn() 등
    components/ui/             # shadcn/ui 컴포넌트
    components/                # naver-map, toast, collection-popup 등
    app/
      login/page.tsx           # 로그인
      (dashboard)/
        layout.tsx             # 인증 gate
        shell.tsx              # 사이드바 + 탭바
        page.tsx               # 대시보드
        properties/            # 매물 목록
        favorites/             # 저장한 매물 (컬렉션)
        my-listings/           # 거래 관리 (칸반)
        customers/             # 고객 관리
        settings/              # 설정
      api/
        auth/                  # PIN 로그인 API
        naver-detail/          # 네이버 상세 프록시
  scripts/
    crawl-mapo-fin.py          # 마포구 전체 크롤링
    crawl-fin-api.py           # 특정 동 크롤링
    sync-to-supabase.py        # JSON -> Supabase 동기화
    extract-naver-cookie.py    # Chrome 쿠키 추출
    run-crawl.sh               # 원클릭 크롤링
    push-cookie-to-github.sh   # 쿠키 GitHub Secret 업로드
    setup-telegram-notify.sh   # 텔레그램 알림 설정
    local-proxy.js             # 로컬 개발용 프록시
  supabase/migrations/         # 21개 마이그레이션
  data/                        # 크롤링 결과 JSON (gitignored)
  docs/                        # 프로젝트 문서
  public/logo.svg              # BEST MOUNTAIN 로고
```

## 5. DB 스키마 (Supabase)

### 공유 데이터
- **`properties`** -- 매물 (id=articleNumber PK, 20,000건+)
- **`price_history`** -- 가격 변동 이력 (article_no FK)
- **`price_change_rankings`** -- 가격 변동 TOP 12 (상승 6 + 하락 6)
- **`naver_detail_cache`** -- 네이버 상세 캐시 (24h TTL)
- **`crawl_logs`** -- 크롤링 실행 로그

### 유저별 데이터 (RLS 적용)
- **`collections`** -- 저장 폴더 (user_id, 소프트삭제)
- **`customers`** -- 고객 (user_id, role: buyer/seller/both)
- **`deals`** -- 거래 (user_id, 칸반 3단계)
- **`user_memos`** -- 매물별 메모 (user_id + property_id UNIQUE)
- **`user_favorites`** -- 즐겨찾기 (user_id + property_id PK)
- **`user_listings`** -- 내 매물 (user_id + property_id PK)
- **`user_settings`** -- 설정 (user_id PK)

인덱스: 복합 인덱스 (is_active+dong+trade+type), 가격 정렬, user_id별

## 6. 크롤링 파이프라인

### API 엔드포인트
- `POST /front-api/v1/article/map/articleClusters` -- 클러스터 목록
- `POST /front-api/v1/article/clusteredArticles` -- 클러스터 내 매물 (페이지네이션)
- 인증: NAVER_COOKIE (브라우저 로그인 쿠키)
- TLS 지문: curl_cffi impersonate="chrome"

### 스크립트
| 파일 | 역할 |
|---|---|
| `scripts/run-crawl.sh` | 원클릭: 쿠키 추출 -> 크롤링 -> 업로드 |
| `scripts/crawl-mapo-fin.py` | 마포구 26개 동 전체 크롤링 |
| `scripts/crawl-fin-api.py` | 특정 동 단독 크롤링 |
| `scripts/sync-to-supabase.py` | JSON -> Supabase upsert + 가격 히스토리 |
| `scripts/extract-naver-cookie.py` | Chrome 쿠키 AES-CBC 복호화 |
| `data/regions.json` | 마포구 26개 동 코드 + 좌표 |

### 수집 결과 (2026-04-05 기준)
- 마포구 전체: 약 20,000건
- 동별 TOP: 서교동 ~6,500 / 연남동 ~3,100 / 동교동 ~1,650

## 7. 페이지별 기능

### `/login` 로그인
- Google OAuth (Supabase Auth)
- PIN 4자리 fallback

### `/` 대시보드
- 통계 카드: 전체매물, 컬렉션, 내 매물, 고객 수
- 가격 변동 TOP: 상승(빨강) / 하락(파랑) 카드 -- 클릭 시 상세 모달
- 최근 매물 5건, 최근 저장 5건

### `/properties` 매물 목록 (핵심)
- **탭**: 전체 / 네이버 / 개인매물
- **서버사이드 페이지네이션**: 50건/페이지
- **필터**: 검색, 동(26개), 유형(4개), 거래(4개), 층(전체/1층/지하/2층이상), 면적, 가격, 월세
- **정렬**: 최신순, 가격 높은순/낮은순, 수익률순
- **컬렉션 저장**: 북마크 아이콘 -> 컬렉션 팝업
- **다중 선택**: 하단 플로팅 액션바 (컬렉션 저장 + 비교)
- **매물 비교**: 최대 5개
- **상세 패널** (우측 380px): 기본/상권/권리/비용 4탭

### `/favorites` 저장한 매물
- 컬렉션(폴더) 카드 목록
- 컬렉션별 매물 보기
- 삭제됨 탭 (복원/영구삭제)

### `/my-listings` 거래 관리
- 칸반 3단계: 거래전 -> 거래중 -> 거래완료
- 드래그앤드롭 정렬
- 거래별 매물/고객 연결, 메모

### `/customers` 고객 관리
- 고객 CRUD (역할: 매수인/매도인/겸용)
- 조건 기반 매물 매칭 추천

### `/settings` 설정
- 표시 설정 (페이지 크기, 수익률 계산법)
- 크롤링 로그 조회
- 로그아웃

## 8. 완료된 기능

- [x] 레이어드 아키텍처 (Types/Config/Repo/Service/Runtime/UI)
- [x] 멀티유저 (Google OAuth + PIN fallback + RLS)
- [x] 20,000건+ 매물 데이터 적재
- [x] 매물 목록 서버사이드 페이지네이션 + 전체 필터
- [x] 매물 상세 패널 (4탭)
- [x] 매물 비교 (최대 5개)
- [x] 컬렉션 (북마크/폴더, Supabase, 소프트삭제)
- [x] 거래 관리 칸반 (3단계, 드래그앤드롭, optimistic update)
- [x] 고객 관리 (Supabase, CRUD, 매물 매칭)
- [x] 가격 변동 히스토리 + 대시보드 랭킹
- [x] 네이버 상세 API (프록시 체인, DB+메모리 캐시)
- [x] 크롤링 자동화 (GitHub Actions, self-hosted, 텔레그램)
- [x] Vercel 배포 + Supabase Seoul
- [x] 모바일 반응형 (하단 탭 바, 상세 오버레이, safe area)
- [x] 대시보드 (통계, 가격변동, 최근매물/저장)
- [x] 설정 페이지
- [x] 네이버 지도 링크 (lz-string)
- [x] 유저별 메모/즐겨찾기/내매물 분리 테이블
- [x] 사이드바 반응형 (xl 풀, md 아이콘, mobile 하단탭)
- [x] Optimistic update (거래/컬렉션/즐겨찾기/메모)

## 9. 미완료 (TODO)

### 데이터/인프라
- [ ] naver_detail_cache 자동 정리 (7일 초과 행)
- [ ] 크롤링 쿠키 만료 자동 감지 + 갱신
- [ ] price_change_rankings dong/property_type 필드 sync 코드 수정

### 기능 확장
- [ ] 지도 연동 (상세 패널, 현재 네이버 링크만)
- [ ] 유동인구 데이터 (서울 열린데이터 API)
- [ ] 상권 정보 (소상공인시장진흥공단 API)
- [ ] 공실률 데이터 (한국부동산원 API)
- [ ] 실거래가 비교 (국토부 API)
- [ ] 등기부등본 메모 저장 (UI만 있고 저장 미구현)
- [ ] 층별 임차인 데이터 저장
- [ ] 비용 시뮬레이션 결과 저장

### 디자인/UX
- [ ] 페이지 로딩 스켈레톤 (대시보드 외)
- [ ] 에러 상태 UI (Supabase 연결 실패 시)

## 10. 디자인 체크리스트 (DESIGN.md 참고)

매 작업 후 확인:
- [ ] 텍스트/배경 대비 WCAG AA (4.5:1)
- [ ] 색상 5개 팔레트 외 사용 금지
- [ ] 그라디언트, 보라색, 네온, glow 없음
- [ ] border-radius 8px (rounded-lg)
- [ ] 아이콘 Lucide만, h-4 w-4 기본

## 11. 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=...
NAVER_COOKIE="NNB=...; NID_SES=...; BUC=..."
```

Vercel 프로덕션 추가: `PROXY_USER`, `PROXY_PASS` (Decodo)

## 12. 관련 문서

- `README.md` -- 소개 + 설치/실행
- `DESIGN.md` -- 브랜드 + 색상/여백/타이포
- `AGENTS.md` -- AI 에이전트 지시사항
- `docs/PROJECT_STATUS.md` -- 현재 상태
- `docs/CRAWLING.md` -- 크롤링 운영 가이드
- `docs/CRAWL_FILTERS.md` -- 필터 레퍼런스
- `docs/NAVER_FIN_API.md` -- API 명세
- `docs/WEB_SECURITY.md` -- 보안 배경지식
- `docs/decisions/` -- 설계 결정 기록
- `docs/DOCUMENTATION.md` -- 문서 메타 가이드
