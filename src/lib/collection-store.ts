import { create } from "zustand";
import { Collection } from "@/types";
import { useToastStore } from "@/lib/toast-store";
import { useAuthStore } from "@/runtime/stores/auth-store";
import * as collectionRepo from "@/repos/collection-repo";

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
    const userId = useAuthStore.getState().userId;
    const { active, deleted } = await collectionRepo.loadCollections(userId);
    set({
      collections: active,
      deletedCollections: deleted,
      loading: false,
    });
  },

  addCollection: async (name) => {
    const userId = useAuthStore.getState().userId;
    const id = await collectionRepo.addCollection(userId, name);
    if (!id) {
      useToastStore.getState().show("컬렉션 생성 실패. 다시 시도해주세요");
      return "";
    }
    const now = new Date().toISOString();
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
    // Optimistic update
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
      deletedCollections: [{ ...col }, ...s.deletedCollections],
    }));
    collectionRepo.removeCollection(id).then((ok) => {
      if (!ok) {
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
    collectionRepo.restoreCollection(id).then((ok) => {
      if (ok) useToastStore.getState().show(`"${col.name}" 컬렉션이 복원되었습니다`);
    });
  },

  permanentDeleteCollection: (id) => {
    const name = get().deletedCollections.find((c) => c.id === id)?.name;
    set((s) => ({
      deletedCollections: s.deletedCollections.filter((c) => c.id !== id),
    }));
    collectionRepo.permanentDeleteCollection(id).then((ok) => {
      if (ok) useToastStore.getState().show(`"${name}" 컬렉션이 영구 삭제되었습니다`);
    });
  },

  renameCollection: (id, name) => {
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, name } : c
      ),
    }));
    collectionRepo.renameCollection(id, name);
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

    // Optimistic update
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === collectionId
          ? { ...c, propertyIds: updatedPropertyIds, entries: updatedEntries }
          : c
      ),
    }));
    collectionRepo.addToCollection(collectionId, updatedPropertyIds, updatedEntries);
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
    collectionRepo.removeFromCollection(collectionId, updatedPropertyIds, updatedEntries);
  },

  getCollectionsForProperty: (propertyId) =>
    get().collections.filter((c) => c.propertyIds.includes(propertyId)),
}));
