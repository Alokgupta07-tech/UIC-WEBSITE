/**
 * Client-Side PDF Generation for UIC SRM AP Certificates
 *
 * Generates ultra-crisp, print-ready A4 landscape (297mm x 210mm) vector PDFs
 * using jsPDF with exact theme styling, security borders, signatures, and QR codes.
 */

import { jsPDF } from "jspdf";
import { buildVerificationUrl } from "@/lib/certificateUrls";
import { CERTIFICATE_SIGNATORIES, loadCertificateSignatureDataUrl } from "@/lib/certificateSignatories";
import type { CertificateThemeKey } from "@/components/certificates/PrintableCertificate";

export interface CertificatePdfData {
  certificateNumber: string;
  verificationToken: string;
  recipientName: string;
  eventTitle: string;
  eventDate?: string | null;
  eventVenue?: string | null;
  eventIsOnline?: boolean | null;
  certificateType?: string | null;
  customTitle?: string | null;
  role?: string | null;
  team?: string | null;
  contributionSummary?: string | null;
  skills?: string[] | null;
  specialRecognition?: string | null;
  organizerOrganization?: string | null;
  signerName?: string | null;
  signerDesignation?: string | null;
  signer2Name?: string | null;
  signer2Designation?: string | null;
  issueDate?: string | null;
  themeKey?: CertificateThemeKey | string | null;
}

interface ThemeRgb {
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  bgTint: [number, number, number];
  textColor: [number, number, number];
  borderOuter: [number, number, number];
  borderInner: [number, number, number];
}

const THEME_PALETTES: Record<string, ThemeRgb> = {
  "cyber-emerald": {
    primary: [6, 78, 59],       // #064e3b deep emerald
    secondary: [5, 150, 105],    // #059669 emerald
    accent: [217, 119, 6],       // #d97706 gold
    bgTint: [248, 253, 249],     // very subtle mint
    textColor: [15, 23, 42],     // slate 900
    borderOuter: [6, 78, 59],
    borderInner: [217, 119, 6],
  },
  "royal-sapphire": {
    primary: [30, 58, 138],      // #1e3a8a deep sapphire
    secondary: [37, 99, 235],    // #2563eb blue
    accent: [217, 119, 6],       // #d97706 gold
    bgTint: [248, 250, 254],
    textColor: [15, 23, 42],
    borderOuter: [30, 58, 138],
    borderInner: [217, 119, 6],
  },
  "imperial-ruby": {
    primary: [136, 19, 55],      // #881337 deep ruby
    secondary: [225, 29, 72],    // #e11d48 rose
    accent: [180, 83, 9],        // #b45309 amber
    bgTint: [255, 248, 248],
    textColor: [15, 23, 42],
    borderOuter: [136, 19, 55],
    borderInner: [180, 83, 9],
  },
  "amethyst-prestige": {
    primary: [74, 4, 78],        // #4a044e deep amethyst
    secondary: [147, 51, 234],   // #9333ea purple
    accent: [202, 138, 4],       // #ca8a04 gold
    bgTint: [253, 249, 255],
    textColor: [15, 23, 42],
    borderOuter: [74, 4, 78],
    borderInner: [202, 138, 4],
  },
  "grand-monarch": {
    primary: [120, 53, 15],      // #78350f 24k amber/gold
    secondary: [217, 119, 6],    // #d97706
    accent: [180, 83, 9],        // #b45309
    bgTint: [255, 252, 245],
    textColor: [15, 23, 42],
    borderOuter: [120, 53, 15],
    borderInner: [217, 119, 6],
  },
};

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

/**
 * Create a jsPDF document for the given certificate data
 */
export async function createCertificatePdf(data: CertificatePdfData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const width = 297;
  const height = 210;

  const palette = THEME_PALETTES[data.themeKey || "royal-sapphire"] || THEME_PALETTES["royal-sapphire"];

  // 1. Background tint
  doc.setFillColor(...palette.bgTint);
  doc.rect(0, 0, width, height, "F");

  // 2. Triple decorative border
  // Outer thick border
  doc.setDrawColor(...palette.borderOuter);
  doc.setLineWidth(2.0);
  doc.rect(8, 8, width - 16, height - 16);

  // Thin outer accent
  doc.setDrawColor(...palette.accent);
  doc.setLineWidth(0.4);
  doc.rect(10.5, 10.5, width - 21, height - 21);

  // Inner border
  doc.setDrawColor(...palette.borderInner);
  doc.setLineWidth(0.8);
  doc.rect(13, 13, width - 26, height - 26);

  // Corner filigree accents (4 corners)
  const drawCornerFlourish = (cx: number, cy: number, flipX: number, flipY: number) => {
    doc.setDrawColor(...palette.accent);
    doc.setLineWidth(0.6);
    doc.line(cx, cy, cx + flipX * 10, cy);
    doc.line(cx, cy, cx, cy + flipY * 10);
    doc.circle(cx + flipX * 3.5, cy + flipY * 3.5, 1.2, "S");
  };
  drawCornerFlourish(14, 14, 1, 1);
  drawCornerFlourish(width - 14, 14, -1, 1);
  drawCornerFlourish(14, height - 14, 1, -1);
  drawCornerFlourish(width - 14, height - 14, -1, -1);

  // 3. Header institution info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...palette.secondary);
  doc.text("UNSTOP IGNITERS CLUB", width / 2, 24, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SRM UNIVERSITY–AP • ANDHRA PRADESH, INDIA", width / 2, 29, { align: "center" });

  // 4. Main Certificate Title
  const title = (data.customTitle || (data.certificateType ? `CERTIFICATE OF ${data.certificateType.toUpperCase()}` : "CERTIFICATE OF APPRECIATION")).toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...palette.primary);
  doc.text(title, width / 2, 42, { align: "center" });

  // Subtitle / Recognition line
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...palette.accent);
  const subtitle = data.specialRecognition || (data.role ? `Presented in recognition of distinguished service as ${data.role}` : "This certificate is proudly presented to");
  doc.text(subtitle, width / 2, 48, { align: "center" });

  // 5. Recipient Name
  doc.setFont("times", "bolditalic");
  doc.setFontSize(26);
  doc.setTextColor(...palette.primary);
  doc.text(data.recipientName || "Recipient Name", width / 2, 62, { align: "center" });

  // Decorative underline under name
  const nameUnderlineWidth = 100;
  doc.setDrawColor(...palette.accent);
  doc.setLineWidth(0.6);
  doc.line(width / 2 - nameUnderlineWidth / 2, 65, width / 2 + nameUnderlineWidth / 2, 65);
  doc.circle(width / 2, 65, 0.8, "FD");

  // 6. Role & Team Badges (if present)
  let yOffset = 73;
  if (data.role || data.team) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...palette.secondary);
    const roleBadgeText = [data.role, data.team ? `• ${data.team}` : ""].filter(Boolean).join(" ");
    doc.text(roleBadgeText, width / 2, yOffset, { align: "center" });
    yOffset += 7;
  }

  // 7. Contribution Blurb / Paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...palette.textColor);

  const defaultBlurb = `For dedicated contribution and exemplary participation in ${data.eventTitle}, organized by ${data.organizerOrganization || "Unstop Igniters Club, SRM AP"}${data.eventDate ? ` on ${data.eventDate}` : ""}.`;
  const contributionText = data.contributionSummary || defaultBlurb;

  const splitBlurb = doc.splitTextToSize(contributionText, 195);
  doc.text(splitBlurb, width / 2, yOffset, { align: "center", lineHeightFactor: 1.35 });
  yOffset += (splitBlurb.length * 4.8) + 4;

  // 8. Event and Date details line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const metaParts = [
    `Event: ${data.eventTitle}`,
    data.eventDate ? `Date: ${data.eventDate}` : null,
    data.eventVenue ? `Venue: ${data.eventVenue}` : (data.eventIsOnline ? "Online" : null),
  ].filter(Boolean).join("  |  ");
  doc.text(metaParts, width / 2, yOffset, { align: "center" });

  // 9. Signatures (Dual Signatory Support)
  const sigY = 166;
  const sig1X = 58;
  const sig2X = width - 58;
  const addSignature = async (key: "facultyCoordinator" | "president", centerX: number) => {
    const image = await loadCertificateSignatureDataUrl(key);
    const dimensions = doc.getImageProperties(image);
    const scale = Math.min(52 / dimensions.width, 13 / dimensions.height);
    const imageWidth = dimensions.width * scale;
    const imageHeight = dimensions.height * scale;
    doc.addImage(image, "PNG", centerX - imageWidth / 2, sigY - imageHeight - 2, imageWidth, imageHeight);
  };

  // Keep the supplied transparent PNGs as PNGs so their original handwriting
  // and transparency are retained by jsPDF in every theme.
  await Promise.all([
    addSignature("facultyCoordinator", sig1X),
    addSignature("president", sig2X),
  ]);

  // Signatory 1
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(sig1X - 35, sigY, sig1X + 35, sigY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...palette.primary);
  doc.text(CERTIFICATE_SIGNATORIES.facultyCoordinator.printedName, sig1X, sigY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(CERTIFICATE_SIGNATORIES.facultyCoordinator.designation, 68), sig1X, sigY + 9, { align: "center", lineHeightFactor: 1.15 });

  // Signatory 2
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(sig2X - 35, sigY, sig2X + 35, sigY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...palette.primary);
  doc.text(CERTIFICATE_SIGNATORIES.president.printedName, sig2X, sigY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(CERTIFICATE_SIGNATORIES.president.designation, 68), sig2X, sigY + 9, { align: "center", lineHeightFactor: 1.15 });

  // 10. Center Gold Seal
  const sealX = width / 2;
  const sealY = 163;
  doc.setDrawColor(...palette.accent);
  doc.setFillColor(...palette.accent);
  doc.circle(sealX, sealY, 11, "FD");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(sealX, sealY, 9.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text("UIC SRM AP", sealX, sealY - 2, { align: "center" });
  doc.setFontSize(7);
  doc.text("VERIFIED", sealX, sealY + 1.5, { align: "center" });
  doc.setFontSize(4.5);
  doc.text("EXCELLENCE", sealX, sealY + 4.5, { align: "center" });

  // 11. Scannable QR Code & Cryptographic ID Footer
  const verifyUrl = buildVerificationUrl(data.verificationToken);
  const qrDataUrl = await generateQrDataUrl(verifyUrl);

  const qrX = 20;
  const qrY = height - 32;
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, 16, 16);
    } catch {
      // Fallback border box
      doc.setDrawColor(...palette.borderInner);
      doc.rect(qrX, qrY, 16, 16);
    }
  }

  // Footer text next to QR
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Scan with phone camera to verify authenticity", qrX + 19, qrY + 5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...palette.primary);
  doc.text(`Certificate No: ${data.certificateNumber}`, qrX + 19, qrY + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Verify URL: ${verifyUrl}`, qrX + 19, qrY + 13);

  // Right-aligned issue date & security stamp
  const stampX = width - 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issued: ${data.issueDate || new Date().toISOString().slice(0, 10)}`, stampX, qrY + 6, { align: "right" });
  doc.text("Tamper-Evident Digital Credential", stampX, qrY + 10, { align: "right" });
  doc.text("SRM University-AP Official Record", stampX, qrY + 14, { align: "right" });

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
 * Return PDF blob (e.g. for uploading to storage or preview in iframe)
 */
export async function getCertificatePdfBlob(data: CertificatePdfData): Promise<Blob> {
  const doc = await createCertificatePdf(data);
  return doc.output("blob");
}
