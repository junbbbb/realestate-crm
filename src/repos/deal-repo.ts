import { supabase } from "@/config/supabase";
import { Deal, DealStatus } from "@/lib/deal-store";
import { KANBAN_POSITION_GAP } from "@/config/constants";

// ---------------------------------------------------------------------------
// Load all deals for a user (with joined property / customer info)
// ---------------------------------------------------------------------------
export async function loadDeals(userId: string | null): Promise<Deal[]> {
  let query = supabase
    .from("deals")
    .select(
      `
      *,
      properties:property_id (id, description, article_name, address, dong),
      seller:seller_id (id, name),
      buyer:buyer_id (id, name)
    `
    )
    .order("position", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("loadDeals error:", error);
    return [];
  }

  return (data || []).map((r: Record<string, unknown>) => {
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
      propertyTitle: prop
        ? (prop.description as string) ||
          (prop.article_name as string) ||
          `${prop.dong}`
        : undefined,
      propertyAddress: prop ? (prop.address as string) : undefined,
      sellerName: seller ? (seller.name as string) : undefined,
      buyerName: buyer ? (buyer.name as string) : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Add a deal
// ---------------------------------------------------------------------------
export async function addDeal(
  userId: string | null,
  d: {
    propertyId?: string;
    sellerId?: string;
    buyerId?: string;
    dealType: string;
    memo?: string;
  },
  existingDeals: Deal[]
): Promise<string | null> {
  // Place at top of "거래전" column
  const firstInColumn = existingDeals.filter((x) => x.status === "거래전");
  const minPos =
    firstInColumn.length > 0
      ? Math.min(...firstInColumn.map((x) => x.position))
      : KANBAN_POSITION_GAP;
  const newPos = minPos - KANBAN_POSITION_GAP;

  const row: Record<string, unknown> = {
    property_id: d.propertyId || null,
    seller_id: d.sellerId || null,
    buyer_id: d.buyerId || null,
    deal_type: d.dealType,
    status: "거래전",
    memo: d.memo || "",
    position: newPos,
  };
  if (userId) {
    row.user_id = userId;
  }

  const { data, error } = await supabase
    .from("deals")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("addDeal error:", error);
    return null;
  }
  return data.id;
}

// ---------------------------------------------------------------------------
// Update deal fields
// ---------------------------------------------------------------------------
export async function updateDeal(
  id: string,
  d: Partial<{
    sellerId: string | null;
    buyerId: string | null;
    status: DealStatus;
    memo: string;
    position: number;
  }>
): Promise<boolean> {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (d.sellerId !== undefined) row.seller_id = d.sellerId;
  if (d.buyerId !== undefined) row.buyer_id = d.buyerId;
  if (d.status !== undefined) row.status = d.status;
  if (d.memo !== undefined) row.memo = d.memo;
  if (d.position !== undefined) row.position = d.position;

  const { error } = await supabase.from("deals").update(row).eq("id", id);
  if (error) {
    console.error("updateDeal error:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Delete deal
// ---------------------------------------------------------------------------
export async function deleteDeal(id: string): Promise<boolean> {
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) {
    console.error("deleteDeal error:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Move deal (status + position)
// ---------------------------------------------------------------------------
export async function moveDeal(
  id: string,
  status: DealStatus,
  position: number
): Promise<boolean> {
  const { error } = await supabase
    .from("deals")
    .update({
      status,
      position,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("moveDeal error:", error);
    return false;
  }
  return true;
}
