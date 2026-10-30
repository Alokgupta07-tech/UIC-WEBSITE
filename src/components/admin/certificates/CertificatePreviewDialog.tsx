import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PrintableCertificate, type CertificateThemeKey } from "@/components/certificates/PrintableCertificate";
import type { Certificate } from "@/types";

interface CertificatePreviewDialogProps {
  certificate: Certificate | null;
  onClose: () => void;
}

export function CertificatePreviewDialog({
  certificate,
  onClose,
}: CertificatePreviewDialogProps) {
  if (!certificate) return null;

  const verificationData = {
    verdict: "verified" as const,
    certificateNumber: certificate.certificateNumber,
    certificateType: certificate.certificateType,
    recipientCategory: certificate.recipientCategory,
    recipientName: certificate.recipientName,
    eventTitle: certificate.eventTitle,
    eventDescription: null,
    eventDate: certificate.eventDate,
    eventVenue: certificate.eventVenue,
    eventIsOnline: certificate.eventIsOnline,
    eventCategory: certificate.eventCategory,
    organizerName: certificate.organizerName,
    organizerOrganization: certificate.organizerOrganization,
    signerName: certificate.signerName,
    signerDesignation: certificate.signerDesignation,
    signerSignatureUrl: certificate.signerSignatureUrl,
    signer2Name: certificate.signer2Name,
    signer2Designation: certificate.signer2Designation,
    signer2SignatureUrl: certificate.signer2SignatureUrl,
    certificateFileUrl: certificate.certificateFileUrl,
    issueDate: certificate.issueDate,
    verifiedAt: new Date().toISOString(),
    role: certificate.role,
    team: certificate.team,
    contributionSummary: certificate.contributionSummary,
    customTitle: certificate.customTitle,
    specialRecognition: certificate.specialRecognition,
    templateKey: certificate.templateKey,
  };
  const themeKeys: CertificateThemeKey[] = [
    "participant-classic",
    "participant-emerald",
    "organizer-forest",
    "organizer-prestige",
    "cyber-emerald",
    "royal-sapphire",
    "imperial-ruby",
    "amethyst-prestige",
    "grand-monarch",
  ];
  const initialTheme = themeKeys.find((key) => key === certificate.templateKey);

  return (
    <Dialog open={Boolean(certificate)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg">
            Certificate Preview — {certificate.certificateNumber}
          </DialogTitle>
          <DialogDescription>
            Live vector presentation for {certificate.recipientName} ({certificate.certificateType})
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <PrintableCertificate
            data={verificationData}
            token={certificate.verificationToken}
            initialTheme={initialTheme}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
