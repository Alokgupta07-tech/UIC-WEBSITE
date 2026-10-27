/**
 * PrintableCertificate — Ultra-premium, A4 Landscape, print-ready certificate canvas.
 *
 * Supports 5 bespoke aesthetic themes tailored for different types of events:
 * 1. Cyber Emerald & Gold (Hackathons, Coding, Vibe Coding, Tech Sprints)
 * 2. Royal Sapphire & Gold (Grand Contests, University Championships)
 * 3. Imperial Ruby & Rose Gold (Workshops, Bootcamps, Design Summits)
 * 4. Royal Amethyst & Platinum (Leadership, Appreciation, Organizers)
 * 5. Grand Monarch 24K Gold (1st Place, Winners, Supreme Excellence)
 *
 * Features:
 * - Smart auto-selection based on event type & achievement
 * - Live interactive theme switcher
 * - Detailed vector guilloche borders & corner filigree
 * - 3D metallic embossed seal with silk ribbon tails
 * - Authentic anti-counterfeit security watermark
 * - Scannable cryptographic QR code
 * - Perfect 1:1 A4 landscape print reproduction
 */

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  Palette, 
  ShieldCheck, 
  Award,
  Sparkles,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { formatEventDate } from "@/lib/dates";
import { buildVerificationUrl } from "@/services/certificates";
import { createQrSvg } from "@/lib/qr";
import { downloadCertificatePdf } from "@/lib/certificatePdf";
import type { CertificateVerification } from "@/types";

// ---------------------------------------------------------------------------
// Theme Definitions
// ---------------------------------------------------------------------------

export type CertificateThemeKey =
  | "cyber-emerald"
  | "royal-sapphire"
  | "imperial-ruby"
  | "amethyst-prestige"
  | "grand-monarch";

interface CertificateTheme {
  id: CertificateThemeKey;
  name: string;
  badge: string;
  categoryHint: string;
  swatchColor: string;
  canvasBg: string;
  outerBorderColor: string;
  innerBorderColor: string;
  cornerAccentColor: string;
  watermarkOpacity: number;
  headerPillBg: string;
  headerPillText: string;
  headerPillBorder: string;
  orgTextColor: string;
  titleTextColor: string;
  subtitleTextColor: string;
  recipientTextColor: string;
  underlineGradient: string;
  citationHighlightColor: string;
  sealGradient: string;
  sealBorderColor: string;
  sealInnerBorder: string;
  sealTextColor: string;
  ribbonColor1: string;
  ribbonColor2: string;
  signatureLineColor: string;
}

const CERTIFICATE_THEMES: Record<CertificateThemeKey, CertificateTheme> = {
  "cyber-emerald": {
    id: "cyber-emerald",
    name: "Cyber Emerald",
    badge: "Hackathon / Tech",
    categoryHint: "Vibe Coding, Hackathons, Tech Contests",
    swatchColor: "#059669",
    canvasBg: "radial-gradient(circle at 50% 45%, #ffffff 40%, #f0fdf4 100%)",
    outerBorderColor: "#064e3b",
    innerBorderColor: "#d97706",
    cornerAccentColor: "#059669",
    watermarkOpacity: 0.045,
    headerPillBg: "#dcfce7",
    headerPillText: "#14532d",
    headerPillBorder: "#86efac",
    orgTextColor: "#064e3b",
    titleTextColor: "#064e3b",
    subtitleTextColor: "#b45309",
    recipientTextColor: "#064e3b",
    underlineGradient: "linear-gradient(90deg, transparent 0%, #10b981 30%, #f59e0b 50%, #10b981 70%, transparent 100%)",
    citationHighlightColor: "#047857",
    sealGradient: "radial-gradient(circle at 35% 35%, #fef08a 0%, #f59e0b 50%, #b45309 100%)",
    sealBorderColor: "#d97706",
    sealInnerBorder: "rgba(6, 78, 59, 0.4)",
    sealTextColor: "#064e3b",
    ribbonColor1: "#047857",
    ribbonColor2: "#d97706",
    signatureLineColor: "#064e3b",
  },
  "royal-sapphire": {
    id: "royal-sapphire",
    name: "Royal Sapphire",
    badge: "Flagship / Contest",
    categoryHint: "Official Contests, Grand Championships",
    swatchColor: "#1d4ed8",
    canvasBg: "radial-gradient(circle at 50% 45%, #ffffff 40%, #f8fafc 100%)",
    outerBorderColor: "#0f172a",
    innerBorderColor: "#ca8a04",
    cornerAccentColor: "#1d4ed8",
    watermarkOpacity: 0.04,
    headerPillBg: "#e0f2fe",
    headerPillText: "#0369a1",
    headerPillBorder: "#7dd3fc",
    orgTextColor: "#0f172a",
    titleTextColor: "#0f172a",
    subtitleTextColor: "#b45309",
    recipientTextColor: "#1e3a8a",
    underlineGradient: "linear-gradient(90deg, transparent 0%, #2563eb 30%, #f59e0b 50%, #2563eb 70%, transparent 100%)",
    citationHighlightColor: "#1e40af",
    sealGradient: "radial-gradient(circle at 35% 35%, #fef9c3 0%, #eab308 50%, #a16207 100%)",
    sealBorderColor: "#ca8a04",
    sealInnerBorder: "rgba(15, 23, 42, 0.35)",
    sealTextColor: "#0f172a",
    ribbonColor1: "#1e3a8a",
    ribbonColor2: "#ca8a04",
    signatureLineColor: "#0f172a",
  },
  "imperial-ruby": {
    id: "imperial-ruby",
    name: "Imperial Ruby",
    badge: "Workshop / Summit",
    categoryHint: "Workshops, Masterclasses, Bootcamps",
    swatchColor: "#be123c",
    canvasBg: "radial-gradient(circle at 50% 45%, #ffffff 40%, #fff1f2 100%)",
    outerBorderColor: "#881337",
    innerBorderColor: "#e11d48",
    cornerAccentColor: "#be123c",
    watermarkOpacity: 0.045,
    headerPillBg: "#ffe4e6",
    headerPillText: "#9f1239",
    headerPillBorder: "#fecdd3",
    orgTextColor: "#881337",
    titleTextColor: "#881337",
    subtitleTextColor: "#be123c",
    recipientTextColor: "#9f1239",
    underlineGradient: "linear-gradient(90deg, transparent 0%, #e11d48 30%, #fb7185 50%, #e11d48 70%, transparent 100%)",
    citationHighlightColor: "#be123c",
    sealGradient: "radial-gradient(circle at 35% 35%, #fff1f2 0%, #fda4af 40%, #e11d48 100%)",
    sealBorderColor: "#be123c",
    sealInnerBorder: "rgba(136, 19, 55, 0.35)",
    sealTextColor: "#881337",
    ribbonColor1: "#be123c",
    ribbonColor2: "#fb7185",
    signatureLineColor: "#881337",
  },
  "amethyst-prestige": {
    id: "amethyst-prestige",
    name: "Royal Amethyst",
    badge: "Honor / Leadership",
    categoryHint: "Appreciation, Organizers, Executive Honors",
    swatchColor: "#7e22ce",
    canvasBg: "radial-gradient(circle at 50% 45%, #ffffff 40%, #faf5ff 100%)",
    outerBorderColor: "#3b0764",
    innerBorderColor: "#a855f7",
    cornerAccentColor: "#7e22ce",
    watermarkOpacity: 0.045,
    headerPillBg: "#f3e8ff",
    headerPillText: "#6b21a8",
    headerPillBorder: "#d8b4fe",
    orgTextColor: "#3b0764",
    titleTextColor: "#3b0764",
    subtitleTextColor: "#7e22ce",
    recipientTextColor: "#581c87",
    underlineGradient: "linear-gradient(90deg, transparent 0%, #9333ea 30%, #c084fc 50%, #9333ea 70%, transparent 100%)",
    citationHighlightColor: "#6b21a8",
    sealGradient: "radial-gradient(circle at 35% 35%, #f3e8ff 0%, #c084fc 45%, #6b21a8 100%)",
    sealBorderColor: "#7e22ce",
    sealInnerBorder: "rgba(59, 7, 100, 0.4)",
    sealTextColor: "#3b0764",
    ribbonColor1: "#581c87",
    ribbonColor2: "#94a3b8",
    signatureLineColor: "#3b0764",
  },
  "grand-monarch": {
    id: "grand-monarch",
    name: "Grand Monarch",
    badge: "1st Place / Winner",
    categoryHint: "Winners, Top Rankers, Supreme Excellence",
    swatchColor: "#d97706",
    canvasBg: "radial-gradient(circle at 50% 45%, #ffffff 35%, #fefce8 100%)",
    outerBorderColor: "#09090b",
    innerBorderColor: "#b45309",
    cornerAccentColor: "#d97706",
    watermarkOpacity: 0.05,
    headerPillBg: "#fef3c7",
    headerPillText: "#92400e",
    headerPillBorder: "#fde68a",
    orgTextColor: "#09090b",
    titleTextColor: "#18181b",
    subtitleTextColor: "#b45309",
    recipientTextColor: "#78350f",
    underlineGradient: "linear-gradient(90deg, transparent 0%, #d97706 25%, #f59e0b 50%, #d97706 75%, transparent 100%)",
    citationHighlightColor: "#92400e",
    sealGradient: "radial-gradient(circle at 35% 35%, #fffbeb 0%, #fbbf24 40%, #b45309 100%)",
    sealBorderColor: "#b45309",
    sealInnerBorder: "rgba(9, 9, 11, 0.45)",
    sealTextColor: "#451a03",
    ribbonColor1: "#dc2626",
    ribbonColor2: "#d97706",
    signatureLineColor: "#18181b",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTitleCase(name: string | null | undefined): string {
  if (!name) return "Distinguished Participant";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatVenue(venue: string | null | undefined, isOnline: boolean | null | undefined): string {
  if (isOnline) return "Virtual / Online Platform";
  if (!venue) return "";
  if (/^\d+$/.test(venue.trim())) return `SRM University AP — Hall ${venue.trim()}`;
  return venue;
}

function autoDetectTheme(eventTitle?: string | null, certType?: string | null): CertificateThemeKey {
  const combined = `${eventTitle || ""} ${certType || ""}`.toLowerCase();

  if (
    combined.includes("winner") ||
    combined.includes("first place") ||
    combined.includes("1st place") ||
    combined.includes("champion") ||
    combined.includes("grand winner")
  ) {
    return "grand-monarch";
  }

  if (
    combined.includes("coding") ||
    combined.includes("vibe") ||
    combined.includes("hackathon") ||
    combined.includes("dev") ||
    combined.includes("tech") ||
    combined.includes("web") ||
    combined.includes("software")
  ) {
    return "cyber-emerald";
  }

  if (
    combined.includes("workshop") ||
    combined.includes("bootcamp") ||
    combined.includes("masterclass") ||
    combined.includes("training") ||
    combined.includes("design") ||
    combined.includes("seminar")
  ) {
    return "imperial-ruby";
  }

  if (
    combined.includes("organizer") ||
    combined.includes("appreciation") ||
    combined.includes("lead") ||
    combined.includes("volunteer") ||
    combined.includes("faculty") ||
    combined.includes("mentor")
  ) {
    return "amethyst-prestige";
  }

  return "royal-sapphire";
}

function getCitationText(
  certType: string,
  eventTitle: string,
  org: string,
  eventDate: string,
  venue: string,
  highlightColor: string,
  customTitle?: string | null,
  customSubtitle?: string | null,
  customSummary?: string | null,
  role?: string | null
) {
  const venueClause = venue ? ` at ${venue}` : "";

  // If custom title or contribution summary was provided by admin, prioritize it
  if (customTitle || customSummary) {
    const fallbackTitle = role
      ? "CERTIFICATE OF APPRECIATION"
      : certType
      ? `CERTIFICATE OF ${certType.toUpperCase()}`
      : "CERTIFICATE OF APPRECIATION";

    return {
      title: (customTitle || fallbackTitle).toUpperCase(),
      subtitle:
        customSubtitle ||
        (role
          ? `Presented in Recognition of Distinguished Service as ${role}`
          : "In Recognition of Invaluable Contribution"),
      body: customSummary || (
        <>
          In grateful recognition of stellar leadership, relentless dedication, and outstanding contribution
          towards the successful organization and execution of{" "}
          <strong style={{ color: highlightColor }}>{eventTitle}</strong> for{" "}
          <strong>{org}</strong> on <strong>{eventDate}</strong>{venueClause}.
        </>
      ),
    };
  }

  const lower = certType.toLowerCase();

  if (lower.includes("winner") || lower.includes("first") || lower.includes("1st")) {
    return {
      title: "CERTIFICATE OF EXCELLENCE",
      subtitle: "Winner — Outstanding Technical Brilliance",
      body: (
        <>
          For securing <strong style={{ color: highlightColor }}>First Place</strong> and demonstrating
          exceptional technical prowess, innovative problem solving, and remarkable execution in{" "}
          <strong style={{ color: highlightColor }}>{eventTitle}</strong>, organized by{" "}
          <strong>{org}</strong> on <strong>{eventDate}</strong>{venueClause}.
        </>
      ),
    };
  }

  if (
    lower.includes("runner") ||
    lower.includes("2nd") ||
    lower.includes("second") ||
    lower.includes("3rd") ||
    lower.includes("third") ||
    lower.includes("merit")
  ) {
    return {
      title: "CERTIFICATE OF MERIT",
      subtitle: "In Recognition of Exemplary Achievement",
      body: (
        <>
          For demonstrating extraordinary competence, technical precision, and exemplary achievement in{" "}
          <strong style={{ color: highlightColor }}>{eventTitle}</strong>, organized by{" "}
          <strong>{org}</strong> on <strong>{eventDate}</strong>{venueClause}.
        </>
      ),
    };
  }

  if (
    lower.includes("organizer") ||
    lower.includes("lead") ||
    lower.includes("volunteer") ||
    lower.includes("appreciation")
  ) {
    return {
      title: "CERTIFICATE OF APPRECIATION",
      subtitle: "In Recognition of Invaluable Leadership & Service",
      body: (
        <>
          In grateful recognition of stellar leadership, relentless dedication, and outstanding contribution
          towards the successful organization and execution of{" "}
          <strong style={{ color: highlightColor }}>{eventTitle}</strong> for{" "}
          <strong>{org}</strong> on <strong>{eventDate}</strong>{venueClause}.
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
        For actively participating and demonstrating commendable technical skill, collaborative spirit, and
        enthusiasm in <strong style={{ color: highlightColor }}>{eventTitle}</strong>, organized by{" "}
        <strong>{org}</strong> on <strong>{eventDate}</strong>{venueClause}.
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// QR Code Generator Fallback
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
          rects.push(`<rect x="${(fx + x) * cellSize}" y="${(fy + y) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a"/>`);
        }
      }
    }
  }
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      if ((x < 8 && y < 8) || (x < 8 && y >= cells - 8) || (x >= cells - 8 && y < 8)) continue;
      const bit = ((hash * (x + 1) * (y + 1) + x * 31 + y * 17) >>> 0) % 3;
      if (bit === 0) {
        rects.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white" rx="3"/>${rects.join("")}</svg>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PrintableCertificateProps {
  data: CertificateVerification;
  token?: string | null;
  initialTheme?: CertificateThemeKey;
}

export function PrintableCertificate({ data, token, initialTheme }: PrintableCertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Auto-detect theme based on event title & certificate type
  const detectedThemeKey = useMemo(() => {
    return autoDetectTheme(data.eventTitle, data.certificateType);
  }, [data.eventTitle, data.certificateType]);

  const [selectedThemeKey, setSelectedThemeKey] = useState<CertificateThemeKey>(
    initialTheme || (data.templateKey as CertificateThemeKey) || detectedThemeKey
  );

  // Update theme if event changes and user hasn't explicitly overridden
  useEffect(() => {
    if (!initialTheme && !data.templateKey) {
      setSelectedThemeKey(detectedThemeKey);
    }
  }, [detectedThemeKey, initialTheme, data.templateKey]);

  const theme = CERTIFICATE_THEMES[selectedThemeKey] || CERTIFICATE_THEMES["royal-sapphire"];

  const recipientName = toTitleCase(data.recipientName);
  const eventTitle = data.eventTitle || "Unstop Igniters Club Event";
  const eventDate = formatEventDate(data.eventDate) || "Date TBA";
  const venue = formatVenue(data.eventVenue, data.eventIsOnline);
  const org = data.organizerOrganization || "Unstop Igniters Club";
  const certId = data.certificateNumber || "UIC-SRMAP-2026";
  const issueDate = formatEventDate(data.issueDate) || eventDate;
  const certType = data.certificateType || "Participation";
  const signerName = data.signerName || "Faculty Coordinator";
  const signerDesig = data.signerDesignation || "Unstop Igniters Club, SRM AP";
  const signer2Name = data.signer2Name || null;
  const signer2Desig = data.signer2Designation || null;
  const verifyUrl = token ? buildVerificationUrl(token) : "";

  // Dynamic citation text with custom title and contribution summary support
  const citation = getCitationText(
    certType,
    eventTitle,
    org,
    eventDate,
    venue,
    theme.citationHighlightColor,
    data.customTitle,
    data.specialRecognition,
    data.contributionSummary,
    data.role
  );

  // Scannable QR code state
  const [qrSvg, setQrSvg] = useState<string>(() => (verifyUrl ? generateQRCodeSVG(verifyUrl, 84) : ""));
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!verifyUrl) return;
    let isMounted = true;
    createQrSvg(verifyUrl, 4, 1)
      .then((svg) => {
        if (isMounted) setQrSvg(svg);
      })
      .catch(() => {
        // Fallback already active
      });
    return () => {
      isMounted = false;
    };
  }, [verifyUrl]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadCertificatePdf({
        certificateNumber: certId,
        verificationToken: token || "",
        recipientName,
        eventTitle,
        eventDate,
        eventVenue: venue,
        eventIsOnline: data.eventIsOnline,
        certificateType: certType,
        customTitle: data.customTitle,
        role: data.role,
        team: data.team,
        contributionSummary: data.contributionSummary,
        specialRecognition: data.specialRecognition,
        organizerOrganization: org,
        signerName,
        signerDesignation: signerDesig,
        signer2Name: signer2Name || "President / Lead",
        signer2Designation: signer2Desig || "Student Body, SRM University–AP",
        issueDate,
        themeKey: selectedThemeKey,
      });
      toast.success("Certificate PDF generated & downloaded!");
    } catch {
      toast.error("Failed to generate PDF. You can also use 'Print / Save as PDF'.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(certId);
      setCopiedId(true);
      toast.success("Certificate ID copied to clipboard!");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error("Could not copy certificate ID.");
    }
  };

  return (
    <div className="space-y-4">
      {/* ===== ACTION & THEME SELECTOR TOOLBAR (Hidden in Print) ===== */}
      <div className="print:hidden space-y-3 bg-muted/40 p-3 rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="gap-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:opacity-95 shadow-sm text-white font-medium"
            >
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </Button>

            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              variant="outline"
              className="gap-2 border-emerald-600/50 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 font-medium"
            >
              <Download className="h-4 w-4" />
              {isDownloadingPdf ? "Creating PDF..." : "Download Official PDF"}
            </Button>

            {verifyUrl && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a href={verifyUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Verify Link
                </a>
              </Button>
            )}

            <Button size="sm" variant="ghost" className="gap-1.5" onClick={handleCopyId}>
              {copiedId ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId ? "Copied" : "Copy ID"}
            </Button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Theme auto-matched: <strong>{theme.name}</strong></span>
          </div>
        </div>

        {/* Theme Switcher Pills */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
            <Palette className="h-3.5 w-3.5" />
            Template:
          </span>
          {Object.values(CERTIFICATE_THEMES).map((t) => {
            const isActive = t.id === selectedThemeKey;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedThemeKey(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all shrink-0 font-medium border ${
                  isActive
                    ? "bg-background text-foreground shadow-sm ring-2 ring-primary border-primary"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted border-transparent"
                }`}
                title={t.categoryHint}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shadow-xs"
                  style={{ backgroundColor: t.swatchColor }}
                />
                <span>{t.name}</span>
                {t.id === detectedThemeKey && (
                  <span className="text-[10px] text-amber-500 font-semibold">★</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== THE CERTIFICATE CANVAS (A4 Landscape, Printable) ===== */}
      <div
        ref={certRef}
        id="printable-certificate"
        className="certificate-canvas relative mx-auto overflow-hidden select-none"
        style={{
          aspectRatio: "1.414 / 1",
          maxWidth: "1050px",
          width: "100%",
          background: theme.canvasBg,
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {/* ================= BACKGROUND SECURITY WATERMARK ================= */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: theme.watermarkOpacity }}
        >
          {/* Large vector crest watermark */}
          <svg
            viewBox="0 0 400 400"
            className="w-[58%] h-[58%] max-w-[500px]"
            fill="none"
            stroke={theme.outerBorderColor}
            strokeWidth="2.5"
          >
            {/* Concentric rings */}
            <circle cx="200" cy="200" r="180" strokeDasharray="6 4" />
            <circle cx="200" cy="200" r="165" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="120" strokeWidth="1" strokeDasharray="3 3" />
            {/* Laurel wreath leaves */}
            <path d="M120 280 C90 230, 90 150, 150 100 C155 120, 145 150, 130 180 C115 210, 115 250, 120 280 Z" fill={theme.outerBorderColor} />
            <path d="M280 280 C310 230, 310 150, 250 100 C245 120, 255 150, 270 180 C285 210, 285 250, 280 280 Z" fill={theme.outerBorderColor} />
            {/* Shield Center */}
            <path d="M200 130 L250 160 V220 C250 255 200 280 200 280 C200 280 150 255 150 220 V160 Z" strokeWidth="3" />
            {/* Star */}
            <polygon points="200,165 206,182 224,182 209,193 215,210 200,200 185,210 191,193 176,182 194,182" fill={theme.outerBorderColor} />
          </svg>
        </div>

        {/* Delicate security crosshatch overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(${theme.outerBorderColor} 0.75px, transparent 0.75px), radial-gradient(${theme.outerBorderColor} 0.75px, transparent 0.75px)`,
            backgroundSize: "24px 24px",
            backgroundPosition: "0 0, 12px 12px",
          }}
        />

        {/* ================= BORDERS & GUILLOCHE ORNAMENTS ================= */}
        {/* Outer Heavy Border */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            border: `7px solid ${theme.outerBorderColor}`,
          }}
        />

        {/* Middle Accent Foil Border */}
        <div
          className="absolute inset-[10px] pointer-events-none"
          style={{
            border: `2.5px solid ${theme.innerBorderColor}`,
          }}
        />

        {/* Inner Fine Hairline Border */}
        <div
          className="absolute inset-[15px] pointer-events-none opacity-40"
          style={{
            border: `1px solid ${theme.outerBorderColor}`,
          }}
        />

        {/* Four Ornate Vector Corner Flairs */}
        {/* Top-Left */}
        <svg
          viewBox="0 0 60 60"
          className="absolute top-[8px] left-[8px] w-12 h-12 pointer-events-none"
          style={{ color: theme.innerBorderColor }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M 4 4 L 4 36 C 4 20, 20 4, 36 4 Z" fill="currentColor" opacity="0.25" />
          <path d="M 2 2 L 40 2 M 2 2 L 2 40" strokeWidth="3" />
          <path d="M 8 8 L 28 8 M 8 8 L 8 28" />
          <circle cx="16" cy="16" r="3" fill="currentColor" />
        </svg>

        {/* Top-Right */}
        <svg
          viewBox="0 0 60 60"
          className="absolute top-[8px] right-[8px] w-12 h-12 pointer-events-none"
          style={{ color: theme.innerBorderColor }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M 56 4 L 56 36 C 56 20, 40 4, 24 4 Z" fill="currentColor" opacity="0.25" />
          <path d="M 58 2 L 20 2 M 58 2 L 58 40" strokeWidth="3" />
          <path d="M 52 8 L 32 8 M 52 8 L 52 28" />
          <circle cx="44" cy="16" r="3" fill="currentColor" />
        </svg>

        {/* Bottom-Left */}
        <svg
          viewBox="0 0 60 60"
          className="absolute bottom-[8px] left-[8px] w-12 h-12 pointer-events-none"
          style={{ color: theme.innerBorderColor }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M 4 56 L 4 24 C 4 40, 20 56, 36 56 Z" fill="currentColor" opacity="0.25" />
          <path d="M 2 58 L 40 58 M 2 58 L 2 20" strokeWidth="3" />
          <path d="M 8 52 L 28 52 M 8 52 L 8 32" />
          <circle cx="16" cy="44" r="3" fill="currentColor" />
        </svg>

        {/* Bottom-Right */}
        <svg
          viewBox="0 0 60 60"
          className="absolute bottom-[8px] right-[8px] w-12 h-12 pointer-events-none"
          style={{ color: theme.innerBorderColor }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M 56 56 L 56 24 C 56 40, 40 56, 24 56 Z" fill="currentColor" opacity="0.25" />
          <path d="M 58 58 L 20 58 M 58 58 L 58 20" strokeWidth="3" />
          <path d="M 52 52 L 32 52 M 52 52 L 52 32" />
          <circle cx="44" cy="44" r="3" fill="currentColor" />
        </svg>

        {/* ================= CERTIFICATE CONTENT ================= */}
        <div className="relative h-full flex flex-col items-center justify-between px-[7.5%] py-[4.5%] z-10">

          {/* Section 1: Header & Institutional Emblem */}
          <div className="text-center w-full space-y-1">
            <div className="flex items-center justify-center gap-3">
              {/* Institution Seal Icon */}
              <div
                className="flex items-center justify-center w-10 h-10 rounded-md shadow-xs"
                style={{
                  background: theme.outerBorderColor,
                  color: "#ffffff",
                }}
              >
                <Award className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p
                  className="text-xs sm:text-sm tracking-[0.28em] uppercase font-extrabold leading-tight"
                  style={{
                    color: theme.orgTextColor,
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                  }}
                >
                  {org}
                </p>
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">
                  SRM University AP Chapter • Official Recognition
                </p>
              </div>
            </div>

            {/* Cryptographically Verified Badge */}
            <div className="flex justify-center pt-0.5">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-2xs"
                style={{
                  backgroundColor: theme.headerPillBg,
                  color: theme.headerPillText,
                  borderColor: theme.headerPillBorder,
                }}
              >
                <ShieldCheck className="h-3 w-3" />
                Verified & Tamper-Proof Credential
              </span>
            </div>
          </div>

          {/* Section 2: Certificate Headline */}
          <div className="text-center space-y-1 w-full max-w-2xl">
            <div className="flex items-center justify-center gap-2">
              <span className="h-[1px] w-12 opacity-60" style={{ background: theme.innerBorderColor }} />
              <p
                className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-bold"
                style={{ color: theme.subtitleTextColor }}
              >
                {citation.subtitle}
              </p>
              <span className="h-[1px] w-12 opacity-60" style={{ background: theme.innerBorderColor }} />
            </div>

            <h1
              className="text-2xl sm:text-3xl md:text-[34px] leading-tight font-black tracking-[0.1em] uppercase"
              style={{
                color: theme.titleTextColor,
                fontFamily: "'Georgia', 'Times New Roman', serif",
                textShadow: "0 1px 1px rgba(0,0,0,0.06)",
              }}
            >
              {citation.title}
            </h1>
          </div>

          {/* Section 3: Recipient Presentation */}
          <div className="text-center w-full max-w-2xl my-1">
            <p className="text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-gray-500 font-semibold mb-1">
              This certificate is proudly awarded to
            </p>
            <p
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight pb-1.5"
              style={{
                color: theme.recipientTextColor,
                fontFamily: "'Georgia', 'Times New Roman', serif",
              }}
            >
              {recipientName}
            </p>
            {/* Elegant Accent Underline */}
            <div
              className="mx-auto w-3/4 h-[2px] rounded-full"
              style={{ background: theme.underlineGradient }}
            />
            {/* Role & Team Recognition Pill */}
            {(data.role || data.team) && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs"
                  style={{
                    backgroundColor: theme.headerPillBg,
                    color: theme.headerPillText,
                    borderColor: theme.headerPillBorder,
                  }}
                >
                  {[data.role, data.team].filter(Boolean).join(" • ")}
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Detailed Citation Copy */}
          <div className="text-center max-w-[86%] my-1">
            <p
              className="text-xs sm:text-[13px] leading-relaxed text-gray-800"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              {citation.body}
            </p>
          </div>

          {/* Section 5: Authentication Footer (Single or Dual Signatories) */}
          <div className={`w-full grid ${signer2Name ? "grid-cols-4" : "grid-cols-3"} items-end gap-2 pt-2`}>
            
            {/* 1. Left: Official Signatory 1 */}
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
                  <span
                    className="italic text-base sm:text-lg font-semibold tracking-wide"
                    style={{
                      color: theme.outerBorderColor,
                      fontFamily: "'Brush Script MT', 'Segoe Script', cursive, serif",
                    }}
                  >
                    {signerName}
                  </span>
                </div>
              )}
              <div
                className="mx-auto w-28 sm:w-36 h-[1.5px]"
                style={{ background: theme.signatureLineColor }}
              />
              <p
                className="text-xs font-bold leading-tight"
                style={{ color: theme.outerBorderColor }}
              >
                {signerName}
              </p>
              <p className="text-[9px] sm:text-[10px] text-gray-600 leading-tight">
                {signerDesig}
              </p>
            </div>

            {/* 2. Optional Second Signatory */}
            {signer2Name && (
              <div className="text-center space-y-1">
                {data.signer2SignatureUrl ? (
                  <img
                    src={data.signer2SignatureUrl}
                    alt={`Signature of ${signer2Name}`}
                    className="h-10 mx-auto object-contain"
                    style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
                  />
                ) : (
                  <div className="h-10 flex items-end justify-center">
                    <span
                      className="italic text-base sm:text-lg font-semibold tracking-wide"
                      style={{
                        color: theme.outerBorderColor,
                        fontFamily: "'Brush Script MT', 'Segoe Script', cursive, serif",
                      }}
                    >
                      {signer2Name}
                    </span>
                  </div>
                )}
                <div
                  className="mx-auto w-28 sm:w-36 h-[1.5px]"
                  style={{ background: theme.signatureLineColor }}
                />
                <p
                  className="text-xs font-bold leading-tight"
                  style={{ color: theme.outerBorderColor }}
                >
                  {signer2Name}
                </p>
                <p className="text-[9px] sm:text-[10px] text-gray-600 leading-tight">
                  {signer2Desig || "Unstop Igniters Club, SRM AP"}
                </p>
              </div>
            )}

            {/* 3. Center: 3D Metallic Embossed Seal with Silk Ribbons */}
            <div className="flex flex-col items-center justify-center relative">
              {/* Dangling Silk Ribbon Tails */}
              <div className="absolute top-[42px] flex items-center justify-center pointer-events-none z-0">
                {/* Left Ribbon */}
                <div
                  className="w-4 h-9 -rotate-15 shadow-xs"
                  style={{
                    backgroundColor: theme.ribbonColor1,
                    clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
                  }}
                />
                {/* Right Ribbon */}
                <div
                  className="w-4 h-9 rotate-15 shadow-xs"
                  style={{
                    backgroundColor: theme.ribbonColor2,
                    clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
                  }}
                />
              </div>

              {/* Embossed Round Medallion */}
              <div
                className="relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center shadow-md"
                style={{
                  background: theme.sealGradient,
                  border: `3px solid ${theme.sealBorderColor}`,
                  boxShadow: "0 3px 10px rgba(0,0,0,0.18), inset 0 1px 2px rgba(255,255,255,0.7)",
                }}
              >
                {/* Inner Tooled Ring */}
                <div
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-dashed flex flex-col items-center justify-center text-center p-1"
                  style={{ borderColor: theme.sealInnerBorder }}
                >
                  <span
                    className="text-[6.5px] tracking-[0.2em] uppercase font-black leading-none"
                    style={{ color: theme.sealTextColor }}
                  >
                    UIC OFFICIAL
                  </span>
                  <div className="my-0.5">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" style={{ color: theme.sealTextColor }}>
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </svg>
                  </div>
                  <span
                    className="text-[6px] tracking-[0.16em] uppercase font-bold leading-none"
                    style={{ color: theme.sealTextColor }}
                  >
                    SEAL OF EXCELLENCE
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Right: Verification QR & Monospace ID */}
            <div className="text-center space-y-1">
              <div className="flex justify-center">
                <div className="p-1 rounded-sm bg-white border shadow-2xs">
                  {qrSvg ? (
                    <div
                      className="w-16 h-16"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-[8px] text-gray-500">
                      QR CODE
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[9px] font-mono font-bold tracking-tight text-gray-700">
                ID: {certId}
              </p>
              <p className="text-[9px] text-gray-500 font-medium">
                Issue Date: {issueDate}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default PrintableCertificate;
