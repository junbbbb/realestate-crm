"use client";

import { useState, useEffect, useMemo } from "react";
import { useCustomerStore, Customer, CustomerRole } from "@/lib/customer-store";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Phone, Mail, MapPin, Trash2, Users, X, Building, Plus, Pencil, Loader2, Handshake, ExternalLink,
} from "lucide-react";
import { useDealStore, Deal } from "@/lib/deal-store";
import Link from "next/link";

const dealTypes = ["매매", "전세", "월세", "단기임대"];
const floorOptions = ["전체", "1층", "지하", "2층 이상"];

function CustomerForm({ onClose, initial }: { onClose: () => void; initial?: Customer }) {
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);

  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<CustomerRole>(initial?.role ?? "buyer");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [interestedIn, setInterestedIn] = useState<string[]>(initial?.interestedIn ?? []);
  const [budgetMin, setBudgetMin] = useState(initial?.budgetMin ? String(initial.budgetMin / 10000) : "");
  const [budgetMax, setBudgetMax] = useState(initial?.budgetMax ? String(initial.budgetMax / 10000) : "");
  const [preferredArea, setPreferredArea] = useState(initial?.preferredArea ?? "");
  const [preferredFloor, setPreferredFloor] = useState(initial?.preferredFloor ?? "전체");
  const [businessType, setBusinessType] = useState(initial?.businessType ?? "");
  const [premiumBudget, setPremiumBudget] = useState(initial?.premiumBudget ? String(initial.premiumBudget / 10000) : "");

  function toggleDeal(d: string) {
    setInterestedIn((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) return;
    const data = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      role,
      memo: memo.trim(),
      interestedIn,
      budgetMin: (Number(budgetMin) || 0) * 10000,
      budgetMax: (Number(budgetMax) || 0) * 10000,
      preferredArea: preferredArea.trim() || undefined,
      preferredFloor: preferredFloor === "전체" ? undefined : preferredFloor,
      businessType: businessType.trim() || undefined,
      premiumBudget: (Number(premiumBudget) || 0) * 10000,
    };
    if (initial) {
      await updateCustomer(initial.id, data);
    } else {
      await addCustomer(data);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-lg shadow-lg w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{initial ? "고객 수정" : "고객 등록"}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">이름 *</p>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="고객명" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">연락처 *</p>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">역할 *</p>
              <div className="flex gap-2">
                {([["buyer", "임차인/매수인"], ["seller", "임대인/매도인"], ["both", "둘 다"]] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setRole(v)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${role === v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">이메일</p>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">관심 거래 유형</p>
            <div className="flex gap-2">
              {dealTypes.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDeal(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    interestedIn.includes(d) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">예산 최소 (만원)</p>
              <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">예산 최대 (만원)</p>
              <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">선호 지역</p>
              <Input value={preferredArea} onChange={(e) => setPreferredArea(e.target.value)} placeholder="예: 합정동" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">희망 층수</p>
              <Select value={preferredFloor} onValueChange={(v) => setPreferredFloor(v ?? "전체")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{floorOptions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">업종</p>
              <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="예: 카페, 음식점" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">권리금 예산 (만원)</p>
              <Input type="number" value={premiumBudget} onChange={(e) => setPremiumBudget(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">메모</p>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="고객 특이사항, 요청사항 등..."
              className="w-full text-sm border rounded-md p-2.5 resize-none h-[70px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim() || !phone.trim()}>
              {initial ? "수정" : "등록"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const { customers, loading, loadCustomers, deleteCustomer } = useCustomerStore();
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const { deals, loadDeals } = useDealStore();
  useEffect(() => { loadCustomers(); loadDeals(); }, [loadCustomers, loadDeals]);

  const dealsByCustomer = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const d of deals) {
      if (d.sellerId) (map[d.sellerId] ??= []).push(d);
      if (d.buyerId) (map[d.buyerId] ??= []).push(d);
    }
    return map;
  }, [deals]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">고객 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">{customers.length}명</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditCustomer(undefined); setShowForm(true); }}>
          <Plus className="h-4 w-4" />고객 등록
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="h-8 w-8 mx-auto text-muted-foreground/50 animate-spin" /></div>
      ) : customers.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="font-medium">등록된 고객이 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1">우측 상단 "고객 등록" 버튼으로 추가하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div key={c.id} className="bg-card rounded-lg border p-5 space-y-3 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base">{c.name}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {c.role === "buyer" ? "임차인" : c.role === "seller" ? "임대인" : "임대인/임차인"}
                  </Badge>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded hover:bg-secondary" onClick={() => { setEditCustomer(c); setShowForm(true); }}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-secondary" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</div>
                {c.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</div>}
                {c.preferredArea && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{c.preferredArea}</div>}
                {c.preferredFloor && <div className="flex items-center gap-2 text-muted-foreground"><Building className="h-3.5 w-3.5" />{c.preferredFloor}</div>}
                {c.businessType && <div className="flex items-center gap-2 text-muted-foreground">{c.businessType}</div>}
              </div>

              {c.interestedIn.length > 0 && (
                <div className="flex gap-1.5">
                  {c.interestedIn.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
              )}

              {(c.budgetMin > 0 || c.budgetMax > 0) && (
                <p className="text-xs text-muted-foreground">
                  예산: {c.budgetMin > 0 ? formatMoney(c.budgetMin) : "0"} ~ {c.budgetMax > 0 ? formatMoney(c.budgetMax) : ""}
                  {c.premiumBudget ? ` · 권리금 ${formatMoney(c.premiumBudget)} 이하` : ""}
                </p>
              )}

              {c.memo && <p className="text-xs text-muted-foreground border-t pt-2">{c.memo}</p>}

              {/* 진행 중인 거래 */}
              {(() => {
                const customerDeals = dealsByCustomer[c.id] || [];
                if (customerDeals.length === 0) return null;
                return (
                  <div className="border-t pt-2 space-y-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Handshake className="h-3 w-3" />거래 {customerDeals.length}건</p>
                    {customerDeals.map((d) => (
                      <Link
                        key={d.id}
                        href={`/my-listings?deal=${d.id}`}
                        className="flex items-center gap-2 text-xs p-1.5 rounded-md hover:bg-accent transition-colors group"
                      >
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {d.status}
                        </Badge>
                        <span className="truncate flex-1">{d.propertyTitle || "매물 미지정"}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {showForm && <CustomerForm onClose={() => setShowForm(false)} initial={editCustomer} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border rounded-lg shadow-lg p-6 w-[320px] space-y-4">
            <p className="text-sm font-medium">"{deleteTarget.name}" 고객을 삭제하시겠습니까?</p>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
              <Button size="sm" variant="destructive" onClick={() => { deleteCustomer(deleteTarget.id); setDeleteTarget(null); }}>삭제</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
