"""fin.land — 매물 리스트 API 찾기 (스크롤 + 전부 캡처)"""
import json
from scrapling import StealthyFetcher


def explore(page):
    import time

    reqs = []
    resps = []

    def on_request(request):
        if "/front-api/" in request.url:
            reqs.append({
                "method": request.method,
                "url": request.url,
                "body": request.post_data,
            })

    def on_response(response):
        if "/front-api/" in response.url:
            try:
                data = response.json()
                resps.append({"url": response.url, "data": data})
            except:
                pass

    page.on("request", on_request)
    page.on("response", on_response)

    target_url = "https://fin.land.naver.com/map?center=126.9016-37.5561&realEstateTypes=D02&tradeTypes=B1-B2-A1-B3&zoom=15&showOnlySelectedRegion=true"
    page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(8)

    # 리스트 영역 찾아서 스크롤
    scroll_result = page.evaluate("""() => {
        // 여러 스크롤 가능 컨테이너 시도
        const all = document.querySelectorAll('*');
        const scrollables = [];
        for (const el of all) {
            const style = getComputedStyle(el);
            if ((style.overflow === 'auto' || style.overflowY === 'auto' || style.overflow === 'scroll' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) {
                scrollables.push({
                    tag: el.tagName,
                    class: el.className?.toString().substring(0, 80),
                    sh: el.scrollHeight,
                    ch: el.clientHeight,
                });
                el.scrollTop = el.scrollHeight;
            }
        }
        return scrollables;
    }""")
    print(f"스크롤 가능 요소: {len(scroll_result)}")
    for s in scroll_result[:10]:
        print(f"  {s}")

    time.sleep(3)

    # 더 스크롤
    for _ in range(5):
        page.evaluate("""() => {
            document.querySelectorAll('*').forEach(el => {
                if (el.scrollHeight > el.clientHeight + 50) {
                    el.scrollTop = el.scrollHeight;
                }
            });
        }""")
        time.sleep(2)

    # 모든 요청 URL
    print(f"\n=== 전체 요청 ({len(reqs)}) ===")
    endpoints = {}
    for r in reqs:
        base = r["url"].split("?")[0]
        key = f"{r['method']} {base}"
        endpoints[key] = endpoints.get(key, 0) + 1
    for k, v in sorted(endpoints.items()):
        print(f"  [{v}] {k}")

    # 매물 리스트 관련 응답 확인
    print(f"\n=== 매물 응답 ===")
    for r in resps:
        if "article" in r["url"].lower() and "cluster" not in r["url"].lower() and "count" not in r["url"].lower() and "nelo" not in r["url"].lower():
            data = r["data"]
            print(f"\n{r['url'][:150]}")
            if isinstance(data, dict):
                print(f"  keys: {list(data.keys())[:10]}")
                for k, v in data.items():
                    if isinstance(v, list):
                        print(f"  {k}: list of {len(v)}")
                        if v:
                            print(f"    sample: {json.dumps(v[0], ensure_ascii=False)[:300]}")


StealthyFetcher.fetch(
    "https://fin.land.naver.com/map?center=126.9016-37.5561&realEstateTypes=D02&tradeTypes=B1-B2-A1-B3&zoom=15&showOnlySelectedRegion=true",
    real_chrome=True,
    headless=True,
    network_idle=True,
    wait=5000,
    timeout=180000,
    page_action=explore,
)
