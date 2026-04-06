import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Collection } from "@/types";

interface CollectionState {
  collections: Collection[];
  addCollection: (name: string) => string; // returns new id
  removeCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  addToCollection: (collectionId: string, propertyIds: string[]) => void;
  removeFromCollection: (collectionId: string, propertyId: string) => void;
  getCollectionsForProperty: (propertyId: string) => Collection[];
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      collections: [],

      addCollection: (name) => {
        const id = generateId();
        set((s) => ({
          collections: [
            ...s.collections,
            { id, name, propertyIds: [], createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },

      removeCollection: (id) =>
        set((s) => ({
          collections: s.collections.filter((c) => c.id !== id),
        })),

      renameCollection: (id, name) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, name } : c
          ),
        })),

      addToCollection: (collectionId, propertyIds) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  propertyIds: [
                    ...new Set([...c.propertyIds, ...propertyIds]),
                  ],
                }
              : c
          ),
        })),

      removeFromCollection: (collectionId, propertyId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? { ...c, propertyIds: c.propertyIds.filter((p) => p !== propertyId) }
              : c
          ),
        })),

      getCollectionsForProperty: (propertyId) =>
        get().collections.filter((c) => c.propertyIds.includes(propertyId)),
    }),
    { name: "realestate-collections" }
  )
);
