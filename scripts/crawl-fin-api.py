"""
망원동 크롤링 — fin.land.naver.com /front-api/v1/article/clusteredArticles
사용자 쿠키 활용 + cluster 순회 + 페이지네이션

쿠키는 .env.local의 NAVER_COOKIE 환경변수에서 읽어옴.
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
    "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "cookie": COOKIE,
}

CLUSTERS_URL = "https://fin.land.naver.com/front-api/v1/article/map/articleClusters"
ARTICLES_URL = "https://fin.land.naver.com/front-api/v1/article/clusteredArticles"

FILTER_BASE = {
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
    "legalDivisionNumbers": ["1144012300"],  # 망원동
    "legalDivisionType": "EUP",
}

# 망원동 bounding box
BOUNDING_BOX = {
    "left": 126.88,
    "right": 126.93,
    "top": 37.57,
    "bottom": 37.545,
}


def fetch_clusters():
    """지도 클러스터 목록 조회"""
    body = {
        "filter": FILTER_BASE,
        "boundingBox": BOUNDING_BOX,
        "precision": 14,
        "userChannelType": "PC",
    }
    resp = cf_requests.post(CLUSTERS_URL, headers=HEADERS, json=body, impersonate="chrome")
    print(f"Clusters API: {resp.status_code}")
    if resp.status_code != 200:
        print(f"  Error: {resp.text[:500]}")
        return []
    data = resp.json()
    # 응답 구조 확인
    return data


def fetch_articles_in_cluster(cluster_id, seed=None, last_info=None):
    """특정 cluster 내 매물 목록 (페이지네이션)"""
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
        "filter": FILTER_BASE,
        "articlePagingRequest": paging,
    }
    resp = cf_requests.post(ARTICLES_URL, headers=HEADERS, json=body, impersonate="chrome")
    if resp.status_code != 200:
        return None
    return resp.json()


def main():
    print("=== 망원동 fin.land API 크롤링 ===")

    # 1. 클러스터 조회
    clusters_data = fetch_clusters()
    print(f"\nClusters response keys: {list(clusters_data.keys()) if isinstance(clusters_data, dict) else type(clusters_data)}")

    # 응답 구조 덤프
    if isinstance(clusters_data, dict):
        print(json.dumps(clusters_data, ensure_ascii=False, indent=2)[:3000])

    # 클러스터 ID 추출 — 응답: result.clusters[]
    cluster_ids = []
    total_expected = 0
    if isinstance(clusters_data, dict):
        result = clusters_data.get("result", {})
        total_expected = result.get("totalCount", 0)
        for c in result.get("clusters", []):
            cid = c.get("clusterId")
            if cid:
                cluster_ids.append((cid, c.get("articleCount", 0)))

    print(f"\n예상 총 매물: {total_expected}건")
    print(f"클러스터: {len(cluster_ids)}개")
    for cid, cnt in cluster_ids:
        print(f"  {cid}: {cnt}건")

    if not cluster_ids:
        print("클러스터 없음")
        return

    # 2. 각 클러스터 순회
    all_articles = []
    seen_ids = set()

    for cid, expected_count in cluster_ids:
        print(f"\n  Cluster {cid} (예상 {expected_count}건)")
        last_info = None
        seed = None
        page_num = 0

        while page_num < 200:
            page_num += 1
            api_result = fetch_articles_in_cluster(cid, seed=seed, last_info=last_info)
            if not api_result or not api_result.get("isSuccess"):
                print(f"    page {page_num} 실패: {api_result.get('message') if api_result else 'no response'}")
                break

            res = api_result.get("result", {})
            articles = res.get("list", [])

            new_in_page = 0
            for a in articles:
                # 실제 매물 정보는 representativeArticleInfo에 있음
                info = a.get("representativeArticleInfo") or a
                aid = info.get("articleNumber") or ""
                if aid and aid not in seen_ids:
                    seen_ids.add(aid)
                    # 원본 묶음 유지
                    all_articles.append(a)
                    new_in_page += 1

            # 다음 페이지 정보 (result.lastInfo, result.seed, result.hasNextPage)
            last_info = res.get("lastInfo")
            seed = res.get("seed") or seed
            has_next = res.get("hasNextPage", False)

            print(f"    page {page_num}: {len(articles)}건 (신규 +{new_in_page}, 누적 {len(all_articles)}), next={has_next}")

            if not has_next or len(articles) == 0:
                break

            time.sleep(0.3)

    print(f"\n=== 총 {len(all_articles)}건 ===")

    # 저장
    os.makedirs("data", exist_ok=True)
    out = "data/crawled-mangwon-fin.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"저장: {out}")


if __name__ == "__main__":
    main()
