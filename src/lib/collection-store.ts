import { create } from "zustand";
import { Collection, CollectionEntry } from "@/types";
import { supabase } from "@/lib/supabase";
import { useToastStore } from "@/lib/toast-store";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

interface CollectionState {
  collections: Collection[];
  deletedCollections: Collection[];
  loading: boolean;
  loadCollections: () => Promise<void>;
  addCollection: (name: string) => Promise<string>;
  removeCollection: (id: string) => void;
  restoreCollection: (id: string) => void;
  permanentDeleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  addToCollection: (collectionId: string, propertyIds: string[]) => void;
  removeFromCollection: (collectionId: string, propertyId: string) => void;
  getCollectionsForProperty: (propertyId: string) => Collection[];
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  deletedCollections: [],
  loading: false,

  loadCollections: async () => {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Collection load error:", error);
      set({ loading: false });
      return;
    }
    const all = (data || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      propertyIds: (r.property_ids as string[]) || [],
      entries: (r.entries as CollectionEntry[]) || [],
      createdAt: r.created_at as string,
      isDeleted: (r.is_deleted as boolean) || false,
    }));
    set({
      collections: all.filter((c) => !c.isDeleted),
      deletedCollections: all.filter((c) => c.isDeleted),
      loading: false,
    });
  },

  addCollection: async (name) => {
    const id = generateId();
    const now = new Date().toISOString();
    const { error } = await supabase.from("collections").insert({
      id,
      name,
      property_ids: [],
      entries: [],
      created_at: now,
    });
    if (error) {
      console.error("Collection add error:", error);
      useToastStore.getState().show("컬렉션 생성 실패. 다시 시도해주세요");
      return "";
    }
    set((s) => ({
      collections: [
        { id, name, propertyIds: [], entries: [], createdAt: now },
        ...s.collections,
      ],
    }));
    useToastStore.getState().show(`"${name}" 컬렉션이 생성되었습니다`);
    return id;
  },

  removeCollection: (id) => {
    const col = get().collections.find((c) => c.id === id);
    if (!col) return;
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
      deletedCollections: [{ ...col }, ...s.deletedCollections],
    }));
    supabase.from("collections").update({ is_deleted: true, updated_at: new Date().toISOString() }).eq("id", id).then(({ error }) => {
      if (error) {
        console.error("Collection delete error:", error);
        useToastStore.getState().show("삭제 실패. 다시 시도해주세요");
        get().loadCollections();
        return;
      }
      useToastStore.getState().show(`"${col.name}" 컬렉션이 삭제되었습니다`);
    });
  },

  restoreCollection: (id) => {
    const col = get().deletedCollections.find((c) => c.id === id);
    if (!col) return;
    set((s) => ({
      deletedCollections: s.deletedCollections.filter((c) => c.id !== id),
      collections: [{ ...col }, ...s.collections],
    }));
    supabase.from("collections").update({ is_deleted: false, updated_at: new Date().toISOString() }).eq("id", id).then(({ error }) => {
      if (error) console.error("Collection restore error:", error);
      else useToastStore.getState().show(`"${col.name}" 컬렉션이 복원되었습니다`);
    });
  },

  permanentDeleteCollection: (id) => {
    const name = get().deletedCollections.find((c) => c.id === id)?.name;
    set((s) => ({
      deletedCollections: s.deletedCollections.filter((c) => c.id !== id),
    }));
    supabase.from("collections").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("Collection permanent delete error:", error);
      else useToastStore.getState().show(`"${name}" 컬렉션이 영구 삭제되었습니다`);
    });
  },

  renameCollection: (id, name) => {
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, name } : c
      ),
    }));
    supabase.from("collections").update({ name, updated_at: new Date().toISOString() }).eq("id", id).then(({ error }) => {
      if (error) console.error("Collection rename error:", error);
    });
  },

  addToCollection: (collectionId, propertyIds) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const now = new Date().toISOString();
    const existing = new Set(col.propertyIds);
    const newIds = propertyIds.filter((id) => !existing.has(id));
    if (newIds.length === 0) return;
    const newEntries = newIds.map((id) => ({ propertyId: id, addedAt: now }));
    const updatedPropertyIds = [...col.propertyIds, ...newIds];
    const updatedEntries = [...(col.entries || []), ...newEntries];

    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === collectionId
          ? { ...c, propertyIds: updatedPropertyIds, entries: updatedEntries }
          : c
      ),
    }));
    supabase.from("collections").update({
      property_ids: updatedPropertyIds,
      entries: updatedEntries,
      updated_at: new Date().toISOString(),
    }).eq("id", collectionId).then(({ error }) => {
      if (error) console.error("Collection update error:", error);
    });
    useToastStore.getState().show(`"${col.name}"에 저장되었습니다`);
  },

  removeFromCollection: (collectionId, propertyId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const updatedPropertyIds = col.propertyIds.filter((p) => p !== propertyId);
    const updatedEntries = (col.entries || []).filter((e) => e.propertyId !== propertyId);

    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === collectionId
          ? { ...c, propertyIds: updatedPropertyIds, entries: updatedEntries }
          : c
      ),
    }));
    supabase.from("collections").update({
      property_ids: updatedPropertyIds,
      entries: updatedEntries,
      updated_at: new Date().toISOString(),
    }).eq("id", collectionId).then(({ error }) => {
      if (error) console.error("Collection remove error:", error);
    });
  },

  getCollectionsForProperty: (propertyId) =>
    get().collections.filter((c) => c.propertyIds.includes(propertyId)),
}));
