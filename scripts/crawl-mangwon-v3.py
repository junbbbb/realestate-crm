"""
망원동 상가 + 건물 — new.land.naver.com API 페이지네이션 (내부 fetch)
거래유형별로 각각 A1/B1/B2/B3 페이지 1부터 끝까지
"""
import json
import os
import time
from scrapling import StealthyFetcher

DONG = "망원동"
CORTAR = "1144012300"
LAT = 37.5561
LON = 126.9016

PROP_TYPES = [
    ("상가", "SG"),
    ("건물", "DDDGG"),
]

TRADE_MAP = {"A1": "매매", "B1": "전세", "B2": "월세", "B3": "단기임대"}


def crawl(page):
    import time

    # new.land에서 세션 확보
    page.goto(
        f"https://new.land.naver.com/offices?ms={LAT},{LON},17&a=SG&e=RETAIL&cortarNo={CORTAR}",
        wait_until="networkidle",
    )
    time.sleep(4)
    print("  new.land 세션 확보")

    all_articles = []
    seen_ids = set()

    for prop_label, prop_code in PROP_TYPES:
        print(f"\n  === {prop_label} ({prop_code}) ===")

        for trade_code, trade_name in TRADE_MAP.items():
            # 페이지네이션 수동
            result = page.evaluate(f"""async () => {{
                const all = [];
                let lastErr = null;
                for (let pg = 1; pg <= 50; pg++) {{
                    try {{
                        const url = 'https://new.land.naver.com/api/articles'
                            + '?cortarNo={CORTAR}'
                            + '&order=rank'
                            + '&realEstateType={prop_code}'
                            + '&tradeType={trade_code}'
                            + '&page=' + pg
                            + '&articleState=';
                        const res = await fetch(url, {{
                            credentials: 'include',
                            headers: {{
                                'Accept': 'application/json, text/plain, */*',
                                'Referer': 'https://new.land.naver.com/'
                            }}
                        }});
                        if (!res.ok) {{
                            lastErr = 'HTTP ' + res.status;
                            break;
                        }}
                        const data = await res.json();
                        const list = data.articleList || [];
                        if (list.length === 0) break;
                        all.push(...list);
                        if (!data.isMoreData) break;
                        await new Promise(r => setTimeout(r, 200));
                    }} catch(e) {{
                        lastErr = e.message;
                        break;
                    }}
                }}
                return {{all, lastErr}};
            }}""")

            if not result:
                print(f"    [{trade_name}] 응답 없음")
                continue

            articles = result.get("all", [])
            err = result.get("lastErr")

            new_count = 0
            for a in articles:
                aid = a.get("articleNo", "")
                if aid and aid not in seen_ids:
                    seen_ids.add(aid)
                    a["_dong"] = DONG
                    a["_propType"] = prop_label
                    tc = a.get("tradeTypeCode", "")
                    a["_tradeType"] = TRADE_MAP.get(tc, tc)
                    all_articles.append(a)
                    new_count += 1

            err_str = f" 에러:{err}" if err else ""
            print(f"    [{trade_name}] API {len(articles)} → 신규 {new_count}{err_str}")
            time.sleep(0.3)

    out = "data/crawled-mangwon.json"
    os.makedirs("data", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n  === 총 {len(all_articles)}건 저장 ===")


def main():
    print("=== 망원동 v3 (new.land API 페이지네이션) ===")
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
