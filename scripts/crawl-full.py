"""
네이버 부동산 크롤링 — 마포구 동별 전체
API intercept 방식
"""

import json
import os
import time
from datetime import datetime
from scrapling import StealthyFetcher

OUT_PATH = f"data/crawled-mapo-full-{datetime.now().strftime('%Y-%m-%d')}.json"

REGIONS = json.load(open("data/regions.json"))["regionList"]

TRADE_TYPES = [
    ("월세", "B2"),
    ("전세", "B1"),
    ("매매", "A1"),
]

PROP_TYPES = [
    ("상가", "SG"),
    ("사무실", "SMS"),
    ("건물", "DDDGG"),
]


def crawl_all_dong(page):
    all_articles = []
    seen_ids = set()

    total_combos = len(REGIONS) * len(PROP_TYPES) * len(TRADE_TYPES)
    done = 0

    for region in REGIONS:
        dong_name = region["cortarName"]
        cortar_no = region["cortarNo"]

        for prop_label, prop_code in PROP_TYPES:
            for trade_label, trade_code in TRADE_TYPES:
                done += 1
                label = f"{dong_name}/{prop_label}/{trade_label}"

                captured = []

                def make_handler(store):
                    def handle(response):
                        if '/api/articles' in response.url and 'clusters' not in response.url and 'interests' not in response.url:
                            try:
                                body = response.json()
                                store.extend(body.get('articleList', []))
                            except:
                                pass
                    return handle

                handler = make_handler(captured)
                page.on('response', handler)

                url = f"https://new.land.naver.com/offices?ms={region['centerLat']},{region['centerLon']},16&a={prop_code}&e=RETAIL&cortarNo={cortar_no}&tradeType={trade_code}"
                try:
                    page.goto(url, wait_until="networkidle", timeout=15000)
                    time.sleep(2)

                    # 스크롤
                    for _ in range(10):
                        page.evaluate('() => window.scrollBy(0, 1000)')
                        time.sleep(0.8)
                except:
                    pass

                page.remove_listener('response', handler)

                # 중복 제거
                new_count = 0
                for a in captured:
                    aid = a.get('articleNo', '')
                    if aid and aid not in seen_ids:
                        seen_ids.add(aid)
                        a['_dong'] = dong_name
                        a['_propType'] = prop_label
                        a['_tradeType'] = trade_label
                        all_articles.append(a)
                        new_count += 1

                if new_count > 0:
                    print(f"  [{done}/{total_combos}] {label}: +{new_count}건 (누적 {len(all_articles)})")

    # 저장
    out = f"/mnt/c/Users/lbj/Documents/projects/realestate-crm/{OUT_PATH}"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n  === 총 {len(all_articles)}건 저장 → {OUT_PATH} ===")


def main():
    print(f"=== 마포구 동별 전체 크롤링 ===")
    print(f"{len(REGIONS)}개 동 x {len(PROP_TYPES)} 유형 x {len(TRADE_TYPES)} 거래 = {len(REGIONS)*len(PROP_TYPES)*len(TRADE_TYPES)} 조합")
    print()

    StealthyFetcher.fetch(
        "https://new.land.naver.com/offices",
        real_chrome=True,
        headless=True,
        network_idle=True,
        wait=3000,
        timeout=600000,
        page_action=crawl_all_dong,
    )

    # 요약
    full_path = f"/mnt/c/Users/lbj/Documents/projects/realestate-crm/{OUT_PATH}"
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        by_dong = {}
        by_prop = {}
        by_trade = {}
        for item in data:
            d = item.get('_dong', '?')
            p = item.get('_propType', '?')
            t = item.get('_tradeType', '?')
            by_dong[d] = by_dong.get(d, 0) + 1
            by_prop[p] = by_prop.get(p, 0) + 1
            by_trade[t] = by_trade.get(t, 0) + 1

        print(f"\n=== 최종 결과 ===")
        print(f"총: {len(data)}건")
        print(f"유형별: {by_prop}")
        print(f"거래별: {by_trade}")
        print(f"동별 TOP10:")
        for dong, cnt in sorted(by_dong.items(), key=lambda x: -x[1])[:10]:
            print(f"  {dong}: {cnt}건")


if __name__ == "__main__":
    main()
