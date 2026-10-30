import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  ShieldCheck,
  AlertTriangle,
  Send,
  ClipboardCheck,
  Download,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  FileSpreadsheet,
} from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sendCertificateEmail } from "@/services/certificates";
import type { Certificate } from "@/types";

interface BulkCertificateDistributionProps {
  certificates: Certificate[];
  onComplete: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DeliveryResult {
  certificateId: string;
  certificateNumber: string;
  recipientName: string;
  recipientEmail: string;
  eventTitle: string | null;
  status: "sent" | "failed" | "skipped";
  error?: string;
  timestamp: string;
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BulkCertificateDistribution({ certificates, onComplete }: BulkCertificateDistributionProps) {
  const [testAddress, setTestAddress] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ complete: 0, failed: 0 });
  const [confirmLiveSend, setConfirmLiveSend] = useState(false);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryResult[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"preflight" | "history">("preflight");

  const report = useMemo(() => {
    const invalid = certificates.filter((certificate) => !certificate.recipientEmail || !EMAIL_PATTERN.test(certificate.recipientEmail));
    const alreadySent = certificates.filter((certificate) => certificate.emailStatus === "sent");
    const revoked = certificates.filter((certificate) => certificate.status !== "issued");
    const unclassified = certificates.filter((certificate) => !certificate.recipientCategory);
    const eligible = certificates.filter((certificate) =>
      certificate.status === "issued" &&
      Boolean(certificate.recipientCategory) &&
      Boolean(certificate.recipientEmail && EMAIL_PATTERN.test(certificate.recipientEmail)) &&
      certificate.emailStatus !== "sent"
    );
    return { invalid, alreadySent, revoked, unclassified, eligible };
  }, [certificates]);

  const historyStats = useMemo(() => {
    const sent = deliveryHistory.filter((r) => r.status === "sent").length;
    const failed = deliveryHistory.filter((r) => r.status === "failed").length;
    const skipped = deliveryHistory.filter((r) => r.status === "skipped").length;
    return { sent, failed, skipped, total: deliveryHistory.length };
  }, [deliveryHistory]);

  const failedInHistory = useMemo(
    () => deliveryHistory.filter((r) => r.status === "failed"),
    [deliveryHistory]
  );

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
    const results: DeliveryResult[] = [];
    let complete = 0;
    let failed = 0;

    for (const certificate of report.eligible) {
      const result: DeliveryResult = {
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        recipientName: certificate.recipientName,
        recipientEmail: certificate.recipientEmail || "",
        eventTitle: certificate.eventTitle,
        status: "sent",
        timestamp: new Date().toISOString(),
      };
      try {
        await sendCertificateEmail(certificate);
      } catch (err) {
        failed += 1;
        result.status = "failed";
        result.error = err instanceof Error ? err.message : "Unknown error";
      }
      complete += 1;
      results.push(result);
      setProgress({ complete, failed });
    }

    setDeliveryHistory((prev) => [...results, ...prev]);
    setIsSending(false);
    setActiveSubTab("history");
    onComplete();
    toast.success(`Campaign finished: ${complete - failed} accepted, ${failed} failed.`);
  };

  const retryFailed = async () => {
    if (isSending || failedInHistory.length === 0) return;
    setIsSending(true);
    setProgress({ complete: 0, failed: 0 });
    const retryIds = new Set(failedInHistory.map((r) => r.certificateId));
    const retryTargets = certificates.filter((c) => retryIds.has(c.id) && c.status === "issued" && c.emailStatus !== "sent");
    let complete = 0;
    let failed = 0;
    const results: DeliveryResult[] = [];

    for (const certificate of retryTargets) {
      const result: DeliveryResult = {
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        recipientName: certificate.recipientName,
        recipientEmail: certificate.recipientEmail || "",
        eventTitle: certificate.eventTitle,
        status: "sent",
        timestamp: new Date().toISOString(),
      };
      try {
        await sendCertificateEmail(certificate);
      } catch (err) {
        failed += 1;
        result.status = "failed";
        result.error = err instanceof Error ? err.message : "Unknown error";
      }
      complete += 1;
      results.push(result);
      setProgress({ complete, failed });
    }

    setDeliveryHistory((prev) => [...results, ...prev]);
    setIsSending(false);
    onComplete();
    toast.success(`Retry finished: ${complete - failed} accepted, ${failed} still failed.`);
  };

  const exportCampaignReport = () => {
    if (deliveryHistory.length === 0) {
      toast.info("No delivery history to export.");
      return;
    }
    const escape = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const header = "Certificate Number,Recipient,Email,Event,Status,Error,Timestamp\n";
    const rows = deliveryHistory.map((r) =>
      [
        escape(r.certificateNumber),
        escape(r.recipientName),
        escape(r.recipientEmail),
        escape(r.eventTitle),
        escape(r.status),
        escape(r.error),
        escape(r.timestamp),
      ].join(",")
    );
    const csv = header + rows.join("\n");
    downloadTextFile(csv, `uic-campaign-report-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    toast.success(`Exported ${deliveryHistory.length} delivery record(s).`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Bulk Certificate Distribution
          </CardTitle>
          <CardDescription>
            Select certificates in Registry &amp; Directory first. A separate personalized email and signed PDF is sent for each eligible recipient.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {certificates.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No certificates selected. Return to Registry &amp; Directory and select issued certificates.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Selected certificates</p><p className="text-xl font-bold">{certificates.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Eligible to send</p><p className="text-xl font-bold text-emerald-600">{report.eligible.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Missing / invalid email</p><p className="text-xl font-bold text-rose-600">{report.invalid.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Already accepted</p><p className="text-xl font-bold text-blue-600">{report.alreadySent.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Category needs review</p><p className="text-xl font-bold text-amber-600">{report.unclassified.length}</p></div>
              </div>

              <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as "preflight" | "history")} className="space-y-3">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="preflight" className="text-xs font-semibold gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Preflight & Send
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs font-semibold gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Delivery History{deliveryHistory.length > 0 ? ` (${deliveryHistory.length})` : ""}
                  </TabsTrigger>
                </TabsList>

                {/* Preflight & Send Tab */}
                <TabsContent value="preflight" className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Preflight report</h3>
                    <div className="max-h-64 overflow-auto rounded-md border">
                      {certificates.map((certificate) => {
                        const eligible = report.eligible.some((item) => item.id === certificate.id);
                        const issue = !certificate.recipientEmail || !EMAIL_PATTERN.test(certificate.recipientEmail)
                          ? "Missing or invalid email"
                          : certificate.status !== "issued"
                            ? "Certificate is not active"
                            : !certificate.recipientCategory
                              ? "Recipient category needs admin review"
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
                </TabsContent>

                {/* Delivery History Tab */}
                <TabsContent value="history" className="space-y-4">
                  {deliveryHistory.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No delivery history yet. Send certificates from the Preflight tab to see results here.
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Total deliveries</p>
                          <p className="text-xl font-bold">{historyStats.total}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Accepted</p>
                          <p className="text-xl font-bold text-emerald-600">{historyStats.sent}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-rose-500" /> Failed</p>
                          <p className="text-xl font-bold text-rose-600">{historyStats.failed}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" /> Skipped</p>
                          <p className="text-xl font-bold text-amber-600">{historyStats.skipped}</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Certificate</TableHead>
                              <TableHead>Recipient</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Error</TableHead>
                              <TableHead>Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deliveryHistory.map((result, idx) => (
                              <TableRow key={`${result.certificateId}-${idx}`} className="text-xs">
                                <TableCell className="font-mono font-semibold">{result.certificateNumber}</TableCell>
                                <TableCell>
                                  <div className="text-xs font-medium">{result.recipientName}</div>
                                  <div className="text-[11px] text-muted-foreground">{result.recipientEmail}</div>
                                </TableCell>
                                <TableCell className="text-muted-foreground max-w-[140px] truncate">{result.eventTitle || "—"}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={result.status === "sent" ? "default" : result.status === "failed" ? "destructive" : "secondary"}
                                    className="text-[10px] uppercase font-semibold"
                                  >
                                    {result.status === "sent" ? "Accepted" : result.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground max-w-[200px] truncate">{result.error || "—"}</TableCell>
                                <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                                  {new Date(result.timestamp).toLocaleTimeString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={exportCampaignReport}
                          >
                            <Download className="h-3.5 w-3.5" /> Export CSV Report
                          </Button>
                          {failedInHistory.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                              disabled={isSending}
                              onClick={() => void retryFailed()}
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Retry {failedInHistory.length} failed
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Retry does not duplicate already-accepted sends — the edge function checks email_status atomically.
                        </p>
                      </div>

                      {isSending && (
                        <div className="space-y-2" role="status" aria-live="polite">
                          <div className="flex justify-between text-xs"><span>Retrying failed deliveries</span><span>{progress.complete} / {failedInHistory.length} · {progress.failed} still failed</span></div>
                          <div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-amber-500 transition-all" style={{ width: `${failedInHistory.length ? (progress.complete / failedInHistory.length) * 100 : 0}%` }} /></div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
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
