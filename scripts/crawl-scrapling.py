"""
네이버 부동산 크롤링 — Scrapling real_chrome + page_action
마포구 상가/사무실/건물 × 월세/전세/매매
페이지 내 필터 클릭 자동화
"""

import json
import sys
import os
import re
from datetime import datetime
from scrapling import StealthyFetcher

MAX_ITEMS = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
CRAWL_RESULT_FILE = "/tmp/crawl_result.json"

# 카테고리 탭 텍스트 → 클릭 대상
PROPERTY_TABS = ["상가", "사무실", "건물"]
TRADE_FILTERS = ["월세", "전세", "매매"]


def scroll_until_done(page):
    """스크롤해서 모든 매물 로드"""
    import time
    prev_len = 0
    stale = 0
    while stale < 8:
        page.evaluate("() => window.scrollBy(0, 1000)")
        time.sleep(1)
        cur_len = page.evaluate("() => document.body.innerText.length")
        if cur_len == prev_len:
            stale += 1
        else:
            stale = 0
        prev_len = cur_len


def click_filter(page, filter_text):
    """페이지 내 필터 버튼 클릭"""
    import time
    clicked = page.evaluate(f"""() => {{
        const buttons = document.querySelectorAll('button, a, span, label, div');
        for (const btn of buttons) {{
            const text = btn.textContent?.trim();
            if (text === '{filter_text}') {{
                btn.click();
                return true;
            }}
        }}
        return false;
    }}""")
    time.sleep(2)
    return clicked


def crawl_all(page):
    """page_action: 카테고리 탭 + 거래 필터 클릭하며 크롤링"""
    import time

    base_url = "https://new.land.naver.com/offices?ms=37.5572,126.9236,16&a=SG&e=RETAIL&cortarNo=1144000000"
    page.goto(base_url, wait_until="networkidle")
    time.sleep(3)

    all_blocks = []

    for prop_tab in PROPERTY_TABS:
        # 카테고리 탭 클릭
        print(f"\n  === 카테고리: {prop_tab} ===")
        click_filter(page, prop_tab)
        time.sleep(2)

        for trade in TRADE_FILTERS:
            label = f"{prop_tab}/{trade}"
            print(f"    {label}...")

            # 거래방식 필터 열기
            click_filter(page, "거래방식")
            time.sleep(1)

            # 거래유형 선택
            clicked = click_filter(page, trade)
            if not clicked:
                print(f"      필터 '{trade}' 클릭 실패, 스킵")
                continue
            time.sleep(2)

            # 스크롤해서 전체 로드
            scroll_until_done(page)

            # 텍스트 수집
            body_text = page.evaluate("() => document.body.innerText")
            all_blocks.append((label, body_text))
            print(f"      텍스트 {len(body_text)} chars")

            # 필터 초기화 — 거래방식 다시 클릭해서 해제
            click_filter(page, trade)
            time.sleep(1)

    with open(CRAWL_RESULT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_blocks, f, ensure_ascii=False)
    print(f"\n  page_action 완료 → {CRAWL_RESULT_FILE}")


def parse_from_text(text, category=""):
    """body innerText에서 매물 파싱"""
    items = []
    lines = text.split("\n")
    current = {}
    state = "idle"

    cat_parts = category.split("/")
    prop_type = cat_parts[0] if cat_parts else "상가"
    expected_deal = cat_parts[1] if len(cat_parts) > 1 else ""

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if "소유자" in line and ("상가" in line or "사무실" in line or "건물" in line or "일반" in line):
            if current.get("price"):
                items.append(current)
            current = {"propertyType": prop_type}
            state = "price"
            continue

        if state == "price" and re.match(r"^(월세|전세|매매)", line):
            current["dealType"] = "월세" if "월세" in line else "전세" if "전세" in line else "매매"
            current["price"] = line
            state = "info"
            continue

        if state == "info" and "m" in line and ("/" in line or "층" in line):
            current["info"] = line
            area_match = re.search(r"(\d+(?:\.\d+)?)/(\d+(?:\.\d+)?)m", line)
            floor_match = re.search(r"(\w+)/(\d+)층", line)
            dir_match = re.search(r"(남|북|동|서|남동|남서|북동|북서)향", line)
            if area_match:
                current["area"] = float(area_match.group(2))
            if floor_match:
                current["floor"] = floor_match.group(1)
                current["totalFloor"] = floor_match.group(2)
            if dir_match:
                current["direction"] = dir_match.group(1) + "향"
            state = "desc"
            continue

        if state == "desc" and len(line) > 10:
            current["description"] = line
            state = "tags"
            continue

        if state == "tags" and "제공" not in line and "공인중개사" not in line and "확인매물" not in line:
            current["tags"] = line
            state = "agent"
            continue

        if state == "agent" and ("제공" in line or "부동산" in line):
            state = "agent_name"
            continue

        if state == "agent_name":
            current["agent"] = line
            state = "confirm"
            continue

        if "확인매물" in line:
            current["confirmDate"] = line.replace("확인매물", "").strip()
            if current.get("price"):
                items.append(current)
            current = {"propertyType": prop_type}
            state = "idle"

    if current.get("price"):
        items.append(current)

    return items


def main():
    print(f"=== 네이버 부동산 크롤링 (Scrapling) ===")
    print(f"지역: 마포구")
    print(f"대상: 상가/사무실/건물 x 월세/전세/매매")
    print()

    response = StealthyFetcher.fetch(
        "https://new.land.naver.com/offices",
        real_chrome=True,
        headless=True,
        network_idle=True,
        wait=5000,
        page_action=crawl_all,
    )

    print(f"\nStatus: {response.status}")

    all_items = []
    if os.path.exists(CRAWL_RESULT_FILE):
        with open(CRAWL_RESULT_FILE, "r", encoding="utf-8") as f:
            text_blocks = json.load(f)
        for label, body_text in text_blocks:
            parsed = parse_from_text(body_text, label)
            print(f"  {label}: {len(parsed)}건")
            all_items.extend(parsed)
        os.remove(CRAWL_RESULT_FILE)

    print(f"\n=== 총 {len(all_items)}건 파싱 ===")

    if all_items:
        cleaned = []
        for i, item in enumerate(all_items):
            cleaned.append({
                "id": str(i + 1),
                "title": item.get("description", f"마포구 매물 {i+1}"),
                "propertyType": item.get("propertyType", "상가"),
                "dealType": item.get("dealType", ""),
                "priceText": item.get("price", ""),
                "area": item.get("area", 0),
                "floor": item.get("floor", ""),
                "totalFloor": item.get("totalFloor", ""),
                "direction": item.get("direction", ""),
                "info": item.get("info", ""),
                "description": item.get("description", ""),
                "tags": item.get("tags", ""),
                "agent": item.get("agent", ""),
                "confirmDate": item.get("confirmDate", ""),
                "address": "서울시 마포구",
                "source": "naver",
                "createdAt": datetime.now().isoformat(),
            })

        os.makedirs("data", exist_ok=True)
        out_path = f"data/crawled-mapo-{datetime.now().strftime('%Y-%m-%d')}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(cleaned, f, ensure_ascii=False, indent=2)
        print(f"저장: {out_path}")

        by_type = {}
        by_deal = {}
        for item in cleaned:
            by_type[item["propertyType"]] = by_type.get(item["propertyType"], 0) + 1
            by_deal[item["dealType"]] = by_deal.get(item["dealType"], 0) + 1
        print(f"유형별: {by_type}")
        print(f"거래별: {by_deal}")

        for item in cleaned[:5]:
            print(f"  [{item['propertyType']}/{item['dealType']}] {item['priceText']} — {item['title'][:40]}")
    else:
        print("파싱된 매물 없음")


if __name__ == "__main__":
    main()
