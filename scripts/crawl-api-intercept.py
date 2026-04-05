"""
네이버 부동산 크롤링 — API 응답 가로채기 방식
카테고리별 50건씩
"""

import json
import sys
import os
import time
from datetime import datetime
from scrapling import StealthyFetcher

PER_CATEGORY = int(sys.argv[1]) if len(sys.argv) > 1 else 50
OUT_PATH = f"data/crawled-mapo-{datetime.now().strftime('%Y-%m-%d')}.json"

CATEGORIES = [
    ("상가/월세", "SG", "B2"),
    ("상가/전세", "SG", "B1"),
    ("상가/매매", "SG", "A1"),
    ("사무실/월세", "SMS", "B2"),
    ("사무실/전세", "SMS", "B1"),
    ("사무실/매매", "SMS", "A1"),
    ("건물/월세", "DDDGG", "B2"),
    ("건물/전세", "DDDGG", "B1"),
    ("건물/매매", "DDDGG", "A1"),
]

TRADE_NAMES = {"A1": "매매", "B1": "전세", "B2": "월세"}
TYPE_NAMES = {"SG": "상가", "SMS": "사무실", "DDDGG": "건물"}


def crawl_categories(page):
    all_articles = []

    for label, real_estate_type, trade_type in CATEGORIES:
        print(f"\n  === {label} ===")
        captured = []

        def make_handler(store):
            def handle(response):
                if '/api/articles' in response.url and 'clusters' not in response.url and 'interests' not in response.url:
                    try:
                        body = response.json()
                        articles = body.get('articleList', [])
                        store.extend(articles)
                    except:
                        pass
            return handle

        handler = make_handler(captured)
        page.on('response', handler)

        # 해당 카테고리 URL로 이동
        url = f"https://new.land.naver.com/offices?ms=37.5572,126.9236,15&a={real_estate_type}&e=RETAIL&cortarNo=1144000000&tradeType={trade_type}"
        page.goto(url, wait_until="networkidle")
        time.sleep(3)

        # 스크롤해서 더 로드
        stale = 0
        prev = len(captured)
        while len(captured) < PER_CATEGORY and stale < 8:
            page.evaluate('() => window.scrollBy(0, 1000)')
            time.sleep(1.5)
            if len(captured) == prev:
                stale += 1
            else:
                stale = 0
            prev = len(captured)

        # 리스너 제거
        page.remove_listener('response', handler)

        # 중복 제거 (articleNo 기준)
        seen = set()
        unique = []
        for a in captured:
            aid = a.get('articleNo', '')
            if aid and aid not in seen:
                seen.add(aid)
                unique.append(a)

        trimmed = unique[:PER_CATEGORY]
        print(f"    수집: {len(trimmed)}건 (원본 {len(captured)}, 중복제거 {len(unique)})")

        # 카테고리 태그 추가
        for a in trimmed:
            a['_category'] = label
            a['_propType'] = TYPE_NAMES.get(real_estate_type, real_estate_type)
            a['_tradeType'] = TRADE_NAMES.get(trade_type, trade_type)

        all_articles.extend(trimmed)

    # 결과 저장
    out = f"/mnt/c/Users/lbj/Documents/projects/realestate-crm/{OUT_PATH}"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n  === 총 {len(all_articles)}건 저장 → {OUT_PATH} ===")


def main():
    print(f"=== 네이버 부동산 크롤링 (API Intercept) ===")
    print(f"카테고리별 {PER_CATEGORY}건")
    print(f"총 {len(CATEGORIES)} 카테고리")

    StealthyFetcher.fetch(
        "https://new.land.naver.com/offices",
        real_chrome=True,
        headless=True,
        network_idle=True,
        wait=3000,
        page_action=crawl_categories,
    )

    # 결과 요약
    full_path = f"/mnt/c/Users/lbj/Documents/projects/realestate-crm/{OUT_PATH}"
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        by_cat = {}
        for item in data:
            cat = item.get('_category', '?')
            by_cat[cat] = by_cat.get(cat, 0) + 1

        print(f"\n=== 결과 요약 ===")
        for cat, count in by_cat.items():
            print(f"  {cat}: {count}건")
        print(f"  합계: {len(data)}건")

        if data:
            print(f"\n  샘플: {data[0].get('articleFeatureDesc', '')[:50]}")


if __name__ == "__main__":
    main()
