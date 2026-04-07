"""
테스트: 목록 10건 + 상세(basicInfo/agent) 조회해서 결과 출력.
전체 크롤링 전 상세 데이터 구조 확인용.

사용법:
    python3 scripts/crawl-test-detail.py
"""
import json
import os
import time
from dotenv import load_dotenv
from curl_cffi import requests as cf_requests

load_dotenv(".env.local")

COOKIE = os.environ.get("NAVER_COOKIE", "")
if not COOKIE:
    print("NAVER_COOKIE 환경변수 필요 (.env.local에 추가)")
    exit(1)

HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "ko,en-US;q=0.9,en;q=0.8",
    "content-type": "application/json",
    "origin": "https://fin.land.naver.com",
    "referer": "https://fin.land.naver.com/map",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "cookie": COOKIE,
}

CLUSTERS_URL = "https://fin.land.naver.com/front-api/v1/article/map/articleClusters"
ARTICLES_URL = "https://fin.land.naver.com/front-api/v1/article/clusteredArticles"
BASIC_URL = "https://fin.land.naver.com/front-api/v1/article/basicInfo"
AGENT_URL = "https://fin.land.naver.com/front-api/v1/article/agent"

REGIONS = json.load(open("data/regions.json"))["regionList"]


def make_filter(cortar_no):
    return {
        "tradeTypes": ["B1", "B2", "A1", "B3"],
        "realEstateTypes": ["D01", "D02", "D03", "D04", "D05", "E01", "Z00"],
        "roomCount": [], "bathRoomCount": [], "optionTypes": [],
        "oneRoomShapeTypes": [], "moveInTypes": [],
        "filtersExclusiveSpace": False, "floorTypes": [], "directionTypes": [],
        "hasArticlePhoto": False, "isAuthorizedByOwner": False,
        "parkingTypes": [], "entranceTypes": [], "hasArticle": False,
        "legalDivisionNumbers": [cortar_no], "legalDivisionType": "EUP",
    }


def region_bbox(region, pad=0.015):
    lat = region["centerLat"]
    lon = region["centerLon"]
    return {"left": lon - pad, "right": lon + pad, "top": lat + pad, "bottom": lat - pad}


def fetch_detail(article_no, real_estate_type, trade_type):
    """basicInfo + agent 조회"""
    try:
        basic_res = cf_requests.get(
            f"{BASIC_URL}?articleNumber={article_no}&realEstateType={real_estate_type}&tradeType={trade_type}",
            headers=HEADERS, impersonate="chrome", timeout=15,
        )
        time.sleep(0.3)
        agent_res = cf_requests.get(
            f"{AGENT_URL}?articleNumber={article_no}",
            headers=HEADERS, impersonate="chrome", timeout=15,
        )
        basic = basic_res.json() if basic_res.status_code == 200 else {}
        agent = agent_res.json() if agent_res.status_code == 200 else {}
        return {
            "basicInfo": basic.get("result") if basic.get("isSuccess") else None,
            "agentInfo": agent.get("result") if agent.get("isSuccess") else None,
        }
    except Exception as e:
        print(f"  상세 조회 실패 ({article_no}): {e}")
        return {"basicInfo": None, "agentInfo": None}


def main():
    # 첫 번째 동에서 10건만 가져오기
    region = REGIONS[0]
    dong = region["cortarName"]
    cortar = region["cortarNo"]
    bbox = region_bbox(region)

    print(f"=== 테스트 크롤링: {dong} ({cortar}) — 목록 10건 + 상세 ===\n")

    # 1. 클러스터 조회
    body = {
        "filter": make_filter(cortar),
        "boundingBox": bbox,
        "precision": 14,
        "userChannelType": "PC",
    }
    r = cf_requests.post(CLUSTERS_URL, headers=HEADERS, json=body, impersonate="chrome")
    cdata = r.json()
    if not cdata.get("isSuccess"):
        print("클러스터 조회 실패")
        return

    clusters = cdata["result"]["clusters"]
    total = cdata["result"]["totalCount"]
    print(f"전체 {total}건 / 클러스터 {len(clusters)}개\n")

    # 2. 첫 클러스터에서 10건만
    if not clusters:
        print("클러스터 없음")
        return

    cid = clusters[0]["clusterId"]
    paging = {"size": 10, "userChannelType": "PC", "articleSortType": "RANKING_DESC"}
    body2 = {"clusterId": cid, "filter": make_filter(cortar), "articlePagingRequest": paging}
    r2 = cf_requests.post(ARTICLES_URL, headers=HEADERS, json=body2, impersonate="chrome")
    adata = r2.json()

    if not adata.get("isSuccess"):
        print("매물 목록 조회 실패")
        return

    items = adata["result"]["list"][:10]
    print(f"목록 {len(items)}건 가져옴\n")
    print("=" * 80)

    # 3. 각 매물 상세 조회
    results = []
    for i, item in enumerate(items):
        info = item.get("representativeArticleInfo", item)
        article_no = info.get("articleNumber", "")
        re_type = info.get("realEstateType", "")
        trade_type = info.get("tradeType", "")
        article_name = info.get("articleName", "")
        price_info = info.get("priceInfo", {})

        print(f"\n[{i+1}/{len(items)}] {article_name} (#{article_no}, {re_type}/{trade_type})")
        print(f"  가격: 매매={price_info.get('dealPrice')}, 보증금={price_info.get('warrantyPrice')}, 월세={price_info.get('rentPrice')}")

        time.sleep(0.3)
        detail = fetch_detail(article_no, re_type, trade_type)

        basic = detail["basicInfo"]
        agent = detail["agentInfo"]

        if basic:
            di = basic.get("detailInfo", {})
            fi = di.get("facilityInfo", {})
            si = di.get("spaceInfo", {})
            sz = di.get("sizeInfo", {})
            ad = di.get("articleDetailInfo", {})
            mv = di.get("movingInInfo", {})
            coords = ad.get("coordinates", {})

            print(f"  좌표: ({coords.get('xCoordinate')}, {coords.get('yCoordinate')})")
            print(f"  주차: {fi.get('totalParkingCount')}대 (가능={fi.get('isParkingPossible')})")
            print(f"  건축: {fi.get('buildingConjunctionDate')} ({fi.get('approvalElapsedYear')}년)")
            print(f"  난방: {fi.get('heatingAndCoolingSystemType')} / {fi.get('heatingEnergyType')}")
            print(f"  면적: 전용{sz.get('exclusiveSpace')}m² / 공급{sz.get('supplySpace')}m² ({sz.get('pyeongArea')}평)")
            print(f"  층: {si.get('floorInfo', {}).get('targetFloor')}층/{si.get('floorInfo', {}).get('totalFloor')}층")
            print(f"  용도: {ad.get('buildingUse')}")
            print(f"  설명: {ad.get('articleFeatureDescription', '')[:60]}")
            print(f"  입주: {mv.get('movingInType')} (협의={mv.get('movingInNegotiation')})")
        else:
            print("  상세 없음")

        if agent:
            phone = agent.get("phone", {})
            print(f"  중개사: {agent.get('brokerageName')} / {agent.get('brokerName')}")
            print(f"  연락처: {phone.get('brokerage')} / {phone.get('mobile')}")
            print(f"  주소: {agent.get('address')}")
        else:
            print("  중개사 정보 없음")

        results.append({
            "articleNumber": article_no,
            "listInfo": info,
            "detail": detail,
        })

    # 저장
    out = "data/crawl-test-detail.json"
    os.makedirs("data", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n\n=== 저장: {out} ({len(results)}건) ===")


if __name__ == "__main__":
    main()
