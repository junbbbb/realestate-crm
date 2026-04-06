import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useToastStore } from "@/lib/toast-store";

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
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Customer load error:", error);
      set({ loading: false });
      return;
    }
    set({
      customers: (data || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        phone: r.phone as string,
        email: (r.email as string) || undefined,
        role: (r.role as CustomerRole) || "buyer",
        memo: (r.memo as string) || "",
        interestedIn: (r.interested_in as string[]) || [],
        budgetMin: r.budget_min as number,
        budgetMax: r.budget_max as number,
        preferredArea: (r.preferred_area as string) || undefined,
        preferredFloor: (r.preferred_floor as string) || undefined,
        businessType: (r.business_type as string) || undefined,
        premiumBudget: (r.premium_budget as number) || undefined,
        createdAt: r.created_at as string,
      })),
      loading: false,
    });
  },

  addCustomer: async (c) => {
    const { error } = await supabase.from("customers").insert({
      name: c.name,
      phone: c.phone,
      email: c.email || null,
      role: c.role || "buyer",
      memo: c.memo || "",
      interested_in: c.interestedIn,
      budget_min: c.budgetMin,
      budget_max: c.budgetMax,
      preferred_area: c.preferredArea || null,
      preferred_floor: c.preferredFloor || null,
      business_type: c.businessType || null,
      premium_budget: c.premiumBudget || 0,
    });
    if (error) {
      console.error("Customer add error:", error);
      return;
    }
    useToastStore.getState().show(`"${c.name}" 고객이 등록되었습니다`);
    get().loadCustomers();
  },

  updateCustomer: async (id, c) => {
    const row: Record<string, unknown> = {};
    if (c.name !== undefined) row.name = c.name;
    if (c.phone !== undefined) row.phone = c.phone;
    if (c.email !== undefined) row.email = c.email || null;
    if (c.role !== undefined) row.role = c.role;
    if (c.memo !== undefined) row.memo = c.memo;
    if (c.interestedIn !== undefined) row.interested_in = c.interestedIn;
    if (c.budgetMin !== undefined) row.budget_min = c.budgetMin;
    if (c.budgetMax !== undefined) row.budget_max = c.budgetMax;
    if (c.preferredArea !== undefined) row.preferred_area = c.preferredArea || null;
    if (c.preferredFloor !== undefined) row.preferred_floor = c.preferredFloor || null;
    if (c.businessType !== undefined) row.business_type = c.businessType || null;
    if (c.premiumBudget !== undefined) row.premium_budget = c.premiumBudget || 0;
    row.updated_at = new Date().toISOString();

    const { error } = await supabase.from("customers").update(row).eq("id", id);
    if (error) {
      console.error("Customer update error:", error);
      return;
    }
    useToastStore.getState().show("고객 정보가 수정되었습니다");
    get().loadCustomers();
  },

  deleteCustomer: async (id) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      console.error("Customer delete error:", error);
      return;
    }
    useToastStore.getState().show("고객이 삭제되었습니다");
    get().loadCustomers();
  },
}));
