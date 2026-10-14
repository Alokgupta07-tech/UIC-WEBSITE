import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface AnimatedBackgroundProps {
  /** Adds a soft glow that follows the pointer. Ignored on touch-only devices. */
  interactive?: boolean;
  className?: string;
}

/**
 * Decorative background: three slow-drifting blurred blobs over the existing
 * hero pattern, plus an optional pointer-following glow.
 *
 * Everything is CSS transform/opacity only — no canvas, no per-frame React
 * state — so it stays off the main thread. The pointer glow writes CSS custom
 * properties from a rAF-throttled listener rather than re-rendering. The whole
 * layer is removed when the user prefers reduced motion.
 */
export function AnimatedBackground({ interactive = false, className }: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!interactive || prefersReducedMotion || !container) return;

    // Hover-driven decoration is pointless on touch input, and listening there
    // just burns battery.
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) {
      return;
    }

    let frame: number | null = null;
    let pending: { x: number; y: number } | null = null;

    const apply = () => {
      frame = null;
      if (!pending) return;
      container.style.setProperty("--glow-x", `${pending.x}%`);
      container.style.setProperty("--glow-y", `${pending.y}%`);
      container.style.setProperty("--glow-opacity", "1");
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pending = {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      };
      if (frame === null) frame = requestAnimationFrame(apply);
    };

    const onPointerLeave = () => {
      container.style.setProperty("--glow-opacity", "0");
    };

    const parent = container.parentElement ?? container;
    parent.addEventListener("pointermove", onPointerMove, { passive: true });
    parent.addEventListener("pointerleave", onPointerLeave);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      parent.removeEventListener("pointermove", onPointerMove);
      parent.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [interactive, prefersReducedMotion]);

  if (prefersReducedMotion) {
    // Keep a static wash so the section still has depth, but nothing moves.
    return (
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden",
          "bg-gradient-to-br from-primary/5 via-transparent to-secondary/5",
          className
        )}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ "--glow-opacity": "0" } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

      <div className="absolute -left-32 -top-40 h-[26rem] w-[26rem] animate-blob-slow rounded-full bg-primary/20 blur-3xl dark:bg-primary/15" />
      <div className="absolute -bottom-40 -right-32 h-[26rem] w-[26rem] animate-blob-slower rounded-full bg-secondary/20 blur-3xl dark:bg-secondary/15" />
      <div className="absolute left-1/3 top-1/4 h-72 w-72 animate-blob-slowest rounded-full bg-accent/40 blur-3xl dark:bg-accent/25" />

      {interactive && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: "var(--glow-opacity)",
            background:
              "radial-gradient(28rem circle at var(--glow-x, 50%) var(--glow-y, 50%), hsl(var(--primary) / 0.14), transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
