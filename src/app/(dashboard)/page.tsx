"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useCollectionStore } from "@/lib/collection-store";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatPrice } from "@/lib/format";
import { Building2, Heart, FolderOpen, Users, TrendingUp, TrendingDown, MapPin, Bookmark, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

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
        .select("id, article_no, property_type, trade_type, deal_or_warrant_price")
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
        const rate = prevPrice > 0 ? ((h.price - prevPrice) / prevPrice) * 100 : 0;
        const prop = propMap.get(h.article_no);

        const tradeMap: Record<string, string> = { A1: "매매", B1: "전세", B2: "월세", B3: "단기" };

        changes.push({
          articleNo: h.article_no,
          changeType: h.change_type,
          price: h.price,
          prevPrice,
          rate,
          recordedAt: h.recorded_at,
          title: prop?.deal_or_warrant_price,
          propertyType: prop?.property_type,
          dealType: tradeMap[prop?.trade_type] ?? prop?.trade_type,
        });

        if (changes.length >= 10) break;
      }

      // 상승률 높은 순 정렬
      changes.sort((a, b) => Math.abs(b.rate) - Math.abs(a.rate));
      setPriceChanges(changes);
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

      {/* 가격 변동 */}
      {priceChanges.length > 0 && (
        <div className="bg-card rounded-lg p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
            <TrendingUp className="h-4 w-4" />
            최근 7일 가격 변동 (변동률 순)
          </div>
          <div className="space-y-2.5">
            {priceChanges.map((c) => {
              const isUp = c.changeType === "increase";
              return (
                <div key={c.articleNo} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      {isUp ? (
                        <ArrowUpRight className="h-4 w-4 text-red-500 shrink-0" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-blue-500 shrink-0" />
                      )}
                      <span className="truncate font-medium">{c.title || c.articleNo}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground ml-6">{c.propertyType} · {c.dealType}</p>
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
              );
            })}
          </div>
        </div>
      )}

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
              <div key={p.id} className="flex items-center justify-between">
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
                  <div key={`${s.propertyId}-${i}`} className="flex items-start gap-3">
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
    </div>
  );
}
