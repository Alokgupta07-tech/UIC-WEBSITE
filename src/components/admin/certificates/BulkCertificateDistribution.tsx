import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, ShieldCheck, AlertTriangle, Send, ClipboardCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { sendCertificateEmail } from "@/services/certificates";
import type { Certificate } from "@/types";

interface BulkCertificateDistributionProps {
  certificates: Certificate[];
  onComplete: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BulkCertificateDistribution({ certificates, onComplete }: BulkCertificateDistributionProps) {
  const [testAddress, setTestAddress] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ complete: 0, failed: 0 });
  const [confirmLiveSend, setConfirmLiveSend] = useState(false);

  const report = useMemo(() => {
    const invalid = certificates.filter((certificate) => !certificate.recipientEmail || !EMAIL_PATTERN.test(certificate.recipientEmail));
    const alreadySent = certificates.filter((certificate) => certificate.emailStatus === "sent");
    const revoked = certificates.filter((certificate) => certificate.status !== "issued");
    const eligible = certificates.filter((certificate) =>
      certificate.status === "issued" &&
      Boolean(certificate.recipientEmail && EMAIL_PATTERN.test(certificate.recipientEmail)) &&
      certificate.emailStatus !== "sent"
    );
    return { invalid, alreadySent, revoked, eligible };
  }, [certificates]);

  const sendTest = async () => {
    if (!EMAIL_PATTERN.test(testAddress.trim())) {
      toast.error("Enter a valid test email address.");
      return;
    }
    const certificate = report.eligible[0];
    if (!certificate) {
      toast.error("Select at least one eligible certificate in the Registry first.");
      return;
    }
    setIsSending(true);
    try {
      const result = await sendCertificateEmail(certificate, { testRecipientEmail: testAddress.trim() });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test email failed.");
    } finally {
      setIsSending(false);
    }
  };

  const sendLiveCampaign = async () => {
    if (isSending || report.eligible.length === 0) return;
    setConfirmLiveSend(false);
    setIsSending(true);
    setProgress({ complete: 0, failed: 0 });
    let complete = 0;
    let failed = 0;

    // One addressed message and one certificate PDF per recipient. Sequential
    // sends keep pressure on the provider bounded and isolate per-recipient failures.
    for (const certificate of report.eligible) {
      try {
        await sendCertificateEmail(certificate);
      } catch {
        failed += 1;
      }
      complete += 1;
      setProgress({ complete, failed });
    }

    setIsSending(false);
    onComplete();
    toast.success(`Campaign finished: ${complete - failed} accepted, ${failed} failed.`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Bulk Certificate Distribution
          </CardTitle>
          <CardDescription>
            Select certificates in Registry & Directory first. A separate personalized email and signed PDF is sent for each eligible recipient.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {certificates.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No certificates selected. Return to Registry & Directory and select issued certificates.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Selected certificates</p><p className="text-xl font-bold">{certificates.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Recipients / PDF attachments</p><p className="text-xl font-bold">{report.eligible.length} / {report.eligible.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Missing or invalid email</p><p className="text-xl font-bold">{report.invalid.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Already accepted / ineligible</p><p className="text-xl font-bold">{report.alreadySent.length} / {report.revoked.length}</p></div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Preflight report</h3>
                <div className="max-h-64 overflow-auto rounded-md border">
                  {certificates.map((certificate) => {
                    const eligible = report.eligible.some((item) => item.id === certificate.id);
                    const issue = !certificate.recipientEmail || !EMAIL_PATTERN.test(certificate.recipientEmail)
                      ? "Missing or invalid email"
                      : certificate.status !== "issued"
                        ? "Certificate is not active"
                        : certificate.emailStatus === "sent"
                          ? "Already accepted; excluded to prevent duplicate email"
                          : "Ready to send";
                    return (
                      <div key={certificate.id} className="flex flex-wrap items-center justify-between gap-2 border-b p-3 last:border-b-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{certificate.recipientName} · {certificate.certificateNumber}</p>
                          <p className="truncate text-xs text-muted-foreground">{certificate.recipientEmail || "No email address"} · {certificate.eventTitle || "Event unavailable"}</p>
                        </div>
                        <Badge variant={eligible ? "secondary" : issue.startsWith("Missing") || issue.startsWith("Certificate is") ? "destructive" : "outline"}>
                          {issue}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold">Test delivery</p>
                    <p className="text-xs text-muted-foreground">Sends only the first eligible signed PDF to the test address. It does not mark the participant's delivery as sent.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input type="email" value={testAddress} onChange={(event) => setTestAddress(event.target.value)} placeholder="Admin test email address" aria-label="Test email address" />
                  <Button type="button" variant="outline" disabled={isSending || report.eligible.length === 0} onClick={() => void sendTest()}>
                    <Send className="mr-2 h-4 w-4" /> Send test
                  </Button>
                </div>
              </div>

              {isSending && (
                <div className="space-y-2" role="status" aria-live="polite">
                  <div className="flex justify-between text-xs"><span>Processing recipients</span><span>{progress.complete} / {report.eligible.length} · {progress.failed} failed</span></div>
                  <div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${report.eligible.length ? (progress.complete / report.eligible.length) * 100 : 0}%` }} /></div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Dry run above excludes invalid, revoked, and previously accepted records.</p>
                <Button type="button" disabled={isSending || report.eligible.length === 0} onClick={() => setConfirmLiveSend(true)}>
                  <ClipboardCheck className="mr-2 h-4 w-4" /> Send {report.eligible.length} certificates
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmLiveSend} onOpenChange={setConfirmLiveSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm certificate distribution</AlertDialogTitle>
            <AlertDialogDescription>
              This will send {report.eligible.length} individual emails with {report.eligible.length} signed PDF attachment(s), one to each certificate's recorded recipient. Previously accepted and ineligible certificates are excluded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review again</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void sendLiveCampaign(); }}>
              Send certificates
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
