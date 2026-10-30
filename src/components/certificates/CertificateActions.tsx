import { useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildVerificationUrl } from "@/services/certificates";
import { downloadCertificatePdf } from "@/lib/certificatePdf";
import type { CertificateVerification } from "@/types";

interface CertificateActionsProps {
  data: CertificateVerification;
  /** Verification token, when the caller knows it. Enables the share action. */
  token?: string | null;
  /** Hidden on the public page, where the share link is already the page URL. */
  showShare?: boolean;
}

/** Copy text with a graceful fallback for browsers without the async clipboard. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

/**
 * Actions for a verified certificate: generate and download the signed PDF,
 * share the public verification link and copy the certificate ID.
 *
 * The share link always points at the public verification page, never at the
 * signed-in dashboard. The generated file uses verified certificate data and
 * the same official signature images as the preview and admin PDF.
 */
export function CertificateActions({
  data,
  token,
  showShare = true,
}: CertificateActionsProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const isValid = data.verdict === "verified";
  const shareUrl = token ? buildVerificationUrl(token) : null;

  const handleDownloadCertificate = async () => {
    if (!isValid || !data.certificateNumber || !data.recipientName || !token) {
      toast.error("Certificate details are incomplete, so a signed PDF cannot be generated.");
      return;
    }

    setIsDownloading(true);
    try {
      await downloadCertificatePdf({
        certificateNumber: data.certificateNumber,
        verificationToken: token,
        recipientName: data.recipientName,
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
        themeKey: data.templateKey,
      });
      toast.success("Signed certificate PDF downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the signed PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyId = async () => {
    if (!data.certificateNumber) return;
    const ok = await copyText(data.certificateNumber);
    if (ok) {
      setCopiedId(true);
      toast.success("Certificate ID copied.");
      window.setTimeout(() => setCopiedId(false), 2000);
    } else {
      toast.error("Could not copy the certificate ID.");
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;

    const title = `UIC certificate ${data.certificateNumber ?? ""}`.trim();
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: "Verify this Unstop Igniters Club certificate",
          url: shareUrl,
        });
        return;
      } catch (error) {
        // A user-cancelled share is not a failure; anything else falls back to copy.
        if ((error as { name?: string } | null)?.name === "AbortError") return;
      }
    }

    const ok = await copyText(shareUrl);
    toast[ok ? "success" : "error"](
      ok ? "Verification link copied." : "Could not copy the verification link."
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isValid && token && (
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          onClick={() => void handleDownloadCertificate()}
          disabled={isDownloading}
        >
          <Download className="h-4 w-4" aria-hidden />
          {isDownloading ? "Generating signed PDF…" : "Download signed PDF"}
        </Button>
      )}

      {showShare && shareUrl && (
        <Button size="sm" variant="outline" className="gap-2" onClick={handleShare}>
          <Share2 className="h-4 w-4" aria-hidden />
          Share Verification
        </Button>
      )}

      {data.certificateNumber && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-2"
          onClick={handleCopyId}
          aria-label={`Copy certificate ID ${data.certificateNumber}`}
        >
          {copiedId ? (
            <Check className="h-4 w-4 text-success" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          Copy ID
        </Button>
      )}
    </div>
  );
}
