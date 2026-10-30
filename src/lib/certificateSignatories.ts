export interface CertificateSignatory {
  printedName: string;
  designation: string;
  signaturePath: string;
}

export interface CertificateSignatoryConfiguration {
  facultyCoordinator: CertificateSignatory;
  president: CertificateSignatory;
}

const assetPath = (filename: string) => `${import.meta.env.BASE_URL}assets/certificates/signatures/${filename}`;

export const DEFAULT_CERTIFICATE_SIGNATORIES: CertificateSignatoryConfiguration = {
  facultyCoordinator: {
    printedName: "Faculty Coordinator",
    designation: "Unstop Igniters Club, SRM University–AP",
    signaturePath: assetPath("faculty-coordinator.png"),
  },
  president: {
    printedName: "Revanth Boina",
    designation: "President, Unstop Igniters Club, SRM University–AP",
    signaturePath: assetPath("president-revanth-boina.png"),
  },
};

/** Compatibility defaults for legacy UI components; new records use the saved admin configuration. */
export const CERTIFICATE_SIGNATORIES = DEFAULT_CERTIFICATE_SIGNATORIES;

/** Keep uploaded/configured signature sources within the site's signature assets. */
export function normalizeCertificateSignaturePath(value: string): string {
  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
  const allowedPrefix = `${basePath.endsWith("/") ? basePath : `${basePath}/`}assets/certificates/signatures/`;
  const parsed = new URL(value.trim(), window.location.origin);
  if (
    parsed.origin !== window.location.origin ||
    !parsed.pathname.startsWith(allowedPrefix) ||
    parsed.search || parsed.hash
  ) {
    throw new Error("Signature files must be selected from the site's certificate signatures folder.");
  }
  return parsed.pathname;
}

export function parseCertificateSignatoryConfiguration(raw: string | null | undefined): CertificateSignatoryConfiguration {
  if (!raw) return DEFAULT_CERTIFICATE_SIGNATORIES;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Saved certificate signatory settings are invalid JSON. Correct them in Admin → Settings before issuing certificates.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Saved certificate signatory settings are invalid. Correct them in Admin → Settings before issuing certificates.");
  }

  const record = parsed as Record<string, unknown>;
  const parseOne = (key: keyof CertificateSignatoryConfiguration): CertificateSignatory => {
    const entry = record[key];
    if (!entry || typeof entry !== "object") throw new Error(`Missing ${key} certificate signatory settings.`);
    const signer = entry as Record<string, unknown>;
    const printedName = typeof signer.printedName === "string" ? signer.printedName.trim() : "";
    const designation = typeof signer.designation === "string" ? signer.designation.trim() : "";
    const signaturePath = typeof signer.signaturePath === "string" ? signer.signaturePath.trim() : "";
    if (!printedName || printedName.length > 80 || !designation || designation.length > 140 || !signaturePath) {
      throw new Error(`Complete the ${key} name, designation, and signature asset in Admin → Settings.`);
    }
    return { printedName, designation, signaturePath: normalizeCertificateSignaturePath(signaturePath) };
  };

  return {
    facultyCoordinator: parseOne("facultyCoordinator"),
    president: parseOne("president"),
  };
}

export async function loadCertificateSignatureDataUrl(signaturePath: string, printedName: string): Promise<string> {
  const safePath = normalizeCertificateSignaturePath(signaturePath);
  const response = await fetch(safePath);
  if (!response.ok) throw new Error(`Could not load the ${printedName} signature asset. Issuance is blocked until the configured file is available.`);

  const blob = await response.blob();
  if (blob.type !== "image/png") throw new Error(`The ${printedName} signature must be a PNG image.`);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error(`Could not read the ${printedName} signature image.`));
    reader.onerror = () => reject(new Error(`Could not read the ${printedName} signature image.`));
    reader.readAsDataURL(blob);
  });
}
