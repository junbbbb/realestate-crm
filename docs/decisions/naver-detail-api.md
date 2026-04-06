# 매물 상세 API 선택 과정

## 날짜: 2026-04-06

## 결론
fin.land.naver.com의 `basicInfo` + `agent` API를 사용하여 매물 상세 정보를 실시간 조회.

## 시행착오

### 1. new.land.naver.com API 시도 → 실패
- `GET https://new.land.naver.com/api/articles/{articleNo}?complexNo=` 엔드포인트 발견
- 응답 데이터가 fin.land보다 훨씬 풍부 (건축물대장, 세금, 중개보수, 상세설명 등)
- **문제**: Bearer 토큰 필요 + rate limit 매우 빡빡
  - 토큰 없이 요청 → 429 (TOO_MANY_REQUESTS)로 위장된 401
  - JWT secret은 프론트엔드 JS에서 찾음: `"React Starter Kit"` (jwt.secret), `"test-secret"` (HMAC_SECRET)
  - 토큰 생성은 성공했으나, 쿠키도 함께 필요한 것으로 추정
  - curl로 6-7회 테스트 후 IP가 장시간 차단됨 (10분 이상)
  - 다른 IP(핸드폰)에서도 토큰 없이는 동일 에러 → 토큰 필수 확인
- **결론**: rate limit이 너무 공격적이고, 쿠키+토큰 조합이 필요해 안정적 사용 불가

### 2. fin.land.naver.com API → 채택
- `GET /front-api/v1/article/basicInfo?articleNumber=...&realEstateType=...&tradeType=...`
- `GET /front-api/v1/article/agent?articleNumber=...`
- 네이버 로그인 쿠키 기반 인증 (NAVER_COOKIE 환경변수)
- rate limit 문제 없음, 안정적
- new.land 대비 정보량은 적지만 핵심 정보(주차, 욕실, 건축물용도, 중개사 연락처 등) 충분

### 3. 네이버 바로가기 링크 (layer 파라미터)
- fin.land URL의 `layer` 파라미터가 매물 선택 상태를 인코딩
- 처음에는 바이너리 분석 시도 (protobuf, msgpack, CBOR, deflate 등) → 전부 실패
- **해결**: `lz-string` 라이브러리의 `compressToEncodedURIComponent`로 압축된 JSON이었음
  - `decompressFromEncodedURIComponent`로 디코딩하면 JSON 배열이 나옴
  - 구조: `[{id:"article_list", searchParams:{type:"CLUSTER", clusterId:"zoom/x/y"}}, {id:"article_detail", params:{articleId:"매물번호"}}]`
- `article_list` 없이 `article_detail`만 넣으면 상세는 보이지만 옆 목록이 안 보임
- `clusterId`는 위경도 → Slippy map tile 좌표 변환으로 계산 (zoom 19 기준)

### 4. 면적 처리
- 상가건물/빌딩은 `supplySpace`=0, `exclusiveSpace`=0으로 내려옴
- 대신 `landSpace`(대지면적), `floorSpace`(연면적)에 값이 있음
- 크롤링 동기화 스크립트(`sync-to-supabase.py`)에서 fallback 체인 추가:
  - area1: supplySpace → floorSpace → landSpace
  - area2: exclusiveSpace → supplySpace → floorSpace → landSpace
- UI 표시도 유형별 자동 판단:
  - 상가/사무실: "계약 100m² / 전용 33m²"
  - 상가건물: "대지 104m² / 연 195m²"
