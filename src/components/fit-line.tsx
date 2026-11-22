"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** How much the font steps down per try, in pixels. */
const STEP_PX = 0.5;

/**
 * Text kept on one line by shrinking its font from `max` down to `min` pixels, so a long talent name fits its column
 * without making the column wider. When even `min` doesn't fit (a phone), it wraps instead at `wrap` pixels (`max`
 * unless given), so nothing is cut. Refits when the column's width changes.
 */
export function FitLine({
  children,
  className = "",
  max,
  min,
  wrap = max,
}: {
  children: ReactNode;
  className?: string;
  max: number;
  min: number;
  wrap?: number;
}) {
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
        el.style.fontSize = `${wrap}px`;
        el.style.whiteSpace = "normal";
      }
    };
    fit();
    // Not in every test runner; the text then keeps its first fit.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, max, min, wrap]);
  return (
    <span ref={ref} className={`block w-full overflow-hidden ${className}`} style={{ fontSize: max }}>
      {children}
    </span>
  );
}
