import { create } from "zustand";
import { useToastStore } from "@/lib/toast-store";
import { useAuthStore } from "@/runtime/stores/auth-store";
import * as dealRepo from "@/repos/deal-repo";
import { KANBAN_POSITION_GAP } from "@/config/constants";

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
    const userId = useAuthStore.getState().userId;
    const deals = await dealRepo.loadDeals(userId);
    set({ deals, loading: false });
  },

  addDeal: async (d) => {
    const userId = useAuthStore.getState().userId;
    const id = await dealRepo.addDeal(userId, d, get().deals);
    if (!id) {
      useToastStore.getState().show("거래 생성 실패");
      return null;
    }
    useToastStore.getState().show("거래가 시작되었습니다");
    get().loadDeals();
    return id;
  },

  updateDeal: async (id, d) => {
    // Calculate new position when status changes
    let newPosition: number | undefined;
    if (d.status !== undefined) {
      const targetDeals = get().deals.filter((x) => x.status === d.status && x.id !== id);
      const minPos = targetDeals.length > 0 ? Math.min(...targetDeals.map((x) => x.position)) : KANBAN_POSITION_GAP;
      newPosition = minPos - KANBAN_POSITION_GAP;
    }

    // Optimistic update
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

    const ok = await dealRepo.updateDeal(id, {
      ...d,
      position: newPosition,
    });
    if (!ok) {
      get().loadDeals();
      return;
    }
    // Reload to get joined names if seller/buyer changed
    if (d.sellerId !== undefined || d.buyerId !== undefined) get().loadDeals();
  },

  deleteDeal: async (id) => {
    const ok = await dealRepo.deleteDeal(id);
    if (!ok) return;
    useToastStore.getState().show("거래가 삭제되었습니다");
    get().loadDeals();
  },

  moveDeal: (id, toStatus, toIndex) => {
    const columnDeals = get().deals
      .filter((d) => d.status === toStatus && d.id !== id)
      .sort((a, b) => a.position - b.position);

    let newPos: number;
    if (columnDeals.length === 0) {
      newPos = KANBAN_POSITION_GAP;
    } else if (toIndex <= 0) {
      newPos = columnDeals[0].position - KANBAN_POSITION_GAP;
    } else if (toIndex >= columnDeals.length) {
      newPos = columnDeals[columnDeals.length - 1].position + KANBAN_POSITION_GAP;
    } else {
      newPos = (columnDeals[toIndex - 1].position + columnDeals[toIndex].position) / 2;
    }

    // Optimistic update
    set((s) => ({
      deals: s.deals.map((d) =>
        d.id === id ? { ...d, status: toStatus, position: newPos, updatedAt: new Date().toISOString() } : d
      ),
    }));

    dealRepo.moveDeal(id, toStatus, newPos).then((ok) => {
      if (!ok) get().loadDeals();
    });
  },
}));
