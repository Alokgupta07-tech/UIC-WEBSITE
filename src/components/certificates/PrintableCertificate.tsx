/**
 * PrintableCertificate — A4 Landscape, print-ready certificate canvas.
 *
 * Renders an official Unstop Igniters Club certificate designed for
 * on-screen viewing AND clean @media print output. When the user clicks
 * "Print / Save as PDF", only this certificate fills the full page.
 *
 * Works for ALL events — text is fully dynamic from the verification data.
 */

import { useRef, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Copy, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatEventDate } from "@/lib/dates";
import { buildVerificationUrl } from "@/services/certificates";
import { createQrSvg } from "@/lib/qr";
import type { CertificateVerification } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert "alok kumar" → "Alok Kumar" */
function toTitleCase(name: string | null | undefined): string {
  if (!name) return "Participant";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Format venue nicely */
function formatVenue(venue: string | null | undefined, isOnline: boolean | null | undefined): string {
  if (isOnline) return "Online / Virtual";
  if (!venue) return "";
  if (/^\d+$/.test(venue.trim())) return `SRM University AP — Hall ${venue.trim()}`;
  return venue;
}

/** Generate custom citation copy based on certificate type */
function getCitationText(certType: string, eventTitle: string, org: string, eventDate: string, venue: string) {
  const lower = certType.toLowerCase();
  const venueClause = venue ? ` at ${venue}` : "";

  if (lower.includes("winner") || lower.includes("first") || lower.includes("1st")) {
    return {
      title: "CERTIFICATE OF EXCELLENCE",
      subtitle: "Winner — Outstanding Performance",
      body: (
        <>
          For securing the <strong className="text-indigo-900 font-bold">First Place</strong> and demonstrating
          exceptional technical brilliance, creativity, and innovative execution in{" "}
          <strong className="text-indigo-900 font-semibold">{eventTitle}</strong>, organized by{" "}
          <strong className="text-indigo-900 font-semibold">{org}</strong> on{" "}
          <strong>{eventDate}</strong>{venueClause}.
        </>
      ),
    };
  }

  if (lower.includes("runner") || lower.includes("2nd") || lower.includes("second") || lower.includes("3rd") || lower.includes("third") || lower.includes("merit")) {
    return {
      title: "CERTIFICATE OF MERIT",
      subtitle: "In Recognition of Exemplary Achievement",
      body: (
        <>
          For outstanding achievement and demonstrating remarkable problem-solving and technical
          prowess in <strong className="text-indigo-900 font-semibold">{eventTitle}</strong>, organized
          by <strong className="text-indigo-900 font-semibold">{org}</strong> on{" "}
          <strong>{eventDate}</strong>{venueClause}.
        </>
      ),
    };
  }

  if (lower.includes("organizer") || lower.includes("lead") || lower.includes("volunteer") || lower.includes("appreciation")) {
    return {
      title: "CERTIFICATE OF APPRECIATION",
      subtitle: "In Recognition of Invaluable Contribution",
      body: (
        <>
          In grateful appreciation for valuable leadership, tireless dedication, and exemplary service in
          successfully organizing and executing{" "}
          <strong className="text-indigo-900 font-semibold">{eventTitle}</strong> for{" "}
          <strong className="text-indigo-900 font-semibold">{org}</strong> on{" "}
          <strong>{eventDate}</strong>{venueClause}.
        </>
      ),
    };
  }

  // Default: Certificate of Participation
  return {
    title: "CERTIFICATE OF PARTICIPATION",
    subtitle: "Presented for Active & Dedicated Participation",
    body: (
      <>
        For actively participating and demonstrating commendable enthusiasm, technical skill, and
        collaborative spirit in <strong className="text-indigo-900 font-semibold">{eventTitle}</strong>,
        organized by <strong className="text-indigo-900 font-semibold">{org}</strong> on{" "}
        <strong>{eventDate}</strong>{venueClause}.
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// Fallback QR pattern (while async SVG loads or on error)
// ---------------------------------------------------------------------------
function generateQRCodeSVG(text: string, size: number = 80): string {
  const cells = 21;
  const cellSize = size / cells;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const rects: string[] = [];
  const finderPositions = [[0, 0], [0, cells - 7], [cells - 7, 0]];
  for (const [fy, fx] of finderPositions) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isBorder = y === 0 || y === 6 || x === 0 || x === 6;
        const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        if (isBorder || isInner) {
          rects.push(`<rect x="${(fx + x) * cellSize}" y="${(fy + y) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#1e1b4b"/>`);
        }
      }
    }
  }
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      if ((x < 8 && y < 8) || (x < 8 && y >= cells - 8) || (x >= cells - 8 && y < 8)) continue;
      const bit = ((hash * (x + 1) * (y + 1) + x * 31 + y * 17) >>> 0) % 3;
      if (bit === 0) {
        rects.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#1e1b4b"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white" rx="4"/>${rects.join("")}</svg>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PrintableCertificateProps {
  data: CertificateVerification;
  token?: string | null;
}

export function PrintableCertificate({ data, token }: PrintableCertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState(false);

  const recipientName = toTitleCase(data.recipientName);
  const eventTitle = data.eventTitle || "UIC Technical Event";
  const eventDate = formatEventDate(data.eventDate) || "Date TBA";
  const venue = formatVenue(data.eventVenue, data.eventIsOnline);
  const org = data.organizerOrganization || "Unstop Igniters Club";
  const certId = data.certificateNumber || "UIC-XXXX-XXXXX";
  const issueDate = formatEventDate(data.issueDate) || eventDate;
  const certType = data.certificateType || "Participation";
  const signerName = data.signerName || "Faculty Coordinator";
  const signerDesig = data.signerDesignation || "Unstop Igniters Club, SRM AP";
  const verifyUrl = token ? buildVerificationUrl(token) : "";

  // Dynamic citation text
  const citation = getCitationText(certType, eventTitle, org, eventDate, venue);

  // Real scannable QR code state
  const [qrSvg, setQrSvg] = useState<string>(() => (verifyUrl ? generateQRCodeSVG(verifyUrl, 80) : ""));

  useEffect(() => {
    if (!verifyUrl) return;
    let isMounted = true;
    createQrSvg(verifyUrl, 4, 1)
      .then((svg) => {
        if (isMounted) setQrSvg(svg);
      })
      .catch(() => {
        // Fallback already set
      });
    return () => {
      isMounted = false;
    };
  }, [verifyUrl]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(certId);
      setCopiedId(true);
      toast.success("Certificate ID copied!");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error("Could not copy certificate ID.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons (hidden in print) */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button onClick={handlePrint} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90">
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
        {verifyUrl && (
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <a href={verifyUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Verification Link
            </a>
          </Button>
        )}
        <Button size="sm" variant="ghost" className="gap-2" onClick={handleCopyId}>
          {copiedId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          Copy ID
        </Button>
      </div>

      {/* ===== THE CERTIFICATE CANVAS ===== */}
      <div
        ref={certRef}
        id="printable-certificate"
        className="certificate-canvas relative mx-auto bg-white text-gray-900 overflow-hidden"
        style={{
          aspectRatio: "1.414 / 1",
          maxWidth: "1000px",
          width: "100%",
        }}
      >
        {/* Outer border */}
        <div className="absolute inset-0 border-[6px] border-indigo-900 rounded-sm" />
        {/* Inner border with gold accent */}
        <div className="absolute inset-[12px] border-[3px] border-amber-500/70 rounded-sm" />
        {/* Corner ornaments */}
        <div className="absolute top-[8px] left-[8px] w-6 h-6 border-t-[3px] border-l-[3px] border-amber-500" />
        <div className="absolute top-[8px] right-[8px] w-6 h-6 border-t-[3px] border-r-[3px] border-amber-500" />
        <div className="absolute bottom-[8px] left-[8px] w-6 h-6 border-b-[3px] border-l-[3px] border-amber-500" />
        <div className="absolute bottom-[8px] right-[8px] w-6 h-6 border-b-[3px] border-r-[3px] border-amber-500" />

        {/* Watermark pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 40px, #312e81 40px, #312e81 41px)`,
          }}
        />

        {/* Content area */}
        <div className="relative h-full flex flex-col items-center justify-between px-[8%] py-[5%]">

          {/* Header */}
          <div className="text-center w-full space-y-1">
            <div className="flex items-center justify-center gap-3">
              {/* Logo mark */}
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-700 to-violet-600">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <div>
                <p className="text-xs tracking-[0.35em] uppercase font-bold text-indigo-900" style={{ fontFamily: "'Georgia', serif" }}>
                  {org.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Verified badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-green-100 text-green-800 border border-green-300">
                ✓ Verified Credential
              </span>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center space-y-1.5 w-full">
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-[0.12em] text-indigo-950 uppercase"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              {citation.title}
            </h1>
            <p className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-amber-600 font-semibold">
              {citation.subtitle}
            </p>
          </div>

          {/* Recipient Name */}
          <div className="text-center w-full">
            <p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase text-gray-500 font-medium mb-1">
              This is proudly presented to
            </p>
            <p
              className="text-2xl sm:text-3xl md:text-5xl font-bold text-indigo-900 pb-2"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              {recipientName}
            </p>
            <div className="mx-auto w-3/5 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          </div>

          {/* Citation */}
          <div className="text-center max-w-[85%]">
            <p className="text-xs sm:text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Georgia', serif" }}>
              {citation.body}
            </p>
          </div>

          {/* Footer: Signatures & Seal & Verification */}
          <div className="w-full grid grid-cols-3 items-end gap-4">
            {/* Left: Signatory */}
            <div className="text-center space-y-1">
              {data.signerSignatureUrl ? (
                <img
                  src={data.signerSignatureUrl}
                  alt={`Signature of ${signerName}`}
                  className="h-10 mx-auto object-contain"
                  style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
                />
              ) : (
                <div className="h-10 flex items-end justify-center">
                  <span className="italic text-sm text-indigo-700" style={{ fontFamily: "'Georgia', serif" }}>
                    {signerName}
                  </span>
                </div>
              )}
              <div className="mx-auto w-32 h-[1px] bg-indigo-900" />
              <p className="text-xs font-semibold text-indigo-900">{signerName}</p>
              <p className="text-[10px] text-gray-500">{signerDesig}</p>
            </div>

            {/* Center: Official Seal */}
            <div className="flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-full border-[3px] border-amber-500 flex items-center justify-center"
                style={{ 
                  background: "radial-gradient(circle, #fef3c7 0%, #fde68a 40%, #f59e0b 100%)",
                  printColorAdjust: "exact",
                  WebkitPrintColorAdjust: "exact",
                }}
              >
                <div className="w-16 h-16 rounded-full border-2 border-indigo-900/30 flex flex-col items-center justify-center text-center">
                  <span className="text-[7px] tracking-[0.15em] uppercase font-bold text-indigo-900 leading-tight">UIC Official</span>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-indigo-900 fill-current my-0.5">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                  </svg>
                  <span className="text-[6px] tracking-[0.1em] uppercase font-semibold text-indigo-900 leading-tight">Verified</span>
                </div>
              </div>
            </div>

            {/* Right: Verification Block + QR */}
            <div className="text-center space-y-1">
              {qrSvg ? (
                <div
                  className="mx-auto w-16 h-16"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="h-16" />
              )}
              <p className="text-[9px] font-mono text-gray-600">ID: {certId}</p>
              <p className="text-[9px] text-gray-500">Issued: {issueDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrintableCertificate;
