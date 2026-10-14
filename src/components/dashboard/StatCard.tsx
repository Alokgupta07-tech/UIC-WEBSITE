import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  hint?: string;
  /** Stagger index so a row of cards counts up in sequence rather than at once. */
  index?: number;
  className?: string;
}

/**
 * Dashboard statistic card. The number animates from 0 to its real value and is
 * padded to two digits for a tidy row. Every value is passed in already
 * computed from backend records — nothing here is hardcoded.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  index = 0,
  className,
}: StatCardProps) {
  const displayed = useCountUp(value, 700 + index * 120);

  return (
    <Card className={cn("card-hover overflow-hidden", className)}>
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15">
          <Icon className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          {/* aria-hidden on the animating number; the real value is announced once. */}
          <div className="text-2xl font-bold tabular-nums sm:text-3xl" aria-hidden>
            {String(displayed).padStart(2, "0")}
          </div>
          <span className="sr-only">
            {value} {label}
          </span>
          <div className="truncate text-xs text-muted-foreground sm:text-sm">{label}</div>
          {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground/80">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
