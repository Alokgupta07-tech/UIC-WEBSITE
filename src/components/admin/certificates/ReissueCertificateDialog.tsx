import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reissueCertificate } from "@/services/certificates";
import type { Certificate } from "@/types";

interface ReissueCertificateDialogProps {
  certificate: Certificate | null;
  adminId: string | null;
  onClose: () => void;
  onSuccess: (newCertificate: Certificate) => void;
}

export function ReissueCertificateDialog({
  certificate,
  adminId,
  onClose,
  onSuccess,
}: ReissueCertificateDialogProps) {
  const queryClient = useQueryClient();
  const [recipientName, setRecipientName] = useState(certificate?.recipientName || "");
  const [recipientEmail, setRecipientEmail] = useState(certificate?.recipientEmail || "");
  const [role, setRole] = useState(certificate?.role || "");
  const [team, setTeam] = useState(certificate?.team || "");
  const [customTitle, setCustomTitle] = useState(certificate?.customTitle || "");
  const [contributionSummary, setContributionSummary] = useState(certificate?.contributionSummary || "");
  const [reason, setReason] = useState("");

  if (!certificate) return null;

  const reissueMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error("Please specify the reason for reissuing this certificate.");
      }
      return reissueCertificate(
        certificate.id,
        {
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim() || null,
          role: role.trim() || null,
          team: team.trim() || null,
          custom_title: customTitle.trim() || null,
          contribution_summary: contributionSummary.trim() || null,
        },
        reason.trim(),
        adminId
      );
    },
    onSuccess: (newCert) => {
      toast.success(`Successfully reissued! New certificate #${newCert.certificateNumber} created.`);
      void queryClient.invalidateQueries({ queryKey: ["certificates-admin"] });
      onSuccess(newCert);
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to reissue certificate.");
    },
  });

  return (
    <Dialog open={Boolean(certificate)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <RefreshCw className="h-5 w-5 text-amber-500" />
            Reissue Certificate
          </DialogTitle>
          <DialogDescription>
            This action will mark certificate <strong>{certificate.certificateNumber}</strong> as
            revoked and generate an authentic new certificate linked via the revision chain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong>Audit Notice:</strong> Both certificates will remain in the database for
              verification authenticity. Public scanners scanning the old QR will see that it was
              reissued.
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="reissue-name">Recipient Name</Label>
              <Input
                id="reissue-name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div>
              <Label htmlFor="reissue-email">Recipient Email</Label>
              <Input
                id="reissue-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Email address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="reissue-role">Role</Label>
                <Input
                  id="reissue-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Lead Organizer"
                />
              </div>
              <div>
                <Label htmlFor="reissue-team">Team</Label>
                <Input
                  id="reissue-team"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="e.g. Technical Team"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reissue-title">Official Title (Optional override)</Label>
              <Input
                id="reissue-title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. CERTIFICATE OF LEADERSHIP & MERIT"
              />
            </div>

            <div>
              <Label htmlFor="reissue-summary">Contribution Citation</Label>
              <Textarea
                id="reissue-summary"
                rows={3}
                value={contributionSummary}
                onChange={(e) => setContributionSummary(e.target.value)}
                placeholder="In grateful recognition of..."
              />
            </div>

            <div>
              <Label htmlFor="reissue-reason" className="text-destructive font-semibold">
                Reason for Reissue *
              </Label>
              <Input
                id="reissue-reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Corrected name spelling error / updated role designation"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={reissueMutation.isPending}>
            Cancel
          </Button>
          <Button
            className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 text-white"
            onClick={() => reissueMutation.mutate()}
            disabled={reissueMutation.isPending || !reason.trim()}
          >
            <RefreshCw className={`h-4 w-4 ${reissueMutation.isPending ? "animate-spin" : ""}`} />
            {reissueMutation.isPending ? "Reissuing…" : "Confirm & Reissue Certificate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
