"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useCollectionStore } from "@/lib/collection-store";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatPrice } from "@/lib/format";
import { Building2, Heart, FolderOpen, Users, TrendingUp, TrendingDown, MapPin, Bookmark, Clock, ArrowUpRight, ArrowDownRight, X, Loader2 } from "lucide-react";
import { mapSupabaseToProperty } from "@/lib/store";
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

const CACHE_KEY = "dashboard_price_changes";
const CACHE_TTL = 60 * 60 * 1000; // 1시간

function getCachedPriceChanges() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCachedPriceChanges(data: unknown) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
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

  const openProperty = async (id: string) => {
    const local = properties.find((p) => p.id === id);
    if (local) { setSelectedProperty(local); return; }
    const { data } = await supabase.from("properties").select("*").eq("id", id).single();
    if (data) setSelectedProperty(mapSupabaseToProperty(data));
  };

  // 가격 변동 매물
  const [priceChanges, setPriceChanges] = useState<{
    articleNo: string;
    changeType: string;
    price: number;
    prevPrice: number;
    rate: number;
    recordedAt: string;
    title?: string;
    propertyType?: string;
    dealType?: string;
  }[]>([]);

  useEffect(() => {
    (async () => {
      // 캐시 확인
      const cached = getCachedPriceChanges();
      if (cached) {
        setPriceChanges(cached);
        setPriceChangesLoading(false);
        return;
      }

      // 최근 7일 가격 변동 (increase/decrease)
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: history } = await supabase
        .from("price_history")
        .select("article_no, change_type, price, recorded_at")
        .in("change_type", ["increase", "decrease"])
        .gte("recorded_at", cutoff)
        .order("recorded_at", { ascending: false })
        .limit(200);

      if (!history || history.length === 0) { setPriceChanges([]); return; }

      // 이전 가격 조회를 위해 article_no별로 그룹핑
      const articleIds = [...new Set(history.map((h) => h.article_no))];

      // 매물 정보 조회
      const { data: props } = await supabase
        .from("properties")
        .select("id, article_no, article_name, property_type, trade_type")
        .in("id", articleIds);

      const propMap = new Map((props || []).map((p) => [p.id, p]));

      // 각 변동 건에 대해 이전 가격 조회
      const changes = [];
      const seen = new Set<string>();
      for (const h of history) {
        if (seen.has(h.article_no)) continue;
        seen.add(h.article_no);

        // 이전 가격: 해당 건 바로 이전 기록
        const { data: prev } = await supabase
          .from("price_history")
          .select("price")
          .eq("article_no", h.article_no)
          .lt("recorded_at", h.recorded_at)
          .order("recorded_at", { ascending: false })
          .limit(1);

        const prevPrice = prev?.[0]?.price ?? 0;

        // 제외: 이전가 0, 현재가 0, 변동 없음, 극소액(100만원 미만)
        if (prevPrice === 0 || h.price === 0 || prevPrice === h.price || prevPrice < 1000000) continue;

        const rate = ((h.price - prevPrice) / prevPrice) * 100;
        const prop = propMap.get(h.article_no);

        const tradeMap: Record<string, string> = { A1: "매매", B1: "전세", B2: "월세", B3: "단기" };

        changes.push({
          articleNo: h.article_no,
          changeType: h.change_type,
          price: h.price,
          prevPrice,
          rate,
          recordedAt: h.recorded_at,
          title: prop?.article_name,
          propertyType: prop?.property_type,
          dealType: tradeMap[prop?.trade_type] ?? prop?.trade_type,
        });

        if (changes.length >= 10) break;
      }

      // 상승 우선, 그 안에서 변동률 높은 순
      changes.sort((a, b) => {
        if (a.changeType !== b.changeType) return a.changeType === "increase" ? -1 : 1;
        return Math.abs(b.rate) - Math.abs(a.rate);
      });
      setPriceChanges(changes);
      setCachedPriceChanges(changes);
      setPriceChangesLoading(false);
    })();
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
            {items.map((c) => (
              <div key={c.articleNo} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 rounded-md px-1 -mx-1 transition-colors" onClick={() => openProperty(c.articleNo)}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.title || c.articleNo}</p>
                  <p className="text-[11px] text-muted-foreground">{c.propertyType} · {c.dealType}</p>
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
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-red-500 mb-4">
                <ArrowUpRight className="h-4 w-4" />
                가격 상승 TOP
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
          <div className="w-full max-w-[900px] max-h-[80vh] mx-4 bg-card rounded-xl shadow-2xl overflow-hidden flex" onClick={(e) => e.stopPropagation()}>
            {/* 왼쪽: 핵심 정보 */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <div>
                <h2 className="text-xl font-bold">{selectedProperty.title}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{selectedProperty.propertyType} · {selectedProperty.address}</p>
              </div>
              <div className="bg-secondary rounded-lg px-4 py-3">
                <p className="text-lg font-bold">
                  <span className="text-sm font-medium text-muted-foreground mr-1.5">{selectedProperty.dealType}</span>
                  {formatPrice(selectedProperty)}
                </p>
                {selectedProperty.premiumKey && (
                  <p className="text-xs text-muted-foreground mt-1">권리금: {formatMoney(selectedProperty.premiumKey)}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-muted-foreground">면적</p>
                  <p className="font-medium">{selectedProperty.areaLabel}</p>
                </div>
                {selectedProperty.floor && (
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">층</p>
                    <p className="font-medium">{selectedProperty.floor}/{selectedProperty.totalFloors}층</p>
                  </div>
                )}
              </div>
              {selectedProperty.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProperty.features.map((f, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{f}</span>
                  ))}
                </div>
              )}
            </div>
            {/* 오른쪽: 가격 변동 이력 + 액션 */}
            <div className="w-[300px] border-l border-border p-6 flex flex-col bg-secondary/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">가격 변동 이력</h3>
                <button onClick={() => setSelectedProperty(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <PriceHistoryPanel articleNo={selectedProperty.id} />
              <div className="mt-auto pt-4 space-y-2">
                <a
                  href={`/properties?select=${selectedProperty.id}`}
                  className="flex items-center justify-center h-9 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  상세 페이지로 이동
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
