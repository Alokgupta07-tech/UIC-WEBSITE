import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildVerificationUrl } from "@/services/certificates";
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
 * Actions for a verified certificate: open the certificate file, download it,
 * share the public verification link and copy the certificate ID.
 *
 * The share link always points at the public verification page, never at the
 * signed-in dashboard. File actions only appear when the record actually carries
 * a file URL — no dead buttons.
 */
export function CertificateActions({
  data,
  token,
  showShare = true,
}: CertificateActionsProps) {
  const [copiedId, setCopiedId] = useState(false);
  const isValid = data.verdict === "verified";
  const fileUrl = isValid ? data.certificateFileUrl : null;
  const shareUrl = token ? buildVerificationUrl(token) : null;

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
      {fileUrl && (
        <>
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden />
              View Certificate
            </a>
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            asChild
          >
            <a href={fileUrl} target="_blank" rel="noreferrer" download>
              <Download className="h-4 w-4" aria-hidden />
              Download
            </a>
          </Button>
        </>
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
