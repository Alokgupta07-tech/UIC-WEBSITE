import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CertificateStatus, MemberEventState } from "@/types";

const EVENT_STATE_STYLES: Record<MemberEventState, { label: string; className: string }> = {
  live: {
    label: "Live now",
    className: "border-transparent bg-destructive text-destructive-foreground",
  },
  today: {
    label: "Today",
    className: "border-transparent bg-warning text-warning-foreground",
  },
  upcoming: {
    label: "Upcoming",
    className: "border-transparent bg-secondary text-secondary-foreground",
  },
  past: {
    label: "Completed",
    className: "border-transparent bg-muted text-muted-foreground",
  },
};

/**
 * Timeline badge for an event. "Live now" is only ever rendered for the `live`
 * state, which the backend derives from the real event window.
 */
export function EventStateBadge({
  state,
  className,
}: {
  state: MemberEventState;
  className?: string;
}) {
  const { label, className: stateClassName } = EVENT_STATE_STYLES[state];
  return (
    <Badge className={cn("transition-colors", stateClassName, className)}>
      {state === "live" && (
        <span
          aria-hidden
          className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current"
        />
      )}
      {label}
    </Badge>
  );
}

/** Registration badge — only rendered when a real registration record exists. */
export function RegisteredBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-primary/40 text-primary transition-colors", className)}
    >
      Registered
    </Badge>
  );
}

/** Attendance badge — only rendered when attendance was actually recorded. */
export function AttendedBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "border-transparent bg-success text-success-foreground transition-colors",
        className
      )}
    >
      ✓ Attended
    </Badge>
  );
}

const CERTIFICATE_STATUS_STYLES: Record<
  CertificateStatus,
  { label: string; className: string }
> = {
  issued: {
    label: "Verified",
    className: "border-transparent bg-success text-success-foreground",
  },
  revoked: {
    label: "Revoked",
    className: "border-transparent bg-destructive text-destructive-foreground",
  },
  expired: {
    label: "Unavailable",
    className: "border-transparent bg-muted text-muted-foreground",
  },
};

export function CertificateStatusBadge({
  status,
  className,
}: {
  status: CertificateStatus;
  className?: string;
}) {
  const { label, className: statusClassName } = CERTIFICATE_STATUS_STYLES[status];
  return (
    <Badge className={cn("transition-colors", statusClassName, className)}>{label}</Badge>
  );
}
