import { cn } from "@/lib/utils";
import { VERDICT_PRESENTATION } from "@/components/certificates/verdictCopy";
import type { CertificateVerdict } from "@/types";

/** Banner announcing the outcome of a certificate verification. */
export function VerificationVerdict({
  verdict,
  className,
  compact = false,
}: {
  verdict: CertificateVerdict;
  className?: string;
  compact?: boolean;
}) {
  const { icon: Icon, heading, detail, wrapper, iconClass } = VERDICT_PRESENTATION[verdict];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 motion-safe:animate-scale-in",
        wrapper,
        className
      )}
    >
      <Icon className={cn("h-6 w-6 shrink-0", iconClass)} aria-hidden />
      <div className="min-w-0">
        <p className={cn("font-semibold", compact ? "text-base" : "text-lg")}>{heading}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
