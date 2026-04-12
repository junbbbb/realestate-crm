"""
크롤링 데이터 → Supabase 동기화
- upsert (articleNumber 기준)
- 가격 변경 감지 → price_history 기록
- last_seen_at 업데이트
- 7일 미확인 매물 is_active=false
"""
import json
import os
import sys
from datetime import datetime, timezone, timedelta
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if not url or not key:
    print("Supabase URL/KEY 없음")
    sys.exit(1)

supabase = create_client(url, key)


CONVERSION_RATE = 0.06  # 전월세 전환율 6% (마포구 상업용 기준)


def converted_deposit(warrant, monthly_rent, trade_type):
    """환산보증금: 거래유형별 비교 가능한 단일 가격 산출"""
    if trade_type == "A1":       # 매매 → dealPrice 그대로 (warrant=dealPrice로 들어옴)
        return warrant
    if trade_type == "B1":       # 전세 → 보증금 그대로
        return warrant
    # 월세/단기임대 → 보증금 + (월세 × 12 ÷ 전환율)
    return warrant + int(monthly_rent * 12 / CONVERSION_RATE) if monthly_rent else warrant


def parse_int(v):
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return int(v)
    try:
        return int(str(v).replace(",", ""))
    except:
        return 0


def map_fin_article(item, dong=None):
    """fin.land API 응답 → properties row"""
    # row에 _dong이 있으면 우선 사용
    dong = item.get("_dong") or dong or "?"
    info = item.get("representativeArticleInfo", item)

    article_no = info.get("articleNumber", "")
    if not article_no:
        return None

    price_info = info.get("priceInfo", {})
    space_info = info.get("spaceInfo", {})
    article_detail = info.get("articleDetail", {})
    broker_info = info.get("brokerInfo", {})
    building_info = info.get("buildingInfo", {})
    verification = info.get("verificationInfo", {})

    deal_price = parse_int(price_info.get("dealPrice"))
    warrant_price = parse_int(price_info.get("warrantyPrice"))
    rent_price = parse_int(price_info.get("rentPrice"))

    trade_type = info.get("tradeType", "")
    trade_map = {"A1": "매매", "B1": "전세", "B2": "월세", "B3": "단기임대"}

    real_estate_type = info.get("realEstateType", "")
    prop_map = {"D01": "사무실", "D02": "상가", "D03": "건물", "D04": "건물", "D05": "상가주택", "E01": "건물", "Z00": "건물"}

    # 가격 텍스트 만들기
    if trade_type == "A1":
        price_text = f"매매 {deal_price:,}"
        price_for_db = deal_price
    elif trade_type == "B1":
        price_text = f"전세 {warrant_price:,}"
        price_for_db = warrant_price
    elif trade_type == "B2":
        price_text = f"월세 {warrant_price:,}/{rent_price}"
        price_for_db = warrant_price
    elif trade_type == "B3":
        price_text = f"단기 {warrant_price:,}/{rent_price}"
        price_for_db = warrant_price
    else:
        price_text = ""
        price_for_db = 0

    row = {
        "id": article_no,
        "article_no": article_no,
        "article_name": info.get("articleName", ""),
        "real_estate_type": real_estate_type,
        "real_estate_type_name": prop_map.get(real_estate_type, real_estate_type),
        "trade_type": trade_type,
        "trade_type_name": trade_map.get(trade_type, trade_type),
        "dong": dong,
        "address": f"서울시 마포구 {dong}",
        "price": price_for_db,
        "deal_or_warrant_price": price_text,
        "rent_price": str(rent_price) if rent_price else None,
        "monthly_rent": rent_price,
        "warrant_price": warrant_price,
        "area1": float(space_info.get("supplySpace") or space_info.get("floorSpace") or space_info.get("landSpace") or 0),
        "area2": float(space_info.get("exclusiveSpace") or space_info.get("supplySpace") or space_info.get("floorSpace") or space_info.get("landSpace") or 0),
        "floor_info": article_detail.get("floorInfo", ""),
        "direction": article_detail.get("direction", ""),
        "description": article_detail.get("articleFeatureDescription", ""),
        "tag_list": [],
        "realtor_name": broker_info.get("brokerageName", ""),
        "confirm_date": verification.get("articleConfirmDate", ""),
        "source_url": f"https://fin.land.naver.com/article/{article_no}",
        "raw_data": item,
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
    }
    return row


def main():
    data_file = sys.argv[1] if len(sys.argv) > 1 else "data/crawled-mangwon-fin.json"

    with open(data_file, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    print(f"로드: {len(raw_data)}건 from {data_file}")

    # 매핑
    rows = []
    for item in raw_data:
        row = map_fin_article(item)
        if row:
            rows.append(row)
    print(f"변환: {len(rows)}건")

    # 기존 DB 전체 로드 (가격 비교용) — 마포구 전체
    existing = {}
    offset = 0
    while True:
        resp = supabase.table("properties").select("id,price,deal_or_warrant_price,warrant_price,monthly_rent,trade_type").range(offset, offset + 999).execute()
        for r in resp.data:
            existing[r["id"]] = r
        if len(resp.data) < 1000:
            break
        offset += 1000
    print(f"기존 DB: {len(existing)}건")

    # 가격 변동 감지 (환산보증금 기준)
    price_history_rows = []
    type_change_cnt = 0
    for row in rows:
        aid = row["id"]
        prev = existing.get(aid)
        if prev is None:
            # 신규 매물
            row["price_change"] = "new"
            row["prev_price"] = 0
            price_history_rows.append({
                "article_no": aid,
                "deal_or_warrant_price": row["deal_or_warrant_price"],
                "rent_price": row["rent_price"],
                "warrant_price": row["warrant_price"],
                "monthly_rent": row["monthly_rent"],
                "price": row["price"],
                "change_type": "initial",
                "trade_type": row["trade_type"],
            })
        else:
            prev_trade = prev.get("trade_type") or ""
            prev_warrant = prev.get("warrant_price") or 0
            prev_rent = prev.get("monthly_rent") or 0

            # 거래유형 변경 → type_change (랭킹 제외)
            if prev_trade and prev_trade != row["trade_type"]:
                row["price_change"] = "type_change"
                row["prev_price"] = prev.get("price") or 0
                type_change_cnt += 1
                price_history_rows.append({
                    "article_no": aid,
                    "deal_or_warrant_price": row["deal_or_warrant_price"],
                    "rent_price": row["rent_price"],
                    "warrant_price": row["warrant_price"],
                    "monthly_rent": row["monthly_rent"],
                    "price": row["price"],
                    "change_type": "type_change",
                    "trade_type": row["trade_type"],
                })
                continue

            # 환산보증금으로 비교
            cur_converted = converted_deposit(row["warrant_price"], row["monthly_rent"], row["trade_type"])
            prev_converted = converted_deposit(prev_warrant, prev_rent, prev_trade)

            if cur_converted != prev_converted:
                change_type = "increase" if cur_converted > prev_converted else "decrease"
                row["price_change"] = change_type
                row["prev_price"] = prev_converted
                row["_converted_price"] = cur_converted
                row["_prev_warrant"] = prev_warrant
                row["_prev_rent"] = prev_rent
                price_history_rows.append({
                    "article_no": aid,
                    "deal_or_warrant_price": row["deal_or_warrant_price"],
                    "rent_price": row["rent_price"],
                    "warrant_price": row["warrant_price"],
                    "monthly_rent": row["monthly_rent"],
                    "price": row["price"],
                    "change_type": change_type,
                    "trade_type": row["trade_type"],
                })
            else:
                row["price_change"] = "none"
                row["prev_price"] = prev_converted

    print(f"가격 히스토리: {len(price_history_rows)}건 (신규/변경), 거래유형변경: {type_change_cnt}건 (랭킹 제외)")

    # properties upsert (100건씩)
    for i in range(0, len(rows), 100):
        batch = rows[i:i + 100]
        try:
            supabase.table("properties").upsert(batch, on_conflict="id").execute()
            print(f"  upsert {i + len(batch)}/{len(rows)}")
        except Exception as e:
            print(f"  에러 @ {i}: {e}")

    # price_history insert
    if price_history_rows:
        for i in range(0, len(price_history_rows), 100):
            batch = price_history_rows[i:i + 100]
            try:
                supabase.table("price_history").insert(batch).execute()
            except Exception as e:
                print(f"  price_history 에러 @ {i}: {e}")
        print(f"  price_history {len(price_history_rows)}건 추가")

    # 7일 미확인 매물 비활성화 (1000건씩 배치)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    deactivated = 0
    while True:
        try:
            batch = supabase.table("properties").select("id").eq("is_active", True).lt("last_seen_at", cutoff).limit(1000).execute()
            if not batch.data:
                break
            ids = [r["id"] for r in batch.data]
            supabase.table("properties").update({"is_active": False}).in_("id", ids).execute()
            deactivated += len(ids)
            print(f"  비활성화: {deactivated}건")
        except Exception as e:
            print(f"  deactivate 에러: {e}")
            break
    print(f"  is_active=false 처리 완료: {deactivated}건")

    # 가격 변동 랭킹 계산 (환산보증금 기준, type_change 제외)
    changes = []
    for r in rows:
        if r.get("price_change") not in ("increase", "decrease"):
            continue
        cur_conv = r.get("_converted_price") or converted_deposit(r["warrant_price"], r["monthly_rent"], r["trade_type"])
        prev_conv = r.get("prev_price") or 0
        if prev_conv < 1000000 or cur_conv <= 0:
            continue
        r["_cur_conv"] = cur_conv
        r["_prev_conv"] = prev_conv
        changes.append(r)

    increases = sorted([r for r in changes if r["price_change"] == "increase"], key=lambda r: (r["_cur_conv"] - r["_prev_conv"]) / r["_prev_conv"], reverse=True)[:6]
    decreases = sorted([r for r in changes if r["price_change"] == "decrease"], key=lambda r: (r["_cur_conv"] - r["_prev_conv"]) / r["_prev_conv"])[:6]

    rankings = []
    trade_map = {"A1": "매매", "B1": "전세", "B2": "월세", "B3": "단기임대"}
    for r in increases + decreases:
        prev_conv = r["_prev_conv"]
        cur_conv = r["_cur_conv"]
        rate = ((cur_conv - prev_conv) / prev_conv * 100) if prev_conv else 0
        rankings.append({
            "article_no": r["id"],
            "article_name": r.get("description") or r.get("article_name", ""),
            "property_type": r.get("property_type", ""),
            "trade_type": trade_map.get(r.get("trade_type", ""), r.get("trade_type_name", "")),
            "trade_type_code": r.get("trade_type", ""),
            "change_type": r["price_change"],
            "prev_price": prev_conv,
            "current_price": cur_conv,
            "rate": round(rate, 2),
            "warrant_price": r.get("warrant_price", 0),
            "monthly_rent": r.get("monthly_rent", 0),
            "prev_warrant_price": r.get("_prev_warrant", 0),
            "prev_monthly_rent": r.get("_prev_rent", 0),
        })

    if rankings:
        try:
            supabase.table("price_change_rankings").delete().neq("id", 0).execute()
            supabase.table("price_change_rankings").insert(rankings).execute()
            print(f"  가격변동 랭킹: 상승 {len(increases)}건, 하락 {len(decreases)}건")
        except Exception as e:
            print(f"  랭킹 에러: {e}")

    # 최종 확인
    active = supabase.table("properties").select("id", count="exact").eq("is_active", True).execute()
    print(f"\n=== 활성 매물: {active.count}건 ===")


if __name__ == "__main__":
    main()
