"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Ruler, BedDouble, Phone } from "lucide-react";

export default function MyListings() {
  const properties = useStore((s) => s.properties);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const myListings = useMemo(() => properties.filter((p) => p.isMyListing), [properties]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">내 매물</h1>
        <p className="text-muted-foreground text-sm mt-1">직접 등록한 매물 {myListings.length}건</p>
      </div>

      {myListings.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-medium">등록한 매물이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myListings.map((p) => (
            <div key={p.id} className="bg-card rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <Badge className="bg-black text-white hover:bg-black/80">{p.dealType}</Badge>
                  <Badge variant="outline" className="font-normal">{p.propertyType}</Badge>
                </div>
                <button onClick={() => toggleFavorite(p.id)}>
                  <Heart className={`h-4 w-4 ${p.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
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
              {p.contact && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground border-t pt-3">
                  <Phone className="h-3.5 w-3.5" />{p.contact}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
