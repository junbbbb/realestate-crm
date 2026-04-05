"""크롤링 데이터를 Supabase에 적재"""
import json
import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("Supabase URL/KEY 없음")
    sys.exit(1)

supabase = create_client(url, key)

# 크롤링 데이터 로드
data_file = sys.argv[1] if len(sys.argv) > 1 else "data/crawled-mapo-10dong.json"
with open(data_file, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"로드: {len(data)}건 from {data_file}")


def parse_int(v):
    if v is None:
        return 0
    if isinstance(v, int):
        return v
    try:
        return int(str(v).replace(",", ""))
    except:
        return 0


rows = []
for item in data:
    article_no = item.get("articleNo", "")
    if not article_no:
        continue

    rows.append({
        "id": article_no,
        "article_no": article_no,
        "article_name": item.get("articleName", ""),
        "real_estate_type": item.get("realEstateTypeCode", ""),
        "real_estate_type_name": item.get("_propType", item.get("realEstateTypeName", "")),
        "trade_type": item.get("tradeTypeCode", ""),
        "trade_type_name": item.get("_tradeType", item.get("tradeTypeName", "")),
        "dong": item.get("_dong", ""),
        "address": f"서울시 마포구 {item.get('_dong', '')}",
        "deal_or_warrant_price": item.get("dealOrWarrantPrc", ""),
        "rent_price": item.get("rentPrc", ""),
        "warrant_price": parse_int(item.get("dealOrWarrantPrc")),
        "monthly_rent": parse_int(item.get("rentPrc")),
        "price": parse_int(item.get("dealOrWarrantPrc")),
        "area1": float(item.get("area1") or 0),
        "area2": float(item.get("area2") or 0),
        "floor_info": item.get("floorInfo", ""),
        "direction": item.get("direction", ""),
        "description": item.get("articleFeatureDesc", ""),
        "tag_list": item.get("tagList", []),
        "latitude": float(item.get("latitude") or 0) or None,
        "longitude": float(item.get("longitude") or 0) or None,
        "realtor_name": item.get("realtorName", ""),
        "confirm_date": item.get("articleConfirmYmd", ""),
        "source_url": f"https://new.land.naver.com/articles/{article_no}",
        "raw_data": item,
    })

print(f"변환: {len(rows)}건")

# 배치 upsert (100건씩)
batch_size = 100
for i in range(0, len(rows), batch_size):
    batch = rows[i:i + batch_size]
    try:
        supabase.table("properties").upsert(batch).execute()
        print(f"  업로드: {i + len(batch)}/{len(rows)}")
    except Exception as e:
        print(f"  에러 @ batch {i}: {e}")

# 확인
result = supabase.table("properties").select("id", count="exact").execute()
print(f"\nSupabase 총 매물 수: {result.count}")
