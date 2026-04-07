import { create } from "zustand";
import { useToastStore } from "@/lib/toast-store";
import { useAuthStore } from "@/runtime/stores/auth-store";
import * as customerRepo from "@/repos/customer-repo";

export type CustomerRole = "buyer" | "seller" | "both";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: CustomerRole;
  memo: string;
  interestedIn: string[];
  budgetMin: number;
  budgetMax: number;
  preferredArea?: string;
  preferredFloor?: string;
  businessType?: string;
  premiumBudget?: number;
  createdAt: string;
}

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  loadCustomers: () => Promise<void>;
  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  loading: false,

  loadCustomers: async () => {
    set({ loading: true });
    const userId = useAuthStore.getState().userId;
    const customers = await customerRepo.loadCustomers(userId);
    set({ customers, loading: false });
  },

  addCustomer: async (c) => {
    const userId = useAuthStore.getState().userId;
    const result = await customerRepo.addCustomer(userId, c);
    if (!result) return;
    useToastStore.getState().show(`"${c.name}" 고객이 등록되었습니다`);
    get().loadCustomers();
  },

  updateCustomer: async (id, c) => {
    const ok = await customerRepo.updateCustomer(id, c);
    if (!ok) return;
    useToastStore.getState().show("고객 정보가 수정되었습니다");
    get().loadCustomers();
  },

  deleteCustomer: async (id) => {
    const ok = await customerRepo.deleteCustomer(id);
    if (!ok) return;
    useToastStore.getState().show("고객이 삭제되었습니다");
    get().loadCustomers();
  },
}));
