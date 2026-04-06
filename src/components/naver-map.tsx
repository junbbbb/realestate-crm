"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMap;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (opts: Record<string, unknown>) => NaverMarker;
      };
    };
  }
}

interface NaverMap {
  destroy: () => void;
}
interface NaverMarker {
  setMap: (map: null) => void;
}

interface NaverMapProps {
  lat: number;
  lng: number;
  className?: string;
}

export default function NaverMap({ lat, lng, className }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<NaverMap | null>(null);
  const markerInstance = useRef<NaverMarker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let interval: ReturnType<typeof setInterval> | null = null;

    function initMap() {
      if (!mapRef.current || !window.naver?.maps) return;
      // 이전 인스턴스 정리
      if (markerInstance.current) markerInstance.current.setMap(null);
      if (mapInstance.current) mapInstance.current.destroy();

      const center = new window.naver.maps.LatLng(lat, lng);
      const map = new window.naver.maps.Map(mapRef.current, {
        center,
        zoom: 16,
        zoomControl: true,
        zoomControlOptions: { position: 9 },
      });
      const marker = new window.naver.maps.Marker({ position: center, map });
      mapInstance.current = map;
      markerInstance.current = marker;
    }

    if (window.naver?.maps) {
      initMap();
    } else {
      interval = setInterval(() => {
        if (window.naver?.maps) {
          if (interval) clearInterval(interval);
          interval = null;
          initMap();
        }
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (markerInstance.current) markerInstance.current.setMap(null);
      if (mapInstance.current) mapInstance.current.destroy();
      mapInstance.current = null;
      markerInstance.current = null;
    };
  }, [lat, lng]);

  return <div ref={mapRef} className={className} />;
}
