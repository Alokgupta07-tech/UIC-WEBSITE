import type { LucideIcon } from "lucide-react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Elegant skeleton block used while a dashboard section loads. */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton-shimmer rounded-lg", className)} />;
}

/** Card-shaped skeleton matching the height of the real event/certificate cards. */
export function SkeletonCards({
  count = 3,
  className,
  cardClassName = "h-44",
}: {
  count?: number;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn("rounded-2xl border bg-card p-4", cardClassName)}
        >
          <SkeletonBlock className="mb-3 h-4 w-2/3" />
          <SkeletonBlock className="mb-2 h-3 w-1/2" />
          <SkeletonBlock className="mb-4 h-3 w-1/3" />
          <SkeletonBlock className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Friendly empty state. Never implies data exists when it does not. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/50 p-8 text-center sm:p-12">
      <Icon className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden />
      <h3 className="mb-1 text-base font-semibold">{title}</h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Error state with a retry. Deliberately shows a plain sentence instead of the
 * underlying exception — no stack traces, database errors or API URLs reach the
 * member.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this section just now. Please try again.",
  onRetry,
  isRetrying = false,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" aria-hidden />
      <h3 className="mb-1 text-base font-semibold">{title}</h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button
          variant="outline"
          className="mt-5 gap-2"
          onClick={onRetry}
          disabled={isRetrying}
        >
          <RotateCw className={cn("h-4 w-4", isRetrying && "animate-spin")} aria-hidden />
          {isRetrying ? "Retrying…" : "Try again"}
        </Button>
      )}
    </div>
  );
}

/** Consistent heading for each dashboard section. */
export function SectionHeading({
  title,
  description,
  action,
  id,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id={id} className="text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
