"""
망원동 v4 — new.land intercept + 리스트 사이드바 정확 스크롤
"""
import json
import os
import time
from scrapling import StealthyFetcher

DONG = "망원동"
CORTAR = "1144012300"
LAT = 37.5561
LON = 126.9016

TRADE_MAP = {"A1": "매매", "B1": "전세", "B2": "월세", "B3": "단기임대"}
PROP_MAP = {"SG": "상가", "DDDGG": "건물"}


def crawl(page):
    import time

    all_articles = []
    seen_ids = set()

    for prop_code, prop_label in PROP_MAP.items():
        print(f"\n  === {prop_label} ({prop_code}) ===")

        captured = []

        def make_handler(store):
            def handle(response):
                url = response.url
                if "/api/articles" in url and "clusters" not in url and "interests" not in url:
                    try:
                        body = response.json()
                        store.extend(body.get("articleList", []))
                    except:
                        pass
            return handle

        handler = make_handler(captured)
        page.on("response", handler)

        url = f"https://new.land.naver.com/offices?ms={LAT},{LON},16&a={prop_code}&e=RETAIL&cortarNo={CORTAR}"
        page.goto(url, wait_until="networkidle", timeout=20000)
        time.sleep(4)

        # 리스트 사이드바 찾아서 정확히 스크롤
        list_info = page.evaluate("""() => {
            // 가능한 리스트 컨테이너 selectors
            const selectors = [
                '.item_list',
                '[class*="item_list"]',
                '[class*="list_contents"]',
                '[class*="article_list"]',
                'ul[class*="list"]',
                'div[class*="List"]',
            ];
            const found = [];
            for (const sel of selectors) {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    if (el.scrollHeight > el.clientHeight + 20) {
                        found.push({
                            selector: sel,
                            class: el.className?.toString().substring(0, 100),
                            sh: el.scrollHeight,
                            ch: el.clientHeight,
                        });
                    }
                }
            }
            // 모든 요소 중 overflow scroll
            document.querySelectorAll('*').forEach(el => {
                const s = getComputedStyle(el);
                if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) {
                    found.push({
                        selector: 'computed',
                        class: el.className?.toString().substring(0, 100),
                        tag: el.tagName,
                        sh: el.scrollHeight,
                        ch: el.clientHeight,
                    });
                }
            });
            return found;
        }""")
        print(f"    스크롤 가능 컨테이너: {len(list_info)}개")
        for info in list_info[:5]:
            print(f"      {info}")

        # 모든 스크롤 가능 컨테이너 끝까지
        prev = 0
        stale = 0
        attempts = 0
        while stale < 15 and attempts < 80:
            page.evaluate("""() => {
                document.querySelectorAll('*').forEach(el => {
                    const s = getComputedStyle(el);
                    if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) {
                        el.scrollTop = el.scrollHeight;
                    }
                });
                // wheel 이벤트도 시뮬
                window.scrollBy(0, 2000);
            }""")
            time.sleep(0.8)
            if len(captured) == prev:
                stale += 1
            else:
                stale = 0
                print(f"      수집: {len(captured)}")
            prev = len(captured)
            attempts += 1

        page.remove_listener("response", handler)

        new_count = 0
        for a in captured:
            aid = a.get("articleNo", "")
            if aid and aid not in seen_ids:
                seen_ids.add(aid)
                a["_dong"] = DONG
                a["_propType"] = prop_label
                tc = a.get("tradeTypeCode", "")
                a["_tradeType"] = TRADE_MAP.get(tc, tc)
                all_articles.append(a)
                new_count += 1

        print(f"    → {prop_label}: {new_count}건 (누적 {len(all_articles)})")

    out = "data/crawled-mangwon.json"
    os.makedirs("data", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n  === 총 {len(all_articles)}건 저장 ===")


def main():
    print("=== 망원동 v4 (리스트 정확 스크롤) ===")
    StealthyFetcher.fetch(
        "https://new.land.naver.com/",
        real_chrome=True,
        headless=True,
        network_idle=True,
        wait=3000,
        timeout=600000,
        page_action=crawl,
    )

    with open("data/crawled-mangwon.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    by_prop = {}
    by_trade = {}
    by_combo = {}
    for item in data:
        p = item.get("_propType", "?")
        t = item.get("_tradeType", "?")
        by_prop[p] = by_prop.get(p, 0) + 1
        by_trade[t] = by_trade.get(t, 0) + 1
        by_combo[f"{p}/{t}"] = by_combo.get(f"{p}/{t}", 0) + 1

    print(f"\n=== 결과 ===")
    print(f"총: {len(data)}건")
    print(f"유형: {by_prop}")
    print(f"거래: {by_trade}")
    print("조합:")
    for combo, cnt in sorted(by_combo.items()):
        print(f"  {combo}: {cnt}")


if __name__ == "__main__":
    main()
