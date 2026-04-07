import { create } from "zustand";
import { Property, PropertyFilters } from "@/types";
import { SupabaseProperty } from "@/lib/supabase";
import { useToastStore } from "@/lib/toast-store";
import { useAuthStore } from "@/runtime/stores/auth-store";
import * as propertyRepo from "@/repos/property-repo";
import { SEARCH_DEBOUNCE_MS, MAX_COMPARE_COUNT } from "@/config/constants";

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
    const dongs = await propertyRepo.loadDongList();
    if (dongs.length > 0) {
      set({ dongList: dongs });
    }
  },

  loadProperties: async () => {
    set({ loading: true });
    try {
      const { filters, page, pageSize } = get();
      const userId = useAuthStore.getState().userId;
      const { data: rows, count } = await propertyRepo.loadProperties(filters, page, pageSize, userId);

      // Map base properties from DB rows
      const properties = rows.map(mapSupabaseToProperty);

      // Overlay user-specific meta (favorites, memos, listings)
      const userId = useAuthStore.getState().userId;
      if (userId && properties.length > 0) {
        const ids = properties.map((p) => p.id);
        const meta = await propertyRepo.getUserPropertyMeta(userId, ids);
        for (const p of properties) {
          if (meta.favorites.has(p.id)) p.isFavorite = true;
          if (meta.memos.has(p.id)) p.memo = meta.memos.get(p.id);
          if (meta.listings.has(p.id)) p.isMyListing = true;
        }
      }

      set({
        properties,
        totalCount: count,
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
      _searchDebounceTimer = setTimeout(() => get().loadProperties(), SEARCH_DEBOUNCE_MS);
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
    // Optimistic update
    set((s) => ({
      properties: s.properties.map((p) =>
        p.id === id ? { ...p, isFavorite: newFav } : p
      ),
    }));
    const userId = useAuthStore.getState().userId;
    if (userId) {
      propertyRepo.toggleFavorite(userId, id, newFav);
    }
  },

  selectProperty: (id) => set({ selectedPropertyId: id }),
  toggleCompare: (id) =>
    set((s) => {
      const removing = s.compareIds.includes(id);
      const newIds = removing
        ? s.compareIds.filter((c) => c !== id)
        : s.compareIds.length < MAX_COMPARE_COUNT ? [...s.compareIds, id] : s.compareIds;
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
    // Optimistic update
    set((s) => ({
      properties: s.properties.map((p) =>
        p.id === id ? { ...p, memo: memo || undefined } : p
      ),
    }));
    const userId = useAuthStore.getState().userId;
    if (userId) {
      propertyRepo
        .saveMemo(userId, id, memo)
        .then(() => useToastStore.getState().show("메모가 저장되었습니다"));
    }
  },
}));
