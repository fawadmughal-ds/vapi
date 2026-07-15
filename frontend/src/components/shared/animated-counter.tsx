"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Animates the first numeric token found inside a value while preserving any
 * surrounding formatting (currency symbols, %, k/M suffixes, thousands
 * separators). Non-numeric values render as-is. Respects reduced motion.
 */
export function AnimatedCounter({
  value,
  duration = 900,
  className,
}: {
  value: string | number;
  duration?: number;
  className?: string;
}) {
  const raw = String(value ?? "");
  const match = raw.match(/-?[\d,]*\.?\d+/);
  const target = match ? Number(match[0].replace(/,/g, "")) : NaN;
  const grouped = match ? /,/.test(match[0]) : false;
  const decimals = match && match[0].includes(".")
    ? match[0].split(".")[1].length
    : 0;

  const [display, setDisplay] = React.useState(Number.isNaN(target) ? 0 : 0);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (Number.isNaN(target)) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || startedRef.current) {
      setDisplay(target);
      return;
    }
    startedRef.current = true;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  if (Number.isNaN(target)) {
    return <span className={className}>{raw}</span>;
  }

  const formatted = grouped
    ? display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : display.toFixed(decimals);
  const rendered = raw.replace(match![0], formatted);

  return (
    <span className={cn("tabular-nums", className)}>{rendered}</span>
  );
}
