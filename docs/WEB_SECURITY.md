# 웹 보안 & 데이터 접근 — BEST MOUNTAIN 참고 자료

이 저장소의 크롤링 코드가 왜 동작하는지, 네이버가 어떻게 막으려 하는지,
무엇이 진짜 보안이고 무엇이 "눈치채서 화면 가리기"에 불과한지 정리.

## 1. "F12로 화면 안 보여주기"는 환상이다

### 볼 수 있는 것 (= 내 브라우저에 이미 도착한 것)
- HTML / CSS / JavaScript 전체 소스
- Network 탭에 기록된 서버와의 모든 통신
- 쿠키, localStorage, sessionStorage
- `display: none`, `hidden` 속성으로 감춰둔 요소
- 아무리 난독화(obfuscate)된 JS도 시간과 도구를 들이면 원형 복원 가능

### 볼 수 없는 것 (= 서버에만 있는 것)
- 데이터베이스 전체, 다른 사용자의 데이터
- 백엔드 코드와 로직
- 권한이 없는 API 엔드포인트의 응답
- HTTPS 통신의 중간 경로 (제3자가 가로채도 못 풀음)

**핵심 원칙**: 브라우저까지 도착한 건 그 사용자의 것이다. 진짜로 지키려면
"숨기기"가 아니라 "애초에 보내지 않기"를 해야 한다. 서버 쪽 권한 검사가
답이지 클라이언트 난독화가 답이 아니다.

## 2. 네이버 부동산의 F12 감지 기법

네이버 부동산은 DevTools를 열면 화면에 경고를 띄운다. 완전 차단이 아니라
**열렸음을 감지해서 화면을 가리는** 수준이다. 흔히 쓰이는 탐지 방법:

### (a) 창 크기 차이 감지
```js
setInterval(() => {
  if (window.outerWidth - window.innerWidth > 160) {
    // DevTools가 오른쪽에 docked된 상태
    document.body.innerHTML = "<div>허가되지 않은 접근입니다</div>";
  }
}, 500);
```
DevTools가 docked되면 `innerWidth`는 줄어드는데 `outerWidth`는 그대로라 차이가
확 벌어진다. 가장 흔하고 가장 쉽게 뚫린다 (DevTools를 별도 창으로 분리하면 무력).

### (b) `debugger` 함정
```js
setInterval(() => {
  const t0 = performance.now();
  debugger;
  const t1 = performance.now();
  if (t1 - t0 > 100) {
    // DevTools 열려 있음 — debugger에서 멈춘 시간 감지
    location.reload();
  }
}, 1000);
```
DevTools가 닫혀 있으면 `debugger`는 no-op이라 수 마이크로초, 열려 있으면 사람이
Resume 누를 때까지 멈춘다. 이 시간 차이로 탐지.

### (c) console 객체 getter 트랩
```js
const trap = {};
Object.defineProperty(trap, "id", {
  get() {
    // DevTools가 객체를 펼쳐볼 때 getter가 호출됨
    document.body.innerHTML = "차단됨";
  }
});
console.log(trap);
```
DevTools는 콘솔에 로깅된 객체를 "펼치기" 위해 속성을 읽는다. 일반 실행에선
아무도 안 읽으니 getter가 호출되는 것 자체가 DevTools 열림의 증거.

### (d) 키 이벤트 가로채기
```js
window.addEventListener("keydown", (e) => {
  if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
    e.preventDefault();
    alert("개발자 도구 사용 불가");
  }
});
```
가장 약한 방어. 브라우저 메뉴 → 개발자 도구로 열면 키 이벤트가 발생하지 않아 우회.

### 전부 뚫리는 이유
- DevTools를 **undock(별도 창)**으로 띄우면 창 크기 탐지 무력화
- Sources 탭에서 탐지 코드 라인에 **breakpoint** 걸고 함수 내부를 `return true`로 바꿔버림
- Chrome 시작 시 `--auto-open-devtools-for-tabs` 플래그로 페이지 로드 전에 DevTools 열기
- 확장 프로그램으로 특정 스크립트 URL 차단 (`uBlock Origin`의 custom rules)
- Playwright/Puppeteer 같은 자동화 도구는 애초에 키 이벤트를 보내지 않음

결론: F12 감지는 일반 사용자에게 "함부로 건드리지 말라"는 심리적 장벽일 뿐
기술적 방어가 아니다.

## 3. TLS 지문 차단 — 진짜 방어에 가까운 것

네이버가 봇을 막는 더 강력한 층위는 **TLS 지문(JA3)** 이다. HTTPS 연결을
시작할 때 클라이언트는 ClientHello 메시지를 보내는데, 여기에 담긴
`암호화 스위트 목록 + 확장 목록 + 타원곡선 목록`의 조합이 브라우저마다
조금씩 다르다. Chrome, Firefox, curl, requests, Node fetch가 전부 서로 다른
지문을 찍는다.

네이버는 이 지문을 보고:
- "진짜 Chrome에서 온 요청" → 통과
- "curl이나 python requests에서 온 요청" → `429 TOO_MANY_REQUESTS` 즉시 반환

쿠키가 있어도 이 레이어에서 걸러진다. 그래서 본 저장소의 크롤러는
[`curl_cffi`](https://github.com/lexiforest/curl_cffi)를 쓴다. 이건 Chrome의
TLS 지문을 그대로 복제해서 서버 입장에서 진짜 Chrome과 구별할 수 없게 만든다.

```python
from curl_cffi import requests
r = requests.post(url, json=body, impersonate="chrome")
```

**Playwright(Chromium)도 막히는 이유**: Playwright는 진짜 Chromium 바이너리를
쓰지만 `navigator.webdriver = true`, Chrome DevTools Protocol 활성화 등
자동화 흔적이 남아 있다. `stealth` 플러그인을 써서 이 흔적을 지워도 네이버는
추가 신호(마우스 움직임 궤적, 타이핑 리듬, WebGL 렌더러 문자열 등)로 탐지한다.

## 4. 쿠키 보호 — AES-CBC란?

Chrome은 쿠키를 SQLite DB 파일에 저장하는데, 값 필드는 **암호화**돼 있다.
누가 `~/Library/Application Support/Google/Chrome/Default/Cookies` 파일을
훔쳐가도 그 안의 `NID_SES=abc123...` 같은 값은 바로 읽을 수 없다.

### AES-CBC의 의미
- **AES (Advanced Encryption Standard)**: 2001년 표준화된 대칭키 암호. 은행,
  정부, 브라우저, 메신저가 전부 씀. "튼튼하다" 정도로 이해하면 됨.
- **CBC (Cipher Block Chaining)**: AES를 블록 단위로 적용할 때 이전 블록의
  결과를 다음 블록에 엮어 연쇄적으로 암호화하는 모드. 같은 평문이어도
  앞뒤 맥락에 따라 다른 암호문이 나오게 만든다.
- 최근엔 CBC 대신 GCM 모드가 더 권장되지만 Chrome macOS는 역사적 이유로
  AES-CBC를 쓴다.

### 열쇠는 어디에
macOS **Keychain**(키체인)에 `Chrome Safe Storage`라는 항목으로 저장돼 있다.
Wi-Fi 비밀번호, Safari 자동완성 비밀번호와 같은 금고.

```bash
security find-generic-password -w -s "Chrome Safe Storage"
```
이 명령을 처음 실행하면 맥OS가 "Terminal이 키체인 항목에 접근하려 합니다.
허용?" 다이얼로그를 띄운다. 이 권한은 사용자 본인의 의지로만 줄 수 있다.

### 왜 이게 크롤링에 쓰이나
본 저장소의 [`scripts/extract-naver-cookie.py`](../scripts/extract-naver-cookie.py)는:

1. Chrome의 Cookies DB를 임시 복사
2. Keychain에서 마스터 패스워드 획득 (사용자 허가 필요)
3. PBKDF2(saltysalt, 1003 iterations)로 AES 키 파생
4. 각 `naver.com` 쿠키 값을 AES-CBC로 복호화
5. `key=value; ...` 헤더 문자열로 조립해 `.env.local`에 기록

결과적으로 "Chrome에 로그인된 상태 그대로"를 Python 크롤러가 이어받는다.
이건 본인 컴퓨터에서 본인 쿠키를 꺼내는 거라 합법이고, Keychain 접근 권한
프롬프트가 보안 경계 역할을 한다.

### 남의 컴퓨터에서는 되는가
안 된다. Keychain 접근 권한은 로그인 세션과 사용자별로 묶여 있다. SSH로
원격 접속하면 GUI 프롬프트를 띄울 수 없어서 거부된다. 또한 `security` 명령
자체가 TouchID 등 추가 인증을 요구할 수 있다.

## 5. 진짜 보안은 어디에 있는가

이 문서를 관통하는 메시지:

| 기법 | 실제 보안 효과 |
|---|---|
| F12 차단, 우클릭 금지 | 없음 (심리적 장벽만) |
| JS 난독화 | 시간 지연만 (결국 풀림) |
| DevTools 감지 → 화면 가리기 | 없음 (undock, breakpoint로 우회) |
| TLS 지문 필터링 | 중 (HTTP 클라이언트 라이브러리 차단) |
| 쿠키 암호화 (AES-CBC) | 중 (파일 탈취만으로는 못 뚫음, 키체인 권한 필요) |
| 서버 권한 검사 (토큰/세션) | **높음** |
| 데이터 자체를 안 내려보냄 | **가장 높음** |

"내 브라우저에 도착한 건 내 것"이라는 원칙을 기억하면, 어디가 약하고 어디가
튼튼한지 구분할 수 있다.
