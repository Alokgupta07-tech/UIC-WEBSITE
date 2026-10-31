import { createServer } from "vite";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = process.cwd();
const outputDirectory = join(tmpdir(), `uic-certificate-qa-${Date.now()}`);
await mkdir(outputDirectory, { recursive: true });
globalThis.window = globalThis;
globalThis.location = { origin: "http://localhost" };
globalThis.FileReader = class {
  async readAsDataURL(blob) {
    this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
    this.onload?.();
  }
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const value = String(input);
  if (value.startsWith("/assets/certificates/")) {
    const file = resolve(root, "public", value.slice(1));
    const type = value.endsWith(".png") ? "image/png" : "font/ttf";
    return new Response(new Blob([await readFile(file)], { type }), { status: 200 });
  }
  return originalFetch(input, init);
};

const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { "@": resolve(root, "src") } },
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  appType: "custom",
  logLevel: "error",
});

const cases = [
  ["participant-normal", { recipientCategory: "participant", certificateType: "Participation", recipientName: "Aarav Kumar", eventTitle: "UIC Innovation Summit" }],
  ["participant-long-unicode", { recipientCategory: "participant", certificateType: "Participation", recipientName: "Dr. Ananya Müller–Rao with an exceptionally long full name", eventTitle: "International Student Innovation and Entrepreneurship Conference 2026", contributionSummary: "Recognized for active participation, thoughtful collaboration, and meaningful contributions during the event." }],
  ["winner", { recipientCategory: "winner", certificateType: "Achievement", recipientName: "R. S. Keerthana", eventTitle: "Campus Innovation Challenge", role: "First Place Winner" }],
  ["organizer-president", { recipientCategory: "organizer", certificateType: "Appreciation", recipientName: "Revanth Boina", eventTitle: "UIC Leadership Forum", role: "President", team: "Core Organizing Committee" }],
  ["organizer-admin-lead", { recipientCategory: "team_member", certificateType: "Appreciation", recipientName: "M. S. Sai Teja", eventTitle: "UIC Career Readiness Workshop", role: "Administrative Lead", team: "Operations and Event Coordination Team" }],
  ["organizer-marketing", { recipientCategory: "team_member", certificateType: "Appreciation", recipientName: "Priya S. Nair", eventTitle: "UIC Annual Festival", role: "Marketing & Campaign Specialist", team: "Communications and Outreach" }],
  ["organizer-technical", { recipientCategory: "team_member", certificateType: "Appreciation", recipientName: "K. V. Sandeep", eventTitle: "UIC Hackathon", role: "Technical Lead", team: "Technology and Platform Engineering" }],
  ["organizer-volunteer-long", { recipientCategory: "volunteer", certificateType: "Appreciation", recipientName: "Samyukta Rao", eventTitle: "University-wide Student Leadership and Innovation Conference", role: "Volunteer and On-site Logistics Coordinator", team: "Event Operations, Guest Services, and Participant Support", contributionSummary: "In appreciation of the recipient’s exceptional dedication, reliable support, positive collaboration, and thoughtful assistance across planning, registration, on-site coordination, and event closeout." }],
  ["participant-appreciation-design2", { recipientCategory: "participant", certificateType: "Certificate of Appreciation", themeKey: "organizer-forest", customTitle: "CERTIFICATE OF APPRECIATION", recipientName: "Siddharth Verma", eventTitle: "UIC Vibe Coding Contest", contributionSummary: "In recognition of outstanding performance, creativity, initiative, and dedication demonstrated during the Vibe Coding Contest. Your valuable contribution and enthusiasm are sincerely appreciated by Unstop Igniters Club, SRM University–AP." }],
  ["participant-appreciation-design1", { recipientCategory: "participant", certificateType: "Certificate of Appreciation", themeKey: "participant-emerald", customTitle: "CERTIFICATE OF APPRECIATION", recipientName: "Aditi Sharma", eventTitle: "UIC AI Innovation Sprint", contributionSummary: "In recognition of remarkable problem solving, creativity, and active initiative shown during the contest." }],
  ["participant-appreciation-default-routing", { recipientCategory: "participant", certificateType: "Certificate of Appreciation", customTitle: "CERTIFICATE OF APPRECIATION", recipientName: "Rohan Das", eventTitle: "UIC Ideathon", specialRecognition: "OUTSTANDING CONTRIBUTION" }],
  ["participant-achievement", { recipientCategory: "participant", certificateType: "Certificate of Achievement", customTitle: "CERTIFICATE OF ACHIEVEMENT", recipientName: "Meera Krishnan", eventTitle: "UIC CodeSprint 3.0", contributionSummary: "For exceptional problem solving and consistent top-tier performance across all contest rounds." }],
  ["mentor-recognition", { recipientCategory: "mentor", certificateType: "Certificate of Recognition", customTitle: "CERTIFICATE OF RECOGNITION", recipientName: "Dr. Vikram Sethi", eventTitle: "National Hackathon Finale", role: "Technical Mentor", team: "Mentorship Panel" }],
];

try {
  const { createCertificatePdf } = await server.ssrLoadModule("/src/lib/certificatePdf.ts");
  const results = [];
  for (const [name, overrides] of cases) {
    const pdf = await createCertificatePdf({
      certificateNumber: `UIC-QA-${name.toUpperCase()}`,
      verificationToken: "0123456789abcdef0123456789abcdef",
      recipientName: "Test Recipient",
      eventTitle: "Test Event",
      eventDate: "2026-10-29",
      eventVenue: "SRM University–AP",
      recipientCategory: "participant",
      issueDate: "2026-10-30",
      signerName: "Faculty Coordinator",
      signerDesignation: "Unstop Igniters Club, SRM University–AP",
      signerSignatureUrl: "/assets/certificates/signatures/faculty-coordinator.png",
      signer2Name: "Revanth Boina",
      signer2Designation: "President, Unstop Igniters Club, SRM University–AP",
      signer2SignatureUrl: "/assets/certificates/signatures/president-revanth-boina.png",
      ...overrides,
    });
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    if (Math.abs(width - 297) > 0.05 || Math.abs(height - 210) > 0.05) throw new Error(`${name}: page is not A4 landscape.`);
    if (pdf.internal.getNumberOfPages() !== 1) throw new Error(`${name}: PDF has an unexpected page count.`);

    const bytes = Buffer.from(await pdf.output("arraybuffer"));
    const raw = bytes.toString("latin1");
    // 2 signatures + QR + 3 official logos (Unstop, UIC, SRM University–AP)
    const signatureAndQrImages = (raw.match(/\/Subtype\s*\/Image/g) ?? []).length;
    const embeddedFonts = (raw.match(/\/FontFile2/g) ?? []).length;
    if (!raw.startsWith("%PDF-") || signatureAndQrImages < 8) throw new Error(`${name}: PDF, signature images, QR, or the three official logos are missing.`);
    if (embeddedFonts < 4) throw new Error(`${name}: required embedded font faces are missing.`);
    await writeFile(join(outputDirectory, `${name}.pdf`), bytes);
    results.push({ name, widthMm: Number(width.toFixed(2)), heightMm: Number(height.toFixed(2)), pages: 1, signatureAndQrImages, embeddedFonts, bytes: bytes.length });
  }

  try {
    await createCertificatePdf({ certificateNumber: "UIC-QA-UNCATEGORIZED", verificationToken: "0123456789abcdef0123456789abcdef", recipientName: "Test", eventTitle: "Test" });
    throw new Error("Unclassified certificates must be blocked.");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("category needs administrator review")) throw error;
  }

  console.log(JSON.stringify({ passed: results.length, outputDirectory, results }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
