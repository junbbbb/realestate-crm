# 크롤링 검색 조건

현재 `scripts/crawl-mapo-fin.py`와 `scripts/crawl-fin-api.py`에서 사용하는 fin.land API 검색 필터 전체 정리.

관련 파일: `scripts/crawl-mapo-fin.py` (make_filter 함수), `scripts/crawl-fin-api.py` (FILTER_BASE 상수)

---

## 1. 고정 필터

### 지역
- **범위**: 서울시 마포구 전체 (26개 동)
- **동 순회**: `data/regions.json`에 정의된 `cortarNo` 전부
- `legalDivisionNumbers`: `[cortarNo]` (요청마다 동 하나씩)
- `legalDivisionType`: `"EUP"` (동 단위 필터)

### 매물 유형 (realEstateTypes)
7개 코드 전부 포함 = 네이버 "상가·업무" 탭 전체 + 사무실 + 상가주택:

| 코드 | 네이버 분류 | CRM 매핑 |
|---|---|---|
| `D01` | 사무실 | 사무실 |
| `D02` | 상가 / 상가점포 | 상가 |
| `D03` | 상가건물 | 건물 |
| `D04` | 건물 계열 | 건물 |
| `D05` | 상가주택 | 상가주택 |
| `E01` | 오피스 | 건물 |
| `Z00` | 기타 / 토지 | 건물 |

### 거래 유형 (tradeTypes)
4종 모두:

| 코드 | 의미 |
|---|---|
| `A1` | 매매 |
| `B1` | 전세 |
| `B2` | 월세 |
| `B3` | 단기임대 |

---

## 2. 선택 필터 (전부 미적용)

네이버 UI에서 "선택 안 함" 상태로 전송 = 가능한 모든 매물 허용.

| 필터 | 현재 값 | 네이버 UI 의미 |
|---|---|---|
| `roomCount` | `[]` | 방 수 제한 없음 |
| `bathRoomCount` | `[]` | 욕실 수 제한 없음 |
| `floorTypes` | `[]` | 층 제한 없음 (1층/지하/고층 등) |
| `directionTypes` | `[]` | 방향 제한 없음 |
| `optionTypes` | `[]` | 옵션(에어컨, 세탁기 등) 제한 없음 |
| `oneRoomShapeTypes` | `[]` | 원룸 구조 제한 없음 |
| `parkingTypes` | `[]` | 주차 제한 없음 |
| `entranceTypes` | `[]` | 출입구 유형 제한 없음 |
| `moveInTypes` | `[]` | 입주 시기 제한 없음 |
| `filtersExclusiveSpace` | `false` | 면적 기준: 공급면적 사용 (전용면적 아님) |
| `hasArticlePhoto` | `false` | 사진 있는 매물만 X |
| `isAuthorizedByOwner` | `false` | 집주인 인증 매물만 X |
| `hasArticle` | `false` | 확인매물만 X |

---

## 3. 정렬 / 페이지네이션

| 항목 | 값 | 설명 |
|---|---|---|
| `articleSortType` | `"RANKING_DESC"` | 네이버 랭킹 순 (기본) |
| `size` | `30` | 페이지당 매물 수 |
| `seed` | 동적 | 서버가 첫 응답에서 생성 |
| `lastInfo` | 동적 | 다음 페이지 커서 |
| 반복 조건 | `hasNextPage == true` | false가 될 때까지 페이지 요청 |

---

## 4. 클러스터 / 바운딩 박스

동 하나 안에도 매물이 많으면 여러 클러스터로 나뉨. 각 클러스터마다 별도 페이지네이션.

| 항목 | 값 |
|---|---|
| `precision` | `14` |
| `userChannelType` | `"PC"` |
| `boundingBox` | 동 중심 좌표 ±0.015 |

---

## 5. 실제 전송되는 Request Body 예시

망원동 기준:

```json
{
  "filter": {
    "tradeTypes": ["B1", "B2", "A1", "B3"],
    "realEstateTypes": ["D01", "D02", "D03", "D04", "D05", "E01", "Z00"],
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
    "left": 126.8866,
    "right": 126.9166,
    "top": 37.5711,
    "bottom": 37.5411
  },
  "precision": 14,
  "userChannelType": "PC"
}
```

---

## 6. 결과 (2026-04-06 기준)

이 필터로 마포구 전체 수집 시:
- **총 20,180건**
- 동별 TOP: 서교동 6,347 / 연남동 3,066 / 동교동 1,651 / 망원동 1,595 / 합정동 1,546

---

## 7. 검색 조건 수정 방법

`scripts/crawl-mapo-fin.py`의 `make_filter()` 함수를 편집.

### 예시: 상가만, 월세+전세만 수집
```python
def make_filter(cortar_no):
    return {
        "tradeTypes": ["B1", "B2"],           # 전세, 월세만
        "realEstateTypes": ["D02"],            # 상가만
        # ... 나머지 동일
    }
```

### CRM 유형 매핑 (sync-to-supabase.py)
```python
prop_map = {
    "D01": "사무실",
    "D02": "상가",
    "D03": "건물",
    "D04": "건물",
    "D05": "상가주택",
    "E01": "건물",
    "Z00": "건물",
}
```

### 예시: 1층 매물만
```python
"floorTypes": ["GROUND"],  # 또는 네이버 내부 코드 (미확정)
```
⚠️ `floorTypes` 등 세부 필터 코드는 네이버 UI에서 직접 필터 적용 후 DevTools로 실제 전송 값을 다시 캡처해야 함.

### 예시: 특정 동만
`scripts/crawl-fin-api.py`의 `CORTAR`, `LAT`, `LON`, `BOUNDING_BOX` 수정:
```python
CORTAR = "1144012300"  # 망원동
LAT = 37.5561
LON = 126.9016
```

---

## 8. 필터 코드 재캡처 방법

새 필터 코드가 필요할 때:

1. https://fin.land.naver.com/map 접속 후 로그인
2. 원하는 조건으로 필터 적용 (예: 1층만 선택)
3. F12 → Network 탭 → Filter: `article`
4. `clusteredArticles` 또는 `articleClusters` 요청 찾기
5. Request → Payload 탭에서 filter 객체 내용 복사
6. `make_filter()` 함수에 반영

관련 문서: `docs/NAVER_FIN_API.md` — API 전체 스펙
