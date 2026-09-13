import { Award, Copy, Download, PenLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateStatusBadge } from "@/components/dashboard/StatusBadge";
import { formatEventDate, formatEventDay, toDateTimeAttr } from "@/lib/dates";
import type { Certificate } from "@/types";

interface CertificateCardProps {
  certificate: Certificate;
  onView: (certificate: Certificate) => void;
  onCopyId: (certificate: Certificate) => void;
}

/**
 * Card in "My Certificates". Every value is read from the certificate record —
 * the event date/day come from the joined event, so the weekday is always
 * correct for the stored date.
 */
export function CertificateCard({ certificate, onView, onCopyId }: CertificateCardProps) {
  const eventDate = formatEventDate(certificate.eventDate);
  const eventDay = formatEventDay(certificate.eventDate);
  const issued = formatEventDate(certificate.issueDate);

  return (
    <article className="card-hover flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-start gap-3 border-b bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/80">
          <Award className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-snug">{certificate.certificateType}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {certificate.eventTitle ?? "Event unavailable"}
          </p>
        </div>
        <CertificateStatusBadge status={certificate.status} className="shrink-0" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <dl className="space-y-2 text-sm">
          {eventDate && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Event date</dt>
              <dd className="min-w-0 truncate text-right">
                <time dateTime={toDateTimeAttr(certificate.eventDate)}>{eventDate}</time>
                {eventDay && <span className="text-muted-foreground"> · {eventDay}</span>}
              </dd>
            </div>
          )}
          {issued && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Issued</dt>
              <dd className="text-right">{issued}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Signed by</dt>
            <dd className="min-w-0 truncate text-right">
              {certificate.signerName ? (
                <span className="inline-flex items-center gap-1">
                  <PenLine className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                  {certificate.signerName}
                </span>
              ) : (
                <span className="text-muted-foreground">Not provided</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Certificate ID</dt>
            <dd className="flex min-w-0 items-center gap-1">
              <span className="truncate font-mono text-xs">{certificate.certificateNumber}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => onCopyId(certificate)}
                aria-label={`Copy certificate ID ${certificate.certificateNumber}`}
              >
                <Copy className="h-3 w-3" aria-hidden />
              </Button>
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="flex-1 min-w-[7rem] gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            onClick={() => onView(certificate)}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            View &amp; Verify
          </Button>

          {certificate.status === "issued" && certificate.certificateFileUrl && (
            <Button variant="outline" size="sm" className="flex-1 min-w-[7rem] gap-2" asChild>
              <a
                href={certificate.certificateFileUrl}
                target="_blank"
                rel="noreferrer"
                download
              >
                <Download className="h-4 w-4" aria-hidden />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
