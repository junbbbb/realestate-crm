import { create } from "zustand";
import { Property, PropertyFilters } from "@/types";
import { supabase, SupabaseProperty } from "@/lib/supabase";
import { useToastStore } from "@/lib/toast-store";

let _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

interface AppState {
  properties: Property[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: PropertyFilters;
  selectedPropertyId: string | null;
  compareIds: string[];
  compareCache: Record<string, Property>;
  loading: boolean;
  dongList: string[];

  loadProperties: () => Promise<void>;
  loadDongList: () => Promise<void>;
  setFilters: (f: Partial<PropertyFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleFavorite: (id: string) => void;
  selectProperty: (id: string | null) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  saveMemo: (id: string, memo: string) => void;
}

const defaultFilters: PropertyFilters = {
  search: "",
  dong: [],
  propertyType: "전체",
  dealType: "전체",
  areaMin: 0,
  areaMax: 0,
  priceMin: 0,
  priceMax: 0,
  rentMin: 0,
  rentMax: 0,
  floorFilter: "전체",
  source: "전체",
  sortBy: "default",
};

function buildAreaLabel(row: SupabaseProperty): { area: number; label: string } {
  const raw = row.raw_data as Record<string, unknown> | null;
  const space = (raw?.spaceInfo ?? (raw?.representativeArticleInfo as Record<string, unknown>)?.spaceInfo) as Record<string, number> | undefined;

  const supply = row.area1 || space?.supplySpace || 0;
  const exclusive = row.area2 || space?.exclusiveSpace || 0;
  const land = space?.landSpace || 0;
  const floorArea = space?.floorSpace || 0;

  // 상가건물/빌딩: 대지+연면적
  if (supply === 0 && exclusive === 0 && (land > 0 || floorArea > 0)) {
    const parts: string[] = [];
    if (land > 0) parts.push(`대지 ${land}m²`);
    if (floorArea > 0) parts.push(`연 ${floorArea}m²`);
    return { area: floorArea || land, label: parts.join(" / ") };
  }

  // 일반 상가/사무실: 계약+전용
  if (supply > 0 && exclusive > 0 && supply !== exclusive) {
    return { area: exclusive, label: `계약 ${supply}m² / 전용 ${exclusive}m²` };
  }

  // 면적 하나만 있는 경우
  const a = exclusive || supply;
  return { area: a, label: `${a}m²` };
}

export function mapSupabaseToProperty(row: SupabaseProperty): Property {
  const floorParts = row.floor_info?.split("/") || [];
  const floor = floorParts[0] ? parseInt(floorParts[0].replace(/\D/g, "")) || undefined : undefined;
  const totalFloors = floorParts[1] ? parseInt(floorParts[1].replace(/\D/g, "")) || undefined : undefined;
  const { area, label: areaLabel } = buildAreaLabel(row);

  return {
    id: row.id,
    title: row.description || row.article_name || `${row.dong} ${row.real_estate_type_name}`,
    address: row.address,
    propertyType: (row.real_estate_type_name === "상가건물" ? "건물" : row.real_estate_type_name) as Property["propertyType"],
    dealType: row.trade_type_name as Property["dealType"],
    realEstateTypeCode: row.real_estate_type || "",
    tradeTypeCode: row.trade_type || "",
    price: row.price,
    deposit: row.warrant_price || undefined,
    monthlyRent: row.monthly_rent || undefined,
    area,
    areaLabel,
    rooms: 1,
    bathrooms: 1,
    floor,
    totalFloors,
    description: row.description || "",
    isFavorite: row.is_favorite || false,
    isMyListing: row.is_my_listing || false,
    createdAt: row.confirm_date || row.created_at,
    features: row.tag_list || [],
    contact: row.realtor_name || undefined,
    sourceUrl: row.source_url || undefined,
    memo: row.memo || undefined,
    priceChange: (row.price_change as Property["priceChange"]) || "none",
    prevPrice: row.prev_price || undefined,
  };
}

export const useStore = create<AppState>((set, get) => ({
  properties: [],
  totalCount: 0,
  page: 1,
  pageSize: 50,
  filters: defaultFilters,
  selectedPropertyId: null,
  compareIds: [],
  compareCache: {},
  loading: false,
  dongList: [],

  loadDongList: async () => {
    const { data } = await supabase
      .from("properties")
      .select("dong")
      .eq("is_active", true);
    if (data) {
      const dongs = Array.from(new Set(data.map((r: { dong: string }) => r.dong).filter(Boolean))).sort();
      set({ dongList: dongs });
    }
  },

  loadProperties: async () => {
    set({ loading: true });
    try {
      const { filters, page, pageSize } = get();

      let query = supabase
        .from("properties")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      // 동 필터
      if (filters.dong.length > 0) {
        query = query.in("dong", filters.dong);
      }

      // 유형 필터
      if (filters.propertyType && filters.propertyType !== "전체") {
        if (filters.propertyType === "건물") {
          query = query.in("real_estate_type_name", ["건물", "상가건물"]);
        } else {
          query = query.eq("real_estate_type_name", filters.propertyType);
        }
      }

      // 거래 필터
      if (filters.dealType && filters.dealType !== "전체") {
        query = query.eq("trade_type_name", filters.dealType);
      }

      // 검색 (설명/주소)
      if (filters.search) {
        query = query.or(
          `description.ilike.%${filters.search}%,address.ilike.%${filters.search}%,article_name.ilike.%${filters.search}%`
        );
      }

      // 층 필터
      if (filters.floorFilter && filters.floorFilter !== "전체") {
        if (filters.floorFilter === "1층") {
          query = query.like("floor_info", "1/%");
        } else if (filters.floorFilter === "지하") {
          query = query.or("floor_info.like.B%,floor_info.like.-%");
        } else if (filters.floorFilter === "2층 이상") {
          // floor_info is like "3/5", "12/15" etc. We need floor >= 2.
          // Since Supabase doesn't support computed filters easily,
          // we exclude 1st floor and basement, and require floor_info to exist.
          query = query
            .not("floor_info", "like", "1/%")
            .not("floor_info", "like", "B%")
            .not("floor_info", "like", "-%")
            .not("floor_info", "is", null);
        }
      }

      // 면적 필터
      if (filters.areaMin > 0) {
        query = query.gte("area2", filters.areaMin);
      }
      if (filters.areaMax > 0) {
        query = query.lte("area2", filters.areaMax);
      }

      // 가격 필터 (DB는 원 단위, 필터는 만원 단위)
      if (filters.priceMin > 0) {
        query = query.gte("price", filters.priceMin * 10000);
      }
      if (filters.priceMax > 0) {
        query = query.lte("price", filters.priceMax * 10000);
      }

      // 월세 필터
      if (filters.rentMin > 0) {
        query = query.gte("monthly_rent", filters.rentMin * 10000);
      }
      if (filters.rentMax > 0) {
        query = query.lte("monthly_rent", filters.rentMax * 10000);
      }

      // 출처 필터
      if (filters.source === "네이버") {
        query = query.or("is_my_listing.eq.false,is_my_listing.is.null");
      } else if (filters.source === "개인매물") {
        query = query.eq("is_my_listing", true);
      }

      // 정렬
      if (filters.sortBy === "price-asc") {
        query = query.order("price", { ascending: true });
      } else if (filters.sortBy === "price-desc") {
        query = query.order("price", { ascending: false });
      } else {
        query = query.order("last_seen_at", { ascending: false });
      }

      // 페이지네이션
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Supabase error:", error);
        set({ loading: false });
        return;
      }

      const properties = (data || []).map(mapSupabaseToProperty);
      set({
        properties,
        totalCount: count || 0,
        loading: false,
      });
    } catch (e) {
      console.error("Load error:", e);
      set({ loading: false });
    }
  },

  setFilters: (f) => {
    set((s) => ({ filters: { ...s.filters, ...f }, page: 1 }));
    if ("search" in f && Object.keys(f).length === 1) {
      if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
      _searchDebounceTimer = setTimeout(() => get().loadProperties(), 300);
    } else {
      get().loadProperties();
    }
  },

  resetFilters: () => {
    set({ filters: defaultFilters, page: 1 });
    get().loadProperties();
  },

  setPage: (page) => {
    set({ page });
    get().loadProperties();
  },
  setPageSize: (size) => {
    set({ pageSize: size, page: 1 });
    get().loadProperties();
  },

  toggleFavorite: (id) => {
    const current = get().properties.find((p) => p.id === id);
    if (!current) return;
    const newFav = !current.isFavorite;
    set((s) => ({
      properties: s.properties.map((p) =>
        p.id === id ? { ...p, isFavorite: newFav } : p
      ),
    }));
    supabase
      .from("properties")
      .update({ is_favorite: newFav })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Favorite sync error:", error);
      });
  },

  selectProperty: (id) => set({ selectedPropertyId: id }),
  toggleCompare: (id) =>
    set((s) => {
      const removing = s.compareIds.includes(id);
      const newIds = removing
        ? s.compareIds.filter((c) => c !== id)
        : s.compareIds.length < 5 ? [...s.compareIds, id] : s.compareIds;
      const newCache = { ...s.compareCache };
      if (!removing) {
        const prop = s.properties.find((p) => p.id === id);
        if (prop) newCache[id] = prop;
      } else {
        delete newCache[id];
      }
      return { compareIds: newIds, compareCache: newCache };
    }),
  clearCompare: () => set({ compareIds: [], compareCache: {} }),
  saveMemo: (id, memo) => {
    set((s) => ({
      properties: s.properties.map((p) =>
        p.id === id ? { ...p, memo: memo || undefined } : p
      ),
    }));
    supabase
      .from("properties")
      .update({ memo: memo || null })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Memo sync error:", error);
        else useToastStore.getState().show("메모가 저장되었습니다");
      });
  },
}));
