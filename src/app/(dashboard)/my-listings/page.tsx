"use client";

import { useState, useEffect } from "react";
import { useDealStore, Deal, DealStatus, DEAL_STATUSES } from "@/lib/deal-store";
import { useCustomerStore, Customer } from "@/lib/customer-store";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Handshake, Plus, Trash2, X, MapPin, Phone, Building2, Users, Loader2, StickyNote,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useToastStore } from "@/lib/toast-store";

const propertyTypes = ["상가", "건물", "사무실", "상가주택"];
const dealTypes = ["매매", "전세", "월세", "단기임대"];
const tradeCodeMap: Record<string, string> = { "매매": "A1", "전세": "B1", "월세": "B2", "단기임대": "B3" };
const propCodeMap: Record<string, string> = { "상가": "D02", "건물": "D04", "사무실": "D01", "상가주택": "D05" };

function NewDealForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const dongList = useStore((s) => s.dongList);
  const loadDongList = useStore((s) => s.loadDongList);
  const { addDeal } = useDealStore();

  useEffect(() => { loadDongList(); }, [loadDongList]);

  const [title, setTitle] = useState("");
  const [dong, setDong] = useState("");
  const [propertyType, setPropertyType] = useState("상가");
  const [dealType, setDealType] = useState("월세");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [area, setArea] = useState("");
  const [floorInfo, setFloorInfo] = useState("");
  const [memo, setMemo] = useState("");

  async function handleSubmit() {
    if (!title.trim() || !dong) return;
    const priceVal = (Number(price) || 0) * 10000;
    const depositVal = (Number(deposit) || 0) * 10000;
    const rentVal = (Number(monthlyRent) || 0) * 10000;
    const id = `MY-${Date.now()}`;

    await supabase.from("properties").insert({
      id, article_no: id,
      article_name: title.trim(),
      real_estate_type: propCodeMap[propertyType] || "D02",
      real_estate_type_name: propertyType,
      trade_type: tradeCodeMap[dealType] || "B2",
      trade_type_name: dealType,
      dong,
      address: `서울시 마포구 ${dong}`,
      price: dealType === "매매" ? priceVal : depositVal,
      deal_or_warrant_price: "",
      warrant_price: depositVal,
      monthly_rent: rentVal,
      area1: Number(area) || 0,
      area2: Number(area) || 0,
      floor_info: floorInfo,
      direction: "",
      description: title.trim(),
      tag_list: [],
      realtor_name: "",
      confirm_date: new Date().toISOString().split("T")[0],
      source_url: "",
      is_my_listing: true,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    });

    await addDeal({ propertyId: id, dealType, memo: memo.trim() });
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-lg shadow-lg w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">개인 매물 등록 + 거래 시작</h2>
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
                <SelectContent>{dongList.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">유형</p>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">거래 유형</p>
            <Select value={dealType} onValueChange={setDealType}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{dealTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
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
            <p className="text-xs text-muted-foreground">메모</p>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="거래 관련 메모..." className="w-full text-sm border rounded-md p-2.5 resize-none h-[60px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim() || !dong}>등록 + 거래 시작</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<DealStatus, string> = {
  "거래전": "bg-blue-50 text-blue-700 border-blue-200",
  "거래중": "bg-orange-50 text-orange-700 border-orange-200",
  "거래완료": "bg-green-50 text-green-700 border-green-200",
};

function DealCard({ deal, index, selected, justDropped, onClick, onDragStart, onDragEnd, onDragOverIndex }: {
  deal: Deal; index: number; selected: boolean; justDropped?: boolean; onClick: () => void;
  onDragStart?: () => void; onDragEnd?: () => void; onDragOverIndex?: (i: number) => void;
}) {
  return (
    <div
      className={`bg-card border rounded-lg p-4 cursor-grab active:cursor-grabbing transition-all ${justDropped ? "ring-2 ring-primary animate-in zoom-in-95 duration-300" : ""} ${selected ? "ring-2 ring-primary" : "hover:border-foreground/20"}`}
      onClick={onClick}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart?.(); }}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        onDragOverIndex?.(e.clientY < midY ? index : index + 1);
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant="outline" className="text-[11px]">{deal.dealType}</Badge>
      </div>
      <p className="font-medium text-sm truncate mb-1">{deal.propertyTitle || "매물 미지정"}</p>
      {deal.propertyAddress && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
          <MapPin className="h-3 w-3 shrink-0" />{deal.propertyAddress.replace("서울시 마포구 ", "")}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {deal.sellerName && <span>임대인: {deal.sellerName}</span>}
        {deal.buyerName && <span>임차인: {deal.buyerName}</span>}
        {!deal.sellerName && !deal.buyerName && <span>고객 미지정</span>}
      </div>
    </div>
  );
}

function QuickCustomerForm({ role, onCreated, onClose }: { role: "seller" | "buyer"; onCreated: (id: string) => void; onClose: () => void }) {
  const { addCustomer } = useCustomerStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerMemo, setCustomerMemo] = useState("");

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) return;
    await addCustomer({ name: name.trim(), phone: phone.trim(), role, memo: customerMemo.trim(), interestedIn: [], budgetMin: 0, budgetMax: 0 });
    const { data } = await supabase.from("customers").select("id").eq("name", name.trim()).eq("phone", phone.trim()).order("created_at", { ascending: false }).limit(1);
    if (data?.[0]) onCreated(data[0].id as string);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-lg shadow-lg w-[380px]">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">{role === "seller" ? "임대인" : "임차인"} 등록</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">이름 *</p>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">연락처 *</p>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">메모</p>
            <Input value={customerMemo} onChange={(e) => setCustomerMemo(e.target.value)} placeholder="특이사항" className="h-9 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim() || !phone.trim()}>등록</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerMiniCard({ customer }: { customer: Customer }) {
  return (
    <div className="border rounded-lg p-3 bg-secondary/30 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{customer.name}</p>
        <Badge variant="outline" className="text-[10px]">
          {customer.role === "buyer" ? "임차인" : customer.role === "seller" ? "임대인" : "임대인/임차인"}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
        <a href={`tel:${customer.phone}`} className="text-primary hover:underline">{customer.phone}</a>
      </div>
      {customer.preferredArea && (
        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{customer.preferredArea}</p>
      )}
      {customer.businessType && (
        <p className="text-xs text-muted-foreground">업종: {customer.businessType}</p>
      )}
      {customer.memo && (
        <p className="text-xs text-muted-foreground">{customer.memo}</p>
      )}
    </div>
  );
}

function DealDetail({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { updateDeal, deleteDeal } = useDealStore();
  const { customers, loadCustomers } = useCustomerStore();
  const [memo, setMemo] = useState(deal.memo);
  const [showDelete, setShowDelete] = useState(false);
  const [addingSeller, setAddingSeller] = useState(false);
  const [addingBuyer, setAddingBuyer] = useState(false);
  const memoChanged = memo !== deal.memo;

  useEffect(() => { setMemo(deal.memo); }, [deal.id, deal.memo]);

  const sellers = customers.filter((c) => c.role === "seller" || c.role === "both");
  const buyers = customers.filter((c) => c.role === "buyer" || c.role === "both");

  const createdDate = new Date(deal.createdAt);
  const dateStr = `${createdDate.getFullYear()}.${(createdDate.getMonth()+1).toString().padStart(2,"0")}.${createdDate.getDate().toString().padStart(2,"0")}`;

  return (
    <div className="bg-card border rounded-lg h-full overflow-y-auto">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{deal.propertyTitle || "매물 미지정"}</h2>
            {deal.propertyAddress && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />{deal.propertyAddress}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* 상태 변경 */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">거래 상태</p>
          <div className="flex flex-wrap gap-1.5">
            {DEAL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => updateDeal(deal.id, { status: s })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  deal.status === s ? STATUS_COLORS[s] : "hover:bg-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* 거래 정보 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">거래 유형</p>
            <p className="text-sm font-medium">{deal.dealType}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">시작일</p>
            <p className="text-sm font-medium">{dateStr}</p>
          </div>
        </div>

        <Separator />

        {/* 임대인 (seller) */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">임대인 / 매도인</p>
          <Select
            value={deal.sellerId || "_none"}
            onValueChange={(v) => {
              if (v === "_add") { setAddingSeller(true); return; }
              updateDeal(deal.id, { sellerId: v === "_none" ? null : v });
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <span>{deal.sellerName || "미지정"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">미지정</SelectItem>
              {sellers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>
              ))}
              <SelectItem value="_add" className="text-primary font-medium">+ 새 고객 추가</SelectItem>
            </SelectContent>
          </Select>
          {addingSeller && (
            <QuickCustomerForm
              role="seller"
              onCreated={(id) => { loadCustomers(); updateDeal(deal.id, { sellerId: id }); }}
              onClose={() => setAddingSeller(false)}
            />
          )}
          {deal.sellerId && (() => {
            const c = customers.find((x) => x.id === deal.sellerId);
            return c ? <CustomerMiniCard customer={c} /> : null;
          })()}
        </div>

        {/* 임차인 (buyer) */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">임차인 / 매수인</p>
          <Select
            value={deal.buyerId || "_none"}
            onValueChange={(v) => {
              if (v === "_add") { setAddingBuyer(true); return; }
              updateDeal(deal.id, { buyerId: v === "_none" ? null : v });
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <span>{deal.buyerName || "미지정"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">미지정</SelectItem>
              {buyers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>
              ))}
              <SelectItem value="_add" className="text-primary font-medium">+ 새 고객 추가</SelectItem>
            </SelectContent>
          </Select>
          {addingBuyer && (
            <QuickCustomerForm
              role="buyer"
              onCreated={(id) => { loadCustomers(); updateDeal(deal.id, { buyerId: id }); }}
              onClose={() => setAddingBuyer(false)}
            />
          )}
          {deal.buyerId && (() => {
            const c = customers.find((x) => x.id === deal.buyerId);
            return c ? <CustomerMiniCard customer={c} /> : null;
          })()}
        </div>

        <Separator />

        {/* 메모 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" />메모</p>
            {memoChanged && (
              <Button size="sm" className="h-6 text-xs px-2" onClick={() => updateDeal(deal.id, { memo })}>저장</Button>
            )}
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="거래 관련 메모..."
            className={`w-full text-sm bg-secondary/50 border rounded-md p-2.5 resize-none h-[80px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground ${memoChanged ? "border-primary" : ""}`}
          />
        </div>

        <Separator />

        {/* 삭제 */}
        <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 w-full" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />거래 삭제
        </Button>

        {showDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card border rounded-lg shadow-lg p-6 w-[320px] space-y-4">
              <p className="text-sm font-medium">이 거래를 삭제하시겠습니까?</p>
              <p className="text-xs text-muted-foreground">{deal.propertyTitle}</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowDelete(false)}>취소</Button>
                <Button size="sm" variant="destructive" onClick={() => { deleteDeal(deal.id); onClose(); }}>삭제</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DealsPage() {
  const { deals, loading, loadDeals, updateDeal, moveDeal } = useDealStore();
  const { loadCustomers } = useCustomerStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<DealStatus | null>(null);
  const [dropIndex, setDropIndex] = useState<number>(-1);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);

  useEffect(() => {
    loadDeals();
    loadCustomers();
  }, [loadDeals, loadCustomers]);

  const selectedDeal = selectedId ? deals.find((d) => d.id === selectedId) : null;
  const columns = DEAL_STATUSES.map((status) => ({
    status,
    deals: deals.filter((d) => d.status === status).sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">거래 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">{deals.length}건</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNewDeal(true)}>
          <Plus className="h-4 w-4" />개인 매물 추가
        </Button>
      </div>

      {showNewDeal && <NewDealForm onClose={() => setShowNewDeal(false)} onCreated={loadDeals} />}

      {loading ? (
        <div className="text-center py-20"><Loader2 className="h-8 w-8 mx-auto text-muted-foreground/50 animate-spin" /></div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-8rem)]">
          {/* 칸반 컬럼들 */}
          {columns.map(({ status, deals: columnDeals }) => (
            <div
              key={status}
              className="flex-1 min-w-[240px] flex flex-col"
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStatus(status); }}
              onDragLeave={() => { setDragOverStatus(null); setDropIndex(-1); }}
              onDrop={() => {
                if (dragId) {
                  moveDeal(dragId, status, dropIndex);
                  setJustDroppedId(dragId);
                  setTimeout(() => setJustDroppedId(null), 1000);
                }
                setDragId(null);
                setDragOverStatus(null);
                setDropIndex(-1);
              }}
            >
              {/* 컬럼 헤더 */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-b-2 ${STATUS_COLORS[status]}`}>
                <span className="text-sm font-bold">{status}</span>
                <span className="text-xs font-medium">{columnDeals.length}</span>
              </div>

              {/* 카드 목록 */}
              <div
                className={`flex-1 overflow-y-auto rounded-b-lg p-2 transition-colors ${dragOverStatus === status && dragId ? "bg-primary/5" : "bg-secondary/30"}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  // 빈 영역 (카드 아래쪽)에 드래그 시 맨 아래로
                  const target = e.target as HTMLElement;
                  if (target === e.currentTarget) setDropIndex(columnDeals.length);
                }}
              >
                {columnDeals.length === 0 ? (
                  <div className={`text-center py-8 rounded-lg border-2 border-dashed transition-colors ${dragOverStatus === status && dragId ? "border-primary/40 bg-primary/5" : "border-transparent"}`}>
                    <p className="text-xs text-muted-foreground">{dragOverStatus === status && dragId ? "여기에 놓으세요" : "없음"}</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {columnDeals.map((d, i) => (
                      <div key={d.id}>
                        {/* 드롭 인디���이터 - 카드 위 */}
                        <div className={`h-0.5 mx-1 rounded-full transition-all my-1 ${dragId && dragOverStatus === status && dropIndex === i ? "bg-primary" : "bg-transparent"}`} />
                        <DealCard
                          deal={d}
                          index={i}
                          selected={selectedId === d.id}
                          justDropped={justDroppedId === d.id}
                          onClick={() => setSelectedId(d.id)}
                          onDragStart={() => setDragId(d.id)}
                          onDragEnd={() => { setDragId(null); setDragOverStatus(null); setDropIndex(-1); }}
                          onDragOverIndex={(idx) => setDropIndex(idx)}
                        />
                        {/* 드롭 인디케이터 - 마지막 카드 아래 */}
                        {i === columnDeals.length - 1 && (
                          <div className={`h-0.5 mx-1 rounded-full transition-all my-1 ${dragId && dragOverStatus === status && dropIndex === columnDeals.length ? "bg-primary" : "bg-transparent"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 오른쪽: 거래 상세 */}
          {selectedDeal && (
            <div className="w-[380px] shrink-0">
              <DealDetail deal={selectedDeal} onClose={() => setSelectedId(null)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
