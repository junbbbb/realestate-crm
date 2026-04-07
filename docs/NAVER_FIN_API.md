# 네이버 부동산 fin.land API 명세

네이버 부동산 크롤링에 사용하는 비공식 API 구조 정리.
출처: 사용자가 fin.land.naver.com 로그인 후 브라우저 DevTools → Network → Copy as cURL로 캡처한 실제 요청.

⚠️ **비공식 API**. 파라미터/응답 구조가 바뀔 수 있음.

---

## 1. 엔드포인트

| Method | URL | 용도 |
|---|---|---|
| POST | `https://fin.land.naver.com/front-api/v1/article/map/articleClusters` | 지도 영역 내 클러스터(집계) 조회 |
| POST | `https://fin.land.naver.com/front-api/v1/article/boundedArticlesCount` | 현재 필터 총 매물 수 |
| POST | `https://fin.land.naver.com/front-api/v1/article/clusteredArticles` | 특정 클러스터 내 매물 리스트 (페이지네이션) |

---

## 2. 인증

**쿠키 기반**. 로그인하지 않은 요청은 401/429로 차단됨.

필수 쿠키 (`NAVER_COOKIE` 환경변수로 저장):
```
NNB=...
NID_AUT=...
NID_SES=...
BUC=...
(그 외 브라우저가 전송하는 모든 쿠키 포함이 안전)
```

### 쿠키 갱신 방법
1. https://fin.land.naver.com/map 접속 후 로그인
2. F12 → Network 탭 → 아무 요청
3. Request Headers의 `cookie:` 값 전체 복사
4. `.env.local`의 `NAVER_COOKIE`에 붙여넣기

쿠키는 만료되므로 크롤링 실패 시 재발급 필요.

---

## 3. 필수 요청 헤더

```
accept: application/json, text/plain, */*
accept-language: ko,en-US;q=0.9,en;q=0.8
content-type: application/json
origin: https://fin.land.naver.com
referer: https://fin.land.naver.com/map?...
sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
sec-fetch-dest: empty
sec-fetch-mode: cors
sec-fetch-site: same-origin
user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/146.0.0.0
cookie: <NAVER_COOKIE>
```

curl_cffi를 사용해 Chrome TLS fingerprint를 흉내 (`impersonate="chrome"`) — 봇 탐지 우회.

---

## 4. 코드 사전

### realEstateTypes (매물 유형)
| 코드 | 의미 | CRM 분류 |
|---|---|---|
| D01 | 사무실 | 사무실 |
| D02 | 상가 / 상가점포 | 상가 |
| D03 | 상가건물 | 건물 |
| D04 | 건물 계열 | 건물 |
| D05 | 상가주택 | 상가주택 |
| E01 | 오피스 | 건물 |
| Z00 | 기타 / 토지 | 건물 |

> 위 7개 코드가 `crawl-mapo-fin.py`에서 사용하는 전체 세트.
> fin.land UI에서 "상가·업무" 탭 선택 시 기본 전송되는 것은 D02, D03, D04, E01, Z00 5개이나,
> D01(사무실)과 D05(상가주택)를 추가하여 7종 모두 수집한다.
> 정확한 각 코드 의미는 네이버가 공식 문서를 내지 않아 경험적으로 추정.

### tradeTypes (거래 유형)
| 코드 | 의미 |
|---|---|
| A1 | 매매 |
| B1 | 전세 |
| B2 | 월세 |
| B3 | 단기임대 |

### legalDivisionType (행정 단위)
| 값 | 의미 |
|---|---|
| `EUP` | 동/읍/면 |
| `SIGUNGU` | 시/군/구 (미확인, 추정) |

### articleSortType (정렬)
| 값 | 의미 |
|---|---|
| `RANKING_DESC` | 네이버 랭킹 기본 순 |

---

## 5. Request Body — `articleClusters`

지도 영역 내 클러스터 목록.

```json
{
  "filter": {
    "tradeTypes": ["B1", "B2", "A1", "B3"],
    "realEstateTypes": ["D01","D02","D03","D04","D05","E01","Z00"],
    "roomCount": [],
    "bathRoomCount": [],
    "optionTypes": [],
    "oneRoomShapeTypes": [],
    "moveInTypes": [],
    "filtersExclusiveSpace": false,
    "floorTypes": [],
    "directionTypes": [],
    "hasArticlePhoto": false,
    "isAuthorizedByOwner": false,
    "parkingTypes": [],
    "entranceTypes": [],
    "hasArticle": false,
    "legalDivisionNumbers": ["1144012300"],
    "legalDivisionType": "EUP"
  },
  "boundingBox": {
    "left": 126.88,
    "right": 126.93,
    "top": 37.57,
    "bottom": 37.545
  },
  "precision": 14,
  "userChannelType": "PC"
}
```

### 필드 설명
- **filter.legalDivisionNumbers**: 법정동 코드 (예: `1144012300` = 마포구 망원동). `data/regions.json`에 마포구 26개 동 코드 있음.
- **filter.legalDivisionType**: 위 코드의 단위. 동 단위면 `"EUP"`.
- **boundingBox**: 지도 뷰포트. left/right는 경도, top/bottom은 위도.
- **precision**: 클러스터 해상도 (14~16 정도 사용). 낮을수록 클러스터가 커짐.
- **userChannelType**: `"PC"` 고정.
- **filter.\*** (빈 배열들): UI 필터 상태. 빈 배열 = 전체.

---

## 6. Response — `articleClusters`

```json
{
  "isSuccess": true,
  "detailCode": "success",
  "message": "",
  "result": {
    "totalCount": 1664,
    "clusters": [
      {
        "clusterId": "16/55870/25381",
        "coordinates": {
          "xCoordinate": 126.90607142,
          "yCoordinate": 37.55528165
        },
        "articleCount": 738
      },
      {
        "clusterId": "16/55870/25380",
        "articleCount": 271,
        "coordinates": { "xCoordinate": 126.90531574, "yCoordinate": 37.55945122 }
      }
      // ...
    ]
  }
}
```

- **result.totalCount**: 필터 전체 매물 수 (지역 + 유형 + 거래 종합)
- **result.clusters[].clusterId**: 타일 좌표 `{zoom}/{x}/{y}` 형식. 이걸 그대로 `clusteredArticles`에 전달.
- **result.clusters[].articleCount**: 해당 클러스터 내 매물 수.
- **articleCount == 1**: 클러스터 안에 매물 1건만 있는 경우 `article` 필드로 바로 포함돼 올 때도 있음.

---

## 7. Request Body — `clusteredArticles`

특정 클러스터 안의 매물 목록 (페이지네이션).

```json
{
  "clusterId": "16/55870/25381",
  "filter": {
    "tradeTypes": ["B1", "B2", "A1", "B3"],
    "realEstateTypes": ["D01","D02","D03","D04","D05","E01","Z00"],
    "roomCount": [],
    "bathRoomCount": [],
    "optionTypes": [],
    "oneRoomShapeTypes": [],
    "moveInTypes": [],
    "filtersExclusiveSpace": false,
    "floorTypes": [],
    "directionTypes": [],
    "hasArticlePhoto": false,
    "isAuthorizedByOwner": false,
    "parkingTypes": [],
    "entranceTypes": [],
    "hasArticle": false,
    "legalDivisionNumbers": ["1144012300"],
    "legalDivisionType": "EUP"
  },
  "articlePagingRequest": {
    "size": 30,
    "userChannelType": "PC",
    "articleSortType": "RANKING_DESC",
    "seed": "0e3794dc-b2cd-4192-a2dc-c26016ed221f",
    "lastInfo": [1, 750.1297393818814, "2617579070"]
  }
}
```

### 페이지네이션 규칙
- **첫 요청**: `seed`, `lastInfo` 없이 전송 → 서버가 새 `seed` 생성해서 응답에 포함
- **다음 요청**: 이전 응답의 `result.seed`, `result.lastInfo`를 그대로 복사해서 전송
- **끝**: `result.hasNextPage == false`가 될 때까지 반복
- **size**: 페이지당 결과 수 (30 권장, UI 기본값)
- **seed는 반드시 유지해야** 동일한 정렬 기준으로 이어지는 페이지 받음

---

## 8. Response — `clusteredArticles`

```json
{
  "isSuccess": true,
  "detailCode": "success",
  "message": "",
  "result": {
    "seed": "02bdd73d-bb7b-43a0-8583-a92e461a8367",
    "lastInfo": [1, 980.9465220600168, "2617927832"],
    "hasNextPage": true,
    "totalCount": 738,
    "list": [
      {
        "representativeArticleInfo": {
          "articleNumber": "2618402354",
          "articleName": "일반상가",
          "buildingType": "D0203",
          "tradeType": "B2",
          "realEstateType": "D02",
          "spaceInfo": {
            "supplySpace": 66.1,
            "exclusiveSpace": 66.1,
            "landSpace": 0,
            "floorSpace": 0,
            "exclusiveSpaceName": "66"
          },
          "landInfo": {},
          "buildingInfo": {
            "buildingConjunctionDateType": "CDY01",
            "buildingConjunctionDate": "20221028",
            "approvalElapsedYear": 4
          },
          "verificationInfo": {
            "verificationType": "NDOC1",
            "isAssociationArticle": false,
            "exposureStartDate": "2026-04-04",
            "articleConfirmDate": "2026-04-04"
          },
          "brokerInfo": {
            "cpId": "NEONET",
            "brokerageName": "초이스 부동산 공인중개사무소",
            "brokerName": "부동산뱅크",
            "cpOutLinkType": "CP_NAME"
          },
          "articleDetail": {
            "direction": "ES",
            "directionStandard": "주된 출입구 기준",
            "articleFeatureDescription": "l굿.초.이.스l권리조정l테라스야장l주방시설l",
            "directTrade": false,
            "floorInfo": "1/4",
            "floorDetailInfo": {
              "targetFloor": "1",
              "totalFloor": "4",
              "groundTotalFloor": "0",
              "undergroundTotalFloor": "0",
              "floorType": "00",
              "residenceType": "1"
            },
            "isSafeLessorOfHug": false
          },
          "articleMediaDto": {
            "imageCount": 18,
            "isVrExposed": false,
            "photos": [
              {
                "imageId": "...",
                "imagePath": "https://landthumb-phinf.pstatic.net/.../.jpg",
                "imageType": "10",
                "isVrExposed": false
              }
            ]
          },
          "priceInfo": {
            "dealPrice": 0,
            "warrantyPrice": 0,
            "rentPrice": 0,
            "priceChangeStatus": 0
          }
        }
      }
      // ... size개
    ]
  }
}
```

### 주요 필드 매핑 (Supabase `properties` 테이블)
| 응답 필드 | DB 컬럼 |
|---|---|
| `representativeArticleInfo.articleNumber` | `id`, `article_no` |
| `representativeArticleInfo.articleName` | `article_name` |
| `representativeArticleInfo.realEstateType` | `real_estate_type` |
| `representativeArticleInfo.tradeType` | `trade_type` |
| `representativeArticleInfo.priceInfo.dealPrice` | 매매 시 `price` |
| `representativeArticleInfo.priceInfo.warrantyPrice` | `warrant_price` |
| `representativeArticleInfo.priceInfo.rentPrice` | `monthly_rent` |
| `representativeArticleInfo.spaceInfo.supplySpace` | `area1` |
| `representativeArticleInfo.spaceInfo.exclusiveSpace` | `area2` |
| `representativeArticleInfo.articleDetail.floorInfo` | `floor_info` |
| `representativeArticleInfo.articleDetail.direction` | `direction` |
| `representativeArticleInfo.articleDetail.articleFeatureDescription` | `description` |
| `representativeArticleInfo.verificationInfo.articleConfirmDate` | `confirm_date` |
| `representativeArticleInfo.brokerInfo.brokerageName` | `realtor_name` |

⚠️ `priceInfo`의 dealPrice / warrantyPrice / rentPrice는 **원 단위 정수** (예: `2000000000` = 20억). PostgreSQL `integer`는 21억이 최대라 `bigint` 사용 필수.

### 가격 해석 규칙
- tradeType == **A1 (매매)**: `dealPrice`가 매매가
- tradeType == **B1 (전세)**: `warrantyPrice`가 전세금, `rentPrice` = 0
- tradeType == **B2 (월세)**: `warrantyPrice` = 보증금, `rentPrice` = 월세
- tradeType == **B3 (단기임대)**: B2와 동일 구조

---

## 9. 전체 크롤링 플로우

1. 각 동(`cortarNo`)에 대해 `boundingBox` 계산 (centerLat/Lon ± 0.015)
2. `articleClusters` 호출 → `totalCount` 확보 + 클러스터 목록
3. 각 클러스터에 대해 `clusteredArticles` 호출:
   - 첫 페이지: `seed`, `lastInfo` 없이
   - 이후: 응답의 `seed`, `lastInfo`를 다음 요청에 전달
   - `hasNextPage == false`까지 반복
4. 모든 매물 `articleNumber` 기준 중복 제거
5. Supabase에 upsert + 가격 변경 시 `price_history` 기록

스크립트 구현:
- `scripts/crawl-fin-api.py` — 특정 동 단독
- `scripts/crawl-mapo-fin.py` — 마포구 26개 동 순회
- `scripts/sync-to-supabase.py` — JSON → Supabase 동기화

---

## 10. 원본 cURL 샘플

사용자가 직접 캡처한 요청 원형 (쿠키는 마스킹).
> 아래 샘플은 초기 캡처본으로 5종(D02-D04, E01, Z00)만 포함. 실제 크롤러는 D01, D05를 추가한 7종을 사용한다.

```bash
curl 'https://fin.land.naver.com/front-api/v1/article/clusteredArticles' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: ko,en-US;q=0.9,en;q=0.8' \
  -H 'content-type: application/json' \
  -b '<NAVER_COOKIE>' \
  -H 'origin: https://fin.land.naver.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://fin.land.naver.com/map?tradeTypes=B1-B2-A1-B3&realEstateTypes=D03-D04-E01-Z00-D02&showOnlySelectedRegion=true&center=126.90511262147334-37.55665605381563&zoom=14.831996068630879' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
  --data-raw '{"clusterId":"16/55870/25381","filter":{"tradeTypes":["B1","B2","A1","B3"],"realEstateTypes":["D03","D04","E01","Z00","D02"],"roomCount":[],"bathRoomCount":[],"optionTypes":[],"oneRoomShapeTypes":[],"moveInTypes":[],"filtersExclusiveSpace":false,"floorTypes":[],"directionTypes":[],"hasArticlePhoto":false,"isAuthorizedByOwner":false,"parkingTypes":[],"entranceTypes":[],"hasArticle":false,"legalDivisionNumbers":["1144012300"],"legalDivisionType":"EUP"},"articlePagingRequest":{"size":30,"userChannelType":"PC","articleSortType":"RANKING_DESC","seed":"0e3794dc-b2cd-4192-a2dc-c26016ed221f","lastInfo":[1,750.1297393818814,"2617579070"]}}'
```

---

## 11. 주의 사항 / 제약

- **비공식 API**: 네이버가 사전 공지 없이 스키마 변경 가능. 크롤링 실패 시 브라우저로 재캡처 후 코드 업데이트 필요.
- **쿠키 만료**: 네이버 로그인 세션은 일정 기간 후 만료됨. 주기적 갱신 필요.
- **Rate limit**: 같은 IP에서 너무 자주 요청하면 429. 요청 간 0.2~0.3초 sleep 권장.
- **TLS fingerprint**: 일반 `requests` 라이브러리는 막힘. `curl_cffi`로 Chrome impersonate 필수.
- **지도 bounding box 의존**: 클러스터는 지도 영역 기준. 한 번에 전 구를 못 가져오므로 동 단위로 쪼개서 요청.
- **동 경계 겹침**: 인접 동의 bounding box가 겹치면 같은 매물이 여러 번 잡힐 수 있음. `articleNumber`로 중복 제거 필수.
- **robots.txt / 이용약관**: 크롤링은 네이버 이용약관과 상충할 수 있음. 개인 용도로만 사용 권장.
