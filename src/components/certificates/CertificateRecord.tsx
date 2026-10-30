import { Flame } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  formatEventDate,
  formatEventDay,
  formatEventTime,
  toDateTimeAttr,
} from "@/lib/dates";
import type { CertificateVerification } from "@/types";

const NOT_PROVIDED = "Not provided";

function Field({
  label,
  value,
  mono = false,
  className,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-sm",
          mono && "font-mono text-xs",
          !value && "text-muted-foreground"
        )}
      >
        {value || NOT_PROVIDED}
      </dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
        {title}
      </h3>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/**
 * The official verification record for a certificate.
 *
 * Renders exactly the fields returned by the `verify_certificate` RPC, which
 * contains no email address, account id or verification token — so this same
 * component is safe on both the private dashboard and the public verification
 * page.
 */
export function CertificateRecord({
  data,
  className,
}: {
  data: CertificateVerification;
  className?: string;
}) {
  const eventDate = formatEventDate(data.eventDate);
  const eventDay = formatEventDay(data.eventDate);
  const eventTime = formatEventTime(data.eventDate);
  const issueDate = formatEventDate(data.issueDate);
  const verifiedAt = data.verifiedAt
    ? `${formatEventDate(data.verifiedAt)} at ${formatEventTime(data.verifiedAt)}`
    : null;

  const venue = data.eventIsOnline ? "Online" : data.eventVenue;

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card", className)}>
      {/* Certificate letterhead */}
      <div className="flex items-center gap-3 border-b bg-gradient-to-r from-primary/10 to-secondary/10 p-4 sm:p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
          <Flame className="h-6 w-6 text-primary-foreground" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {data.organizerOrganization || "Unstop Igniters Club"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {data.certificateType || "Certificate"}
          </p>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <Group title="Recipient & Recognition">
          <Field label="Recipient name" value={data.recipientName} className="sm:col-span-2" />
          {data.role && <Field label="Role / Capacity" value={data.role} />}
          {data.team && <Field label="Team / Department" value={data.team} />}
          {data.customTitle && <Field label="Official Title" value={data.customTitle} className="sm:col-span-2" />}
          {data.contributionSummary && (
            <Field label="Contribution / Citation" value={data.contributionSummary} className="sm:col-span-2" />
          )}
        </Group>

        <Separator />

        <Group title="Event">
          <Field label="Event name" value={data.eventTitle} className="sm:col-span-2" />
          {data.eventDescription && (
            <Field label="About" value={data.eventDescription} className="sm:col-span-2" />
          )}
          <div className="min-w-0">
            <dt className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
              Event date
            </dt>
            <dd className="mt-0.5 text-sm">
              {eventDate ? (
                <time dateTime={toDateTimeAttr(data.eventDate)}>{eventDate}</time>
              ) : (
                <span className="text-muted-foreground">{NOT_PROVIDED}</span>
              )}
            </dd>
          </div>
          <Field label="Day" value={eventDay} />
          <Field label="Time" value={eventTime} />
          <Field label="Event type" value={data.eventCategory} />
          <Field label="Venue" value={venue} className="sm:col-span-2" />
        </Group>

        <Separator />

        <Group title="Organisation">
          <Field label="Organised by" value={data.organizerOrganization} />
          <Field label="Organiser" value={data.organizerName} />
        </Group>

        <Separator />

        <Group title="Authorized Signatories">
          <div>
            <dt className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">Faculty Coordinator</dt>
            <dd className="mt-1.5 space-y-1">
              {data.signerSignatureUrl && <img src={data.signerSignatureUrl} alt="Faculty Coordinator handwritten signature" loading="lazy" className="h-12 w-auto max-w-[16rem] object-contain" />}
              <p className="text-sm font-semibold">{data.signerName || "Faculty Coordinator"}</p>
              <p className="text-xs text-muted-foreground">{data.signerDesignation || ""}</p>
            </dd>
          </div>
          <div>
            <dt className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">President</dt>
            <dd className="mt-1.5 space-y-1">
              {data.signer2SignatureUrl && <img src={data.signer2SignatureUrl} alt="President handwritten signature" loading="lazy" className="h-12 w-auto max-w-[16rem] object-contain" />}
              <p className="text-sm font-semibold">{data.signer2Name || "President"}</p>
              <p className="text-xs text-muted-foreground">{data.signer2Designation || ""}</p>
            </dd>
          </div>
        </Group>

        <Separator />

        <Group title="Certificate">
          <Field label="Certificate ID" value={data.certificateNumber} mono />
          <Field label="Certificate type" value={data.certificateType} />
          <Field label="Issued on" value={issueDate} />
          <Field label="Verified on" value={verifiedAt} />
        </Group>
      </div>
    </div>
  );
}
