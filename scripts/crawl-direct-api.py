"""
네이버 부동산 크롤링 — 브라우저 내 직접 API 호출
네이버 부동산 페이지 로드 후 → 브라우저 내에서 fetch로 API 직접 호출
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


def crawl_via_eval(page):
    import time

    # 네이버 부동산 마포구 상가 페이지 로드 (세션 확보)
    page.goto(
        "https://new.land.naver.com/offices?ms=37.5572,126.9236,16&a=SG&e=RETAIL&cortarNo=1144000000",
        wait_until="networkidle",
    )
    time.sleep(5)
    print("  페이지 로드 완료")

    all_articles = []
    seen_ids = set()
    total = len(REGIONS) * len(PROP_TYPES)
    done = 0

    for region in REGIONS:
        dong = region["cortarName"]
        cortar = region["cortarNo"]

        for prop_label, prop_code in PROP_TYPES:
            done += 1

            # 브라우저 세션 안에서 API 직접 호출 (페이지 내 fetch → 쿠키/세션 공유)
            result = page.evaluate(f"""async () => {{
                const articles = [];
                for (let pg = 1; pg <= 20; pg++) {{
                    try {{
                        const res = await fetch(
                            'https://new.land.naver.com/api/articles?cortarNo={cortar}&order=rank&realEstateType={prop_code}&page=' + pg + '&sameAddressGroup=true'
                        );
                        if (!res.ok) break;
                        const data = await res.json();
                        const list = data.articleList || [];
                        if (list.length === 0) break;
                        articles.push(...list);
                        if (!data.isMoreData) break;
                    }} catch(e) {{
                        break;
                    }}
                    await new Promise(r => setTimeout(r, 200));
                }}
                return articles;
            }}""")

            if not result:
                continue

            new_count = 0
            for a in result:
                aid = a.get("articleNo", "")
                if aid and aid not in seen_ids:
                    seen_ids.add(aid)
                    a["_dong"] = dong
                    a["_propType"] = prop_label
                    trade_code = a.get("tradeTypeCode", "")
                    a["_tradeType"] = TRADE_MAP.get(trade_code, trade_code)
                    all_articles.append(a)
                    new_count += 1

            if new_count > 0:
                print(f"  [{done}/{total}] {dong}/{prop_label}: +{new_count} (누적 {len(all_articles)})")

            time.sleep(0.3)

    # 저장
    out = f"/mnt/c/Users/lbj/Documents/projects/realestate-crm/{OUT_PATH}"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n  === 총 {len(all_articles)}건 저장 ===")


def main():
    print(f"=== 마포구 전체 크롤링 (직접 API) ===")
    print(f"{len(REGIONS)}개 동 x {len(PROP_TYPES)} 유형 = {len(REGIONS)*len(PROP_TYPES)} 조합")
    print()

    StealthyFetcher.fetch(
        "https://new.land.naver.com/offices",
        real_chrome=True,
        headless=True,
        network_idle=True,
        wait=3000,
        timeout=600000,
        page_action=crawl_via_eval,
    )

    # 요약
    full_path = f"/mnt/c/Users/lbj/Documents/projects/realestate-crm/{OUT_PATH}"
    if os.path.exists(full_path):
        with open(full_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        by_prop = {}
        by_trade = {}
        by_dong = {}
        for item in data:
            by_prop[item.get("_propType", "?")] = by_prop.get(item.get("_propType", "?"), 0) + 1
            by_trade[item.get("_tradeType", "?")] = by_trade.get(item.get("_tradeType", "?"), 0) + 1
            by_dong[item.get("_dong", "?")] = by_dong.get(item.get("_dong", "?"), 0) + 1

        print(f"\n=== 최종 결과 ===")
        print(f"총: {len(data)}건")
        print(f"유형별: {by_prop}")
        print(f"거래별: {by_trade}")
        print(f"동별 TOP10:")
        for dong, cnt in sorted(by_dong.items(), key=lambda x: -x[1])[:10]:
            print(f"  {dong}: {cnt}건")


if __name__ == "__main__":
    main()
