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
  ["participant-normal", { recipientCategory: "participant", recipientName: "Aarav Kumar", eventTitle: "UIC Innovation Summit" }],
  ["participant-long-unicode", { recipientCategory: "participant", recipientName: "Dr. Ananya Müller–Rao with an exceptionally long full name", eventTitle: "International Student Innovation and Entrepreneurship Conference 2026", contributionSummary: "Recognized for active participation, thoughtful collaboration, and meaningful contributions during the event." }],
  ["winner", { recipientCategory: "winner", recipientName: "R. S. Keerthana", eventTitle: "Campus Innovation Challenge", role: "First Place Winner" }],
  ["organizer-president", { recipientCategory: "organizer", recipientName: "Revanth Boina", eventTitle: "UIC Leadership Forum", role: "President", team: "Core Organizing Committee" }],
  ["organizer-admin-lead", { recipientCategory: "team_member", recipientName: "M. S. Sai Teja", eventTitle: "UIC Career Readiness Workshop", role: "Administrative Lead", team: "Operations and Event Coordination Team" }],
  ["organizer-marketing", { recipientCategory: "team_member", recipientName: "Priya S. Nair", eventTitle: "UIC Annual Festival", role: "Marketing & Campaign Specialist", team: "Communications and Outreach" }],
  ["organizer-technical", { recipientCategory: "team_member", recipientName: "K. V. Sandeep", eventTitle: "UIC Hackathon", role: "Technical Lead", team: "Technology and Platform Engineering" }],
  ["organizer-volunteer-long", { recipientCategory: "volunteer", recipientName: "Samyukta Rao", eventTitle: "University-wide Student Leadership and Innovation Conference", role: "Volunteer and On-site Logistics Coordinator", team: "Event Operations, Guest Services, and Participant Support", contributionSummary: "In appreciation of the recipient’s exceptional dedication, reliable support, positive collaboration, and thoughtful assistance across planning, registration, on-site coordination, and event closeout." }],
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
      certificateType: "Appreciation",
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
    const signatureAndQrImages = (raw.match(/\/Subtype\s*\/Image/g) ?? []).length;
    const embeddedFonts = (raw.match(/\/FontFile2/g) ?? []).length;
    if (!raw.startsWith("%PDF-") || signatureAndQrImages < 5) throw new Error(`${name}: PDF or both signature images/QR are missing.`);
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
