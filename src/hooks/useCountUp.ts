import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** easeOutCubic — quick start, gentle settle. */
function ease(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Counts from 0 up to `value` once, using a single rAF loop that stops as soon
 * as it lands. Returns `value` immediately when the user prefers reduced motion
 * or when the target is 0, so nothing animates needlessly.
 */
export function useCountUp(value: number, durationMs = 900): number {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(() =>
    prefersReducedMotion ? value : 0
  );
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion || value === 0 || durationMs <= 0) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const step = (nowMs: number) => {
      const progress = Math.min(1, (nowMs - start) / durationMs);
      setDisplay(Math.round(ease(progress) * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [value, durationMs, prefersReducedMotion]);

  return display;
}
