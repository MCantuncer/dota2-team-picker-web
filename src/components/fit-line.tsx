"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** How much the font steps down per try, in pixels. */
const STEP_PX = 0.5;

/**
 * Text kept on one line by shrinking its font from `max` down to `min` pixels, so a long talent name fits its column
 * without making the column wider. When even `min` doesn't fit (a phone), it goes back to `max` and wraps instead,
 * so nothing is cut. Refits when the column's width changes.
 */
export function FitLine({ children, className = "", max, min }: { children: ReactNode; className?: string; max: number; min: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const fits = () => el.scrollWidth <= el.clientWidth;
      el.style.whiteSpace = "nowrap";
      let size = max;
      el.style.fontSize = `${size}px`;
      while (size > min && !fits()) {
        size = Math.max(min, size - STEP_PX);
        el.style.fontSize = `${size}px`;
      }
      if (!fits()) {
        el.style.fontSize = `${max}px`;
        el.style.whiteSpace = "normal";
      }
    };
    fit();
    // Not in every test runner; the text then keeps its first fit.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, max, min]);
  return (
    <span ref={ref} className={`block w-full overflow-hidden ${className}`} style={{ fontSize: max }}>
      {children}
    </span>
  );
}
