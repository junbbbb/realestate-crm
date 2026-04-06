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

const STATUS_COLORS: Record<DealStatus, string> = {
  "상담": "bg-blue-50 text-blue-700 border-blue-200",
  "매물투어": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "계약협상": "bg-orange-50 text-orange-700 border-orange-200",
  "계약완료": "bg-green-50 text-green-700 border-green-200",
  "무산": "bg-secondary text-muted-foreground",
};

function DealCard({ deal, selected, onClick }: { deal: Deal; selected: boolean; onClick: () => void }) {
  return (
    <div
      className={`bg-card border rounded-lg p-4 cursor-pointer transition-all ${selected ? "ring-2 ring-primary" : "hover:border-foreground/20"}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge className={`text-[11px] border ${STATUS_COLORS[deal.status]}`}>{deal.status}</Badge>
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

function DealDetail({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { updateDeal, deleteDeal } = useDealStore();
  const { customers } = useCustomerStore();
  const [memo, setMemo] = useState(deal.memo);
  const [showDelete, setShowDelete] = useState(false);
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
            onValueChange={(v) => updateDeal(deal.id, { sellerId: v === "_none" ? null : v })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">미지정</SelectItem>
              {sellers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deal.sellerName && deal.sellerId && (() => {
            const c = customers.find((x) => x.id === deal.sellerId);
            return c ? (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>
              </div>
            ) : null;
          })()}
        </div>

        {/* 임차인 (buyer) */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">임차인 / 매수인</p>
          <Select
            value={deal.buyerId || "_none"}
            onValueChange={(v) => updateDeal(deal.id, { buyerId: v === "_none" ? null : v })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">미지정</SelectItem>
              {buyers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deal.buyerName && deal.buyerId && (() => {
            const c = customers.find((x) => x.id === deal.buyerId);
            return c ? (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>
              </div>
            ) : null;
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
  const { deals, loading, loadDeals } = useDealStore();
  const { loadCustomers } = useCustomerStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DealStatus | "전체">("전체");

  useEffect(() => {
    loadDeals();
    loadCustomers();
  }, [loadDeals, loadCustomers]);

  const filtered = statusFilter === "전체" ? deals : deals.filter((d) => d.status === statusFilter);
  const selectedDeal = selectedId ? deals.find((d) => d.id === selectedId) : null;

  const statusCounts = DEAL_STATUSES.reduce((acc, s) => {
    acc[s] = deals.filter((d) => d.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">거래 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">{deals.length}건</p>
        </div>
      </div>

      {/* 상태 필터 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setStatusFilter("전체")}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${statusFilter === "전체" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent"}`}
        >
          전체 {deals.length}
        </button>
        {DEAL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${statusFilter === s ? STATUS_COLORS[s] + " font-medium" : "text-muted-foreground hover:bg-accent"}`}
          >
            {s} {statusCounts[s] || 0}
          </button>
        ))}
      </div>

      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* 왼쪽: 거래 카드 목록 */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {loading ? (
            <div className="text-center py-20"><Loader2 className="h-8 w-8 mx-auto text-muted-foreground/50 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Handshake className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="font-medium">{statusFilter === "전체" ? "진행 중인 거래가 없습니다" : `${statusFilter} 상태의 거래가 없습니다`}</p>
              <p className="text-sm text-muted-foreground mt-1">매물 상세에서 "거래 시작"으로 추가하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((d) => (
                <DealCard key={d.id} deal={d} selected={selectedId === d.id} onClick={() => setSelectedId(d.id)} />
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 거래 상세 */}
        <div className="w-[380px] shrink-0">
          {selectedDeal ? (
            <DealDetail deal={selectedDeal} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="h-full flex items-center justify-center border rounded-lg">
              <div className="text-center">
                <Handshake className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">거래를 선택하면</p>
                <p className="text-sm text-muted-foreground">상세 정보가 여기에 표시됩니다</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
