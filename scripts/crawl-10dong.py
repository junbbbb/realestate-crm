"""10개 동 크롤링"""
import json, os, time
from scrapling import StealthyFetcher

TRADE_MAP = {"A1": "매매", "B1": "전세", "B2": "월세"}
PROP_TYPES = [("상가", "SG"), ("사무실", "SMS"), ("건물", "DDDGG")]
REGIONS = json.load(open("data/regions.json"))["regionList"][:10]

def crawl(page):
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
                    if "/api/articles" in response.url and "clusters" not in response.url and "interests" not in response.url:
                        try:
                            body = response.json()
                            store.extend(body.get("articleList", []))
                        except:
                            pass
                return handle

            handler = make_handler(captured)
            page.on("response", handler)

            url = f"https://new.land.naver.com/offices?ms={lat},{lon},17&a={prop_code}&e=RETAIL&cortarNo={cortar}"
            try:
                page.goto(url, wait_until="networkidle", timeout=15000)
                time.sleep(2)
                stale = 0
                prev = len(captured)
                while stale < 5:
                    page.evaluate("() => window.scrollBy(0, 1000)")
                    time.sleep(1)
                    if len(captured) == prev:
                        stale += 1
                    else:
                        stale = 0
                    prev = len(captured)
            except:
                pass

            page.remove_listener("response", handler)

            new_count = 0
            for a in captured:
                aid = a.get("articleNo", "")
                if aid and aid not in seen_ids:
                    seen_ids.add(aid)
                    a["_dong"] = dong
                    a["_propType"] = prop_label
                    tc = a.get("tradeTypeCode", "")
                    a["_tradeType"] = TRADE_MAP.get(tc, tc)
                    all_articles.append(a)
                    new_count += 1

            if new_count > 0:
                print(f"  [{done}/{total}] {dong}/{prop_label}: +{new_count} (누적 {len(all_articles)})")
            time.sleep(0.3)

    out = "data/crawled-mapo-10dong.json"
    os.makedirs("data", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n  === 총 {len(all_articles)}건 저장 ===")

dongs = ", ".join(r["cortarName"] for r in REGIONS)
print(f"=== 10개 동: {dongs} ===")

StealthyFetcher.fetch(
    "https://new.land.naver.com/offices",
    real_chrome=True, headless=True, network_idle=True,
    wait=3000, timeout=600000, page_action=crawl,
)

data = json.load(open("data/crawled-mapo-10dong.json"))
by_trade = {}
by_prop = {}
by_dong = {}
for item in data:
    by_trade[item.get("_tradeType", "?")] = by_trade.get(item.get("_tradeType", "?"), 0) + 1
    by_prop[item.get("_propType", "?")] = by_prop.get(item.get("_propType", "?"), 0) + 1
    by_dong[item.get("_dong", "?")] = by_dong.get(item.get("_dong", "?"), 0) + 1
print(f"\n총: {len(data)}건")
print(f"거래별: {by_trade}")
print(f"유형별: {by_prop}")
print("동별:")
for d, c in sorted(by_dong.items(), key=lambda x: -x[1]):
    print(f"  {d}: {c}건")
