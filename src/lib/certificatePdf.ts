/**
 * Client-Side PDF Generation for UIC SRM AP Certificates
 *
 * Generates ultra-crisp, print-ready A4 landscape (297mm x 210mm) vector PDFs
 * using jsPDF with exact theme styling, security borders, signatures, and QR codes.
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
  "participant-classic": {
    primary: [15, 46, 80], secondary: [15, 118, 110], accent: [202, 138, 4],
    bgTint: [255, 253, 247], textColor: [30, 41, 59], borderOuter: [15, 46, 80], borderInner: [15, 118, 110],
  },
  "organizer-forest": {
    primary: [20, 83, 45], secondary: [22, 101, 52], accent: [202, 138, 4],
    bgTint: [255, 253, 247], textColor: [30, 41, 59], borderOuter: [20, 83, 45], borderInner: [202, 138, 4],
  },
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

async function registerCertificateFonts(doc: jsPDF): Promise<void> {
  const fontFiles = [
    ["LiberationSans-Regular.ttf", "normal"],
    ["LiberationSans-Bold.ttf", "bold"],
    ["LiberationSans-Italic.ttf", "italic"],
    ["LiberationSans-BoldItalic.ttf", "bolditalic"],
  ] as const;

  for (const [filename, style] of fontFiles) {
    const response = await fetch(`${import.meta.env.BASE_URL}assets/certificates/fonts/${filename}`);
    if (!response.ok) throw new Error(`Certificate font ${filename} could not be loaded.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x4000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x4000));
    }
    const vfsName = `UIC-${filename}`;
    doc.addFileToVFS(vfsName, btoa(binary));
    doc.addFont(vfsName, "UICSans", style);
  }
}

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

  const width = 297;
  const height = 210;

  const category = data.recipientCategory;
  const family = getCertificateFamily(category);
  const participantFamily = family === "participant";
  const organizerFamily = family === "organizer";
  const familyPalette = participantFamily
    ? THEME_PALETTES["participant-classic"]
    : organizerFamily ? THEME_PALETTES["organizer-forest"] : null;
  const palette = familyPalette || THEME_PALETTES[data.themeKey || "royal-sapphire"] || THEME_PALETTES["royal-sapphire"];

  // 1. Background tint
  doc.setFillColor(...palette.bgTint);
  doc.rect(0, 0, width, height, "F");

  // Pale central watermark, drawn before content so it never reduces legibility.
  doc.setFont("UICSans", "bold");
  doc.setFontSize(72);
  doc.setTextColor(241, 244, 240);
  doc.text("UIC", width / 2, 127, { align: "center" });

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
  doc.setFont("UICSans", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...palette.secondary);
  doc.text("UNSTOP IGNITERS CLUB", width / 2, 24, { align: "center" });

  doc.setFont("UICSans", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SRM UNIVERSITY–AP • ANDHRA PRADESH, INDIA", width / 2, 29, { align: "center" });

  // 4. Main Certificate Title
  const defaultTitle = participantFamily
    ? category === "winner" ? "CERTIFICATE OF ACHIEVEMENT" : "CERTIFICATE OF PARTICIPATION"
    : organizerFamily ? "CERTIFICATE OF APPRECIATION"
    : data.certificateType ? `CERTIFICATE OF ${data.certificateType.toUpperCase()}` : "CERTIFICATE OF APPRECIATION";
  const title = (data.customTitle || defaultTitle).toUpperCase();
  if (category) {
    const label = getCertificateCategoryLabel(category).toUpperCase();
    doc.setFont("UICSans", "bold");
    doc.setFontSize(7);
    const badgeWidth = Math.min(52, Math.max(25, doc.getTextWidth(label) + 10));
    doc.setFillColor(237, 245, 239);
    doc.setDrawColor(...palette.secondary);
    doc.roundedRect(width / 2 - badgeWidth / 2, 32, badgeWidth, 6, 2, 2, "FD");
    doc.setTextColor(...palette.secondary);
    doc.text(label, width / 2, 36, { align: "center" });
  }
  doc.setFont("UICSans", "bold");
  let titleFontSize = 22;
  doc.setFontSize(titleFontSize);
  while (titleFontSize > 15 && doc.getTextWidth(title) * titleFontSize / 22 > 250) titleFontSize -= 1;
  doc.setFontSize(titleFontSize);
  doc.setTextColor(...palette.primary);
  doc.text(title, width / 2, 48, { align: "center" });

  // Subtitle / Recognition line
  doc.setFont("UICSans", "italic");
  let subtitleFontSize = 10.5;
  doc.setFontSize(subtitleFontSize);
  doc.setTextColor(...palette.accent);
  const subtitle = data.specialRecognition || (organizerFamily
    ? "In recognition of dedicated service and contribution"
    : data.role ? `Presented in recognition of distinguished service as ${data.role}` : "This certificate is proudly presented to");
  let subtitleLines = doc.splitTextToSize(subtitle, 240);
  while (subtitleLines.length > 2 && subtitleFontSize > 8) {
    subtitleFontSize -= 0.5;
    doc.setFontSize(subtitleFontSize);
    subtitleLines = doc.splitTextToSize(subtitle, 240);
  }
  if (subtitleLines.length > 2) throw new Error("The recognition line is too long for the certificate. Shorten it before issuing.");
  doc.text(subtitleLines, width / 2, 54, { align: "center", lineHeightFactor: 1.2 });

  // 5. Recipient Name
  doc.setFont("UICSans", "bolditalic");
  doc.setFontSize(26);
  const recipientName = data.recipientName || "Recipient Name";
  let recipientFontSize = 26;
  let recipientLines = doc.splitTextToSize(recipientName, 230);
  while (recipientFontSize > 18 && recipientLines.length > 1) {
    recipientFontSize -= 1;
    doc.setFontSize(recipientFontSize);
    recipientLines = doc.splitTextToSize(recipientName, 230);
  }
  if (recipientLines.length > 2) throw new Error("The recipient name is too long for the certificate layout.");
  doc.setFontSize(recipientFontSize);
  doc.setTextColor(...palette.primary);
  const recipientNameY = 68;
  doc.text(recipientLines, width / 2, recipientNameY, { align: "center", lineHeightFactor: 1.15 });

  // Decorative underline under name
  const nameUnderlineWidth = 100;
  doc.setDrawColor(...palette.accent);
  doc.setLineWidth(0.6);
  const underlineY = recipientNameY + (recipientLines.length - 1) * recipientFontSize * 0.42 + 4;
  doc.line(width / 2 - nameUnderlineWidth / 2, underlineY, width / 2 + nameUnderlineWidth / 2, underlineY);
  doc.circle(width / 2, underlineY, 0.8, "FD");

  // 6. Role & Team Badges (if present)
  let yOffset = underlineY + 8;
  if (data.role || data.team) {
    doc.setFont("UICSans", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...palette.secondary);
    const roleBadgeText = [data.role, data.team ? `• ${data.team}` : ""].filter(Boolean).join(" ");
    const roleLines = doc.splitTextToSize(roleBadgeText, 220);
    if (roleLines.length > 2) throw new Error("The recipient role or team is too long for the certificate. Shorten it before issuing.");
    doc.text(roleLines, width / 2, yOffset, { align: "center", lineHeightFactor: 1.2 });
    yOffset += roleLines.length * 4 + 3;
  }

  // 7. Contribution Blurb / Paragraph
  doc.setFont("UICSans", "normal");
  doc.setTextColor(...palette.textColor);

  const organizer = data.organizerOrganization || "Unstop Igniters Club, SRM University–AP";
  const formattedEventDate = formatEventDate(data.eventDate) || data.eventDate;
  const defaultBlurb = participantFamily
    ? `This certificate is proudly presented in recognition of participation in ${data.eventTitle}, organized by ${organizer}${formattedEventDate ? ` on ${formattedEventDate}` : ""}.`
    : organizerFamily
      ? `This certificate is awarded in appreciation of the recipient's contribution${data.role ? ` as ${data.role}` : ""}${data.team ? ` in ${data.team}` : ""} for ${data.eventTitle}, organized by ${organizer}.`
      : `For dedicated contribution and exemplary participation in ${data.eventTitle}, organized by ${organizer}${formattedEventDate ? ` on ${formattedEventDate}` : ""}.`;
  const contributionText = data.contributionSummary || defaultBlurb;

  let blurbFontSize = 10;
  doc.setFontSize(blurbFontSize);
  let splitBlurb = doc.splitTextToSize(contributionText, 225);
  while (splitBlurb.length > 6 && blurbFontSize > 8) {
    blurbFontSize -= 0.5;
    doc.setFontSize(blurbFontSize);
    splitBlurb = doc.splitTextToSize(contributionText, 225);
  }
  if (splitBlurb.length > 6) throw new Error("The certificate statement is too long for the A4 layout. Shorten it before issuing.");
  doc.text(splitBlurb, width / 2, yOffset, { align: "center", lineHeightFactor: 1.35 });
  yOffset += (splitBlurb.length * blurbFontSize * 0.36) + 4;

  // 8. Event and Date details line
  doc.setFont("UICSans", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const metaParts = [
    `Event: ${data.eventTitle}`,
    formattedEventDate ? `Date: ${formattedEventDate}` : null,
    data.eventVenue ? `Venue: ${data.eventVenue}` : (data.eventIsOnline ? "Online" : null),
  ].filter(Boolean).join("  |  ");
  const metaLines = doc.splitTextToSize(metaParts, 250);
  if (metaLines.length > 2) throw new Error("Event details are too long for the certificate footer.");
  doc.text(metaLines, width / 2, yOffset, { align: "center", lineHeightFactor: 1.2 });

  // 9. Signatures (Dual Signatory Support)
  const sigY = 159;
  const sig1X = 58;
  const sig2X = width - 58;
  const signatories = [
    {
      name: data.signerName || DEFAULT_CERTIFICATE_SIGNATORIES.facultyCoordinator.printedName,
      designation: data.signerDesignation || DEFAULT_CERTIFICATE_SIGNATORIES.facultyCoordinator.designation,
      path: data.signerSignatureUrl || DEFAULT_CERTIFICATE_SIGNATORIES.facultyCoordinator.signaturePath,
      label: "Faculty Coordinator",
      centerX: sig1X,
    },
    {
      name: data.signer2Name || DEFAULT_CERTIFICATE_SIGNATORIES.president.printedName,
      designation: data.signer2Designation || DEFAULT_CERTIFICATE_SIGNATORIES.president.designation,
      path: data.signer2SignatureUrl || DEFAULT_CERTIFICATE_SIGNATORIES.president.signaturePath,
      label: "President",
      centerX: sig2X,
    },
  ];
  const addSignature = async (signatory: typeof signatories[number]) => {
    const image = await loadCertificateSignatureDataUrl(signatory.path, signatory.label);
    const dimensions = doc.getImageProperties(image);
    const scale = Math.min(52 / dimensions.width, 13 / dimensions.height);
    const imageWidth = dimensions.width * scale;
    const imageHeight = dimensions.height * scale;
    doc.addImage(image, "PNG", signatory.centerX - imageWidth / 2, sigY - imageHeight - 2, imageWidth, imageHeight);
  };

  // Keep the supplied transparent PNGs as PNGs so their original handwriting
  // and transparency are retained by jsPDF in every theme.
  for (const signatory of signatories) await addSignature(signatory);

  // Signatory 1
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(sig1X - 35, sigY, sig1X + 35, sigY);

  doc.setFont("UICSans", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...palette.primary);
  doc.text(signatories[0].name, sig1X, sigY + 5, { align: "center" });

  doc.setFont("UICSans", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(signatories[0].designation, 68), sig1X, sigY + 9, { align: "center", lineHeightFactor: 1.15 });

  // Signatory 2
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(sig2X - 35, sigY, sig2X + 35, sigY);

  doc.setFont("UICSans", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...palette.primary);
  doc.text(signatories[1].name, sig2X, sigY + 5, { align: "center" });

  doc.setFont("UICSans", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(doc.splitTextToSize(signatories[1].designation, 68), sig2X, sigY + 9, { align: "center", lineHeightFactor: 1.15 });

  // 10. Center Gold Seal
  const sealX = width / 2;
  const sealY = 143;
  doc.setDrawColor(...palette.accent);
  doc.setFillColor(...palette.accent);
  doc.circle(sealX, sealY, 11, "FD");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(sealX, sealY, 9.5, "S");

  doc.setFont("UICSans", "bold");
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
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Scan with phone camera to verify authenticity", qrX + 19, qrY + 5);
  doc.setFont("UICSans", "bold");
  doc.setTextColor(...palette.primary);
  doc.text(`Certificate No: ${data.certificateNumber}`, qrX + 19, qrY + 9);
  doc.setFont("UICSans", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Verify URL: ${verifyUrl}`, qrX + 19, qrY + 13);

  // Right-aligned issue date & security stamp
  const stampX = width - 20;
  doc.setFont("UICSans", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issued: ${formatEventDate(data.issueDate) || data.issueDate || formatEventDate(new Date().toISOString())}`, stampX, qrY + 6, { align: "right" });
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
