import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useToastStore } from "@/lib/toast-store";

export type DealStatus = "거래전" | "거래중" | "거래완료";
export const DEAL_STATUSES: DealStatus[] = ["거래전", "거래중", "거래완료"];

export interface Deal {
  id: string;
  propertyId: string | null;
  sellerId: string | null;
  buyerId: string | null;
  dealType: string;
  status: DealStatus;
  memo: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  // joined
  propertyTitle?: string;
  propertyAddress?: string;
  sellerName?: string;
  buyerName?: string;
}

interface DealState {
  deals: Deal[];
  loading: boolean;
  loadDeals: () => Promise<void>;
  addDeal: (d: { propertyId?: string; sellerId?: string; buyerId?: string; dealType: string; memo?: string }) => Promise<string | null>;
  moveDeal: (id: string, toStatus: DealStatus, toIndex: number) => void;
  updateDeal: (id: string, d: Partial<{ sellerId: string | null; buyerId: string | null; status: DealStatus; memo: string }>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
}

export const useDealStore = create<DealState>((set, get) => ({
  deals: [],
  loading: false,

  loadDeals: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("deals")
      .select(`
        *,
        properties:property_id (id, description, article_name, address, dong),
        seller:seller_id (id, name),
        buyer:buyer_id (id, name)
      `)
      .order("position", { ascending: true });

    if (error) {
      console.error("Deal load error:", error);
      set({ loading: false });
      return;
    }

    set({
      deals: (data || []).map((r: Record<string, unknown>) => {
        const prop = r.properties as Record<string, unknown> | null;
        const seller = r.seller as Record<string, unknown> | null;
        const buyer = r.buyer as Record<string, unknown> | null;
        return {
          id: r.id as string,
          propertyId: r.property_id as string | null,
          sellerId: r.seller_id as string | null,
          buyerId: r.buyer_id as string | null,
          dealType: r.deal_type as string,
          status: r.status as DealStatus,
          memo: (r.memo as string) || "",
          position: (r.position as number) || 0,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
          propertyTitle: prop ? ((prop.description as string) || (prop.article_name as string) || `${prop.dong}`) : undefined,
          propertyAddress: prop ? (prop.address as string) : undefined,
          sellerName: seller ? (seller.name as string) : undefined,
          buyerName: buyer ? (buyer.name as string) : undefined,
        };
      }),
      loading: false,
    });
  },

  addDeal: async (d) => {
    // 거래전 컬럼 맨 위에 배치
    const firstInColumn = get().deals.filter((x) => x.status === "��래전");
    const minPos = firstInColumn.length > 0 ? Math.min(...firstInColumn.map((x) => x.position)) : 1024;
    const newPos = minPos - 1024;

    const { data, error } = await supabase.from("deals").insert({
      property_id: d.propertyId || null,
      seller_id: d.sellerId || null,
      buyer_id: d.buyerId || null,
      deal_type: d.dealType,
      status: "거래전",
      memo: d.memo || "",
      position: newPos,
    }).select("id").single();

    if (error) {
      console.error("Deal add error:", error);
      useToastStore.getState().show("거래 생성 실패");
      return null;
    }
    useToastStore.getState().show("거래가 시작되었습니다");
    get().loadDeals();
    return data.id;
  },

  updateDeal: async (id, d) => {
    // 상태 변경 시 대상 컬럼 맨 위로
    let newPosition: number | undefined;
    if (d.status !== undefined) {
      const targetDeals = get().deals.filter((x) => x.status === d.status && x.id !== id);
      const minPos = targetDeals.length > 0 ? Math.min(...targetDeals.map((x) => x.position)) : 1024;
      newPosition = minPos - 1024;
    }

    // optimistic update
    set((s) => ({
      deals: s.deals.map((deal) => {
        if (deal.id !== id) return deal;
        const updated = { ...deal, updatedAt: new Date().toISOString() };
        if (d.sellerId !== undefined) updated.sellerId = d.sellerId;
        if (d.buyerId !== undefined) updated.buyerId = d.buyerId;
        if (d.status !== undefined) updated.status = d.status;
        if (d.memo !== undefined) updated.memo = d.memo;
        if (newPosition !== undefined) updated.position = newPosition;
        return updated;
      }),
    }));

    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (d.sellerId !== undefined) row.seller_id = d.sellerId;
    if (d.buyerId !== undefined) row.buyer_id = d.buyerId;
    if (d.status !== undefined) row.status = d.status;
    if (d.memo !== undefined) row.memo = d.memo;
    if (newPosition !== undefined) row.position = newPosition;

    const { error } = await supabase.from("deals").update(row).eq("id", id);
    if (error) {
      console.error("Deal update error:", error);
      get().loadDeals();
      return;
    }
    if (d.sellerId !== undefined || d.buyerId !== undefined) get().loadDeals();
  },

  deleteDeal: async (id) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      console.error("Deal delete error:", error);
      return;
    }
    useToastStore.getState().show("거래가 삭제되었습니다");
    get().loadDeals();
  },

  moveDeal: (id, toStatus, toIndex) => {
    const columnDeals = get().deals
      .filter((d) => d.status === toStatus && d.id !== id)
      .sort((a, b) => a.position - b.position);

    let newPos: number;
    if (columnDeals.length === 0) {
      newPos = 1024;
    } else if (toIndex <= 0) {
      newPos = columnDeals[0].position - 1024;
    } else if (toIndex >= columnDeals.length) {
      newPos = columnDeals[columnDeals.length - 1].position + 1024;
    } else {
      newPos = (columnDeals[toIndex - 1].position + columnDeals[toIndex].position) / 2;
    }

    // optimistic
    set((s) => ({
      deals: s.deals.map((d) =>
        d.id === id ? { ...d, status: toStatus, position: newPos, updatedAt: new Date().toISOString() } : d
      ),
    }));

    supabase.from("deals").update({ status: toStatus, position: newPos, updated_at: new Date().toISOString() }).eq("id", id).then(({ error }) => {
      if (error) { console.error("Move deal error:", error); get().loadDeals(); }
    });
  },
}));
