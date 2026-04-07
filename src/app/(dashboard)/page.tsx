"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useCollectionStore } from "@/lib/collection-store";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatPrice } from "@/lib/format";
import { Building2, FolderOpen, Users, MapPin, Bookmark, Clock, ArrowUpRight, ArrowDownRight, X, Loader2 } from "lucide-react";
import { mapSupabaseToProperty } from "@/lib/store";
import { DetailPanel } from "@/app/(dashboard)/properties/page";
import { Property } from "@/types";

function PriceHistoryPanel({ articleNo }: { articleNo: string }) {
  const [history, setHistory] = useState<{ price: number; change_type: string; recorded_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("price_history")
      .select("price, change_type, recorded_at")
      .eq("article_no", articleNo)
      .order("recorded_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setHistory(data || []);
        setLoading(false);
      });
  }, [articleNo]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  if (history.length === 0) return <p className="flex-1 text-sm text-muted-foreground">변동 이력 없음</p>;

  return (
    <div className="flex-1 overflow-y-auto space-y-1.5">
      {history.map((h, i) => {
        const date = new Date(h.recorded_at);
        const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
        const isUp = h.change_type === "increase";
        const isDown = h.change_type === "decrease";
        return (
          <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
            <div className="flex items-center gap-2">
              {isUp && <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />}
              {isDown && <ArrowDownRight className="h-3.5 w-3.5 text-blue-500" />}
              {!isUp && !isDown && <div className="h-3.5 w-3.5 rounded-full bg-muted" />}
              <span className="text-muted-foreground text-xs">{dateStr}</span>
            </div>
            <span className={`font-medium ${isUp ? "text-red-500" : isDown ? "text-blue-500" : ""}`}>
              {formatMoney(h.price)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const properties = useStore((s) => s.properties);
  const totalCount = useStore((s) => s.totalCount);
  const loadProperties = useStore((s) => s.loadProperties);
  const collections = useCollectionStore((s) => s.collections);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const favorites = useMemo(() => properties.filter((p) => p.isFavorite), [properties]);
  const myListings = useMemo(() => properties.filter((p) => p.isMyListing), [properties]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [priceChangesLoading, setPriceChangesLoading] = useState(true);
  const [priceChangesUpdatedAt, setPriceChangesUpdatedAt] = useState<string | null>(null);

  const openProperty = async (id: string) => {
    const local = properties.find((p) => p.id === id);
    if (local) { setSelectedProperty(local); return; }
    const { data } = await supabase.from("properties").select("*").eq("id", id).single();
    if (data) setSelectedProperty(mapSupabaseToProperty(data));
  };

  // 가격 변동 매물 — price_change_rankings 테이블에서 12행 읽기
  const [priceChanges, setPriceChanges] = useState<{
    articleNo: string;
    changeType: string;
    price: number;
    prevPrice: number;
    rate: number;
    title?: string;
    propertyType?: string;
    dealType?: string;
    dong?: string;
  }[]>([]);

  useEffect(() => {
    supabase
      .from("price_change_rankings")
      .select("*")
      .order("rate", { ascending: false })
      .then(({ data }) => {
        const rows = data || [];
        setPriceChanges(rows.map((r) => ({
          articleNo: r.article_no,
          changeType: r.change_type,
          price: r.current_price,
          prevPrice: r.prev_price,
          rate: r.rate,
          title: r.article_name,
          propertyType: r.property_type,
          dealType: r.trade_type,
          dong: r.dong,
        })));
        if (rows.length > 0) setPriceChangesUpdatedAt(rows[0].updated_at);
        setPriceChangesLoading(false);
      });
  }, []);

  // 최근 저장된 매물 (컬렉션 entries에서 최신 5개)
  const recentSaved = useMemo(() => {
    const all: { propertyId: string; collectionName: string; addedAt: string }[] = [];
    for (const c of collections) {
      for (const e of c.entries || []) {
        all.push({ propertyId: e.propertyId, collectionName: c.name, addedAt: e.addedAt });
      }
    }
    return all.sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 5);
  }, [collections]);

  const stats = [
    { label: "마포구 전체매물", value: totalCount, unit: "건", icon: Building2 },
    { label: "컬렉션", value: collections.length, unit: "개", icon: Bookmark },
    { label: "내 매물", value: myListings.length, unit: "건", icon: FolderOpen },
    { label: "고객", value: 0, unit: "명", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">대시보드</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">
              {s.value.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-1">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 가격 변동 — 상승/하락 카드 */}
      {priceChangesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[{ label: "가격 상승 TOP", color: "text-red-500", Icon: ArrowUpRight }, { label: "가격 하락 TOP", color: "text-blue-500", Icon: ArrowDownRight }].map(({ label, color, Icon }) => (
            <div key={label} className="bg-card rounded-lg p-6">
              <div className={`flex items-center gap-2 text-sm font-medium ${color} mb-4`}>
                <Icon className="h-4 w-4" />{label}
              </div>
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="space-y-1.5 flex-1"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/3" /></div>
                    <div className="space-y-1.5 ml-3"><div className="h-4 bg-muted rounded w-12" /><div className="h-3 bg-muted rounded w-20" /></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : priceChanges.length > 0 ? (() => {
        const increases = priceChanges.filter((c) => c.changeType === "increase").sort((a, b) => b.rate - a.rate);
        const decreases = priceChanges.filter((c) => c.changeType === "decrease").sort((a, b) => a.rate - b.rate);
        const renderList = (items: typeof priceChanges, isUp: boolean) => (
          <div className="space-y-1">
            {items.map((c, idx) => (
              <div key={c.articleNo} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 rounded-md px-1 -mx-1 transition-colors" onClick={() => openProperty(c.articleNo)}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                  <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.title || c.articleNo}</p>
                  <p className="text-[11px] text-muted-foreground">{c.dong && `${c.dong} · `}{c.propertyType} · {c.dealType}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className={`text-sm font-bold ${isUp ? "text-red-500" : "text-blue-500"}`}>
                    {isUp ? "+" : ""}{c.rate.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatMoney(c.prevPrice)} → {formatMoney(c.price)}
                  </p>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-muted-foreground py-2">변동 없음</p>}
          </div>
        );
        const updatedStr = priceChangesUpdatedAt ? (() => {
          const d = new Date(priceChangesUpdatedAt);
          return `${d.getMonth()+1}/${d.getDate()} 업데이트됨`;
        })() : "";
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-red-500">
                  <ArrowUpRight className="h-4 w-4" />
                  가격 상승 TOP
                </div>
                {updatedStr && <span className="text-[11px] text-muted-foreground">{updatedStr}</span>}
              </div>
              {renderList(increases, true)}
            </div>
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-4">
                <ArrowDownRight className="h-4 w-4" />
                가격 하락 TOP
              </div>
              {renderList(decreases, false)}
            </div>
          </div>
        );
      })() : null}

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 최근 매물 */}
        <div className="bg-card rounded-lg p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
            <Clock className="h-4 w-4" />
            최근 매물
          </div>
          <div className="space-y-3">
            {properties.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between cursor-pointer hover:bg-secondary/50 rounded-md px-1 -mx-1 py-0.5 transition-colors" onClick={() => openProperty(p.id)}>
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{p.title}</span>
                </div>
                <span className="text-sm text-muted-foreground shrink-0 ml-3">{formatPrice(p)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 저장 */}
        <div className="bg-card rounded-lg p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
            <Bookmark className="h-4 w-4" />
            최근 저장
          </div>
          {recentSaved.length === 0 ? (
            <p className="text-sm text-muted-foreground">저장된 매물이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {recentSaved.map((s, i) => {
                const p = properties.find((pr) => pr.id === s.propertyId);
                const time = new Date(s.addedAt);
                const timeStr = `${(time.getMonth() + 1).toString().padStart(2, "0")}.${time.getDate().toString().padStart(2, "0")} ${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
                return (
                  <div key={`${s.propertyId}-${i}`} className="flex items-start gap-3 cursor-pointer hover:bg-secondary/50 rounded-md px-1 -mx-1 py-0.5 transition-colors" onClick={() => { if (p) openProperty(p.id); }}>
                    <div className="mt-0.5 h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p?.title ?? `매물 ${s.propertyId}`}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p ? `${p.propertyType} · ${p.dealType} ${formatPrice(p)} · ${p.address.replace("서울시 마포구 ", "")}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-primary font-medium flex items-center gap-1 justify-end"><FolderOpen className="h-3 w-3" />{s.collectionName}</p>
                      <p className="text-[11px] text-muted-foreground">{timeStr}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* 매물 상세 모달 — 가로형 */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedProperty(null)}>
          <div className="w-full max-w-[900px] h-[85vh] mx-4 bg-card rounded-xl shadow-2xl overflow-hidden flex" onClick={(e) => e.stopPropagation()}>
            {/* 왼쪽: 매물 상세 (DetailPanel) */}
            <div className="flex-1 overflow-hidden">
              <DetailPanel property={selectedProperty} onClose={() => setSelectedProperty(null)} />
            </div>
            {/* 오른쪽: 가격 변동 이력 */}
            <div className="w-[280px] border-l border-border p-5 flex flex-col bg-secondary/30">
              <h3 className="text-sm font-bold mb-4">가격 변동 이력</h3>
              <PriceHistoryPanel articleNo={selectedProperty.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
