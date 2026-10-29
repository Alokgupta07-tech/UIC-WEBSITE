/** Approved signatories used across every UIC certificate renderer. */
export const CERTIFICATE_SIGNATORIES = {
  facultyCoordinator: {
    printedName: "Faculty Coordinator",
    designation: "Unstop Igniters Club, SRM University–AP",
    signaturePath: `${import.meta.env.BASE_URL}assets/certificates/signatures/faculty-coordinator.png`,
    active: true,
  },
  president: {
    printedName: "Revanth Boina",
    designation: "President, Unstop Igniters Club, SRM University–AP",
    signaturePath: `${import.meta.env.BASE_URL}assets/certificates/signatures/president-revanth-boina.png`,
    active: true,
  },
} as const;

export type CertificateSignatoryKey = keyof typeof CERTIFICATE_SIGNATORIES;

export async function loadCertificateSignatureDataUrl(key: CertificateSignatoryKey): Promise<string> {
  const signatory = CERTIFICATE_SIGNATORIES[key];
  if (!signatory.active) throw new Error(`The ${signatory.printedName} signature is not active.`);

  const response = await fetch(signatory.signaturePath);
  if (!response.ok) throw new Error(`Could not load the ${signatory.printedName} signature asset.`);

  const blob = await response.blob();
  if (blob.type !== "image/png") throw new Error(`The ${signatory.printedName} signature must be a PNG image.`);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error(`Could not read the ${signatory.printedName} signature image.`));
    reader.onerror = () => reject(new Error(`Could not read the ${signatory.printedName} signature image.`));
    reader.readAsDataURL(blob);
  });
}
