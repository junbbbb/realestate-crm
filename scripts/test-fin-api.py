"""fin.land.naver.com 상세 탐색"""
import json
from scrapling import StealthyFetcher


def explore(page):
    import time

    captured_urls = []

    def handle(response):
        url = response.url
        # 이미지/폰트/맵 타일 제외
        if any(x in url for x in [".png", ".jpg", ".woff", ".pbf", "map.pstatic", "static"]):
            return
        captured_urls.append({
            "url": url,
            "method": response.request.method if response.request else "GET",
            "status": response.status,
        })

    page.on("response", handle)

    target_url = "https://fin.land.naver.com/map?center=126.9016-37.5561&realEstateTypes=D02&tradeTypes=B1-B2-A1-B3&zoom=15&showOnlySelectedRegion=true"
    try:
        page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
    except:
        pass
    time.sleep(5)

    # 매물 리스트 영역 찾아서 스크롤
    page.evaluate("""() => {
        const candidates = document.querySelectorAll('div, section, ul');
        for (const el of candidates) {
            const cn = el.className || '';
            if (typeof cn === 'string' && (cn.includes('list') || cn.includes('List') || cn.includes('article'))) {
                el.scrollBy && el.scrollBy(0, 2000);
            }
        }
        window.scrollBy(0, 2000);
    }""")
    time.sleep(5)

    # HTML 스냅샷
    html_len = page.evaluate("() => document.body.innerText.length")
    title = page.evaluate("() => document.title")
    print(f"\nTitle: {title}")
    print(f"Body text length: {html_len}")

    # 매물 관련 DOM 요소 검색
    dom_check = page.evaluate("""() => {
        const result = {};
        const articles = document.querySelectorAll('[class*=article], [class*=Article]');
        result.articleEls = articles.length;
        const lists = document.querySelectorAll('[class*=list], [class*=List]');
        result.listEls = lists.length;
        // 첫 매물 같은 거 찾기
        const firstText = document.body.innerText.substring(0, 2000);
        result.firstText = firstText;
        return result;
    }""")
    print(f"\nDOM:")
    print(f"  article-like: {dom_check.get('articleEls')}")
    print(f"  list-like: {dom_check.get('listEls')}")
    print(f"\nBody 앞 500자:")
    print(dom_check.get('firstText', '')[:500])

    print(f"\n\n=== 캡처된 비리소스 요청 ({len(captured_urls)}개) ===")
    endpoints = set()
    for c in captured_urls:
        base = c["url"].split("?")[0]
        endpoints.add(f"[{c['status']}] {c['method']} {base}")
    for e in sorted(endpoints):
        print(f"  {e}")


StealthyFetcher.fetch(
    "https://fin.land.naver.com/map?center=126.9016-37.5561&realEstateTypes=D02&tradeTypes=B1-B2-A1-B3&zoom=15&showOnlySelectedRegion=true",
    real_chrome=True,
    headless=True,
    network_idle=True,
    wait=5000,
    timeout=120000,
    page_action=explore,
)
