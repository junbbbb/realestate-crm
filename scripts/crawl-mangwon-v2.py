"""
망원동 상가 + 건물 — 페이지 내 fetch 직접 호출
네이버 세션 확보 후 /api/articles 페이지네이션 수동 순회
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

    # 네이버 부동산 페이지 로드 (세션/쿠키 확보)
    init_url = f"https://new.land.naver.com/offices?ms={LAT},{LON},16&a=SG&e=RETAIL&cortarNo={CORTAR}"
    page.goto(init_url, wait_until="networkidle")
    time.sleep(5)
    print("  세션 확보 완료")

    all_articles = []
    seen_ids = set()

    for prop_label, prop_code in PROP_TYPES:
        print(f"\n  === {prop_label} ===")

        # 거래유형별로 각각 요청
        for trade_code, trade_name in TRADE_MAP.items():
            # 페이지네이션으로 전부 수집
            result = page.evaluate(f"""async () => {{
                const collected = [];
                for (let p = 1; p <= 50; p++) {{
                    try {{
                        const url = 'https://new.land.naver.com/api/articles?cortarNo={CORTAR}'
                            + '&order=rank'
                            + '&realEstateType={prop_code}'
                            + '&tradeType={trade_code}'
                            + '&page=' + p
                            + '&sameAddressGroup=false'
                            + '&articleState=';
                        const res = await fetch(url, {{
                            credentials: 'include',
                            headers: {{
                                'Accept': 'application/json, text/plain, */*',
                                'Referer': 'https://new.land.naver.com/offices'
                            }}
                        }});
                        if (!res.ok) {{
                            console.log('HTTP', res.status, 'page', p);
                            return {{error: 'status ' + res.status, page: p, collected}};
                        }}
                        const data = await res.json();
                        const list = data.articleList || [];
                        if (list.length === 0) break;
                        collected.push(...list);
                        if (!data.isMoreData) break;
                        await new Promise(r => setTimeout(r, 150));
                    }} catch(e) {{
                        return {{error: e.message, page: p, collected}};
                    }}
                }}
                return {{collected}};
            }}""")

            if not result:
                print(f"    [{trade_name}] 응답 없음")
                continue

            if result.get("error"):
                print(f"    [{trade_name}] 에러: {result['error']} @ page {result.get('page')}")

            articles = result.get("collected", [])
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

            print(f"    [{trade_name}] API {len(articles)} → 신규 {new_count} (누적 {len(all_articles)})")
            time.sleep(0.3)

    out = "data/crawled-mangwon.json"
    os.makedirs("data", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n  === 총 {len(all_articles)}건 저장 → {out} ===")


def main():
    print("=== 망원동 크롤링 v2 (직접 API 페이지네이션) ===")
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

    print(f"\n=== 망원동 결과 ===")
    print(f"총: {len(data)}건")
    print(f"유형별: {by_prop}")
    print(f"거래별: {by_trade}")
    print("조합별:")
    for combo, cnt in sorted(by_combo.items()):
        print(f"  {combo}: {cnt}건")


if __name__ == "__main__":
    main()
