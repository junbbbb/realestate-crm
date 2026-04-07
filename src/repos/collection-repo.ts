import { supabase } from "@/config/supabase";
import { Collection, CollectionEntry } from "@/types";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------------------------------------------------------------------------
// Load all collections for a user (both active + deleted)
// ---------------------------------------------------------------------------
export async function loadCollections(
  userId: string | null
): Promise<{ active: Collection[]; deleted: Collection[] }> {
  let query = supabase
    .from("collections")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("loadCollections error:", error);
    return { active: [], deleted: [] };
  }

  const all = (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    propertyIds: (r.property_ids as string[]) || [],
    entries: (r.entries as CollectionEntry[]) || [],
    createdAt: r.created_at as string,
    isDeleted: (r.is_deleted as boolean) || false,
  }));

  return {
    active: all.filter((c) => !c.isDeleted),
    deleted: all.filter((c) => c.isDeleted),
  };
}

// ---------------------------------------------------------------------------
// Add new collection
// ---------------------------------------------------------------------------
export async function addCollection(
  userId: string | null,
  name: string
): Promise<string> {
  const id = generateId();
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    id,
    name,
    property_ids: [],
    entries: [],
    created_at: now,
  };
  if (userId) {
    row.user_id = userId;
  }

  const { error } = await supabase.from("collections").insert(row);
  if (error) {
    console.error("addCollection error:", error);
    return "";
  }
  return id;
}

// ---------------------------------------------------------------------------
// Soft-delete collection
// ---------------------------------------------------------------------------
export async function removeCollection(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("collections")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("removeCollection error:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Restore soft-deleted collection
// ---------------------------------------------------------------------------
export async function restoreCollection(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("collections")
    .update({ is_deleted: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("restoreCollection error:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Permanently delete collection
// ---------------------------------------------------------------------------
export async function permanentDeleteCollection(id: string): Promise<boolean> {
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) {
    console.error("permanentDeleteCollection error:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Rename collection
// ---------------------------------------------------------------------------
export async function renameCollection(
  id: string,
  name: string
): Promise<boolean> {
  const { error } = await supabase
    .from("collections")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("renameCollection error:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Add properties to collection
// ---------------------------------------------------------------------------
export async function addToCollection(
  id: string,
  updatedPropertyIds: string[],
  updatedEntries: CollectionEntry[]
): Promise<boolean> {
  const { error } = await supabase
    .from("collections")
    .update({
      property_ids: updatedPropertyIds,
      entries: updatedEntries,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("addToCollection error:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Remove property from collection
// ---------------------------------------------------------------------------
export async function removeFromCollection(
  id: string,
  updatedPropertyIds: string[],
  updatedEntries: CollectionEntry[]
): Promise<boolean> {
  const { error } = await supabase
    .from("collections")
    .update({
      property_ids: updatedPropertyIds,
      entries: updatedEntries,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("removeFromCollection error:", error);
    return false;
  }
  return true;
}
