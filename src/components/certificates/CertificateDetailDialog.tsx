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
import { CertificateRecord } from "@/components/certificates/CertificateRecord";
import { CertificateActions } from "@/components/certificates/CertificateActions";
import { VerificationVerdict } from "@/components/certificates/VerificationVerdict";
import { ErrorState } from "@/components/dashboard/SectionStates";
import { verifyCertificate } from "@/services/certificates";
import type { Certificate } from "@/types";

interface CertificateDetailDialogProps {
  certificate: Certificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full certificate view for a certificate the member already owns.
 *
 * Even here the record is re-fetched through the same `verify_certificate` RPC
 * the QR scanner uses, so the member always sees a server-confirmed record
 * rather than values rendered straight from a client-side row.
 */
export function CertificateDetailDialog({
  certificate,
  open,
  onOpenChange,
}: CertificateDetailDialogProps) {
  const token = certificate?.verificationToken ?? null;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["certificate-verification", token],
    enabled: open && Boolean(token),
    queryFn: () => verifyCertificate(token as string),
    staleTime: 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4 pr-12 text-left sm:p-6 sm:pr-14">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            Certificate details
          </DialogTitle>
          <DialogDescription>
            {certificate?.certificateNumber
              ? `Verification record for ${certificate.certificateNumber}`
              : "Verification record"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-11rem)]">
          <div className="space-y-4 p-4 sm:p-6">
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
              <div className="space-y-4 motion-safe:animate-fade-in">
                <VerificationVerdict verdict={data.verdict} />
                {data.verdict !== "not_found" && data.verdict !== "invalid" && (
                  <>
                    <CertificateRecord data={data} />
                    <CertificateActions data={data} token={token} />
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
