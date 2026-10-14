import { useEffect, useState } from "react";
import { Check, Circle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";
import type { MemberProgress, MemberStats } from "@/types";

interface ProgressSectionProps {
  progress: MemberProgress;
  stats: MemberStats;
}

/**
 * "Your UIC Progress".
 *
 * The percentage is computed in `services/dashboard.ts` from real attendance,
 * certificate and registration counts — see the formula documented there. The
 * bar eases to that value once on mount; with reduced motion it is drawn at its
 * final width immediately.
 */
export function ProgressSection({ progress, stats }: ProgressSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [barWidth, setBarWidth] = useState(prefersReducedMotion ? progress.percent : 0);
  const displayedPercent = useCountUp(progress.percent, 1000);

  useEffect(() => {
    if (prefersReducedMotion) {
      setBarWidth(progress.percent);
      return;
    }
    // Next frame, so the transition has a 0 -> value change to animate.
    const frame = requestAnimationFrame(() => setBarWidth(progress.percent));
    return () => cancelAnimationFrame(frame);
  }, [progress.percent, prefersReducedMotion]);

  return (
    <Card className="card-hover overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
              Your UIC Progress
            </CardTitle>
            <CardDescription>
              Based on events you attended, certificates earned and events you registered for.
            </CardDescription>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-3xl font-bold tabular-nums" aria-hidden>
              {displayedPercent}%
            </div>
            <div className="text-xs text-muted-foreground">{progress.label}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`UIC progress: ${progress.percent} percent, ${progress.label}`}
          className="h-3 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-1000 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>

        <dl className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Attended</dt>
            <dd className="text-lg font-semibold tabular-nums">{stats.eventsAttended}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Certificates</dt>
            <dd className="text-lg font-semibold tabular-nums">{stats.validCertificates}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Upcoming</dt>
            <dd className="text-lg font-semibold tabular-nums">{stats.upcomingEvents}</dd>
          </div>
        </dl>

        <ul className="space-y-2">
          {progress.milestones.map((milestone) => (
            <li key={milestone.label} className="flex items-start gap-2.5 text-sm">
              {milestone.reached ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
              )}
              <span className="min-w-0">
                <span
                  className={cn(
                    "block",
                    milestone.reached ? "font-medium" : "text-muted-foreground"
                  )}
                >
                  {milestone.label}
                  <span className="sr-only">{milestone.reached ? " — done" : " — not yet"}</span>
                </span>
                <span className="block text-xs text-muted-foreground/80">{milestone.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
