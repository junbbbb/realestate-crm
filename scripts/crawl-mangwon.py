"""
망원동 상가 + 건물 전체 크롤링
거래유형 필터 없이 전체 → 응답에서 분류
"""
import json
import os
import time
from datetime import datetime
from scrapling import StealthyFetcher

DONG = "망원동"
CORTAR = "1144012300"
LAT = 37.5561
LON = 126.9016

PROP_TYPES = [
    ("상가", "SG"),
    ("건물", "DDDGG"),
]

TRADE_MAP = {
    "A1": "매매",
    "B1": "전세",
    "B2": "월세",
    "B3": "단기임대",
}


def crawl(page):
    import time

    all_articles = []
    seen_ids = set()

    for prop_label, prop_code in PROP_TYPES:
        captured = []

        def make_handler(store):
            def handle(response):
                url = response.url
                if '/api/articles' in url and 'clusters' not in url and 'interests' not in url:
                    try:
                        body = response.json()
                        store.extend(body.get('articleList', []))
                    except:
                        pass
            return handle

        handler = make_handler(captured)
        page.on('response', handler)

        url = f"https://new.land.naver.com/offices?ms={LAT},{LON},17&a={prop_code}&e=RETAIL&cortarNo={CORTAR}"
        print(f"\n  === {prop_label} 크롤링 ===")
        print(f"  URL: {url}")

        try:
            page.goto(url, wait_until="networkidle", timeout=20000)
            time.sleep(3)

            # 스크롤 — 최대한 많이
            stale = 0
            prev = len(captured)
            attempts = 0
            max_attempts = 60
            while stale < 12 and attempts < max_attempts:
                page.evaluate('''() => {
                    // item_list 같은 내부 스크롤 컨테이너 찾기
                    const containers = document.querySelectorAll('[class*="item_list"], [class*="list_contents"], [class*="ArticleList"]');
                    containers.forEach(c => { if (c.scrollBy) c.scrollBy(0, 3000); });
                    window.scrollBy(0, 3000);
                }''')
                time.sleep(1.2)
                if len(captured) == prev:
                    stale += 1
                else:
                    stale = 0
                    print(f"    수집 중: {len(captured)}건")
                prev = len(captured)
                attempts += 1
        except Exception as e:
            print(f"    에러: {e}")

        page.remove_listener('response', handler)

        # 중복 제거
        new_count = 0
        for a in captured:
            aid = a.get('articleNo', '')
            if aid and aid not in seen_ids:
                seen_ids.add(aid)
                a['_dong'] = DONG
                a['_propType'] = prop_label
                tc = a.get('tradeTypeCode', '')
                a['_tradeType'] = TRADE_MAP.get(tc, tc)
                all_articles.append(a)
                new_count += 1

        print(f"  → {prop_label}: API {len(captured)}건 → 신규 {new_count}건 (누적 {len(all_articles)})")

    # 저장
    out = "data/crawled-mangwon.json"
    os.makedirs("data", exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n  === 총 {len(all_articles)}건 저장 → {out} ===")


def main():
    print("=== 망원동 전체 크롤링 ===")
    print(f"유형: 상가, 건물")
    print(f"거래: 전체 (매매/전세/월세/단기임대)")
    print()

    StealthyFetcher.fetch(
        "https://new.land.naver.com/offices",
        real_chrome=True,
        headless=True,
        network_idle=True,
        wait=3000,
        timeout=600000,
        page_action=crawl,
    )

    with open("data/crawled-mangwon.json", 'r', encoding='utf-8') as f:
        data = json.load(f)

    by_prop = {}
    by_trade = {}
    by_combo = {}
    for item in data:
        p = item.get('_propType', '?')
        t = item.get('_tradeType', '?')
        by_prop[p] = by_prop.get(p, 0) + 1
        by_trade[t] = by_trade.get(t, 0) + 1
        by_combo[f"{p}/{t}"] = by_combo.get(f"{p}/{t}", 0) + 1

    print(f"\n=== 망원동 결과 ===")
    print(f"총: {len(data)}건")
    print(f"\n유형별: {by_prop}")
    print(f"거래별: {by_trade}")
    print(f"\n조합별:")
    for combo, cnt in sorted(by_combo.items()):
        print(f"  {combo}: {cnt}건")


if __name__ == "__main__":
    main()
