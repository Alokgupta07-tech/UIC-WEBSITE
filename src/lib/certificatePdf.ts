/**
 * Client-Side PDF Generation for UIC SRM AP Certificates
 *
 * Generates ultra-crisp, print-ready A4 landscape (297mm x 210mm) vector PDFs
 * using jsPDF with exact official branding, vector security borders, dual
 * transparent handwriting signatures, scannable QR codes, and two distinct
 * premium designs:
 *   - Design 1: Premium Participant Certificate (Ivory, Emerald Vertical Curved Borders, Gold Accents)
 *   - Design 2: Premium Appreciation Certificate (Deep Emerald Frame, Ivory Panel, Gold Accents)
 *
 * Both designs share one institutional header with the three official logos
 * (Unstop | Unstop Igniters Club | SRM University–AP) and a large, bold serif
 * certificate title so preview, download, email, and bulk outputs stay identical.
 */

import { jsPDF } from "jspdf";
import { buildVerificationUrl } from "@/lib/certificateUrls";
import { DEFAULT_CERTIFICATE_SIGNATORIES, loadCertificateSignatureDataUrl } from "@/lib/certificateSignatories";
import type { CertificateThemeKey } from "@/components/certificates/PrintableCertificate";
import type { CertificateCategory } from "@/types";
import { getCertificateCategoryLabel, getCertificateFamily } from "@/lib/certificateCategories";
import { formatEventDate } from "@/lib/dates";

export interface CertificatePdfData {
  certificateNumber: string;
  verificationToken: string;
  recipientName: string;
  eventTitle: string;
  eventDate?: string | null;
  eventVenue?: string | null;
  eventIsOnline?: boolean | null;
  certificateType?: string | null;
  recipientCategory?: CertificateCategory | null;
  customTitle?: string | null;
  role?: string | null;
  team?: string | null;
  contributionSummary?: string | null;
  skills?: string[] | null;
  specialRecognition?: string | null;
  organizerOrganization?: string | null;
  signerName?: string | null;
  signerDesignation?: string | null;
  signerSignatureUrl?: string | null;
  signer2Name?: string | null;
  signer2Designation?: string | null;
  signer2SignatureUrl?: string | null;
  issueDate?: string | null;
  themeKey?: CertificateThemeKey | string | null;
}

// ============================================================================
// SHARED DESIGN TOKENS
// ============================================================================
type Rgb = readonly [number, number, number];

const COLOR = {
  ivory: [252, 253, 251] as Rgb,
  cardIvory: [253, 253, 250] as Rgb,
  emerald: [6, 78, 59] as Rgb,
  emeraldFrame: [5, 56, 42] as Rgb,
  emeraldTeal: [15, 118, 110] as Rgb,
  gold: [205, 162, 67] as Rgb,
  goldRich: [205, 158, 55] as Rgb,
  goldSoft: [218, 178, 88] as Rgb,
  goldPale: [222, 184, 88] as Rgb,
  navy: [15, 32, 67] as Rgb,
  ink: [30, 41, 59] as Rgb,
  charcoal: [15, 23, 42] as Rgb,
  slate: [100, 116, 139] as Rgb,
  slateSoft: [71, 85, 105] as Rgb,
  line: [148, 163, 184] as Rgb,
  white: [255, 255, 255] as Rgb,
  nameGold: [184, 134, 38] as Rgb,
  blackGreen: [12, 42, 32] as Rgb,
} as const;

const fill = (doc: jsPDF, [r, g, b]: Rgb) => doc.setFillColor(r, g, b);
const stroke = (doc: jsPDF, [r, g, b]: Rgb) => doc.setDrawColor(r, g, b);
const ink = (doc: jsPDF, [r, g, b]: Rgb) => doc.setTextColor(r, g, b);
/** Line step in mm for a given font size (pt) and lineHeightFactor. */
const lineStep = (sizePt: number, factor: number) => sizePt * 0.352778 * factor;

// ============================================================================
// OFFICIAL THREE-LOGO ASSETS (Unstop | UIC SRM-AP | SRM University–AP)
// ============================================================================
interface CertificateLogoAsset {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

type CertificateLogoSet = {
  unstop: CertificateLogoAsset | null;
  uic: CertificateLogoAsset | null;
  srmAp: CertificateLogoAsset | null;
};

const CERTIFICATE_LOGO_FILES: Record<keyof CertificateLogoSet, string> = {
  unstop: "unstop-logo.png",
  uic: "uic-logo.png",
  srmAp: "srm-ap-logo.png",
};

/** Read pixel dimensions straight from the PNG IHDR header (no DOM needed). */
function readPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function bytesToDataUrl(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : resolve(""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(new Blob([bytes], { type: "image/png" }));
  });
}

async function loadCertificateLogoAsset(filename: string): Promise<CertificateLogoAsset | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}assets/certificates/logos/${filename}`);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const size = readPngSize(bytes);
    const dataUrl = await bytesToDataUrl(bytes);
    if (!dataUrl || !size) return null;
    return { dataUrl, widthPx: size.width, heightPx: size.height };
  } catch {
    return null;
  }
}

async function loadCertificateLogoAssets(): Promise<CertificateLogoSet> {
  const [unstop, uic, srmAp] = await Promise.all([
    loadCertificateLogoAsset(CERTIFICATE_LOGO_FILES.unstop),
    loadCertificateLogoAsset(CERTIFICATE_LOGO_FILES.uic),
    loadCertificateLogoAsset(CERTIFICATE_LOGO_FILES.srmAp),
  ]);
  return { unstop, uic, srmAp };
}

interface LogoHeaderLayout {
  centerY: number;
  /** Left edge for the Unstop logo. */
  leftX: number;
  /** Right edge for the SRM University–AP logo. */
  rightX: number;
  /** Horizontal center for the UIC logo. */
  centerX: number;
  /** Consistent maximum logo height (mm). */
  maxHeight: number;
}

/**
 * Draw the official three-logo institutional header:
 * Unstop (left) · UIC SRM-AP (centre) · SRM University–AP (right).
 * Aspect ratios are preserved from the source PNG; every logo shares the
 * same maximum height and a common vertical center axis.
 */
function drawCertificateLogoHeader(doc: jsPDF, logos: CertificateLogoSet, layout: LogoHeaderLayout): void {
  const drawLogo = (asset: CertificateLogoAsset | null, mode: "left" | "center" | "right") => {
    if (!asset) return;
    const height = layout.maxHeight;
    const width = (asset.widthPx / asset.heightPx) * height;
    let x: number;
    if (mode === "left") x = layout.leftX;
    else if (mode === "right") x = layout.rightX - width;
    else x = layout.centerX - width / 2;
    const y = layout.centerY - height / 2;
    try {
      doc.addImage(asset.dataUrl, "PNG", x, y, width, height);
    } catch {
      // Never block issuance on a logo render problem.
    }
  };

  drawLogo(logos.unstop, "left");
  drawLogo(logos.uic, "center");
  drawLogo(logos.srmAp, "right");
}

// ============================================================================
// SHARED TYPOGRAPHY HELPERS
// ============================================================================
function textWidthWithCharSpace(doc: jsPDF, text: string, charSpace: number): number {
  return doc.getTextWidth(text) + Math.max(0, text.length - 1) * charSpace;
}

function drawCenteredSpacedText(
  doc: jsPDF,
  text: string,
  centerX: number,
  baselineY: number,
  charSpace = 0
): void {
  const width = textWidthWithCharSpace(doc, text, charSpace);
  doc.text(text, centerX - width / 2, baselineY, { align: "left", charSpace });
}

interface TitleBlockOptions {
  centerX: number;
  qualifier: string;
  mainBaseline: number;
  qualifierBaseline: number;
  ruleY: number;
  mainSize: number;
  qualifierSize: number;
  mainColor: Rgb;
  qualifierColor: Rgb;
  ruleColor: Rgb;
  mainCharSpace?: number;
  qualifierCharSpace?: number;
}

/**
 * Large premium certificate title: a big uppercase serif line ("CERTIFICATE")
 * above a letterspaced qualifier ("OF PARTICIPATION" / "OF APPRECIATION")
 * flanked by thin gold rules.
 */
function drawCertificateTitle(doc: jsPDF, o: TitleBlockOptions): void {
  const mainCharSpace = o.mainCharSpace ?? 1;
  const qualifierCharSpace = o.qualifierCharSpace ?? 2.6;

  doc.setFont("times", "bold");
  doc.setFontSize(o.mainSize);
  ink(doc, o.mainColor);
  drawCenteredSpacedText(doc, "CERTIFICATE", o.centerX, o.mainBaseline, mainCharSpace);

  doc.setFont("UICSans", "bold");
  doc.setFontSize(o.qualifierSize);
  ink(doc, o.qualifierColor);
  drawCenteredSpacedText(doc, o.qualifier, o.centerX, o.qualifierBaseline, qualifierCharSpace);

  // Thin gold rules flanking the qualifier, with a small diamond terminal.
  const qualifierWidth = textWidthWithCharSpace(doc, o.qualifier, qualifierCharSpace);
  const gap = 5;
  const ruleLength = 18;
  stroke(doc, o.ruleColor);
  doc.setLineWidth(0.35);
  doc.line(o.centerX - qualifierWidth / 2 - gap - ruleLength, o.ruleY, o.centerX - qualifierWidth / 2 - gap, o.ruleY);
  doc.line(o.centerX + qualifierWidth / 2 + gap, o.ruleY, o.centerX + qualifierWidth / 2 + gap + ruleLength, o.ruleY);
  fill(doc, o.ruleColor);
  doc.circle(o.centerX - qualifierWidth / 2 - gap + 1.2, o.ruleY, 0.65, "F");
  doc.circle(o.centerX + qualifierWidth / 2 + gap - 1.2, o.ruleY, 0.65, "F");
}

/** Derive the uppercase qualifier ("OF …") from custom titles when provided. */
function resolveTitleQualifier(
  data: CertificatePdfData,
  fallback: string
): string {
  const custom = data.customTitle?.trim();
  if (!custom) return fallback;
  const cleaned = custom.toUpperCase().replace(/^CERTIFICATE\s+/, "").trim();
  if (!cleaned) return fallback;
  return cleaned.startsWith("OF ") ? cleaned : cleaned;
}

/**
 * Generate a high resolution QR Code data URL using qrcode-generator
 */
async function generateQrDataUrl(text: string): Promise<string> {
  try {
    const qrcodeModule = await import("qrcode-generator");
    const qrFactory = (qrcodeModule.default ?? qrcodeModule) as unknown as (
      typeNumber: TypeNumber,
      errorCorrectionLevel: ErrorCorrectionLevel
    ) => QRCode;
    const qr = qrFactory(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createDataURL(4, 0);
  } catch {
    return "";
  }
}

async function registerCertificateFonts(doc: jsPDF): Promise<void> {
  const fontFiles = [
    ["LiberationSans-Regular.ttf", "normal", "UICSans"],
    ["LiberationSans-Bold.ttf", "bold", "UICSans"],
    ["LiberationSans-Italic.ttf", "italic", "UICSans"],
    ["LiberationSans-BoldItalic.ttf", "bolditalic", "UICSans"],
    ["GreatVibes-Regular.ttf", "normal", "GreatVibes"],
  ] as const;

  for (const [filename, style, family] of fontFiles) {
    const response = await fetch(`${import.meta.env.BASE_URL}assets/certificates/fonts/${filename}`);
    if (!response.ok) throw new Error(`Certificate font ${filename} could not be loaded.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x4000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x4000));
    }
    const vfsName = `UIC-${filename}`;
    doc.addFileToVFS(vfsName, btoa(binary));
    doc.addFont(vfsName, family, style);
  }
}

interface SignatoryRenderInfo {
  name: string;
  designation: string;
  dataUrl: string;
  /** Native width/height ratio of the signature PNG (preserved when drawing). */
  aspect: number;
}

/** Decode the native aspect ratio of a base64 PNG data URL from its IHDR header. */
function pngAspectFromDataUrl(dataUrl: string): number | null {
  try {
    const base64Index = dataUrl.indexOf(";base64,");
    if (base64Index < 0) return null;
    // 64 base64 chars decode to 48 bytes — enough for the 24-byte PNG header.
    const binary = atob(dataUrl.slice(base64Index + 8, base64Index + 8 + 64));
    const bytes = new Uint8Array(24);
    for (let i = 0; i < 24; i++) bytes[i] = binary.charCodeAt(i);
    const size = readPngSize(bytes);
    return size ? size.width / size.height : null;
  } catch {
    return null;
  }
}

/** Draw a signature image centred above its line without stretching or distortion. */
function drawSignatureImage(
  doc: jsPDF,
  signatory: SignatoryRenderInfo,
  centerX: number,
  lineY: number,
  maxWidth: number,
  maxHeight: number
): void {
  if (!signatory.dataUrl) return;
  const aspect = signatory.aspect > 0 ? signatory.aspect : 4;
  const height = Math.min(maxHeight, maxWidth / aspect);
  const width = height * aspect;
  try {
    doc.addImage(signatory.dataUrl, "PNG", centerX - width / 2, lineY - 2.5 - height, width, height);
  } catch {
    // Fallback
  }
}

// ============================================================================
// TEMPLATE 1: PARTICIPANT CERTIFICATE (DESIGN 1)
// ============================================================================
function renderParticipantCertificate(
  doc: jsPDF,
  data: CertificatePdfData,
  signatories: [SignatoryRenderInfo, SignatoryRenderInfo],
  verifyUrl: string,
  qrDataUrl: string,
  logos: CertificateLogoSet
): void {
  const width = 297;
  const height = 210;
  const isWinner = data.recipientCategory === "winner";
  const isAppreciationTitle =
    (data.customTitle && data.customTitle.toUpperCase().includes("APPRECIATION")) ||
    (data.certificateType && data.certificateType.toUpperCase().includes("APPRECIATION"));

  // 1. Background: Warm Ivory Paper
  fill(doc, COLOR.ivory);
  doc.rect(0, 0, width, height, "F");

  // 2. Horizontal Gold Accent Hairlines (Top & Bottom)
  stroke(doc, COLOR.gold);
  doc.setLineWidth(0.35);
  doc.line(28, 10, 269, 10);
  doc.setLineWidth(0.18);
  doc.line(28, 11.5, 269, 11.5);

  doc.setLineWidth(0.18);
  doc.line(30, 198.5, 267, 198.5);
  doc.setLineWidth(0.35);
  doc.line(30, 200, 267, 200);

  // 3. Left Vertical Curved Border (Emerald Wave & Gold Ribbon)
  fill(doc, COLOR.emerald);
  doc.moveTo(0, 0);
  doc.lineTo(24, 0);
  doc.curveTo(12, 65, 15, 145, 25, 210);
  doc.lineTo(0, 210);
  doc.fill();

  fill(doc, COLOR.gold);
  doc.moveTo(24, 0);
  doc.curveTo(12, 65, 15, 145, 25, 210);
  doc.lineTo(26.5, 210);
  doc.curveTo(16.5, 145, 13.5, 65, 25.5, 0);
  doc.fill();

  stroke(doc, COLOR.emeraldTeal);
  doc.setLineWidth(0.3);
  doc.moveTo(27, 0);
  doc.curveTo(15, 65, 18, 145, 28.5, 210);
  doc.stroke();

  // Delicate wave filigree in bottom-left corner
  stroke(doc, COLOR.goldSoft);
  doc.setLineWidth(0.15);
  for (let i = 0; i < 9; i++) {
    const offset = i * 2.8;
    doc.moveTo(8 + offset * 0.4, 210);
    doc.curveTo(22 + offset, 195 - offset * 0.6, 30 + offset * 1.2, 175 - offset, 42 + offset * 0.5, 160 + offset * 0.8);
    doc.stroke();
  }

  // 4. Right Vertical Curved Border (Mirrored Emerald Wave & Gold Ribbon)
  fill(doc, COLOR.emerald);
  doc.moveTo(width, 0);
  doc.lineTo(width - 24, 0);
  doc.curveTo(width - 12, 65, width - 15, 145, width - 25, 210);
  doc.lineTo(width, 210);
  doc.fill();

  fill(doc, COLOR.gold);
  doc.moveTo(width - 24, 0);
  doc.curveTo(width - 12, 65, width - 15, 145, width - 25, 210);
  doc.lineTo(width - 26.5, 210);
  doc.curveTo(width - 16.5, 145, width - 13.5, 65, width - 25.5, 0);
  doc.fill();

  stroke(doc, COLOR.emeraldTeal);
  doc.setLineWidth(0.3);
  doc.moveTo(width - 27, 0);
  doc.curveTo(width - 15, 65, width - 18, 145, width - 28.5, 210);
  doc.stroke();

  // Delicate wave filigree in top-right corner
  stroke(doc, COLOR.goldSoft);
  doc.setLineWidth(0.15);
  for (let i = 0; i < 9; i++) {
    const offset = i * 2.8;
    doc.moveTo(width - 8 - offset * 0.4, 0);
    doc.curveTo(width - 22 - offset, 15 + offset * 0.6, width - 30 - offset * 1.2, 35 + offset, width - 42 - offset * 0.5, 50 - offset * 0.8);
    doc.stroke();
  }

  // 5. Official Three-Logo Institutional Header (Unstop | UIC | SRM University–AP)
  drawCertificateLogoHeader(doc, logos, {
    centerY: 21,
    leftX: 40,
    rightX: 257,
    centerX: width / 2,
    maxHeight: 16,
  });

  // 6. Large Premium Certificate Title
  const qualifier = isWinner && !isAppreciationTitle
    ? "OF ACHIEVEMENT"
    : resolveTitleQualifier(data, isAppreciationTitle ? "OF APPRECIATION" : "OF PARTICIPATION");
  drawCertificateTitle(doc, {
    centerX: width / 2,
    qualifier,
    mainBaseline: 48,
    qualifierBaseline: 57,
    ruleY: 57,
    mainSize: 34,
    qualifierSize: 12,
    mainColor: COLOR.navy,
    qualifierColor: COLOR.emerald,
    ruleColor: COLOR.gold,
  });

  // 7. Classification Badge (PARTICIPANT / WINNER / SPECIAL RECOGNITION)
  const categoryLabel = (
    data.specialRecognition ||
    (isAppreciationTitle && !isWinner ? "SPECIAL RECOGNITION" : getCertificateCategoryLabel(data.recipientCategory)) ||
    (isWinner ? "WINNER" : "PARTICIPANT")
  ).toUpperCase();
  const badgeWidth = Math.max(36, doc.getTextWidth(categoryLabel) + 12);
  fill(doc, [242, 248, 244]);
  stroke(doc, COLOR.emerald);
  doc.setLineWidth(0.35);
  doc.roundedRect(width / 2 - badgeWidth / 2, 62, badgeWidth, 5.5, 1.5, 1.5, "FD");
  doc.setFont("UICSans", "bold");
  doc.setFontSize(6.5);
  ink(doc, COLOR.emerald);
  doc.text(categoryLabel, width / 2, 66, { align: "center" });

  // 8. Recipient Introduction
  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  ink(doc, COLOR.slateSoft);
  doc.text("This certificate is proudly presented to", width / 2, 75.5, { align: "center" });

  // 9. Recipient Name in Warm Amber Gold (large, prominent)
  doc.setFont("times", "bolditalic");
  let recipientFontSize = 26;
  doc.setFontSize(recipientFontSize);
  const recipientName = data.recipientName || "Recipient Name";
  let recipientLines = doc.splitTextToSize(recipientName, 200);
  while (recipientFontSize > 17 && recipientLines.length > 1) {
    recipientFontSize -= 1;
    doc.setFontSize(recipientFontSize);
    recipientLines = doc.splitTextToSize(recipientName, 200);
  }
  if (recipientLines.length > 2) throw new Error("The recipient name is too long for the certificate layout.");
  ink(doc, COLOR.nameGold);
  const recipientNameY = 89;
  doc.text(recipientLines, width / 2, recipientNameY, { align: "center", lineHeightFactor: 1.15 });

  // Decorative gold underline beneath the final name line
  const underlineY = recipientNameY + (recipientLines.length - 1) * lineStep(recipientFontSize, 1.15) + 4;
  const nameUnderlineWidth = Math.min(100, Math.max(60, doc.getTextWidth(recipientLines[recipientLines.length - 1]) * 0.7));
  stroke(doc, COLOR.gold);
  doc.setLineWidth(0.4);
  doc.line(width / 2 - nameUnderlineWidth / 2, underlineY, width / 2 + nameUnderlineWidth / 2, underlineY);
  fill(doc, COLOR.gold);
  doc.circle(width / 2, underlineY, 0.75, "FD");

  // Optional Role / Team
  let currentY = underlineY + 7;
  if (data.role) {
    doc.setFont("UICSans", "bold");
    doc.setFontSize(9);
    ink(doc, COLOR.emerald);
    const roleText = [data.role, data.team ? `• ${data.team}` : ""].filter(Boolean).join(" ");
    const roleLines = doc.splitTextToSize(roleText, 200);
    doc.text(roleLines, width / 2, currentY, { align: "center", lineHeightFactor: 1.2 });
    currentY += roleLines.length * lineStep(9, 1.2) + 3;
  }

  // 10. Event Participation Description Paragraph
  doc.setFont("UICSans", "normal");
  const formattedEventDate = formatEventDate(data.eventDate) || data.eventDate;
  const organizerOrg = data.organizerOrganization || "Unstop Igniters Club, SRM University–AP";
  const defaultDesc = isWinner
    ? `This certificate is awarded in recognition of outstanding performance and achievement in ${data.eventTitle}, organized by ${organizerOrg}${formattedEventDate ? ` on ${formattedEventDate}` : ""}.`
    : isAppreciationTitle
    ? `This certificate is awarded in sincere appreciation of exceptional performance, initiative, and dedication in ${data.eventTitle}, organized by ${organizerOrg}${formattedEventDate ? ` on ${formattedEventDate}` : ""}.`
    : `This certificate is awarded in recognition of participation in ${data.eventTitle}, organized by ${organizerOrg}${formattedEventDate ? ` on ${formattedEventDate}` : ""}.`;
  const descText = data.contributionSummary || defaultDesc;

  const maxDescLines = recipientLines.length > 1 ? 4 : 5;
  let descFontSize = 9.5;
  doc.setFontSize(descFontSize);
  let descLines = doc.splitTextToSize(descText, 190);
  while (descLines.length > maxDescLines && descFontSize > 8) {
    descFontSize -= 0.5;
    doc.setFontSize(descFontSize);
    descLines = doc.splitTextToSize(descText, 190);
  }
  if (descLines.length > maxDescLines + 1) throw new Error("The certificate statement is too long for the A4 layout. Shorten it before issuing.");
  ink(doc, COLOR.ink);
  doc.text(descLines, width / 2, currentY, { align: "center", lineHeightFactor: 1.35 });
  currentY += descLines.length * lineStep(descFontSize, 1.35) + 3;

  // Metadata Line (Event, Date, Venue)
  doc.setFont("UICSans", "normal");
  doc.setFontSize(8);
  ink(doc, COLOR.slate);
  const metaParts = [
    `Event: ${data.eventTitle}`,
    formattedEventDate ? `Date: ${formattedEventDate}` : null,
    data.eventVenue ? `Venue: ${data.eventVenue}` : (data.eventIsOnline ? "Online" : null),
  ].filter(Boolean).join("  |  ");
  const metaLines = doc.splitTextToSize(metaParts, 225);
  doc.text(metaLines, width / 2, currentY + 1.5, { align: "center", lineHeightFactor: 1.25 });
  const metadataBottom = currentY + 1.5 + (metaLines.length - 1) * lineStep(8, 1.25) + 1.5;

  // 11. Central Award Medallion (between the two signatures; adapts to text height)
  const medalY = Math.min(155, Math.max(150, metadataBottom + 4));
  const medalX = width / 2;

  // Gold ribbon tails with V-notches
  fill(doc, COLOR.gold);
  doc.moveTo(medalX - 6, medalY + 6);
  doc.lineTo(medalX - 10, medalY + 22);
  doc.lineTo(medalX - 6, medalY + 19);
  doc.lineTo(medalX - 2, medalY + 22);
  doc.lineTo(medalX - 2, medalY + 6);
  doc.fill();

  doc.moveTo(medalX + 6, medalY + 6);
  doc.lineTo(medalX + 10, medalY + 22);
  doc.lineTo(medalX + 6, medalY + 19);
  doc.lineTo(medalX + 2, medalY + 22);
  doc.lineTo(medalX + 2, medalY + 6);
  doc.fill();

  // Medal outer disc
  fill(doc, COLOR.gold);
  doc.circle(medalX, medalY, 11, "F");
  // Emerald inner disc
  fill(doc, COLOR.emerald);
  doc.circle(medalX, medalY, 9.2, "F");
  // Gold inner hairline
  stroke(doc, COLOR.gold);
  doc.setLineWidth(0.4);
  doc.circle(medalX, medalY, 8, "S");

  // Medal typography
  doc.setFont("UICSans", "bold");
  doc.setFontSize(4.5);
  ink(doc, COLOR.white);
  doc.text("UIC SRM AP", medalX, medalY - 2.5, { align: "center" });
  doc.setFontSize(6.5);
  doc.text("VERIFIED", medalX, medalY + 0.8, { align: "center" });
  doc.setFontSize(4);
  doc.text("EXCELLENCE", medalX, medalY + 3.8, { align: "center" });

  // 12. Signatures (Left: Faculty Coordinator, Right: President)
  const sigY = 169;
  const sig1X = 74;
  const sig2X = width - 74;

  // Signatory 1 (Faculty Coordinator)
  drawSignatureImage(doc, signatories[0], sig1X, sigY, 48, 11);
  stroke(doc, COLOR.line);
  doc.setLineWidth(0.35);
  doc.line(sig1X - 27, sigY, sig1X + 27, sigY);
  doc.setFont("UICSans", "bold");
  doc.setFontSize(8.5);
  ink(doc, COLOR.navy);
  doc.text(signatories[0].name, sig1X, sigY + 4.5, { align: "center" });
  doc.setFont("UICSans", "normal");
  doc.setFontSize(7);
  ink(doc, COLOR.slate);
  doc.text(doc.splitTextToSize(signatories[0].designation, 62), sig1X, sigY + 8.5, { align: "center", lineHeightFactor: 1.15 });

  // Signatory 2 (President)
  drawSignatureImage(doc, signatories[1], sig2X, sigY, 48, 11);
  stroke(doc, COLOR.line);
  doc.setLineWidth(0.35);
  doc.line(sig2X - 27, sigY, sig2X + 27, sigY);
  doc.setFont("UICSans", "bold");
  doc.setFontSize(8.5);
  ink(doc, COLOR.navy);
  doc.text(signatories[1].name, sig2X, sigY + 4.5, { align: "center" });
  doc.setFont("UICSans", "normal");
  doc.setFontSize(7);
  ink(doc, COLOR.slate);
  doc.text(doc.splitTextToSize(signatories[1].designation, 62), sig2X, sigY + 8.5, { align: "center", lineHeightFactor: 1.15 });

  // 13. Security & Scannable QR Code Footer
  const qrX = 33;
  const qrY = height - 28;
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, 15, 15);
    } catch {
      stroke(doc, COLOR.gold);
      doc.rect(qrX, qrY, 15, 15);
    }
  } else {
    stroke(doc, COLOR.gold);
    doc.rect(qrX, qrY, 15, 15);
  }

  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  ink(doc, COLOR.slate);
  doc.text("Scan with camera to verify authenticity", qrX + 18, qrY + 4.5);
  doc.setFont("UICSans", "bold");
  ink(doc, COLOR.navy);
  doc.text(`Certificate No: ${data.certificateNumber}`, qrX + 18, qrY + 8.5);
  doc.setFont("UICSans", "normal");
  ink(doc, COLOR.line);
  doc.text(`Verify URL: ${verifyUrl}`, qrX + 18, qrY + 12.5);

  const stampX = width - 33;
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  ink(doc, COLOR.slate);
  doc.text(`Issued: ${formatEventDate(data.issueDate) || data.issueDate || formatEventDate(new Date().toISOString())}`, stampX, qrY + 5.5, { align: "right" });
  doc.text("Tamper-Evident Digital Credential", stampX, qrY + 9.5, { align: "right" });
  doc.text("SRM University–AP Official Record", stampX, qrY + 13.5, { align: "right" });
}

// ============================================================================
// TEMPLATE 2: ORGANIZER / APPRECIATION CERTIFICATE (DESIGN 2)
// ============================================================================
function renderOrganizerCertificate(
  doc: jsPDF,
  data: CertificatePdfData,
  signatories: [SignatoryRenderInfo, SignatoryRenderInfo],
  verifyUrl: string,
  qrDataUrl: string,
  logos: CertificateLogoSet
): void {
  const width = 297;
  const height = 210;

  // 1. Outer Canvas: Deep Rich Emerald Green
  fill(doc, COLOR.emeraldFrame);
  doc.rect(0, 0, width, height, "F");

  // 2. Gold keyline on the outer frame with small corner accents
  stroke(doc, COLOR.goldRich);
  doc.setLineWidth(0.3);
  doc.rect(4.5, 4.5, width - 9, height - 9);
  doc.setLineWidth(0.5);
  const cornerAccent = (cx: number, cy: number, dx: number, dy: number) => {
    for (let i = 0; i < 3; i++) {
      const offset = 2.2 + i * 2.2;
      doc.line(cx + dx * offset, cy, cx, cy + dy * offset);
    }
  };
  cornerAccent(4.5, 4.5, 1, 1);
  cornerAccent(width - 4.5, 4.5, -1, 1);
  cornerAccent(4.5, height - 4.5, 1, -1);
  cornerAccent(width - 4.5, height - 4.5, -1, -1);

  // 3. Inner Ivory Card with Notched Corners
  const cardX = 12;
  const cardY = 12;
  const cardW = width - 24;
  const cardH = height - 24;
  const notch = 6;

  fill(doc, COLOR.cardIvory);
  doc.moveTo(cardX + notch, cardY);
  doc.lineTo(cardX + cardW - notch, cardY);
  doc.lineTo(cardX + cardW, cardY + notch);
  doc.lineTo(cardX + cardW, cardY + cardH - notch);
  doc.lineTo(cardX + cardW - notch, cardY + cardH);
  doc.lineTo(cardX + notch, cardY + cardH);
  doc.lineTo(cardX, cardY + cardH - notch);
  doc.lineTo(cardX, cardY + notch);
  doc.fill();

  // 4. Subtle Repeated Scallop Watermark Pattern (Seigaiha Motif)
  doc.setDrawColor(235, 240, 236);
  doc.setLineWidth(0.15);
  for (let row = 0; row < 12; row++) {
    const cy = cardY + 15 + row * 14;
    const offset = (row % 2) * 10;
    for (let cx = cardX + 10 + offset; cx < cardX + cardW - 10; cx += 20) {
      // Exclude main text area to maintain clean legibility
      if (cx > 55 && cx < 242 && cy > 34 && cy < 134) continue;
      doc.circle(cx, cy, 6, "S");
      doc.circle(cx, cy, 9, "S");
    }
  }

  // 5. Inner Card Dual Gold Border
  stroke(doc, COLOR.goldRich);
  doc.setLineWidth(0.8);
  doc.moveTo(cardX + notch, cardY);
  doc.lineTo(cardX + cardW - notch, cardY);
  doc.lineTo(cardX + cardW, cardY + notch);
  doc.lineTo(cardX + cardW, cardY + cardH - notch);
  doc.lineTo(cardX + cardW - notch, cardY + cardH);
  doc.lineTo(cardX + notch, cardY + cardH);
  doc.lineTo(cardX, cardY + cardH - notch);
  doc.lineTo(cardX, cardY + notch);
  doc.lineTo(cardX + notch, cardY);
  doc.stroke();

  // Inner gold hairline border offset by 2.2mm
  const inNotch = 4.5;
  const inX = cardX + 2.2;
  const inY = cardY + 2.2;
  const inW = cardW - 4.4;
  const inH = cardH - 4.4;
  doc.setLineWidth(0.3);
  stroke(doc, COLOR.goldPale);
  doc.moveTo(inX + inNotch, inY);
  doc.lineTo(inX + inW - inNotch, inY);
  doc.lineTo(inX + inW, inY + inNotch);
  doc.lineTo(inX + inW, inY + inH - inNotch);
  doc.lineTo(inX + inW - inNotch, inY + inH);
  doc.lineTo(inX + inNotch, inY + inH);
  doc.lineTo(inX, inY + inH - inNotch);
  doc.lineTo(inX, inY + inNotch);
  doc.lineTo(inX + inNotch, inY);
  doc.stroke();

  // 6. Official Three-Logo Institutional Header (Unstop | UIC | SRM University–AP)
  drawCertificateLogoHeader(doc, logos, {
    centerY: 25,
    leftX: 27,
    rightX: 270,
    centerX: width / 2,
    maxHeight: 16,
  });

  // 7. Large Premium Certificate Title
  const qualifier = resolveTitleQualifier(data, "OF APPRECIATION");
  drawCertificateTitle(doc, {
    centerX: width / 2,
    qualifier,
    mainBaseline: 51.5,
    qualifierBaseline: 60.5,
    ruleY: 60.5,
    mainSize: 32,
    qualifierSize: 11.5,
    mainColor: COLOR.blackGreen,
    qualifierColor: COLOR.emerald,
    ruleColor: COLOR.goldRich,
    mainCharSpace: 0.9,
    qualifierCharSpace: 2.4,
  });

  // 8. Classification Badge (ORGANIZER / VOLUNTEER / SPECIAL RECOGNITION …)
  const isOrganizerCategory = data.recipientCategory === "organizer";
  const isParticipantCategory = data.recipientCategory === "participant" || data.recipientCategory === "winner";
  const isParticipantAppreciation = isParticipantCategory && (
    (data.customTitle && data.customTitle.toUpperCase().includes("APPRECIATION")) ||
    (data.certificateType && data.certificateType.toUpperCase().includes("APPRECIATION")) ||
    data.themeKey === "organizer-forest" ||
    data.themeKey === "organizer-prestige"
  );
  const categoryLabel = (
    data.specialRecognition ||
    (isParticipantAppreciation ? "SPECIAL RECOGNITION" : getCertificateCategoryLabel(data.recipientCategory)) ||
    (isOrganizerCategory ? "ORGANIZER" : "RECOGNITION")
  ).toUpperCase();

  const orgBadgeWidth = Math.max(26, doc.getTextWidth(categoryLabel) + 10);
  fill(doc, COLOR.emerald);
  doc.roundedRect(width / 2 - orgBadgeWidth / 2, 64, orgBadgeWidth, 5.5, 1.2, 1.2, "F");
  doc.setFont("UICSans", "bold");
  doc.setFontSize(6.5);
  ink(doc, COLOR.white);
  doc.text(categoryLabel, width / 2, 68.1, { align: "center" });

  // 9. Recipient Introduction
  doc.setFont("UICSans", "bold");
  doc.setFontSize(7.5);
  ink(doc, COLOR.slate);
  drawCenteredSpacedText(doc, "PROUDLY PRESENTED TO", width / 2, 77, 1.1);

  // 10. Recipient Name in elegant script calligraphy
  doc.setFont("GreatVibes", "normal");
  let recipientFontSize = 30;
  doc.setFontSize(recipientFontSize);
  const recipientName = data.recipientName || "Recipient Name";
  let recipientLines = doc.splitTextToSize(recipientName, 190);
  while (recipientFontSize > 20 && recipientLines.length > 1) {
    recipientFontSize -= 1;
    doc.setFontSize(recipientFontSize);
    recipientLines = doc.splitTextToSize(recipientName, 190);
  }
  if (recipientLines.length > 2) throw new Error("The recipient name is too long for the certificate layout.");
  ink(doc, COLOR.charcoal);
  const nameBaseline = 91;
  const nameLineStep = lineStep(recipientFontSize, 1.5);
  doc.text(recipientLines, width / 2, nameBaseline, { align: "center", lineHeightFactor: 1.5 });

  // Gold underline with diamond terminals beneath the name
  const underlineY = nameBaseline + (recipientLines.length - 1) * nameLineStep + 8;
  const nameUnderlineWidth = Math.min(110, Math.max(70, doc.getTextWidth(recipientLines[recipientLines.length - 1]) * 0.8));
  stroke(doc, COLOR.goldRich);
  doc.setLineWidth(0.4);
  doc.line(width / 2 - nameUnderlineWidth / 2, underlineY, width / 2 + nameUnderlineWidth / 2, underlineY);
  fill(doc, COLOR.goldRich);
  doc.circle(width / 2 - nameUnderlineWidth / 2 - 2.5, underlineY, 0.7, "F");
  doc.circle(width / 2 + nameUnderlineWidth / 2 + 2.5, underlineY, 0.7, "F");

  // 11. Role / Team
  let currentY = underlineY + 7;
  if (data.role || data.team) {
    const roleText = [data.role, data.team ? `• ${data.team}` : ""].filter(Boolean).join(" ");
    doc.setFont("UICSans", "bold");
    doc.setFontSize(8.5);
    ink(doc, COLOR.emerald);
    const roleLines = doc.splitTextToSize(roleText, 190);
    doc.text(roleLines, width / 2, currentY, { align: "center", lineHeightFactor: 1.2 });
    currentY += roleLines.length * lineStep(8.5, 1.2) + 4;
  }

  // 12. Appreciation Statement Paragraph
  doc.setFont("UICSans", "normal");
  const formattedEventDate = formatEventDate(data.eventDate) || data.eventDate;
  const organizerOrg = data.organizerOrganization || "Unstop Igniters Club, SRM University–AP";
  const defaultStatement = isParticipantCategory
    ? `In recognition of outstanding performance, creativity, initiative, and dedication demonstrated during ${data.eventTitle}. Your valuable contribution and enthusiasm are sincerely appreciated by ${organizerOrg}.`
    : `In recognition of valuable contributions, dedication, and efforts towards the successful organization of ${data.eventTitle} by ${organizerOrg}.`;
  const statement = data.contributionSummary || defaultStatement;

  const maxStatementLines = recipientLines.length > 1 ? 4 : 5;
  let blurbFontSize = 9.5;
  doc.setFontSize(blurbFontSize);
  let statementLines = doc.splitTextToSize(statement, 170);
  while (statementLines.length > maxStatementLines && blurbFontSize > 8) {
    blurbFontSize -= 0.5;
    doc.setFontSize(blurbFontSize);
    statementLines = doc.splitTextToSize(statement, 170);
  }
  if (statementLines.length > maxStatementLines + 1) throw new Error("The certificate statement is too long for the A4 layout. Shorten it before issuing.");
  ink(doc, COLOR.ink);
  doc.text(statementLines, width / 2, currentY, { align: "center", lineHeightFactor: 1.35 });
  currentY += statementLines.length * lineStep(blurbFontSize, 1.35) + 3.5;

  // Metadata Line (Event, Date, Venue)
  doc.setFont("UICSans", "normal");
  doc.setFontSize(7.5);
  ink(doc, COLOR.slate);
  const metaParts = [
    `Event: ${data.eventTitle}`,
    formattedEventDate ? `Date: ${formattedEventDate}` : null,
    data.eventVenue ? `Venue: ${data.eventVenue}` : (data.eventIsOnline ? "Online" : null),
  ].filter(Boolean).join("  |  ");
  const metaLines = doc.splitTextToSize(metaParts, 200);
  doc.text(metaLines, width / 2, currentY + 1.5, { align: "center", lineHeightFactor: 1.25 });
  const metadataBottom = currentY + 1.5 + (metaLines.length - 1) * lineStep(7.5, 1.25) + 1.5;

  // 13. Dual Signatures (Left: Faculty Coordinator, Right: President)
  const sigY = Math.min(170, Math.max(167, metadataBottom + 6));
  const sig1X = 95;
  const sig2X = 202;

  // Faculty Coordinator
  drawSignatureImage(doc, signatories[0], sig1X, sigY, 44, 11);
  stroke(doc, COLOR.goldRich);
  doc.setLineWidth(0.4);
  doc.line(sig1X - 25, sigY, sig1X + 25, sigY);
  doc.setFont("UICSans", "bold");
  doc.setFontSize(7.5);
  ink(doc, COLOR.charcoal);
  doc.text(signatories[0].name, sig1X, sigY + 4, { align: "center" });
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  ink(doc, COLOR.slate);
  doc.text(doc.splitTextToSize(signatories[0].designation, 58), sig1X, sigY + 7.5, { align: "center", lineHeightFactor: 1.15 });

  // President
  drawSignatureImage(doc, signatories[1], sig2X, sigY, 44, 11);
  stroke(doc, COLOR.goldRich);
  doc.setLineWidth(0.4);
  doc.line(sig2X - 25, sigY, sig2X + 25, sigY);
  doc.setFont("UICSans", "bold");
  doc.setFontSize(7.5);
  ink(doc, COLOR.charcoal);
  doc.text(signatories[1].name, sig2X, sigY + 4, { align: "center" });
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  ink(doc, COLOR.slate);
  doc.text(doc.splitTextToSize(signatories[1].designation, 58), sig2X, sigY + 7.5, { align: "center", lineHeightFactor: 1.15 });

  // 14. Laurel Recognition Emblem centered between the signature blocks
  const emblemX = width / 2;
  const emblemY = 178;
  fill(doc, COLOR.goldRich);
  doc.circle(emblemX, emblemY, 6.2, "F");
  fill(doc, COLOR.emerald);
  doc.circle(emblemX, emblemY, 5, "F");
  stroke(doc, COLOR.goldPale);
  doc.setLineWidth(0.3);
  doc.circle(emblemX, emblemY, 4, "S");
  fill(doc, COLOR.goldPale);
  for (let a = -60; a <= 60; a += 24) {
    const rad = (a * Math.PI) / 180;
    doc.circle(emblemX - 7.6 * Math.cos(rad), emblemY + 7.6 * Math.sin(rad), 0.7, "F");
    doc.circle(emblemX + 7.6 * Math.cos(rad), emblemY + 7.6 * Math.sin(rad), 0.7, "F");
  }
  doc.setFont("UICSans", "bold");
  doc.setFontSize(3.6);
  ink(doc, COLOR.white);
  doc.text("UIC", emblemX, emblemY + 1.2, { align: "center" });

  // 15. Security & QR Code (bottom-right) with verification details
  const qrX = cardX + cardW - 41;
  const qrY = 166;
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, 13, 13);
    } catch {
      stroke(doc, COLOR.goldRich);
      doc.rect(qrX, qrY, 13, 13);
    }
  } else {
    stroke(doc, COLOR.goldRich);
    doc.rect(qrX, qrY, 13, 13);
  }

  const stampRightX = cardX + cardW - 14;
  doc.setFont("UICSans", "bold");
  doc.setFontSize(6);
  ink(doc, COLOR.charcoal);
  doc.text(`ID: ${data.certificateNumber}`, stampRightX, qrY + 17.5, { align: "right" });
  doc.setFont("UICSans", "normal");
  ink(doc, COLOR.slate);
  doc.text(`Issued: ${formatEventDate(data.issueDate) || data.issueDate || formatEventDate(new Date().toISOString())}`, stampRightX, qrY + 21, { align: "right" });
  doc.text("Tamper-Evident Record", stampRightX, qrY + 24.5, { align: "right" });

  doc.setFont("UICSans", "normal");
  doc.setFontSize(6);
  ink(doc, COLOR.slate);
  doc.text(`Verify: ${verifyUrl}`, cardX + 14, qrY + 24.5);
}

// ============================================================================
// PUBLIC ENTRY POINTS
// ============================================================================

/**
 * Create a jsPDF document for the given certificate data
 */
export async function createCertificatePdf(data: CertificatePdfData): Promise<jsPDF> {
  if (!data.recipientCategory) {
    throw new Error("Recipient category needs administrator review before generating this certificate.");
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  await registerCertificateFonts(doc);

  // Load both official transparent signature PNG assets
  const signer1Path = data.signerSignatureUrl || DEFAULT_CERTIFICATE_SIGNATORIES.facultyCoordinator.signaturePath;
  const signer1Name = data.signerName || DEFAULT_CERTIFICATE_SIGNATORIES.facultyCoordinator.printedName;
  const signer1Designation = data.signerDesignation || DEFAULT_CERTIFICATE_SIGNATORIES.facultyCoordinator.designation;
  const sig1DataUrl = await loadCertificateSignatureDataUrl(signer1Path, "Faculty Coordinator");

  const signer2Path = data.signer2SignatureUrl || DEFAULT_CERTIFICATE_SIGNATORIES.president.signaturePath;
  const signer2Name = data.signer2Name || DEFAULT_CERTIFICATE_SIGNATORIES.president.printedName;
  const signer2Designation = data.signer2Designation || DEFAULT_CERTIFICATE_SIGNATORIES.president.designation;
  const sig2DataUrl = await loadCertificateSignatureDataUrl(signer2Path, "President");

  const signatories: [SignatoryRenderInfo, SignatoryRenderInfo] = [
    { name: signer1Name, designation: signer1Designation, dataUrl: sig1DataUrl, aspect: pngAspectFromDataUrl(sig1DataUrl) ?? 4 },
    { name: signer2Name, designation: signer2Designation, dataUrl: sig2DataUrl, aspect: pngAspectFromDataUrl(sig2DataUrl) ?? 4 },
  ];

  // Scannable QR Code and the three official logos
  const verifyUrl = buildVerificationUrl(data.verificationToken);
  const qrDataUrl = await generateQrDataUrl(verifyUrl);
  const logos = await loadCertificateLogoAssets();

  // Template Routing:
  // Participant & Winner records route to Design 1 (Participation / Achievement).
  // Organizer, Volunteer, Core Team, Mentor, Speaker records route to Design 2 (Appreciation / Recognition).
  // Admins can also explicitly specify templateKey ("participant-emerald", "participant-classic", "organizer-prestige", "organizer-forest").
  const family = getCertificateFamily(data.recipientCategory);
  const explicitParticipant = data.themeKey === "participant-classic" || data.themeKey === "participant-emerald";
  const explicitOrganizer = data.themeKey === "organizer-forest" || data.themeKey === "organizer-prestige";
  const isExplicitAppreciation = Boolean(
    (data.certificateType && data.certificateType.toLowerCase().includes("appreciation")) ||
    (data.customTitle && data.customTitle.toLowerCase().includes("appreciation"))
  );

  const isParticipantTemplate = explicitParticipant
    ? true
    : explicitOrganizer
      ? false
      : isExplicitAppreciation
        ? false
        : family === "participant";

  if (isParticipantTemplate) {
    renderParticipantCertificate(doc, data, signatories, verifyUrl, qrDataUrl, logos);
  } else {
    renderOrganizerCertificate(doc, data, signatories, verifyUrl, qrDataUrl, logos);
  }

  return doc;
}

/**
 * Download certificate PDF directly to user's device
 */
export async function downloadCertificatePdf(data: CertificatePdfData, fileName?: string): Promise<void> {
  const doc = await createCertificatePdf(data);
  const cleanName = (fileName || `${data.certificateNumber || "certificate"}_${data.recipientName || "uic"}`).replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`${cleanName}.pdf`);
}

/**
 * Return PDF blob (for uploading to storage, preview in iframe, and email attachment)
 */
export async function getCertificatePdfBlob(data: CertificatePdfData): Promise<Blob> {
  const doc = await createCertificatePdf(data);
  return doc.output("blob");
}
