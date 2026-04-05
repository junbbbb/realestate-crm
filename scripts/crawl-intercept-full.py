"""
네이버 부동산 크롤링 — intercept 방식 (동별 goto + API 응답 가로채기)
거래유형 전체, 마포구 26개 동 x 3 유형
"""

import json
import os
import time
from datetime import datetime
from scrapling import StealthyFetcher

OUT_PATH = f"data/crawled-mapo-full-{datetime.now().strftime('%Y-%m-%d')}.json"
REGIONS = json.load(open("data/regions.json"))["regionList"]

PROP_TYPES = [
    ("상가", "SG"),
    ("사무실", "SMS"),
    ("건물", "DDDGG"),
]

TRADE_MAP = {"A1": "매매", "B1": "전세", "B2": "월세"}


def crawl_all(page):
    all_articles = []
    seen_ids = set()
    total = len(REGIONS) * len(PROP_TYPES)
    done = 0

    for region in REGIONS:
        dong = region["cortarName"]
        cortar = region["cortarNo"]
        lat = region["centerLat"]
        lon = region["centerLon"]

        for prop_label, prop_code in PROP_TYPES:
            done += 1
            captured = []

            def make_handler(store):
                def handle(response):
                    url = response.url
                    if '/api/articles' in url and 'clusters' not in url and 'interests' not in url:
                        try:
                            body = response.json()
                            arts = body.get('articleList', [])
                            store.extend(arts)
                        except:
                            pass
                return handle

            handler = make_handler(captured)
            page.on('response', handler)

            # 해당 동 + 유형으로 goto (거래유형 필터 없음 = 전체)
            url = f"https://new.land.naver.com/offices?ms={lat},{lon},17&a={prop_code}&e=RETAIL&cortarNo={cortar}"
            try:
                page.goto(url, wait_until="networkidle", timeout=15000)
                time.sleep(2)

                # 스크롤해서 추가 로드
                stale = 0
                prev = len(captured)
                while stale < 5:
                    page.evaluate('() => window.scrollBy(0, 1000)')
                    time.sleep(1)
                    if len(captured) == prev:
                        stale += 1
                    else:
                        stale = 0
                    prev = len(captured)
            except Exception as e:
                pass

            page.remove_listener('response', handler)

            # 중복 제거 + 메타 추가
            new_count = 0
            for a in captured:
                aid = a.get('articleNo', '')
                if aid and aid not in seen_ids:
                    seen_ids.add(aid)
                    a['_dong'] = dong
                    a['_propType'] = prop_label
                    tc = a.get('tradeTypeCode', '')
                    a['_tradeType'] = TRADE_MAP.get(tc, tc)
                    all_articles.append(a)
                    new_count += 1

            if new_count > 0:
                print(f"  [{done}/{total}] {dong}/{prop_label}: +{new_count} (누적 {len(all_articles)})")

            time.sleep(0.3)

    # 저장
    out = f"/mnt/c/Users/lbj/Documents/projects/realestate-crm/{OUT_PATH}"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n  === 총 {len(all_articles)}건 저장 ===")


def main():
    print(f"=== 마포구 전체 크롤링 (intercept) ===")
    print(f"{len(REGIONS)}개 동 x {len(PROP_TYPES)} 유형 = {len(REGIONS)*len(PROP_TYPES)} 조합")
    print(f"거래유형: 전체")
    print()

    StealthyFetcher.fetch(
        "https://new.land.naver.com/offices",
        real_chrome=True,
        headless=True,
        network_idle=True,
        wait=3000,
        timeout=600000,
        page_action=crawl_all,
    )

    # 요약
    full_path = f"/mnt/c/Users/lbj/Documents/projects/realestate-crm/{OUT_PATH}"
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        by_prop = {}
        by_trade = {}
        by_dong = {}
        for item in data:
            by_prop[item.get('_propType', '?')] = by_prop.get(item.get('_propType', '?'), 0) + 1
            by_trade[item.get('_tradeType', '?')] = by_trade.get(item.get('_tradeType', '?'), 0) + 1
            by_dong[item.get('_dong', '?')] = by_dong.get(item.get('_dong', '?'), 0) + 1

        print(f"\n=== 최종 결과 ===")
        print(f"총: {len(data)}건")
        print(f"유형별: {by_prop}")
        print(f"거래별: {by_trade}")
        print(f"동별 TOP10:")
        for d, c in sorted(by_dong.items(), key=lambda x: -x[1])[:10]:
            print(f"  {d}: {c}건")


if __name__ == "__main__":
    main()
