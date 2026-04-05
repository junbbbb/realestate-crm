"""clusteredArticles 단일 호출 테스트"""
import json
from curl_cffi import requests as cf

with open("/tmp/cookie.txt") as f:
    COOKIE = f.read().strip()

url = "https://fin.land.naver.com/front-api/v1/article/clusteredArticles"
headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "ko,en-US;q=0.9,en;q=0.8",
    "content-type": "application/json",
    "origin": "https://fin.land.naver.com",
    "referer": "https://fin.land.naver.com/map?tradeTypes=B1-B2-A1-B3&realEstateTypes=D03-D04-E01-Z00-D02&showOnlySelectedRegion=true",
    "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "cookie": COOKIE,
}

body = {
    "clusterId": "16/55870/25381",
    "filter": {
        "tradeTypes": ["B1", "B2", "A1", "B3"],
        "realEstateTypes": ["D03", "D04", "E01", "Z00", "D02"],
        "roomCount": [],
        "bathRoomCount": [],
        "optionTypes": [],
        "oneRoomShapeTypes": [],
        "moveInTypes": [],
        "filtersExclusiveSpace": False,
        "floorTypes": [],
        "directionTypes": [],
        "hasArticlePhoto": False,
        "isAuthorizedByOwner": False,
        "parkingTypes": [],
        "entranceTypes": [],
        "hasArticle": False,
        "legalDivisionNumbers": ["1144012300"],
        "legalDivisionType": "EUP",
    },
    "articlePagingRequest": {
        "size": 30,
        "userChannelType": "PC",
        "articleSortType": "RANKING_DESC",
    },
}

r = cf.post(url, headers=headers, json=body, impersonate="chrome")
print(f"Status: {r.status_code}")
print(f"Response length: {len(r.text)}")
data = r.json()
print(json.dumps(data, ensure_ascii=False, indent=2)[:4000])
