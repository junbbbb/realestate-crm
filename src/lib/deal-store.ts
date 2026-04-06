import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useToastStore } from "@/lib/toast-store";

export type DealStatus = "상담" | "매물투어" | "계약협상" | "계약완료" | "무산";
export const DEAL_STATUSES: DealStatus[] = ["상담", "매물투어", "계약협상", "계약완료", "무산"];

export interface Deal {
  id: string;
  propertyId: string | null;
  sellerId: string | null;
  buyerId: string | null;
  dealType: string;
  status: DealStatus;
  memo: string;
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
      .order("created_at", { ascending: false });

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
    const { data, error } = await supabase.from("deals").insert({
      property_id: d.propertyId || null,
      seller_id: d.sellerId || null,
      buyer_id: d.buyerId || null,
      deal_type: d.dealType,
      status: "상담",
      memo: d.memo || "",
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
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (d.sellerId !== undefined) row.seller_id = d.sellerId;
    if (d.buyerId !== undefined) row.buyer_id = d.buyerId;
    if (d.status !== undefined) row.status = d.status;
    if (d.memo !== undefined) row.memo = d.memo;

    const { error } = await supabase.from("deals").update(row).eq("id", id);
    if (error) {
      console.error("Deal update error:", error);
      return;
    }
    useToastStore.getState().show("거래가 업데이트되었습니다");
    get().loadDeals();
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
}));
