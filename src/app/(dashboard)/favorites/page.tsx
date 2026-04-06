"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { useCollectionStore } from "@/lib/collection-store";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";
import { Property } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin, Ruler, BedDouble, FolderOpen, Bookmark, Plus, Trash2, ArrowLeft,
  Pencil, X, Loader2,
} from "lucide-react";

export default function Favorites() {
  const properties = useStore((s) => s.properties);
  const collections = useCollectionStore((s) => s.collections);
  const addCollection = useCollectionStore((s) => s.addCollection);
  const removeCollection = useCollectionStore((s) => s.removeCollection);
  const renameCollection = useCollectionStore((s) => s.renameCollection);
  const removeFromCollection = useCollectionStore((s) => s.removeFromCollection);

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [collectionProperties, setCollectionProperties] = useState<Property[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);

  const activeCollection = activeCollectionId
    ? collections.find((c) => c.id === activeCollectionId)
    : null;

  // Fetch collection properties directly from Supabase
  const loadCollectionProperties = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setCollectionProperties([]);
      return;
    }
    setLoadingCollection(true);
    try {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .in("id", ids);
      if (data) {
        setCollectionProperties(
          data.map((row: any) => ({
            id: row.id,
            title: row.description || row.article_name || `${row.dong} ${row.real_estate_type_name}`,
            address: row.address,
            propertyType: row.real_estate_type_name,
            dealType: row.trade_type_name,
            price: row.price,
            deposit: row.warrant_price || undefined,
            monthlyRent: row.monthly_rent || undefined,
            area: row.area2 || row.area1,
            rooms: 1,
            bathrooms: 1,
            floor: row.floor_info?.split("/")[0] ? parseInt(row.floor_info.split("/")[0]) || undefined : undefined,
            description: row.description || "",
            isFavorite: row.is_favorite || false,
            isMyListing: row.is_my_listing || false,
            createdAt: row.confirm_date || row.created_at,
            features: row.tag_list || [],
            contact: row.realtor_name || undefined,
          }))
        );
      }
    } catch (e) {
      console.error("Collection load error:", e);
    } finally {
      setLoadingCollection(false);
    }
  }, []);

  useEffect(() => {
    if (activeCollection) {
      loadCollectionProperties(activeCollection.propertyIds);
    }
  }, [activeCollection, loadCollectionProperties]);

  const allSavedIds = useMemo(
    () => [...new Set(collections.flatMap((c) => c.propertyIds))],
    [collections]
  );

  // Load all saved properties when not viewing a specific collection
  useEffect(() => {
    if (!activeCollection) {
      loadCollectionProperties(allSavedIds);
    }
  }, [activeCollection, allSavedIds, loadCollectionProperties]);

  const displayProperties = activeCollection ? collectionProperties : collectionProperties;

  const title = activeCollection ? activeCollection.name : "저장한 매물";
  const count = activeCollection ? activeCollection.propertyIds.length : allSavedIds.length;

  function handleCreateCollection() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addCollection(trimmed);
    setNewName("");
    setShowNewInput(false);
  }

  function handleStartRename(id: string, currentName: string) {
    setEditingId(id);
    setEditName(currentName);
  }

  function handleFinishRename() {
    if (editingId && editName.trim()) {
      renameCollection(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeCollection && (
            <button
              onClick={() => setActiveCollectionId(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {activeCollection ? `${count}건` : `관심 매물 ${count}건`}
            </p>
          </div>
        </div>
      </div>

      {/* Collection cards — shown only when no collection is active */}
      {!activeCollection && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />
              내 컬렉션
            </h2>
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              onClick={() => setShowNewInput(true)}
            >
              <Plus className="h-3 w-3" />
              새 컬렉션
            </button>
          </div>

          {showNewInput && (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                placeholder="컬렉션 이름..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCollection();
                  if (e.key === "Escape") { setShowNewInput(false); setNewName(""); }
                }}
                className="h-8 text-sm flex-1"
              />
              <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowNewInput(false); setNewName(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {collections.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {collections.map((c) => {
                return (
                  <button
                    key={c.id}
                    className="bg-card border rounded-lg p-4 text-left hover:border-foreground/20 transition-colors group relative"
                    onClick={() => {
                      if (editingId !== c.id) setActiveCollectionId(c.id);
                    }}
                  >
                    {/* Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        className="p-1 rounded hover:bg-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(c.id, c.name);
                        }}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCollection(c.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>

                    <FolderOpen className="h-5 w-5 text-muted-foreground mb-2" />
                    {editingId === c.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleFinishRename();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={handleFinishRename}
                        onClick={(e) => e.stopPropagation()}
                        className="block w-full bg-transparent text-sm font-semibold outline-none border-b border-primary"
                      />
                    ) : (
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.propertyIds.length}건
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {collections.length === 0 && !showNewInput && (
            <div className="text-center py-8 border rounded-lg bg-card">
              <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                컬렉션이 없습니다. 매물 목록에서 🔖 버튼으로 추가하세요.
              </p>
            </div>
          )}

        </div>
      )}

      {/* Property grid */}
      {loadingCollection ? (
        <div className="text-center py-20">
          <Loader2 className="h-8 w-8 mx-auto text-muted-foreground/50 animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </div>
      ) : count === 0 ? (
        <div className="text-center py-20">
          {activeCollection ? (
            <>
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="font-medium">이 컬렉션이 비어있습니다</p>
              <p className="text-sm text-muted-foreground mt-1">매물 목록에서 🔖 버튼으로 추가하세요.</p>
            </>
          ) : (
            <>
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="font-medium">저장한 매물이 없습니다</p>
              <p className="text-sm text-muted-foreground mt-1">매물 목록에서 🔖 버튼으로 컬렉션에 저장하세요.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayProperties.map((p) => (
            <div key={p.id} className="bg-card rounded-lg p-5 space-y-3 group">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <Badge className="bg-black text-white hover:bg-black/80">{p.dealType}</Badge>
                  <Badge variant="outline" className="font-normal">{p.propertyType}</Badge>
                </div>
                {activeCollection && (
                  <button
                    onClick={() => removeFromCollection(activeCollection.id, p.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="컬렉션에서 제거"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <p className="font-semibold truncate">{p.title}</p>
              <p className="text-2xl font-bold">{formatPrice(p)}</p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{p.address}</span>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{p.area}m²</span>
                <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{p.rooms}방</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
