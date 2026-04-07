import { supabase } from "@/config/supabase";
import { PropertyFilters } from "@/types";
import { SupabaseProperty } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Load properties with filters + pagination
// ---------------------------------------------------------------------------
export async function loadProperties(
  filters: PropertyFilters,
  page: number,
  pageSize: number,
  userId?: string | null
): Promise<{ data: SupabaseProperty[]; count: number }> {
  try {
    // 내 개인매물 ID 가져오기 (user_listings 테이블)
    // 네이버 탭은 개인매물을 전부 숨기므로 user_listings 조회 불필요
    let myListingIds = new Set<string>();
    if (userId && filters.source !== "네이버") {
      const { data: myListings } = await supabase
        .from("user_listings")
        .select("property_id")
        .eq("user_id", userId);
      myListingIds = new Set((myListings || []).map((r: { property_id: string }) => r.property_id));
    }

    let query = supabase
      .from("properties")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    // 탭별 개인매물 필터링
    if (filters.source === "네이버") {
      // 네이버 탭: 개인매물 전부 숨김 (네이버 크롤링 데이터만)
      query = query.or("is_my_listing.neq.true,is_my_listing.is.null");
    } else if (filters.source !== "개인매물") {
      // 전체 탭: 네이버 매물 + 내 개인매물만 (남의 개인매물 숨김)
      if (myListingIds.size > 0) {
        query = query.or(`is_my_listing.neq.true,is_my_listing.is.null,id.in.(${[...myListingIds].join(",")})`);
      } else {
        query = query.or("is_my_listing.neq.true,is_my_listing.is.null");
      }
    }

    // dong filter
    if (filters.dong.length > 0) {
      query = query.in("dong", filters.dong);
    }

    // property type filter
    if (filters.propertyType && filters.propertyType !== "전체") {
      if (filters.propertyType === "건물") {
        query = query.in("real_estate_type_name", ["건물", "상가건물"]);
      } else {
        query = query.eq("real_estate_type_name", filters.propertyType);
      }
    }

    // deal type filter
    if (filters.dealType && filters.dealType !== "전체") {
      query = query.eq("trade_type_name", filters.dealType);
    }

    // search (description / address / article_name)
    if (filters.search) {
      query = query.or(
        `description.ilike.%${filters.search}%,address.ilike.%${filters.search}%,article_name.ilike.%${filters.search}%`
      );
    }

    // floor filter
    if (filters.floorFilter && filters.floorFilter !== "전체") {
      if (filters.floorFilter === "1층") {
        query = query.like("floor_info", "1/%");
      } else if (filters.floorFilter === "지하") {
        query = query.or("floor_info.like.B%,floor_info.like.-%");
      } else if (filters.floorFilter === "2층 이상") {
        query = query
          .not("floor_info", "like", "1/%")
          .not("floor_info", "like", "B%")
          .not("floor_info", "like", "-%")
          .not("floor_info", "is", null);
      }
    }

    // area filter
    if (filters.areaMin > 0) {
      query = query.gte("area2", filters.areaMin);
    }
    if (filters.areaMax > 0) {
      query = query.lte("area2", filters.areaMax);
    }

    // price filter (DB is 원, filter is 만원)
    if (filters.priceMin > 0) {
      query = query.gte("price", filters.priceMin * 10000);
    }
    if (filters.priceMax > 0) {
      query = query.lte("price", filters.priceMax * 10000);
    }

    // monthly rent filter
    if (filters.rentMin > 0) {
      query = query.gte("monthly_rent", filters.rentMin * 10000);
    }
    if (filters.rentMax > 0) {
      query = query.lte("monthly_rent", filters.rentMax * 10000);
    }

    // source filter — "개인매물" 탭: 내 것만
    if (filters.source === "개인매물") {
      if (myListingIds.size > 0) {
        query = query.in("id", [...myListingIds]);
      } else {
        return { data: [], count: 0 };
      }
    }

    // sort
    if (filters.sortBy === "price-asc") {
      query = query.order("price", { ascending: true });
    } else if (filters.sortBy === "price-desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("last_seen_at", { ascending: false });
    }

    // pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("loadProperties error:", error);
      return { data: [], count: 0 };
    }

    return { data: (data || []) as SupabaseProperty[], count: count || 0 };
  } catch (e) {
    console.error("loadProperties exception:", e);
    return { data: [], count: 0 };
  }
}

// ---------------------------------------------------------------------------
// Load distinct dong list
// ---------------------------------------------------------------------------
// 마포구 26개 동 — 고정 상수 (DB 조회 불필요)
// 정합성: 크롤링 시 regions.json과 DB distinct dong 비교로 검증
const MAPO_DONGS = [
  "공덕동", "구수동", "노고산동", "당인동", "대흥동", "도화동", "동교동",
  "마포동", "망원동", "상수동", "상암동", "서교동", "성산동", "신공덕동",
  "신수동", "신정동", "아현동", "연남동", "염리동", "용강동", "중동",
  "창전동", "토정동", "하중동", "합정동", "현석동",
];

export async function loadDongList(): Promise<string[]> {
  return MAPO_DONGS;
}

// ---------------------------------------------------------------------------
// Get a single property by id
// ---------------------------------------------------------------------------
export async function getPropertyById(
  id: string
): Promise<SupabaseProperty | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getPropertyById error:", error);
    return null;
  }
  return data as SupabaseProperty;
}

// ---------------------------------------------------------------------------
// Toggle favorite (user_favorites table)
// ---------------------------------------------------------------------------
export async function toggleFavorite(
  userId: string,
  propertyId: string,
  isFavorite: boolean
): Promise<void> {
  if (isFavorite) {
    // add row
    const { error } = await supabase.from("user_favorites").upsert(
      { user_id: userId, property_id: propertyId },
      { onConflict: "user_id,property_id" }
    );
    if (error) console.error("toggleFavorite add error:", error);
  } else {
    // remove row
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("property_id", propertyId);
    if (error) console.error("toggleFavorite remove error:", error);
  }
}

// ---------------------------------------------------------------------------
// Save memo (user_memos table)
// ---------------------------------------------------------------------------
export async function saveMemo(
  userId: string,
  propertyId: string,
  memo: string
): Promise<void> {
  if (memo) {
    const { error } = await supabase.from("user_memos").upsert(
      {
        user_id: userId,
        property_id: propertyId,
        memo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,property_id" }
    );
    if (error) console.error("saveMemo error:", error);
  } else {
    // empty memo — remove the row
    const { error } = await supabase
      .from("user_memos")
      .delete()
      .eq("user_id", userId)
      .eq("property_id", propertyId);
    if (error) console.error("saveMemo remove error:", error);
  }
}

// ---------------------------------------------------------------------------
// Toggle my-listing (user_listings table)
// ---------------------------------------------------------------------------
export async function toggleMyListing(
  userId: string,
  propertyId: string,
  isListing: boolean
): Promise<void> {
  if (isListing) {
    const { error } = await supabase.from("user_listings").upsert(
      { user_id: userId, property_id: propertyId },
      { onConflict: "user_id,property_id" }
    );
    if (error) console.error("toggleMyListing add error:", error);
  } else {
    const { error } = await supabase
      .from("user_listings")
      .delete()
      .eq("user_id", userId)
      .eq("property_id", propertyId);
    if (error) console.error("toggleMyListing remove error:", error);
  }
}

// ---------------------------------------------------------------------------
// Batch-load user-specific property metadata (favorites, memos, listings)
// ---------------------------------------------------------------------------
export async function getUserPropertyMeta(
  userId: string,
  propertyIds: string[]
): Promise<{
  favorites: Set<string>;
  memos: Map<string, string>;
  listings: Set<string>;
}> {
  const favorites = new Set<string>();
  const memos = new Map<string, string>();
  const listings = new Set<string>();

  if (!userId || propertyIds.length === 0) {
    return { favorites, memos, listings };
  }

  const [favRes, memoRes, listRes] = await Promise.all([
    supabase
      .from("user_favorites")
      .select("property_id")
      .eq("user_id", userId)
      .in("property_id", propertyIds),
    supabase
      .from("user_memos")
      .select("property_id, memo")
      .eq("user_id", userId)
      .in("property_id", propertyIds),
    supabase
      .from("user_listings")
      .select("property_id")
      .eq("user_id", userId)
      .in("property_id", propertyIds),
  ]);

  if (favRes.data) {
    for (const r of favRes.data) favorites.add(r.property_id);
  }
  if (memoRes.data) {
    for (const r of memoRes.data) {
      if (r.memo) memos.set(r.property_id, r.memo);
    }
  }
  if (listRes.data) {
    for (const r of listRes.data) listings.add(r.property_id);
  }

  return { favorites, memos, listings };
}
