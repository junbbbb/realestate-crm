"""
마포구 전체 크롤링 — fin.land API 동별 순회
각 동의 clusters → clusteredArticles 페이지네이션
"""
import json
import os
import time
import sys
from datetime import datetime
from curl_cffi import requests as cf_requests

from dotenv import load_dotenv
load_dotenv(".env.local")

COOKIE = os.environ.get("NAVER_COOKIE", "")
if not COOKIE:
    print("NAVER_COOKIE 환경변수 필요 (.env.local에 추가)")
    sys.exit(1)

HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "ko,en-US;q=0.9,en;q=0.8",
    "content-type": "application/json",
    "origin": "https://fin.land.naver.com",
    "referer": "https://fin.land.naver.com/map?tradeTypes=B1-B2-A1-B3&realEstateTypes=D03-D04-E01-Z00-D02&showOnlySelectedRegion=true",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "cookie": COOKIE,
}

CLUSTERS_URL = "https://fin.land.naver.com/front-api/v1/article/map/articleClusters"
ARTICLES_URL = "https://fin.land.naver.com/front-api/v1/article/clusteredArticles"

REGIONS = json.load(open("data/regions.json"))["regionList"]

# 동별 bounding box (centerLat/centerLon 기준 약 ±0.01)
def region_bbox(region, pad=0.015):
    lat = region["centerLat"]
    lon = region["centerLon"]
    return {
        "left": lon - pad,
        "right": lon + pad,
        "top": lat + pad,
        "bottom": lat - pad,
    }


def make_filter(cortar_no):
    return {
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
        "legalDivisionNumbers": [cortar_no],
        "legalDivisionType": "EUP",
    }


def fetch_clusters(cortar_no, bbox):
    body = {
        "filter": make_filter(cortar_no),
        "boundingBox": bbox,
        "precision": 14,
        "userChannelType": "PC",
    }
    r = cf_requests.post(CLUSTERS_URL, headers=HEADERS, json=body, impersonate="chrome")
    if r.status_code != 200:
        return None
    return r.json()


def fetch_articles(cluster_id, cortar_no, seed=None, last_info=None):
    paging = {
        "size": 30,
        "userChannelType": "PC",
        "articleSortType": "RANKING_DESC",
    }
    if seed:
        paging["seed"] = seed
    if last_info:
        paging["lastInfo"] = last_info
    body = {
        "clusterId": cluster_id,
        "filter": make_filter(cortar_no),
        "articlePagingRequest": paging,
    }
    r = cf_requests.post(ARTICLES_URL, headers=HEADERS, json=body, impersonate="chrome")
    if r.status_code != 200:
        return None
    return r.json()


def crawl_dong(region):
    dong = region["cortarName"]
    cortar = region["cortarNo"]
    bbox = region_bbox(region)

    print(f"\n=== {dong} ({cortar}) ===")

    # 1. Clusters
    cdata = fetch_clusters(cortar, bbox)
    if not cdata or not cdata.get("isSuccess"):
        print(f"  클러스터 실패")
        return []

    result = cdata.get("result", {})
    total = result.get("totalCount", 0)
    clusters = result.get("clusters", [])
    print(f"  예상 {total}건 / 클러스터 {len(clusters)}개")

    if total == 0:
        return []

    # 2. 각 클러스터 순회
    all_articles = []
    seen = set()

    for c in clusters:
        cid = c.get("clusterId")
        expected = c.get("articleCount", 0)
        if not cid or expected == 0:
            continue

        seed = None
        last_info = None
        page = 0

        while page < 200:
            page += 1
            resp = fetch_articles(cid, cortar, seed=seed, last_info=last_info)
            if not resp or not resp.get("isSuccess"):
                break

            res = resp.get("result", {})
            items = res.get("list", [])

            new_cnt = 0
            for item in items:
                info = item.get("representativeArticleInfo", item)
                aid = info.get("articleNumber", "")
                if aid and aid not in seen:
                    seen.add(aid)
                    item["_dong"] = dong
                    all_articles.append(item)
                    new_cnt += 1

            last_info = res.get("lastInfo")
            seed = res.get("seed") or seed
            has_next = res.get("hasNextPage", False)

            if not has_next or len(items) == 0:
                break
            time.sleep(0.2)

        # 간단 요약만
    print(f"  → 수집 {len(all_articles)}건")
    return all_articles


def main():
    print(f"=== 마포구 {len(REGIONS)}개 동 크롤링 (fin.land) ===")

    all_articles = []
    seen = set()
    summary = {}

    for region in REGIONS:
        items = crawl_dong(region)
        for item in items:
            info = item.get("representativeArticleInfo", item)
            aid = info.get("articleNumber", "")
            if aid and aid not in seen:
                seen.add(aid)
                all_articles.append(item)
        summary[region["cortarName"]] = len(items)
        time.sleep(0.3)

    print(f"\n\n=== 마포구 전체: {len(all_articles)}건 ===")
    for dong, cnt in sorted(summary.items(), key=lambda x: -x[1]):
        print(f"  {dong}: {cnt}건")

    os.makedirs("data", exist_ok=True)
    out = f"data/crawled-mapo-fin-{datetime.now().strftime('%Y-%m-%d')}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n저장: {out}")


if __name__ == "__main__":
    main()
