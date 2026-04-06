"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useCollectionStore } from "@/lib/collection-store";
import { useStore } from "@/lib/store";
import { supabase, SupabaseProperty } from "@/lib/supabase";
import { formatPrice, formatMoney } from "@/lib/format";
import { Property } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  MapPin, FolderOpen, Bookmark, Plus, Trash2, ArrowLeft,
  Pencil, X, Loader2, Building2, Undo2,
} from "lucide-react";
import { DetailPanel } from "@/app/(dashboard)/properties/page";

type SimpleProperty = {
  id: string;
  title: string;
  address: string;
  propertyType: string;
  dealType: string;
  realEstateTypeCode: string;
  tradeTypeCode: string;
  price: number;
  deposit?: number;
  monthlyRent?: number;
  area: number;
  floor?: string;
  memo?: string;
};

export default function Favorites() {
  const collections = useCollectionStore((s) => s.collections);
  const deletedCollections = useCollectionStore((s) => s.deletedCollections);
  const addCollection = useCollectionStore((s) => s.addCollection);
  const removeCollection = useCollectionStore((s) => s.removeCollection);
  const restoreCollection = useCollectionStore((s) => s.restoreCollection);
  const permanentDeleteCollection = useCollectionStore((s) => s.permanentDeleteCollection);
  const renameCollection = useCollectionStore((s) => s.renameCollection);
  const removeFromCollection = useCollectionStore((s) => s.removeFromCollection);

  const [viewTab, setViewTab] = useState<"active" | "deleted">("active");

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 폴더 카드용 미리보기: 전체 컬렉션의 매물 ID를 모아서 한번에 조회
  const [previewMap, setPreviewMap] = useState<Record<string, SimpleProperty>>({});
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  // 상세 보기용
  const [detailProperties, setDetailProperties] = useState<SimpleProperty[]>([]);

  const activeCollection = activeCollectionId
    ? collections.find((c) => c.id === activeCollectionId)
    : null;

  // 모든 컬렉션의 매물 ID를 모아서 미리보기 로드
  const allIds = useMemo(
    () => [...new Set([...collections, ...deletedCollections].flatMap((c) => c.propertyIds))],
    [collections, deletedCollections]
  );

  useEffect(() => {
    if (allIds.length === 0) { setPreviewMap({}); return; }
    setLoadingPreviews(true);
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, article_name, description, dong, real_estate_type, real_estate_type_name, trade_type, trade_type_name, price, warrant_price, monthly_rent, area1, area2, floor_info, address, memo")
        .in("id", allIds);
      const map: Record<string, SimpleProperty> = {};
      (data || []).forEach((r: Record<string, unknown>) => {
        map[r.id as string] = {
          id: r.id as string,
          title: (r.description as string) || (r.article_name as string) || `${r.dong} ${r.real_estate_type_name}`,
          address: r.address as string,
          propertyType: r.real_estate_type_name as string,
          dealType: r.trade_type_name as string,
          realEstateTypeCode: (r.real_estate_type as string) || "",
          tradeTypeCode: (r.trade_type as string) || "",
          price: r.price as number,
          deposit: (r.warrant_price as number) || undefined,
          monthlyRent: (r.monthly_rent as number) || undefined,
          area: (r.area2 as number) || (r.area1 as number),
          floor: r.floor_info as string,
          memo: (r.memo as string) || undefined,
        };
      });
      setPreviewMap(map);
      setLoadingPreviews(false);
    })();
  }, [allIds]);

  // 컬렉션 상세 진입 시 — previewMap에서 재사용
  useEffect(() => {
    if (!activeCollection) { setDetailProperties([]); return; }
    const ids = activeCollection.propertyIds;
    const sorted = (activeCollection.entries || [])
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      .map((e) => previewMap[e.propertyId])
      .filter(Boolean);
    setDetailProperties(sorted.length > 0 ? sorted : ids.map((id) => previewMap[id]).filter(Boolean));
  }, [activeCollection, previewMap]);

  async function handleCreateCollection() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = await addCollection(trimmed);
    if (!id) return;
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

  function fmtPrice(p: SimpleProperty) {
    if (p.dealType === "월세") {
      return `${formatMoney(p.deposit ?? 0)} / ${formatMoney(p.monthlyRent ?? 0)}`;
    }
    return formatMoney(p.price);
  }

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detailEditName, setDetailEditName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // detailProperties를 Property 타입으로 변환 (DetailPanel용)
  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;
    const p = detailProperties.find((pr) => pr.id === selectedPropertyId);
    if (!p) return null;
    return {
      id: p.id,
      title: p.title,
      address: p.address,
      propertyType: p.propertyType as Property["propertyType"],
      dealType: p.dealType as Property["dealType"],
      realEstateTypeCode: p.realEstateTypeCode,
      tradeTypeCode: p.tradeTypeCode,
      price: p.price,
      deposit: p.deposit,
      monthlyRent: p.monthlyRent,
      area: p.area,
      areaLabel: `${p.area}m²`,
      rooms: 1,
      bathrooms: 1,
      floor: p.floor ? parseInt(p.floor.split("/")[0]) || undefined : undefined,
      totalFloors: p.floor ? parseInt(p.floor.split("/")[1]) || undefined : undefined,
      description: "",
      memo: p.memo,
      isFavorite: false,
      isMyListing: false,
      createdAt: "",
      features: [],
    } as Property;
  }, [selectedPropertyId, detailProperties]);

  // ── 컬렉션 상세 보기 ──
  if (activeCollection) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setActiveCollectionId(null); setSelectedPropertyId(null); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              {detailEditing ? (
                <input
                  autoFocus
                  value={detailEditName}
                  onChange={(e) => setDetailEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && detailEditName.trim()) {
                      renameCollection(activeCollection.id, detailEditName.trim());
                      setDetailEditing(false);
                    }
                    if (e.key === "Escape") setDetailEditing(false);
                  }}
                  onBlur={() => {
                    if (detailEditName.trim()) renameCollection(activeCollection.id, detailEditName.trim());
                    setDetailEditing(false);
                  }}
                  className="text-3xl font-bold bg-transparent outline-none border-b-2 border-primary"
                />
              ) : (
                <h1 className="text-3xl font-bold">{activeCollection.name}</h1>
              )}
              <p className="text-muted-foreground text-sm mt-1">{activeCollection.propertyIds.length}건</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-sm gap-1.5" onClick={() => { setDetailEditName(activeCollection.name); setDetailEditing(true); }}>
              <Pencil className="h-3.5 w-3.5" />이름 변경
            </Button>
            <Button size="sm" variant="ghost" className="text-sm gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5" />삭제
            </Button>
          </div>
        </div>

        {/* 삭제 확인 팝업 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card border rounded-lg shadow-lg p-6 w-[320px] space-y-4">
              <p className="text-sm font-medium">"{activeCollection.name}" 컬렉션을 삭제하시겠습니까?</p>
              <p className="text-xs text-muted-foreground">저장된 매물 {activeCollection.propertyIds.length}건이 포함되어 있습니다.</p>
              <p className="text-xs text-muted-foreground">삭제 후에도 "삭제됨" 탭에서 복원할 수 있습니다.</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>취소</Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  removeCollection(activeCollection.id);
                  setShowDeleteConfirm(false);
                  setActiveCollectionId(null);
                  setSelectedPropertyId(null);
                }}>삭제</Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-6 h-[calc(100vh-10rem)]">
          {/* 왼쪽: 테이블 */}
          <div className="flex-1 min-w-0 flex flex-col">
            {detailProperties.length === 0 ? (
              <div className="text-center py-20">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="font-medium">이 컬렉션이 비어있습니다</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg border overflow-auto flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow className="bg-secondary hover:bg-secondary">
                      <TableHead className="text-sm font-medium pl-4">매물명</TableHead>
                      <TableHead className="text-sm font-medium">동</TableHead>
                      <TableHead className="text-sm font-medium">거래</TableHead>
                      <TableHead className="text-sm font-medium text-right">가격</TableHead>
                      <TableHead className="text-sm font-medium text-right">면적</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailProperties.map((p) => (
                      <TableRow
                        key={p.id}
                        className={`cursor-pointer transition-colors ${selectedPropertyId === p.id ? "bg-accent" : "hover:bg-accent/50"}`}
                        onClick={() => setSelectedPropertyId(p.id)}
                      >
                        <TableCell className="max-w-[200px] pl-4">
                          <p className="font-medium text-sm truncate">{p.title}</p>
                          {p.memo && <p className="text-[11px] text-primary truncate">{p.memo}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.address.replace("서울시 마포구 ", "")}</TableCell>
                        <TableCell className="text-sm">{p.dealType}</TableCell>
                        <TableCell className="text-sm font-semibold text-right tabular-nums">{fmtPrice(p)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground text-right tabular-nums">{p.area}m²</TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => removeFromCollection(activeCollection.id, p.id)}
                            className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity inline-flex"
                            title="제거"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* 오른쪽: 상세 패널 */}
          <div className="w-[380px] shrink-0">
            {selectedProperty ? (
              <DetailPanel property={selectedProperty} onClose={() => setSelectedPropertyId(null)} onMemoSaved={(id, memo) => {
                setDetailProperties((prev) => prev.map((p) => p.id === id ? { ...p, memo: memo || undefined } : p));
              }} />
            ) : (
              <div className="h-full flex items-center justify-center border rounded-lg">
                <div className="text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">매물을 선택하면</p>
                  <p className="text-sm text-muted-foreground">상세 정보가 여기에 표시됩니다</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 폴더 목록 (메인) ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">저장한 매물</h1>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setViewTab("active")}
              className={`text-sm px-3 py-1 rounded-md transition-colors ${viewTab === "active" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent"}`}
            >
              컬렉션 {collections.length}
            </button>
            <button
              onClick={() => setViewTab("deleted")}
              className={`text-sm px-3 py-1 rounded-md transition-colors ${viewTab === "deleted" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent"}`}
            >
              삭제됨 {deletedCollections.length}
            </button>
          </div>
        </div>
        <Button size="sm" variant="outline" className="text-sm gap-1.5" onClick={() => setShowNewInput(true)}>
          <Plus className="h-3.5 w-3.5" />새 컬렉션
        </Button>
      </div>

      {showNewInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border rounded-lg shadow-lg p-6 w-[360px] space-y-4">
            <h2 className="text-lg font-bold">새 컬렉션</h2>
            <Input
              autoFocus
              placeholder="컬렉션 이름을 입력하세요"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCollection();
                if (e.key === "Escape") { setShowNewInput(false); setNewName(""); }
              }}
              className="h-10 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setShowNewInput(false); setNewName(""); }}>취소</Button>
              <Button size="sm" onClick={handleCreateCollection} disabled={!newName.trim()}>만들기</Button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제됨 탭 */}
      {viewTab === "deleted" ? (
        <div className="space-y-3">
          {deletedCollections.length === 0 ? (
            <div className="text-center py-20 border rounded-lg bg-card">
              <Trash2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">삭제된 컬렉션이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {deletedCollections.map((c) => {
                const previews = c.propertyIds.slice(0, 5).map((id) => previewMap[id]).filter(Boolean);
                return (
                  <div key={c.id} className="bg-card border rounded-lg p-5 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Trash2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.propertyIds.length}건</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => restoreCollection(c.id)}>
                          <Undo2 className="h-3.5 w-3.5" />복원
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:text-red-600" onClick={() => permanentDeleteCollection(c.id)}>
                          영구삭제
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {previews.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">매물 정보 없음</p>
                      ) : (
                        <>
                          {previews.map((p) => (
                            <div key={p.id} className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded bg-secondary flex items-center justify-center shrink-0">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{p.title}</p>
                                <p className="text-[11px] text-muted-foreground">{p.propertyType} · {p.address.replace("서울시 마포구 ", "")}</p>
                              </div>
                              <p className="text-xs font-medium shrink-0">{fmtPrice(p)}</p>
                            </div>
                          ))}
                          {c.propertyIds.length > 5 && (
                            <p className="text-[11px] text-muted-foreground pl-9">+{c.propertyIds.length - 5}건 더보기</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : loadingPreviews ? (
        <div className="text-center py-20">
          <Loader2 className="h-8 w-8 mx-auto text-muted-foreground/50 animate-spin" />
        </div>
      ) : collections.length === 0 && !showNewInput ? (
        <div className="text-center py-20 border rounded-lg bg-card">
          <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">컬렉션이 없습니다</p>
          <p className="text-xs text-muted-foreground mt-1">매물 목록에서 북마크 버튼으로 추가하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {collections.map((c) => {
            const sortedEntries = [...(c.entries || [])].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
            const entryMap = Object.fromEntries(sortedEntries.map((e) => [e.propertyId, e.addedAt]));
            const sortedIds = sortedEntries.length > 0 ? sortedEntries.map((e) => e.propertyId) : c.propertyIds;
            const previews = sortedIds.slice(0, 5).map((id) => previewMap[id]).filter(Boolean);
            return (
              <div key={c.id} className="bg-card border rounded-lg p-5 cursor-pointer group hover:border-foreground/20 transition-colors"
                onClick={() => { if (editingId !== c.id) setActiveCollectionId(c.id); }}>
                <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
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
                        className="bg-transparent text-base font-bold outline-none border-b border-primary w-full"
                      />
                    ) : (
                      <p className="text-base font-bold truncate">{c.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{c.propertyIds.length}건</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button className="p-1.5 rounded hover:bg-secondary" onClick={(e) => { e.stopPropagation(); handleStartRename(c.id, c.name); }}><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-secondary" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(c.id); }}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  {previews.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">매물 없음</p>
                  ) : (
                    <>
                      {previews.map((p) => {
                        const addedAt = entryMap[p.id];
                        const timeStr = addedAt ? (() => {
                          const d = new Date(addedAt);
                          return `${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getDate().toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
                        })() : "";
                        return (
                          <div key={p.id} className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded bg-secondary flex items-center justify-center shrink-0">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{p.title}</p>
                              <p className="text-[11px] text-muted-foreground">{p.propertyType} · {p.address.replace("서울시 마포구 ", "")}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-medium">{fmtPrice(p)}</p>
                              {timeStr && <p className="text-[10px] text-muted-foreground">{timeStr}</p>}
                            </div>
                          </div>
                        );
                      })}
                      {c.propertyIds.length > 5 && (
                        <p className="text-[11px] text-muted-foreground pl-9">+{c.propertyIds.length - 5}건 더보기</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteConfirmId && (() => {
        const col = collections.find((c) => c.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card border rounded-lg shadow-lg p-6 w-[320px] space-y-4">
              <p className="text-sm font-medium">"{col?.name}" 컬렉션을 삭제하시겠습니까?</p>
              <p className="text-xs text-muted-foreground">{col?.propertyIds.length ?? 0}건의 매물이 포함되어 있습니다.</p>
              <p className="text-xs text-muted-foreground">삭제 후에도 "삭제됨" 탭에서 복원할 수 있습니다.</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId(null)}>취소</Button>
                <Button size="sm" variant="destructive" onClick={() => { removeCollection(deleteConfirmId); setDeleteConfirmId(null); }}>삭제</Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
