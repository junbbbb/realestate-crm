"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const update = useCallback(() => {
    const el = ref.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight) {
      thumb.style.opacity = "0";
      return;
    }

    const ratio = clientHeight / scrollHeight;
    const thumbHeight = Math.max(ratio * clientHeight, 24);
    const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight);

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.top = `${thumbTop}px`;
    thumb.style.opacity = "1";

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (thumb) thumb.style.opacity = "0";
    }, 1000);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      el.removeEventListener("scroll", update);
      clearTimeout(timerRef.current);
    };
  }, [update]);

  return { containerRef: ref, thumbRef };
}
