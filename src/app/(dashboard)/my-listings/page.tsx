"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { useToastStore } from "@/lib/toast-store";
import { formatPrice, formatMoney } from "@/lib/format";
import { Property, DealType, PropertyType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  MapPin, Plus, Trash2, Pencil, Loader2, FolderOpen, X, Building2, CheckCircle, Undo2,
} from "lucide-react";
import { DetailPanel } from "@/app/(dashboard)/properties/page";

type MyListing = {
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
  description: string;
  createdAt: string;
  tradeStatus: string;
};

const propertyTypes = ["상가", "건물", "사무실", "상가주택"];
const dealTypes = ["매매", "전세", "월세", "단기임대"];
const tradeCodeMap: Record<string, string> = { "매매": "A1", "전세": "B1", "월세": "B2", "단기임대": "B3" };
const propCodeMap: Record<string, string> = { "상가": "D02", "건물": "D04", "사무실": "D01", "상가주택": "D05" };

function ListingForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const dongList = useStore((s) => s.dongList);
  const loadDongList = useStore((s) => s.loadDongList);
  useEffect(() => { loadDongList(); }, [loadDongList]);
  const [title, setTitle] = useState("");
  const [dong, setDong] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [propertyType, setPropertyType] = useState("상가");
  const [dealType, setDealType] = useState("월세");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [area, setArea] = useState("");
  const [floorInfo, setFloorInfo] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit() {
    if (!title.trim()) return;
    const priceVal = (Number(price) || 0) * 10000;
    const depositVal = (Number(deposit) || 0) * 10000;
    const rentVal = (Number(monthlyRent) || 0) * 10000;

    const { error } = await supabase.from("properties").insert({
      id: `MY-${Date.now()}`,
      article_no: `MY-${Date.now()}`,
      article_name: title.trim(),
      real_estate_type: propCodeMap[propertyType] || "D02",
      real_estate_type_name: propertyType,
      trade_type: tradeCodeMap[dealType] || "B2",
      trade_type_name: dealType,
      dong: dong || "기타",
      address: `서울시 마포구 ${dong}${addressDetail ? " " + addressDetail.trim() : ""}`,
      price: dealType === "매매" ? priceVal : depositVal,
      deal_or_warrant_price: "",
      warrant_price: depositVal,
      monthly_rent: rentVal,
      area1: Number(area) || 0,
      area2: Number(area) || 0,
      floor_info: floorInfo,
      direction: "",
      description: description.trim() || title.trim(),
      tag_list: [],
      realtor_name: "",
      confirm_date: new Date().toISOString().split("T")[0],
      source_url: "",
      is_my_listing: true,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Insert error:", error);
      return;
    }
    useToastStore.getState().show("내 매물이 등록되었습니다");
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-lg shadow-lg w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">내 매물 등록</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">매물명 *</p>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 합정역 1층 상가" className="h-9 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">동 *</p>
              <Select value={dong} onValueChange={setDong}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="동 선택" /></SelectTrigger>
                <SelectContent>
                  {dongList.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">상세주소</p>
              <Input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="예: 123-4" className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">유형</p>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">거래</p>
              <Select value={dealType} onValueChange={setDealType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{dealTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {dealType === "매매" ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">매매가 (만원)</p>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">보증금 (만원)</p>
                <Input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">월세 (만원)</p>
                <Input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="0" className="h-9 text-sm" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">면적 (m²)</p>
              <Input type="number" value={area} onChange={(e) => setArea(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">층 (예: 1/5)</p>
              <Input value={floorInfo} onChange={(e) => setFloorInfo(e.target.value)} placeholder="1/5" className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">설명</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="매물 상세 설명..."
              className="w-full text-sm border rounded-md p-2.5 resize-none h-[70px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim() || !dong}>등록</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyListings() {
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("properties")
      .select("id, article_name, description, dong, real_estate_type, real_estate_type_name, trade_type, trade_type_name, price, warrant_price, monthly_rent, area1, area2, floor_info, address, memo, confirm_date, created_at, trade_status")
      .eq("is_my_listing", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setListings(
      (data || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        title: (r.description as string) || (r.article_name as string) || "",
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
        description: (r.description as string) || "",
        createdAt: (r.confirm_date as string) || (r.created_at as string),
        tradeStatus: (r.trade_status as string) || "active",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { loadListings(); }, [loadListings]);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [soldTargetId, setSoldTargetId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    await supabase.from("properties").update({ is_active: false, is_my_listing: false }).eq("id", id);
    useToastStore.getState().show("매물이 삭제되었습니다");
    setDeleteTargetId(null);
    loadListings();
  }

  async function handleSold(id: string) {
    await supabase.from("properties").update({ trade_status: "sold" }).eq("id", id);
    useToastStore.getState().show("거래완료 처리되었습니다");
    setSoldTargetId(null);
    loadListings();
  }

  async function handleRestore(id: string) {
    await supabase.from("properties").update({ trade_status: "active" }).eq("id", id);
    useToastStore.getState().show("거래중으로 복원되었습니다");
    loadListings();
  }

  function fmtPrice(p: MyListing) {
    if (p.dealType === "월세" || p.dealType === "단기임대") {
      return `${formatMoney(p.deposit ?? 0)} / ${formatMoney(p.monthlyRent ?? 0)}`;
    }
    return formatMoney(p.price);
  }

  const selectedProperty = useMemo(() => {
    const p = listings.find((l) => l.id === selectedId);
    if (!p) return null;
    return {
      id: p.id, title: p.title, address: p.address,
      propertyType: p.propertyType as PropertyType,
      dealType: p.dealType as DealType,
      realEstateTypeCode: p.realEstateTypeCode,
      tradeTypeCode: p.tradeTypeCode,
      price: p.price, deposit: p.deposit, monthlyRent: p.monthlyRent,
      area: p.area, areaLabel: `${p.area}m²`,
      rooms: 1, bathrooms: 1,
      floor: p.floor ? parseInt(p.floor.split("/")[0]) || undefined : undefined,
      totalFloors: p.floor ? parseInt(p.floor.split("/")[1]) || undefined : undefined,
      description: p.description, memo: p.memo,
      isFavorite: false, isMyListing: true, createdAt: p.createdAt, features: [],
    } as Property;
  }, [selectedId, listings]);

  const [tab, setTab] = useState<"active" | "sold">("active");
  const filteredListings = listings.filter((l) => tab === "active" ? l.tradeStatus !== "sold" : l.tradeStatus === "sold");
  const activeCount = listings.filter((l) => l.tradeStatus !== "sold").length;
  const soldCount = listings.filter((l) => l.tradeStatus === "sold").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">내 매물</h1>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setTab("active")}
              className={`text-sm px-3 py-1 rounded-md transition-colors ${tab === "active" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent"}`}
            >
              거래중 {activeCount}
            </button>
            <button
              onClick={() => setTab("sold")}
              className={`text-sm px-3 py-1 rounded-md transition-colors ${tab === "sold" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent"}`}
            >
              거래완료 {soldCount}
            </button>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />매물 등록
        </Button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-10rem)]">
        <div className="flex-1 min-w-0 flex flex-col">
          {loading ? (
            <div className="text-center py-20"><Loader2 className="h-8 w-8 mx-auto text-muted-foreground/50 animate-spin" /></div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-20">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="font-medium">등록한 매물이 없습니다</p>
              <p className="text-sm text-muted-foreground mt-1">우측 상단 "매물 등록" 버튼으로 추가하세요</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border overflow-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="bg-secondary hover:bg-secondary">
                    <TableHead className="text-sm font-medium pl-4">매물명</TableHead>
                    <TableHead className="text-sm font-medium">유형</TableHead>
                    <TableHead className="text-sm font-medium">거래</TableHead>
                    <TableHead className="text-sm font-medium text-right">가격</TableHead>
                    <TableHead className="text-sm font-medium text-center">상태</TableHead>
                    <TableHead className="text-sm font-medium text-right">면적</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListings.map((p) => (
                    <TableRow
                      key={p.id}
                      className={`cursor-pointer transition-colors group ${selectedId === p.id ? "bg-accent" : "hover:bg-accent/50"} ${p.tradeStatus === "sold" ? "opacity-50" : ""}`}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <TableCell className="max-w-[200px] pl-4">
                        <p className="font-medium text-sm truncate">{p.title}</p>
                        {p.memo && <p className="text-[11px] text-primary truncate">{p.memo}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.propertyType}</TableCell>
                      <TableCell className="text-sm">{p.dealType}</TableCell>
                      <TableCell className="text-sm font-semibold text-right tabular-nums">{fmtPrice(p)}</TableCell>
                      <TableCell className="text-sm text-center" onClick={(e) => e.stopPropagation()}>
                        <Select value={p.tradeStatus} onValueChange={async (v) => {
                          await supabase.from("properties").update({ trade_status: v }).eq("id", p.id);
                          useToastStore.getState().show(v === "sold" ? "거래완료 처리되었습니다" : "거래중으로 변경되었습니다");
                          loadListings();
                        }}>
                          <SelectTrigger className={`h-7 w-[80px] text-[11px] font-medium rounded-md px-2.5 mx-auto ${p.tradeStatus === "sold" ? "bg-secondary text-muted-foreground" : "bg-green-50 text-green-700 border-green-200"}`}>
                            <span>{p.tradeStatus === "sold" ? "거래완료" : "거래중"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">거래중</SelectItem>
                            <SelectItem value="sold">거래완료</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground text-right tabular-nums">{p.area}m²</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDeleteTargetId(p.id)} title="삭제">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                        </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="w-[380px] shrink-0">
          {selectedProperty ? (
            <DetailPanel property={selectedProperty} onClose={() => setSelectedId(null)} onMemoSaved={(id, memo) => {
              setListings((prev) => prev.map((p) => p.id === id ? { ...p, memo: memo || undefined } : p));
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

      {showForm && <ListingForm onClose={() => setShowForm(false)} onSaved={loadListings} />}

      {deleteTargetId && (() => {
        const target = listings.find((l) => l.id === deleteTargetId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card border rounded-lg shadow-lg p-6 w-[320px] space-y-4">
              <p className="text-sm font-medium">이 매물을 삭제하시겠습니까?</p>
              {target && <p className="text-xs text-muted-foreground">{target.title}</p>}
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setDeleteTargetId(null)}>취소</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(deleteTargetId)}>삭제</Button>
              </div>
            </div>
          </div>
        );
      })()}

      {soldTargetId && (() => {
        const target = listings.find((l) => l.id === soldTargetId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card border rounded-lg shadow-lg p-6 w-[320px] space-y-4">
              <p className="text-sm font-medium">거래완료 처리하시겠습니까?</p>
              {target && <p className="text-xs text-muted-foreground">{target.title}</p>}
              <p className="text-xs text-muted-foreground">목록에서 사라지지 않고 거래완료로 표시됩니다.</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setSoldTargetId(null)}>취소</Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSold(soldTargetId)}>거래완료</Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
