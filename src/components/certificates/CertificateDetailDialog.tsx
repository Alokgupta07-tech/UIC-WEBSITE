import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CertificateRecord } from "@/components/certificates/CertificateRecord";
import { CertificateActions } from "@/components/certificates/CertificateActions";
import { VerificationVerdict } from "@/components/certificates/VerificationVerdict";
import { PrintableCertificate } from "@/components/certificates/PrintableCertificate";
import { ErrorState } from "@/components/dashboard/SectionStates";
import { verifyCertificate } from "@/services/certificates";
import type { Certificate } from "@/types";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

interface CertificateDetailDialogProps {
  certificate: Certificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full certificate view for a certificate the member already owns.
 *
 * Shows the **PrintableCertificate** canvas prominently at the top, with the
 * verification metadata in a collapsible section below. The dialog padding and
 * scroll area are fixed so the VerificationVerdict banner is never clipped by
 * the sticky header.
 */
export function CertificateDetailDialog({
  certificate,
  open,
  onOpenChange,
}: CertificateDetailDialogProps) {
  const token = certificate?.verificationToken ?? null;
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["certificate-verification", token],
    enabled: open && Boolean(token),
    queryFn: () => verifyCertificate(token as string),
    staleTime: 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-[calc(100vw-1.5rem)] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-4xl">
        {/* Header — fixed padding so it doesn't overlap content */}
        <DialogHeader className="border-b px-4 py-4 pr-12 text-left sm:px-6 sm:pr-14">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            Certificate Details
          </DialogTitle>
          <DialogDescription>
            {certificate?.certificateNumber
              ? `Verification record for ${certificate.certificateNumber}`
              : "Verification record"}
          </DialogDescription>
        </DialogHeader>

        {/* Scroll area — pt-4 ensures the verdict banner is visible below the header */}
        <ScrollArea className="max-h-[calc(95vh-9rem)]">
          <div className="space-y-4 p-4 pt-5 sm:p-6 sm:pt-6">
            {isLoading && (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-center gap-3 py-12"
              >
                <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                <p className="text-sm text-muted-foreground">Verifying certificate…</p>
              </div>
            )}

            {isError && (
              <ErrorState
                title="Unable to verify this certificate"
                description="We could not reach the verification service. Please try again."
                onRetry={() => void refetch()}
                isRetrying={isFetching}
              />
            )}

            {data && (
              <div className="space-y-5 motion-safe:animate-fade-in">
                {/* Verdict banner — now with proper spacing, never clipped */}
                <VerificationVerdict verdict={data.verdict} />

                {data.verdict !== "not_found" && data.verdict !== "invalid" && (
                  <>
                    {/* ═══ PRIMARY: Printable Certificate Canvas ═══ */}
                    <PrintableCertificate data={data} token={token} />

                    <Separator />

                    {/* ═══ COLLAPSIBLE: Verification Details ═══ */}
                    <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full gap-2 justify-between">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Verification Details
                          </span>
                          {detailsOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 space-y-4">
                        <CertificateRecord data={data} />
                        <CertificateActions data={data} token={token} />
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t p-4 sm:p-6">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CertificateDetailDialog;
