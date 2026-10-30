/**
 * Client-Side PDF Generation for UIC SRM AP Certificates
 *
 * Generates ultra-crisp, print-ready A4 landscape (297mm x 210mm) vector PDFs
 * using jsPDF with exact official branding, vector security borders, dual
 * transparent handwriting signatures, scannable QR codes, and two distinct
 * premium designs:
 *   - Design 1: Premium Participant Certificate (Ivory, Emerald Vertical Curved Borders, Gold Accents)
 *   - Design 2: Premium Organizer & Appreciation Certificate (Deep Emerald, Layered Diagonal Ribbons, Scallop Watermark, Luxury Badge)
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

async function loadCertificateLogoDataUrl(): Promise<string> {
  try {
    const logoPath = `${import.meta.env.BASE_URL}assets/certificates/uic-logo.png`;
    const response = await fetch(logoPath);
    if (!response.ok) return "";
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : resolve(""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

interface SignatoryRenderInfo {
  name: string;
  designation: string;
  dataUrl: string;
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
  logoDataUrl: string
): void {
  const width = 297;
  const height = 210;
  const isWinner = data.recipientCategory === "winner";

  // 1. Background: Warm Ivory Paper
  doc.setFillColor(252, 253, 251);
  doc.rect(0, 0, width, height, "F");

  // 2. Horizontal Gold Accent Hairlines (Top & Bottom)
  doc.setDrawColor(205, 162, 67); // Gold
  doc.setLineWidth(0.35);
  doc.line(28, 10, 269, 10);
  doc.setLineWidth(0.18);
  doc.line(28, 11.5, 269, 11.5);

  doc.setLineWidth(0.18);
  doc.line(30, 198.5, 267, 198.5);
  doc.setLineWidth(0.35);
  doc.line(30, 200, 267, 200);

  // 3. Left Vertical Curved Border (Emerald Wave & Gold Ribbon)
  // Deep emerald outer wave
  doc.setFillColor(6, 78, 59);
  doc.moveTo(0, 0);
  doc.lineTo(24, 0);
  doc.curveTo(12, 65, 15, 145, 25, 210);
  doc.lineTo(0, 210);
  doc.fill();

  // Gold accent ribbon following the contour
  doc.setFillColor(205, 162, 67);
  doc.moveTo(24, 0);
  doc.curveTo(12, 65, 15, 145, 25, 210);
  doc.lineTo(26.5, 210);
  doc.curveTo(16.5, 145, 13.5, 65, 25.5, 0);
  doc.fill();

  // Emerald hairline along ribbon
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.3);
  doc.moveTo(27, 0);
  doc.curveTo(15, 65, 18, 145, 28.5, 210);
  doc.stroke();

  // Delicate wave filigree in bottom-left corner
  doc.setDrawColor(218, 178, 88);
  doc.setLineWidth(0.15);
  for (let i = 0; i < 9; i++) {
    const offset = i * 2.8;
    doc.moveTo(8 + offset * 0.4, 210);
    doc.curveTo(22 + offset, 195 - offset * 0.6, 30 + offset * 1.2, 175 - offset, 42 + offset * 0.5, 160 + offset * 0.8);
    doc.stroke();
  }

  // 4. Right Vertical Curved Border (Mirrored Emerald Wave & Gold Ribbon)
  doc.setFillColor(6, 78, 59);
  doc.moveTo(width, 0);
  doc.lineTo(width - 24, 0);
  doc.curveTo(width - 12, 65, width - 15, 145, width - 25, 210);
  doc.lineTo(width, 210);
  doc.fill();

  doc.setFillColor(205, 162, 67);
  doc.moveTo(width - 24, 0);
  doc.curveTo(width - 12, 65, width - 15, 145, width - 25, 210);
  doc.lineTo(width - 26.5, 210);
  doc.curveTo(width - 16.5, 145, width - 13.5, 65, width - 25.5, 0);
  doc.fill();

  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.3);
  doc.moveTo(width - 27, 0);
  doc.curveTo(width - 15, 65, width - 18, 145, width - 28.5, 210);
  doc.stroke();

  // Delicate wave filigree in top-right corner
  doc.setDrawColor(218, 178, 88);
  doc.setLineWidth(0.15);
  for (let i = 0; i < 9; i++) {
    const offset = i * 2.8;
    doc.moveTo(width - 8 - offset * 0.4, 0);
    doc.curveTo(width - 22 - offset, 15 + offset * 0.6, width - 30 - offset * 1.2, 35 + offset, width - 42 - offset * 0.5, 50 - offset * 0.8);
    doc.stroke();
  }

  // 5. Top Left: Official UIC Logo & Institutional Branding
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 32, 14, 22, 16);
    } catch {
      // Fallback
    }
  }

  doc.setFont("UICSans", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(6, 78, 59);
  doc.text("UNSTOP IGNITERS CLUB", 57, 21);
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text("SRM UNIVERSITY–AP", 57, 25.5);

  // 6. Main Certificate Heading
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(15, 32, 67); // Dark navy
  doc.text("CERTIFICATE", width / 2, 37, { align: "center" });

  doc.setFont("UICSans", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  const defaultSub = isWinner ? "OF ACHIEVEMENT" : "OF PARTICIPATION";
  const subTitle = (data.customTitle ? data.customTitle.toUpperCase() : defaultSub);
  doc.text(subTitle, width / 2, 44.5, { align: "center" });

  // 7. Classification Badge (PARTICIPANT / WINNER)
  const categoryLabel = (getCertificateCategoryLabel(data.recipientCategory) || (isWinner ? "WINNER" : "PARTICIPANT")).toUpperCase();
  const badgeWidth = Math.max(36, doc.getTextWidth(categoryLabel) + 12);
  doc.setFillColor(242, 248, 244);
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.35);
  doc.roundedRect(width / 2 - badgeWidth / 2, 48.5, badgeWidth, 5.5, 1.5, 1.5, "FD");
  doc.setFont("UICSans", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(6, 78, 59);
  doc.text(categoryLabel, width / 2, 52.5, { align: "center" });

  // 8. Recipient Introduction
  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105);
  doc.text("This certificate is proudly presented to", width / 2, 62.5, { align: "center" });

  // 9. Recipient Name in Warm Amber Gold
  doc.setFont("times", "bolditalic");
  let recipientFontSize = 26;
  doc.setFontSize(recipientFontSize);
  const recipientName = data.recipientName || "Recipient Name";
  let recipientLines = doc.splitTextToSize(recipientName, 210);
  while (recipientFontSize > 18 && recipientLines.length > 1) {
    recipientFontSize -= 1;
    doc.setFontSize(recipientFontSize);
    recipientLines = doc.splitTextToSize(recipientName, 210);
  }
  if (recipientLines.length > 2) throw new Error("The recipient name is too long for the certificate layout.");
  doc.setTextColor(184, 134, 38); // Warm gold
  const recipientNameY = 74;
  doc.text(recipientLines, width / 2, recipientNameY, { align: "center", lineHeightFactor: 1.15 });

  // Decorative gold underline
  const nameUnderlineWidth = Math.min(100, Math.max(60, doc.getTextWidth(recipientLines[0]) * 0.7));
  const underlineY = recipientNameY + (recipientLines.length - 1) * recipientFontSize * 0.4 + 4;
  doc.setDrawColor(205, 162, 67);
  doc.setLineWidth(0.4);
  doc.line(width / 2 - nameUnderlineWidth / 2, underlineY, width / 2 + nameUnderlineWidth / 2, underlineY);
  doc.circle(width / 2, underlineY, 0.75, "FD");

  // Optional Role / Special Recognition
  let currentY = underlineY + 8;
  if (data.role) {
    doc.setFont("UICSans", "bold");
    doc.setFontSize(9);
    doc.setTextColor(6, 78, 59);
    const roleText = [data.role, data.team ? `• ${data.team}` : ""].filter(Boolean).join(" ");
    const roleLines = doc.splitTextToSize(roleText, 210);
    doc.text(roleLines, width / 2, currentY, { align: "center" });
    currentY += roleLines.length * 4.5 + 3;
  }

  // 10. Event Participation Description Paragraph
  doc.setFont("UICSans", "normal");
  const formattedEventDate = formatEventDate(data.eventDate) || data.eventDate;
  const organizerOrg = data.organizerOrganization || "Unstop Igniters Club, SRM University–AP";
  const defaultDesc = isWinner
    ? `This certificate is awarded in recognition of outstanding performance and achievement in ${data.eventTitle}, organized by ${organizerOrg}${formattedEventDate ? ` on ${formattedEventDate}` : ""}.`
    : `This certificate is awarded in recognition of participation in ${data.eventTitle}, organized by ${organizerOrg}${formattedEventDate ? ` on ${formattedEventDate}` : ""}.`;
  const descText = data.contributionSummary || defaultDesc;

  let descFontSize = 9.5;
  doc.setFontSize(descFontSize);
  let descLines = doc.splitTextToSize(descText, 190);
  while (descLines.length > 5 && descFontSize > 8) {
    descFontSize -= 0.5;
    doc.setFontSize(descFontSize);
    descLines = doc.splitTextToSize(descText, 190);
  }
  if (descLines.length > 6) throw new Error("The certificate statement is too long for the A4 layout. Shorten it before issuing.");
  doc.setTextColor(30, 41, 59);
  doc.text(descLines, width / 2, currentY, { align: "center", lineHeightFactor: 1.35 });
  currentY += descLines.length * (descFontSize * 0.38) + 4;

  // Metadata Line (Event, Date, Venue)
  doc.setFont("UICSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const metaParts = [
    `Event: ${data.eventTitle}`,
    formattedEventDate ? `Date: ${formattedEventDate}` : null,
    data.eventVenue ? `Venue: ${data.eventVenue}` : (data.eventIsOnline ? "Online" : null),
  ].filter(Boolean).join("  |  ");
  const metaLines = doc.splitTextToSize(metaParts, 220);
  doc.text(metaLines, width / 2, currentY, { align: "center", lineHeightFactor: 1.2 });

  // 11. Central Award Medallion (Between the two signatures)
  const medalX = width / 2;
  const medalY = 152;

  // Gold ribbon tails with V-notches
  doc.setFillColor(205, 162, 67);
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
  doc.setFillColor(205, 162, 67);
  doc.circle(medalX, medalY, 11, "F");
  // Emerald inner disc
  doc.setFillColor(6, 78, 59);
  doc.circle(medalX, medalY, 9.2, "F");
  // Gold inner hairline
  doc.setDrawColor(205, 162, 67);
  doc.setLineWidth(0.4);
  doc.circle(medalX, medalY, 8, "S");

  // Medal typography
  doc.setFont("UICSans", "bold");
  doc.setFontSize(4.5);
  doc.setTextColor(255, 255, 255);
  doc.text("UIC SRM AP", medalX, medalY - 2.5, { align: "center" });
  doc.setFontSize(6.5);
  doc.text("VERIFIED", medalX, medalY + 0.8, { align: "center" });
  doc.setFontSize(4);
  doc.text("EXCELLENCE", medalX, medalY + 3.8, { align: "center" });

  // 12. Signatures (Left: Faculty Coordinator, Right: President)
  const sigY = 163;
  const sig1X = 72;
  const sig2X = width - 72;

  // Signatory 1 (Faculty Coordinator)
  if (signatories[0].dataUrl) {
    try {
      doc.addImage(signatories[0].dataUrl, "PNG", sig1X - 22, sigY - 14, 44, 12);
    } catch {
      // Fallback
    }
  }
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.line(sig1X - 28, sigY, sig1X + 28, sigY);
  doc.setFont("UICSans", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 32, 67);
  doc.text(signatories[0].name, sig1X, sigY + 4.5, { align: "center" });
  doc.setFont("UICSans", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(signatories[0].designation, 65), sig1X, sigY + 8.5, { align: "center", lineHeightFactor: 1.15 });

  // Signatory 2 (President)
  if (signatories[1].dataUrl) {
    try {
      doc.addImage(signatories[1].dataUrl, "PNG", sig2X - 22, sigY - 14, 44, 12);
    } catch {
      // Fallback
    }
  }
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.line(sig2X - 28, sigY, sig2X + 28, sigY);
  doc.setFont("UICSans", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 32, 67);
  doc.text(signatories[1].name, sig2X, sigY + 4.5, { align: "center" });
  doc.setFont("UICSans", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(signatories[1].designation, 65), sig2X, sigY + 8.5, { align: "center", lineHeightFactor: 1.15 });

  // 13. Security & Scannable QR Code Footer
  const qrX = 33;
  const qrY = height - 28;
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, 15, 15);
    } catch {
      doc.setDrawColor(205, 162, 67);
      doc.rect(qrX, qrY, 15, 15);
    }
  } else {
    doc.setDrawColor(205, 162, 67);
    doc.rect(qrX, qrY, 15, 15);
  }

  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Scan with camera to verify authenticity", qrX + 18, qrY + 4.5);
  doc.setFont("UICSans", "bold");
  doc.setTextColor(15, 32, 67);
  doc.text(`Certificate No: ${data.certificateNumber}`, qrX + 18, qrY + 8.5);
  doc.setFont("UICSans", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Verify URL: ${verifyUrl}`, qrX + 18, qrY + 12.5);

  const stampX = width - 33;
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
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
  logoDataUrl: string
): void {
  const width = 297;
  const height = 210;

  // 1. Outer Canvas: Deep Rich Emerald Green
  doc.setFillColor(5, 56, 42); // Deep emerald
  doc.rect(0, 0, width, height, "F");

  // 2. Inner Ivory Card with Notched Corners
  const cardX = 12;
  const cardY = 12;
  const cardW = width - 24;
  const cardH = height - 24;
  const notch = 6;

  doc.setFillColor(253, 253, 250); // Warm ivory
  doc.moveTo(cardX + notch, cardY);
  doc.lineTo(cardX + cardW - notch, cardY);
  doc.lineTo(cardX + cardW, cardY + notch);
  doc.lineTo(cardX + cardW, cardY + cardH - notch);
  doc.lineTo(cardX + cardW - notch, cardY + cardH);
  doc.lineTo(cardX + notch, cardY + cardH);
  doc.lineTo(cardX, cardY + cardH - notch);
  doc.lineTo(cardX, cardY + notch);
  doc.fill();

  // 3. Subtle Repeated Scallop Watermark Pattern (Seigaiha Motif)
  doc.setDrawColor(235, 240, 236);
  doc.setLineWidth(0.15);
  for (let row = 0; row < 12; row++) {
    const cy = cardY + 15 + row * 14;
    const offset = (row % 2) * 10;
    for (let cx = cardX + 10 + offset; cx < cardX + cardW - 10; cx += 20) {
      // Exclude main text area to maintain clean legibility
      if (cx > 65 && cx < 195 && cy > 60 && cy < 125) continue;
      doc.circle(cx, cy, 6, "S");
      doc.circle(cx, cy, 9, "S");
    }
  }

  // 4. Inner Card Dual Gold Border
  doc.setDrawColor(205, 158, 55); // Rich gold
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
  doc.setDrawColor(222, 184, 88);
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

  // Corner floral filigree accents
  const drawCornerFlourish = (cx: number, cy: number, flipX: number, flipY: number) => {
    doc.setDrawColor(205, 158, 55);
    doc.setLineWidth(0.5);
    doc.line(cx, cy, cx + flipX * 8, cy);
    doc.line(cx, cy, cx, cy + flipY * 8);
    doc.circle(cx + flipX * 3, cy + flipY * 3, 1, "S");
  };
  drawCornerFlourish(cardX + 4.5, cardY + 4.5, 1, 1);
  drawCornerFlourish(cardX + cardW - 4.5, cardY + cardH - 4.5, -1, -1);

  // 5. Dynamic Diagonal Corner Ribbons (Signature Luxury Aesthetic)
  // Top-Right Ribbons (Crossing from ~215mm top to ~297mm right)
  doc.setFillColor(3, 35, 26); // Depth shadow
  doc.moveTo(215, 0);
  doc.lineTo(297, 82);
  doc.lineTo(297, 85);
  doc.lineTo(213, 0);
  doc.fill();

  doc.setFillColor(8, 72, 54); // Wide emerald ribbon
  doc.moveTo(216, 0);
  doc.lineTo(297, 81);
  doc.lineTo(297, 65);
  doc.lineTo(232, 0);
  doc.fill();

  doc.setFillColor(205, 158, 55); // Gleaming metallic gold ribbon
  doc.moveTo(232, 0);
  doc.lineTo(297, 65);
  doc.lineTo(297, 50);
  doc.lineTo(247, 0);
  doc.fill();

  doc.setFillColor(10, 88, 66); // Thin emerald accent stripe
  doc.moveTo(247, 0);
  doc.lineTo(297, 50);
  doc.lineTo(297, 43);
  doc.lineTo(254, 0);
  doc.fill();

  doc.setFillColor(224, 185, 92); // Outer gold hairline
  doc.moveTo(254, 0);
  doc.lineTo(297, 43);
  doc.lineTo(297, 40);
  doc.lineTo(257, 0);
  doc.fill();

  // Bottom-Left Ribbons (Crossing from left edge to bottom)
  doc.setFillColor(3, 35, 26);
  doc.moveTo(0, 142);
  doc.lineTo(82, 210);
  doc.lineTo(85, 210);
  doc.lineTo(0, 145);
  doc.fill();

  doc.setFillColor(8, 72, 54);
  doc.moveTo(0, 143);
  doc.lineTo(81, 210);
  doc.lineTo(65, 210);
  doc.lineTo(0, 159);
  doc.fill();

  doc.setFillColor(205, 158, 55);
  doc.moveTo(0, 159);
  doc.lineTo(65, 210);
  doc.lineTo(50, 210);
  doc.lineTo(0, 174);
  doc.fill();

  doc.setFillColor(10, 88, 66);
  doc.moveTo(0, 174);
  doc.lineTo(50, 210);
  doc.lineTo(43, 210);
  doc.lineTo(0, 181);
  doc.fill();

  doc.setFillColor(224, 185, 92);
  doc.moveTo(0, 181);
  doc.lineTo(43, 210);
  doc.lineTo(40, 210);
  doc.lineTo(0, 184);
  doc.fill();

  // 6. Top Left: Official UIC Logo & Header
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", cardX + 12, cardY + 7, 21, 15);
    } catch {
      // Fallback
    }
  }

  doc.setFont("UICSans", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(6, 78, 59);
  doc.text("UNSTOP IGNITERS CLUB", cardX + 36, cardY + 13);
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text("SRM UNIVERSITY–AP", cardX + 36, cardY + 17.5);

  // 7. Upper-Right Award Badge with Laurel Wreath & Emerald Ribbon Tails
  const badgeX = 216;
  const badgeY = 52;

  // Ribbon tails
  doc.setFillColor(6, 78, 59);
  doc.moveTo(badgeX - 6, badgeY + 6);
  doc.lineTo(badgeX - 10, badgeY + 22);
  doc.lineTo(badgeX - 6, badgeY + 19);
  doc.lineTo(badgeX - 2, badgeY + 22);
  doc.lineTo(badgeX - 2, badgeY + 6);
  doc.fill();

  doc.moveTo(badgeX + 6, badgeY + 6);
  doc.lineTo(badgeX + 10, badgeY + 22);
  doc.lineTo(badgeX + 6, badgeY + 19);
  doc.lineTo(badgeX + 2, badgeY + 22);
  doc.lineTo(badgeX + 2, badgeY + 6);
  doc.fill();

  // Gold laurel wreath leaves curving around badge
  doc.setDrawColor(205, 158, 55);
  doc.setFillColor(205, 158, 55);
  doc.setLineWidth(0.4);
  for (let a = -70; a <= 70; a += 20) {
    const rad = (a * Math.PI) / 180;
    const lx = badgeX - 13.5 * Math.cos(rad);
    const ly = badgeY + 13.5 * Math.sin(rad);
    doc.circle(lx, ly, 1.2, "FD");

    const rx = badgeX + 13.5 * Math.cos(rad);
    const ry = badgeY + 13.5 * Math.sin(rad);
    doc.circle(rx, ry, 1.2, "FD");
  }

  // Scalloped gold rim
  doc.setFillColor(205, 158, 55);
  doc.circle(badgeX, badgeY, 12, "F");
  // Emerald center
  doc.setFillColor(6, 78, 59);
  doc.circle(badgeX, badgeY, 10, "F");
  // Inner gold ring
  doc.setDrawColor(222, 184, 88);
  doc.setLineWidth(0.4);
  doc.circle(badgeX, badgeY, 8.8, "S");

  // Badge typography
  doc.setFont("UICSans", "bold");
  doc.setFontSize(4);
  doc.setTextColor(255, 255, 255);
  doc.text("★ ★ ★ ★ ★", badgeX, badgeY - 4.5, { align: "center" });
  doc.setFontSize(6.5);
  doc.text("EXCELLENCE", badgeX, badgeY - 0.5, { align: "center" });
  doc.setFontSize(4.5);
  doc.text("UIC AWARD", badgeX, badgeY + 3.2, { align: "center" });
  doc.setFontSize(3.5);
  doc.text("ORGANIZER", badgeX, badgeY + 6, { align: "center" });

  // 8. Main Certificate Heading (Script Calligraphy)
  const contentLeft = cardX + 18;

  // "Certificate" in sweeping calligraphy script
  doc.setFont("GreatVibes", "normal");
  doc.setFontSize(38);
  doc.setTextColor(15, 23, 42); // Dark charcoal
  doc.text("Certificate", contentLeft + 35, cardY + 36);

  // "OF APPRECIATION" flanked by gold rules
  const ruleY = cardY + 44;
  doc.setDrawColor(205, 158, 55);
  doc.setLineWidth(0.4);
  doc.line(contentLeft, ruleY - 1, contentLeft + 22, ruleY - 1);

  doc.setFont("UICSans", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const title = (data.customTitle || "CERTIFICATE OF APPRECIATION").toUpperCase();
  const subTitleText = title.includes("OF") ? title.slice(title.indexOf("OF")) : "OF APPRECIATION";
  doc.text(subTitleText, contentLeft + 25, ruleY);

  const textWidth = doc.getTextWidth(subTitleText);
  doc.line(contentLeft + 28 + textWidth, ruleY - 1, contentLeft + 70 + textWidth, ruleY - 1);

  // 9. Recipient Introduction
  doc.setFont("UICSans", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PROUDLY PRESENTED TO", contentLeft, cardY + 58);

  // 10. Recipient Name
  doc.setFont("times", "bolditalic");
  let recipientFontSize = 28;
  doc.setFontSize(recipientFontSize);
  const recipientName = data.recipientName || "Recipient Name";
  let recipientLines = doc.splitTextToSize(recipientName, 175);
  while (recipientFontSize > 18 && recipientLines.length > 1) {
    recipientFontSize -= 1;
    doc.setFontSize(recipientFontSize);
    recipientLines = doc.splitTextToSize(recipientName, 175);
  }
  if (recipientLines.length > 2) throw new Error("The recipient name is too long for the certificate layout.");
  doc.setTextColor(15, 23, 42);
  const nameY = cardY + 72;
  doc.text(recipientLines, contentLeft, nameY, { lineHeightFactor: 1.15 });

  // 11. Classification Badge & Role
  let currentY = nameY + (recipientLines.length - 1) * recipientFontSize * 0.4 + 9;
  const categoryLabel = (getCertificateCategoryLabel(data.recipientCategory) || "ORGANIZER").toUpperCase();
  const orgBadgeWidth = Math.max(26, doc.getTextWidth(categoryLabel) + 10);
  doc.setFillColor(6, 78, 59); // Deep emerald fill
  doc.roundedRect(contentLeft, currentY - 4, orgBadgeWidth, 5.5, 1.2, 1.2, "F");
  doc.setFont("UICSans", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(categoryLabel, contentLeft + orgBadgeWidth / 2, currentY, { align: "center" });

  if (data.role || data.team) {
    const roleText = [data.role, data.team ? `• ${data.team}` : ""].filter(Boolean).join(" ");
    const roleLines = doc.splitTextToSize(roleText, 140);
    doc.setFont("UICSans", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(6, 78, 59);
    doc.text(roleLines, contentLeft + orgBadgeWidth + 6, currentY);
    currentY += (roleLines.length - 1) * 4 + 7;
  } else {
    currentY += 7;
  }

  // 12. Appreciation Statement Paragraph
  doc.setFont("UICSans", "normal");
  const formattedEventDate = formatEventDate(data.eventDate) || data.eventDate;
  const organizerOrg = data.organizerOrganization || "Unstop Igniters Club, SRM University–AP";
  const defaultStatement = `In recognition of valuable contributions, dedication, and efforts towards the successful organization of ${data.eventTitle} by ${organizerOrg}.`;
  const statement = data.contributionSummary || defaultStatement;

  let blurbFontSize = 9.5;
  doc.setFontSize(blurbFontSize);
  let statementLines = doc.splitTextToSize(statement, 160);
  while (statementLines.length > 5 && blurbFontSize > 8) {
    blurbFontSize -= 0.5;
    doc.setFontSize(blurbFontSize);
    statementLines = doc.splitTextToSize(statement, 160);
  }
  if (statementLines.length > 6) throw new Error("The certificate statement is too long for the A4 layout. Shorten it before issuing.");
  doc.setTextColor(30, 41, 59);
  doc.text(statementLines, contentLeft, currentY, { lineHeightFactor: 1.35 });
  currentY += statementLines.length * (blurbFontSize * 0.38) + 4;

  // Metadata Line (Event, Date, Venue)
  doc.setFont("UICSans", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const metaParts = [
    `Event: ${data.eventTitle}`,
    formattedEventDate ? `Date: ${formattedEventDate}` : null,
    data.eventVenue ? `Venue: ${data.eventVenue}` : (data.eventIsOnline ? "Online" : null),
  ].filter(Boolean).join("  |  ");
  const metaLines = doc.splitTextToSize(metaParts, 160);
  doc.text(metaLines, contentLeft, currentY);

  // 13. Dual Signatures (Positioned safely clear of diagonal ribbons)
  const sigY = cardY + cardH - 26;
  const sig1X = contentLeft + 35;
  const sig2X = contentLeft + 115;

  // Faculty Coordinator
  if (signatories[0].dataUrl) {
    try {
      doc.addImage(signatories[0].dataUrl, "PNG", sig1X - 20, sigY - 14, 40, 11);
    } catch {
      // Fallback
    }
  }
  doc.setDrawColor(205, 158, 55);
  doc.setLineWidth(0.4);
  doc.line(sig1X - 25, sigY, sig1X + 25, sigY);
  doc.setFont("UICSans", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(signatories[0].name, sig1X, sigY + 4, { align: "center" });
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(signatories[0].designation, 60), sig1X, sigY + 7.5, { align: "center", lineHeightFactor: 1.15 });

  // President
  if (signatories[1].dataUrl) {
    try {
      doc.addImage(signatories[1].dataUrl, "PNG", sig2X - 20, sigY - 14, 40, 11);
    } catch {
      // Fallback
    }
  }
  doc.setDrawColor(205, 158, 55);
  doc.setLineWidth(0.4);
  doc.line(sig2X - 25, sigY, sig2X + 25, sigY);
  doc.setFont("UICSans", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(signatories[1].name, sig2X, sigY + 4, { align: "center" });
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(signatories[1].designation, 60), sig2X, sigY + 7.5, { align: "center", lineHeightFactor: 1.15 });

  // 14. Security & QR Code in Lower Right Panel
  const qrX = cardX + cardW - 55;
  const qrY = cardY + cardH - 30;
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, 13, 13);
    } catch {
      doc.setDrawColor(205, 158, 55);
      doc.rect(qrX, qrY, 13, 13);
    }
  } else {
    doc.setDrawColor(205, 158, 55);
    doc.rect(qrX, qrY, 13, 13);
  }

  doc.setFont("UICSans", "bold");
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text(`ID: ${data.certificateNumber}`, qrX + 15, qrY + 4);
  doc.setFont("UICSans", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Issued: ${formatEventDate(data.issueDate) || data.issueDate || formatEventDate(new Date().toISOString())}`, qrX + 15, qrY + 8);
  doc.text("Tamper-Evident Record", qrX + 15, qrY + 12);
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
    { name: signer1Name, designation: signer1Designation, dataUrl: sig1DataUrl },
    { name: signer2Name, designation: signer2Designation, dataUrl: sig2DataUrl },
  ];

  // Scannable QR Code and Official Logo
  const verifyUrl = buildVerificationUrl(data.verificationToken);
  const qrDataUrl = await generateQrDataUrl(verifyUrl);
  const logoDataUrl = await loadCertificateLogoDataUrl();

  // Template Routing:
  // Participant & Winner records route to Design 1 (Participation / Achievement).
  // Organizer, Volunteer, Core Team, Mentor, Speaker records route to Design 2 (Appreciation / Recognition).
  // Admins can also explicitly specify templateKey ("participant-emerald", "participant-classic", "organizer-prestige", "organizer-forest").
  const family = getCertificateFamily(data.recipientCategory);
  const explicitParticipant = data.themeKey === "participant-classic" || data.themeKey === "participant-emerald";
  const explicitOrganizer = data.themeKey === "organizer-forest" || data.themeKey === "organizer-prestige";

  const isParticipantTemplate = explicitParticipant
    ? true
    : explicitOrganizer
      ? false
      : family === "participant";

  if (isParticipantTemplate) {
    renderParticipantCertificate(doc, data, signatories, verifyUrl, qrDataUrl, logoDataUrl);
  } else {
    renderOrganizerCertificate(doc, data, signatories, verifyUrl, qrDataUrl, logoDataUrl);
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
