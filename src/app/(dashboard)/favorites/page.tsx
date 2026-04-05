"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Ruler, BedDouble } from "lucide-react";

export default function Favorites() {
  const properties = useStore((s) => s.properties);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const favorites = useMemo(() => properties.filter((p) => p.isFavorite), [properties]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">즐겨찾기</h1>
        <p className="text-muted-foreground text-sm mt-1">관심 매물 {favorites.length}건</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="font-medium">즐겨찾기한 매물이 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1">매물 목록에서 하트를 눌러 추가하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((p) => (
            <div key={p.id} className="bg-card rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <Badge className="bg-black text-white hover:bg-black/80">{p.dealType}</Badge>
                  <Badge variant="outline" className="font-normal">{p.propertyType}</Badge>
                </div>
                <button onClick={() => toggleFavorite(p.id)}>
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                </button>
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
