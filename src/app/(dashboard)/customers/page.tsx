"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatMoney, formatPrice } from "@/lib/format";
import { Customer } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, Trash2, Users, Sparkles, X, Building, Clock, Plus } from "lucide-react";

function MatchPanel({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const properties = useStore((s) => s.properties);

  const matched = useMemo(() => {
    return properties.filter((p) => {
      if (!customer.interestedIn.includes(p.dealType)) return false;
      const effectivePrice = p.dealType === "월세" ? (p.deposit ?? 0) : p.price;
      if (effectivePrice < customer.budget.min || effectivePrice > customer.budget.max) return false;
      if (customer.preferredArea && !p.address.includes(customer.preferredArea)) return false;
      if (customer.preferredFloor === "1층" && p.floor !== 1) return false;
      if (customer.preferredFloor === "2층 이상" && (p.floor === undefined || p.floor < 2)) return false;
      if (customer.premiumBudget && p.premiumKey && p.premiumKey > customer.premiumBudget) return false;
      return true;
    });
  }, [properties, customer]);

  return (
    <div className="bg-card border-l h-full overflow-y-auto">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{customer.name} 추천 매물</h3>
            <p className="text-sm text-muted-foreground mt-1">조건 매칭 {matched.length}건</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* 조건 요약 */}
        <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">관심 거래</span>
            <div className="flex gap-1">{customer.interestedIn.map((t) => (<Badge key={t} variant="secondary" className="text-xs">{t}</Badge>))}</div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">예산</span>
            <span className="font-medium">{formatMoney(customer.budget.min)} ~ {formatMoney(customer.budget.max)}</span>
          </div>
          {customer.preferredArea && <div className="flex justify-between"><span className="text-muted-foreground">선호 지역</span><span className="font-medium">{customer.preferredArea}</span></div>}
          {customer.preferredFloor && <div className="flex justify-between"><span className="text-muted-foreground">희망 층수</span><span className="font-medium">{customer.preferredFloor}</span></div>}
          {customer.businessType && <div className="flex justify-between"><span className="text-muted-foreground">업종</span><span className="font-medium">{customer.businessType}</span></div>}
          {customer.premiumBudget && <div className="flex justify-between"><span className="text-muted-foreground">권리금 예산</span><span className="font-medium">{formatMoney(customer.premiumBudget)} 이하</span></div>}
        </div>

        {/* 매칭 결과 */}
        {matched.length === 0 ? (
          <div className="text-center py-12"><p className="text-muted-foreground text-sm">조건에 맞는 매물이 없습니다</p></div>
        ) : (
          <div className="space-y-3">
            {matched.map((p) => (
              <div key={p.id} className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-sm truncate">{p.title}</span>
                  <Badge className="bg-primary text-primary-foreground text-xs shrink-0 ml-2">{p.dealType}</Badge>
                </div>
                <p className="text-lg font-bold">{formatPrice(p)}</p>
                {p.premiumKey && <p className="text-sm text-muted-foreground">권리금: {formatMoney(p.premiumKey)}</p>}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /><span className="truncate">{p.address}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{p.area}m²</span>
                  <span>{p.floor ? `${p.floor}층` : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* 추천 히스토리 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium"><Clock className="h-4 w-4 text-muted-foreground" />추천 히스토리</div>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"><Plus className="h-3 w-3 mr-1" />기록</Button>
          </div>
          {customer.history && customer.history.length > 0 ? (
            <div className="space-y-2">
              {customer.history.map((h, i) => (
                <div key={i} className="border rounded-lg p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">{h.date}</p>
                  <p>{h.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg p-3">
              <textarea placeholder="추천한 매물, 고객 반응 등 기록..." className="w-full text-sm bg-transparent resize-none h-[60px] focus:outline-none placeholder:text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const customers = useStore((s) => s.customers);
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <div className={`${selectedCustomer ? "flex-1 min-w-0 max-w-3xl" : "w-full"} space-y-6 overflow-auto`}>
        <div>
          <h1 className="text-3xl font-bold">고객 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">{customers.length}명</p>
        </div>

        {customers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-medium">등록된 고객이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customers.map((c) => (
              <div
                key={c.id}
                className={`bg-card rounded-lg p-5 space-y-4 border cursor-pointer transition-all ${
                  selectedCustomer?.id === c.id ? "ring-1 ring-primary" : "hover:ring-1 hover:ring-border"
                }`}
                onClick={() => setSelectedCustomer(c)}
              >
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-base">{c.name}</p>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setSelectedCustomer(c)}>
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteCustomer(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</div>
                  {c.preferredArea && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{c.preferredArea}</div>}
                  {c.preferredFloor && <div className="flex items-center gap-2 text-muted-foreground"><Building className="h-3.5 w-3.5" />{c.preferredFloor}</div>}
                  {c.businessType && <div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />{c.businessType}</div>}
                </div>

                <div className="flex gap-2">
                  {c.interestedIn.map((t) => (<Badge key={t} className="bg-primary text-primary-foreground text-xs">{t}</Badge>))}
                </div>

                <p className="text-sm text-muted-foreground">
                  예산: {formatMoney(c.budget.min)} ~ {formatMoney(c.budget.max)}
                  {c.premiumBudget && ` · 권리금 ${formatMoney(c.premiumBudget)} 이하`}
                </p>

                <p className="text-sm text-muted-foreground border-t pt-3">{c.memo}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match panel */}
      {selectedCustomer && (
        <div className="flex-1 min-w-[360px]">
          <MatchPanel customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
        </div>
      )}
    </div>
  );
}
