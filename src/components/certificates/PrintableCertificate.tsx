import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, LoaderCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadCertificatePdf, getCertificatePdfBlob } from "@/lib/certificatePdf";
import type { CertificateVerification } from "@/types";

export type CertificateThemeKey =
  | "participant-classic"
  | "participant-emerald"
  | "organizer-forest"
  | "organizer-prestige"
  | "cyber-emerald"
  | "royal-sapphire"
  | "imperial-ruby"
  | "amethyst-prestige"
  | "grand-monarch";

interface PrintableCertificateProps {
  data: CertificateVerification;
  token?: string | null;
  initialTheme?: CertificateThemeKey;
}

/**
 * Show the same generated PDF that the download and email paths use. Keeping
 * the PDF as the preview source prevents a second React/CSS certificate layout
 * from drifting away from the issued document.
 */
export function PrintableCertificate({ data, token, initialTheme }: PrintableCertificateProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const pdfData = useMemo(() => ({
    certificateNumber: data.certificateNumber || "UIC-CERTIFICATE",
    verificationToken: token || "",
    recipientName: data.recipientName || "Recipient",
    eventTitle: data.eventTitle || "UIC Event",
    eventDate: data.eventDate,
    eventVenue: data.eventVenue,
    eventIsOnline: data.eventIsOnline,
    certificateType: data.certificateType,
    recipientCategory: data.recipientCategory,
    customTitle: data.customTitle,
    role: data.role,
    team: data.team,
    contributionSummary: data.contributionSummary,
    specialRecognition: data.specialRecognition,
    organizerOrganization: data.organizerOrganization,
    signerName: data.signerName,
    signerDesignation: data.signerDesignation,
    signerSignatureUrl: data.signerSignatureUrl,
    signer2Name: data.signer2Name,
    signer2Designation: data.signer2Designation,
    signer2SignatureUrl: data.signer2SignatureUrl,
    issueDate: data.issueDate,
    themeKey: initialTheme || data.templateKey || "royal-sapphire",
  }), [data, initialTheme, token]);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    setPdfUrl(null);
    setLoadError(null);

    void getCertificatePdfBlob(pdfData).then((blob) => {
      if (!active) return;
      createdUrl = URL.createObjectURL(blob);
      setPdfUrl(createdUrl);
    }).catch(() => {
      if (active) setLoadError("Category or signature review is required before generating this PDF.");
    });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [pdfData]);

  const handleDownload = async () => {
    try {
      await downloadCertificatePdf(pdfData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the signed PDF.");
    }
  };

  const handleCopyId = async () => {
    if (!data.certificateNumber) return;
    try {
      await navigator.clipboard.writeText(data.certificateNumber);
      toast.success("Certificate ID copied.");
    } catch {
      toast.error("Could not copy the certificate ID.");
    }
  };

  return (
    <section className="space-y-3" aria-label="Certificate PDF preview">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground">A4 landscape preview of the final signed PDF</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => previewFrame.current?.contentWindow?.print()} disabled={!pdfUrl}>
            <Printer className="mr-2 h-4 w-4" aria-hidden /> Print
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyId()} disabled={!data.certificateNumber}>
            <Copy className="mr-2 h-4 w-4" aria-hidden /> Copy ID
          </Button>
          <Button type="button" size="sm" onClick={() => void handleDownload()} disabled={!pdfUrl}>
            <Download className="mr-2 h-4 w-4" aria-hidden /> Download PDF
          </Button>
        </div>
      </div>
      {pdfUrl ? (
        <iframe
          ref={previewFrame}
          src={pdfUrl}
          title={`Certificate preview for ${pdfData.recipientName}`}
          className="block w-full aspect-[297/210] rounded-md border bg-white"
        />
      ) : (
        <div className="flex aspect-[297/210] w-full items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground" role={loadError ? "alert" : "status"}>
          {loadError ? loadError : <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Preparing signed certificate preview…</>}
        </div>
      )}
    </section>
  );
}

export default PrintableCertificate;
