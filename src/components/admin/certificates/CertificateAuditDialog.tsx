import { useQuery } from "@tanstack/react-query";
import { History, Mail, ShieldAlert, CheckCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getCertificateAuditLogs, getCertificateEmailLogs } from "@/services/certificates";
import { formatEventDate } from "@/lib/dates";
import type { Certificate } from "@/types";

interface CertificateAuditDialogProps {
  certificate: Certificate | null;
  onClose: () => void;
}

export function CertificateAuditDialog({
  certificate,
  onClose,
}: CertificateAuditDialogProps) {
  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ["certificate-audit-logs", certificate?.id],
    queryFn: () => getCertificateAuditLogs(certificate?.id),
    enabled: Boolean(certificate?.id),
  });

  const { data: emailLogs, isLoading: loadingEmails } = useQuery({
    queryKey: ["certificate-email-logs", certificate?.id],
    queryFn: () => getCertificateEmailLogs(certificate?.id),
    enabled: Boolean(certificate?.id),
  });

  if (!certificate) return null;

  return (
    <Dialog open={Boolean(certificate)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Certificate History & Audit Logs
          </DialogTitle>
          <DialogDescription>
            Audit trail and email delivery logs for #{certificate.certificateNumber} ({certificate.recipientName})
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="audit" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="audit" className="gap-2">
              <ShieldAlert className="h-4 w-4" />
              Audit Trail ({auditLogs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="emails" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Deliveries ({emailLogs?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-3 pt-3">
            {loadingAudit ? (
              <p className="text-center text-xs text-muted-foreground py-6">Loading audit records…</p>
            ) : !auditLogs?.length ? (
              <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg border-dashed">
                <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                No audit log entries recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg bg-card text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-primary">
                        {log.action}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {log.reason && (
                      <p className="text-muted-foreground">
                        <strong>Reason:</strong> {log.reason}
                      </p>
                    )}
                    {log.newStatus && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-muted-foreground">Status change:</span>
                        <Badge variant="outline">{log.oldStatus || "none"} → {log.newStatus}</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Email Deliveries Tab */}
          <TabsContent value="emails" className="space-y-3 pt-3">
            {loadingEmails ? (
              <p className="text-center text-xs text-muted-foreground py-6">Loading delivery records…</p>
            ) : !emailLogs?.length ? (
              <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg border-dashed">
                <Mail className="h-6 w-6 mx-auto mb-2 opacity-50" />
                No email deliveries dispatched for this certificate yet.
              </div>
            ) : (
              <div className="space-y-2">
                {emailLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg bg-card text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {log.recipientEmail}
                      </span>
                      <Badge
                        variant={log.status === "sent" || log.status === "delivered" ? "default" : "destructive"}
                        className="gap-1"
                      >
                        {log.status === "sent" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <ShieldAlert className="h-3 w-3" />
                        )}
                        {log.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span>Subject: {log.subject || "Official Certificate from UIC SRM University–AP"}</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    {log.attachmentSha256 && (
                      <p className="break-all text-[10px] text-muted-foreground">
                        Attached PDF SHA-256: <code>{log.attachmentSha256}</code>
                      </p>
                    )}
                    {log.errorDetails && (
                      <p className="text-destructive font-mono text-[11px] bg-destructive/10 p-1.5 rounded">
                        Error: {log.errorDetails}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
