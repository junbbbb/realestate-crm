# 크롤링 운영 가이드

네이버 부동산(`fin.land.naver.com`)에서 마포구 상업용 매물을 일별로 수집한다.

## TL;DR — 한 줄로 돌리기

```bash
bash scripts/run-crawl.sh
```

정상 동작 시 결과:
- `data/crawled-mapo-fin-YYYY-MM-DD.json` — 수집된 매물 (약 2만건, 100~200MB)
- `data/crawl-logs/YYYY-MM-DD_HHMMSS-mapo.log` — 실행 로그

## 사전 준비 (한 번만)

### 1. Python 의존성
```bash
pip3 install --user pycryptodome curl_cffi python-dotenv
```

| 패키지 | 용도 |
|---|---|
| `pycryptodome` | Chrome Cookies DB 복호화 (AES-CBC) |
| `curl_cffi` | Chrome TLS 지문 모방 — 네이버 봇 탐지 우회의 핵심 |
| `python-dotenv` | `.env.local` 로드 |

### 2. Chrome에서 네이버 로그인
macOS Chrome의 **Default 프로파일**로 https://fin.land.naver.com 에 접속해 로그인해둔다.
다른 프로파일에 로그인했다면 `extract-naver-cookie.py` 실행 시 프로파일 이름 인자를 넘겨야 한다.

### 3. `data/regions.json` 확인
마포구 26개 동의 `cortarNo` + 중심좌표가 들어있는 파일. 저장소에 커밋돼 있어야 한다.
**절대 손으로 만들지 말 것** — 코드 체계가 1144010100부터 1144012700까지 촘촘하게
정해져 있어 추측으로 만들면 동이 밀리거나 누락된다 (실제로 겪음, 결과 2만→1만으로 반토막).

## 동작 원리

### 왜 `curl`이나 `fetch`로는 안 되는가
- 네이버는 TLS ClientHello 지문으로 봇을 걸러낸다. 쿠키가 있어도 `curl` 기본 지문이면 `429 TOO_MANY_REQUESTS`를 즉시 리턴한다.
- `curl_cffi`의 `impersonate="chrome"` 옵션이 진짜 Chrome의 JA3 지문을 복제해 이를 우회한다.
- Playwright(Chromium) 역시 오토메이션 플래그로 탐지돼 `429`가 나온다. Node/JS 쪽에서 시도하려면 TLS 지문 모방 라이브러리를 따로 붙여야 한다.

### 쿠키 추출 방식
`scripts/extract-naver-cookie.py`가 하는 일:

1. `~/Library/Application Support/Google/Chrome/<profile>/Cookies` SQLite DB를 임시 복사
2. `security find-generic-password -s "Chrome Safe Storage"`로 macOS Keychain에서 마스터 키 획득
3. PBKDF2(saltysalt, 1003회)로 AES 키 파생
4. 각 암호화된 `naver.com` 쿠키를 AES-CBC로 복호화
5. `key=value; ...` 헤더 문자열로 조립해 `.env.local`의 `NAVER_COOKIE=`에 기록

**Chrome v20+ 쿠키 주의**: 복호화 후 앞 32바이트가 SHA256 무결성 해시로 prepend 돼 있다. UTF-8 디코딩 실패 시 `[32:]`로 잘라낸다.

### 크롤링 필터 (`scripts/crawl-mapo-fin.py`)

| 항목 | 값 | 의미 |
|---|---|---|
| `tradeTypes` | `["A1","B1","B2","B3"]` | 매매·전세·월세·단기 (전부) |
| `realEstateTypes` | `["D02","D03","D04","E01","Z00"]` | 상가·상가건물·건물·사무실·기타/토지 |
| `legalDivisionType` | `"EUP"` | 동 단위 필터 |
| `legalDivisionNumbers` | `[cortar_no]` | 한 번에 **한 동**만 요청 (여러 개 넣으면 0건 리턴) |
| 세부 필터 전부 | `[]` / `false` | 무제한 |

API 2단계:
1. `POST /front-api/v1/article/map/articleClusters` → cluster 목록 + `totalCount`
2. 각 cluster마다 `POST /front-api/v1/article/clusteredArticles` → `seed`/`lastInfo` 커서 페이지네이션

## 문제 해결

### `TOO_MANY_REQUESTS` (429)
- TLS 지문 탐지. `curl_cffi`의 `impersonate="chrome"`이 빠졌거나 다른 HTTP 클라이언트를 쓰고 있다.
- 같은 IP에서 짧은 시간에 너무 많이 요청한 경우 잠시 대기(5~15분).

### `Error` (400)
- 요청 body 스키마 불일치. `make_filter()`의 키 하나라도 빠지면 400이 떨어진다.
- `realEstateTypes`에 존재하지 않는 코드를 넣으면 400.

### 전세(B1) 0건
- 버그 아님. 상업용 부동산은 한국 시장에서 전세가 거의 없음 (월세/매매가 대부분).

### 동별 카운트가 이상함 (특정 동이 0건, 다른 동이 과도하게 많음)
- `regions.json`의 `cortarNo`가 밀렸을 가능성. 1144010600~1144012700 구간에서 한 칸만 어긋나도 동 이름과 코드가 어긋난다.
- 원본 regions.json과 diff 찍어볼 것.

### `NID_*` 쿠키가 없다는 경고
- Chrome Default 프로파일이 네이버에 로그인돼 있지 않다. 브라우저에서 다시 로그인하거나, `python3 scripts/extract-naver-cookie.py "Profile 1"`처럼 실제 로그인된 프로파일을 지정한다.

## Supabase 업로드

크롤링 결과를 CRM에서 보이게 하려면:
```bash
python3 scripts/sync-to-supabase.py data/crawled-mapo-fin-YYYY-MM-DD.json
```

## 자동화

### 옵션 A — GitHub Actions + self-hosted runner (권장)
저장소에 `.github/workflows/crawl.yml`이 들어 있다. 매일 **새벽 5시 KST**에
**한국 IP(이모 Mac)의 self-hosted runner** 위에서 자동 실행되어 크롤링 → Supabase
동기화까지 수행한다.

#### 왜 self-hosted인가
GitHub 무료 클라우드 runner(`ubuntu-latest`)는 미국/유럽에 있다. 네이버는
`fin.land.naver.com` API를 해외 IP에서 호출하면 **30초 타임아웃**으로 지오블락한다
(실제 테스트에서 첫 요청에서 curl: (28) timed out 발생). 한국 IP가 필수.

self-hosted runner는 이모 Mac에 설치되는 작은 에이전트. GitHub Actions 웹 UI와
워크플로우 파일은 그대로 쓰면서 실행만 로컬에서 일어난다. 쿠키 문제도 자동 해결 —
runner가 로컬 Chrome에서 직접 꺼낼 수 있다.

#### runner 설치 (최초 1회)
1. https://github.com/junbbbb/realestate-crm/settings/actions/runners 접속
2. "New self-hosted runner" → **macOS / ARM64** 선택
3. 페이지에 나온 명령어를 터미널에서 순서대로 실행 (대략):
   ```bash
   mkdir -p ~/actions-runner && cd ~/actions-runner
   curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/vX.X.X/...
   tar xzf actions-runner.tar.gz
   ./config.sh --url https://github.com/junbbbb/realestate-crm --token <웹페이지에 표시되는 토큰>
   ```
4. 라벨 설정 시 `self-hosted, macOS`가 자동으로 붙음
5. 백그라운드 서비스로 등록 (Mac 재부팅 후에도 자동 시작):
   ```bash
   ./svc.sh install
   ./svc.sh start
   ```

#### 크론 절전 해제 (중요)
Mac이 잠자기 상태면 워크플로우가 실행 안 된다. 매일 새벽 4:55에 깨우도록:
```bash
sudo pmset repeat wakeorpoweron MTWRFSU 04:55:00
```

#### Keychain 접근 권한
self-hosted runner가 쿠키 추출 시 Keychain에 접근한다. 최초 실행 시 한 번
"항상 허용" 다이얼로그가 뜨면 체크해두면 이후 자동 진행.

#### 최초 1회 시크릿 등록

#### 최초 1회 설정
저장소 설정 → Secrets and variables → Actions 에 아래 3개 시크릿 등록:

| Secret 이름 | 값 |
|---|---|
| `NAVER_COOKIE` | `.env.local`의 NAVER_COOKIE 전체 문자열 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

`gh` CLI로 한 번에:
```bash
bash scripts/push-cookie-to-github.sh   # NAVER_COOKIE 자동 업로드
gh secret set NEXT_PUBLIC_SUPABASE_URL
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### 수동 실행
저장소 → Actions → "Daily Mapo Crawl" → "Run workflow" 버튼.
또는 CLI:
```bash
gh workflow run crawl.yml
```

#### 쿠키 만료 대응 (중요)
네이버 `NID_*` 세션 쿠키는 수 주 단위로 만료된다. 만료되면 GitHub Actions가
첫 요청에서 `401` 또는 `429`를 받아 실패한다. 대응:

1. 로컬 Chrome Default 프로파일로 https://fin.land.naver.com 재로그인
2. 터미널에서:
   ```bash
   bash scripts/push-cookie-to-github.sh
   ```
3. 다음 실행(자동 또는 수동)부터 정상화

`push-cookie-to-github.sh`는 `extract-naver-cookie.py`를 호출해 Chrome에서
쿠키를 꺼낸 뒤 `gh secret set NAVER_COOKIE`로 업로드한다. Keychain 접근 권한
프롬프트가 뜰 수 있다.

#### 결과 확인
- **Supabase**: `properties` 테이블에 upsert됨 — CRM 매물 목록에서 바로 확인
- **Actions artifact**: 실행 결과 JSON + 로그가 14일간 보존됨
  (저장소 → Actions → 해당 run → Artifacts)
- **Job summary**: run 페이지 상단에 "수집 건수" 표시

### 옵션 B — 로컬 cron (macOS)
로컬 개발 머신에서 돌리고 싶다면:
```bash
crontab -e
```
```cron
# 매일 오전 6시 마포구 크롤링
0 6 * * * cd /Users/lbj/realestate-crm && bash scripts/run-crawl.sh >> data/crawl-logs/cron.log 2>&1
```
Chrome이 켜져 있지 않아도 동작한다 (DB 파일 복사 방식이라 락 없음). 단,
`extract-naver-cookie.py`가 호출될 때마다 Keychain 접근 권한을 요구할 수 있으므로
최초 1회 "항상 허용"을 눌러두면 편하다.

### 왜 GitHub Actions가 권장인가
- **비용 0** (public repo는 무제한, private repo도 월 2000분 무료)
- **Ubuntu runner에서 `curl_cffi` 정상 동작** — Chrome TLS 지문 모방은 OS 독립적
- **장비 꺼져 있어도 실행** — 노트북 닫아놔도 새벽에 돌아감
- **로그/실패 알림 자동** — 실패하면 GitHub에서 이메일 옴
- **결과 자동 Supabase 반영** — 사용자는 앱만 보면 됨

### 실패 알림 — 텔레그램 / 이메일

#### 텔레그램 (권장, 푸시 알림)
```bash
bash scripts/setup-telegram-notify.sh
```
이 스크립트는:
1. `@BotFather`에서 발급받은 봇 token 입력 받기
2. 봇과 대화방의 `chat_id` 자동 감지 (봇에게 `/start` 한 번 보낸 상태여야 함)
3. 테스트 메시지 발송
4. GitHub Secret에 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` 등록

설정이 끝나면 크롤링이 **실패할 때마다** 아래와 같은 메시지가 텔레그램으로 옴:
> ❌ 마포구 크롤링 실패
> 실행 번호: #42
> 시각: 2026-04-06 05:03 KST
> 원인 확인: (run URL)
> 쿠키 만료일 수도 있음 → 로컬에서 `bash scripts/push-cookie-to-github.sh`

**성공 시에도 알림을 받고 싶다면:**
```bash
gh variable set TELEGRAM_NOTIFY_SUCCESS -b true
```

#### 이메일 (GitHub 기본)
별도 설정 없이도 동작한다. GitHub는 워크플로우 실패 시 저장소 소유자에게 이메일을
보낸다. 단:
- 알림이 누락되는 경우가 잦으니 다음 설정을 확인할 것
  - https://github.com/settings/notifications → "Actions" 섹션 → "Email"과
    "Send notifications for failed workflows only" 체크
- 스케줄 워크플로우는 워크플로우 파일을 **마지막으로 수정한 사용자**에게만 기본적으로
  이메일이 간다. 공동 작업자가 있으면 각자 위 설정 확인 필요

#### 외부 SMTP로 직접 이메일 보내기 (선택)
더 확실한 이메일이 필요하면 `dawidd6/action-send-mail@v3` 액션을 추가해 Gmail
SMTP 등으로 직접 발송 가능. 앱 비밀번호 + 2FA 설정 필요해서 본 저장소는
기본 활성화하지 않았다. 필요 시 요청하면 추가한다.

### 관련 보안 메모
GitHub Actions 시크릿은 workflow 로그에 `***`로 마스킹되지만, 시크릿 값을
실수로 `echo`하거나 artifact에 그대로 저장하지 않도록 주의. 본 저장소의
workflow는 쿠키 **길이**만 출력하고 값 자체는 찍지 않는다.

웹 보안/쿠키 복호화의 배경 원리는 [`WEB_SECURITY.md`](./WEB_SECURITY.md) 참고.
