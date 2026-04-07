import { supabase } from "@/config/supabase";
import { Customer } from "@/lib/customer-store";

// ---------------------------------------------------------------------------
// Load all customers for a user
// ---------------------------------------------------------------------------
export async function loadCustomers(
  userId: string | null
): Promise<Customer[]> {
  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("loadCustomers error:", error);
    return [];
  }

  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    phone: r.phone as string,
    email: (r.email as string) || undefined,
    role: (r.role as Customer["role"]) || "buyer",
    memo: (r.memo as string) || "",
    interestedIn: (r.interested_in as string[]) || [],
    budgetMin: r.budget_min as number,
    budgetMax: r.budget_max as number,
    preferredArea: (r.preferred_area as string) || undefined,
    preferredFloor: (r.preferred_floor as string) || undefined,
    businessType: (r.business_type as string) || undefined,
    premiumBudget: (r.premium_budget as number) || undefined,
    createdAt: r.created_at as string,
  }));
}

// ---------------------------------------------------------------------------
// Add a customer
// ---------------------------------------------------------------------------
export async function addCustomer(
  userId: string | null,
  c: Omit<Customer, "id" | "createdAt">
): Promise<Customer | null> {
  const row: Record<string, unknown> = {
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
  };
  if (userId) {
    row.user_id = userId;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error("addCustomer error:", error);
    return null;
  }
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    phone: r.phone as string,
    email: (r.email as string) || undefined,
    role: (r.role as Customer["role"]) || "buyer",
    memo: (r.memo as string) || "",
    interestedIn: (r.interested_in as string[]) || [],
    budgetMin: r.budget_min as number,
    budgetMax: r.budget_max as number,
    preferredArea: (r.preferred_area as string) || undefined,
    preferredFloor: (r.preferred_floor as string) || undefined,
    businessType: (r.business_type as string) || undefined,
    premiumBudget: (r.premium_budget as number) || undefined,
    createdAt: r.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Update customer
// ---------------------------------------------------------------------------
export async function updateCustomer(
  id: string,
  c: Partial<Customer>
): Promise<boolean> {
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
    console.error("updateCustomer error:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Delete customer
// ---------------------------------------------------------------------------
export async function deleteCustomer(id: string): Promise<boolean> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    console.error("deleteCustomer error:", error);
    return false;
  }
  return true;
}
