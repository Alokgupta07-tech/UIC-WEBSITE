import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Award,
  Copy,
  Download,
  QrCode,
  RotateCcw,
  ShieldOff,
  Trash2,
  UserCheck,
  Mail,
  RefreshCw,
  Eye,
  History,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Filter,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { CertificateStatusBadge } from "@/components/dashboard/StatusBadge";
import { CertificateQrPreview } from "@/components/admin/CertificateQrPreview";
import { CertificatePreviewDialog } from "@/components/admin/certificates/CertificatePreviewDialog";
import { ReissueCertificateDialog } from "@/components/admin/certificates/ReissueCertificateDialog";
import { CertificateAuditDialog } from "@/components/admin/certificates/CertificateAuditDialog";
import { BatchIssueWizard } from "@/components/admin/certificates/BatchIssueWizard";

import { getAllEventsAdmin } from "@/services/events";
import {
  buildVerificationUrl,
  certificatesToCSV,
  deleteCertificate,
  getAllCertificatesAdmin,
  issueCertificate,
  setCertificateStatus,
  sendCertificateEmail,
  getCertificateAuditLogs,
  type CertificateInput,
} from "@/services/certificates";
import { downloadCertificatePdf } from "@/lib/certificatePdf";
import {
  CERTIFICATE_TEAMS,
  ALL_ROLES,
  findRolePreset,
  renderContributionBlurb,
} from "@/lib/certificateRoles";
import { formatEventDate } from "@/lib/dates";
import { downloadQrSvg } from "@/lib/qr";
import type { Certificate, CertificateEmailStatus } from "@/types";

const INITIAL_FORM = {
  recipient_name: "",
  recipient_email: "",
  role_id: "lead-organizer",
  role: "Lead Organizer / Convenor",
  team: "Organizing & Leadership",
  custom_title: "CERTIFICATE OF APPRECIATION",
  certificate_type: "Leadership & Organization",
  template_key: "amethyst-prestige",
  contribution_summary: "",
  organizer_organization: "Unstop Igniters Club, SRM AP",
  signer_name: "Faculty Coordinator",
  signer_designation: "Unstop Igniters Club, SRM University–AP",
  signer2_name: "President / Lead",
  signer2_designation: "Student Body, SRM University–AP",
  issue_date: "",
  auto_email: true,
};

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

export function CertificatesPanel({ createdBy }: { createdBy: string | null }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"directory" | "single" | "batch" | "logs">("directory");
  const [eventId, setEventId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "revoked">("all");
  const [emailStatusFilter, setEmailStatusFilter] = useState<"all" | CertificateEmailStatus>("all");

  // Selection state for batch actions
  const [selectedCertIds, setSelectedCertIds] = useState<Set<string>>(new Set());

  // Form state for single issue
  const [form, setForm] = useState(INITIAL_FORM);

  // Dialog targets
  const [previewTarget, setPreviewTarget] = useState<Certificate | null>(null);
  const [reissueTarget, setReissueTarget] = useState<Certificate | null>(null);
  const [auditTarget, setAuditTarget] = useState<Certificate | null>(null);
  const [qrTarget, setQrTarget] = useState<Certificate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const { data: events } = useQuery({
    queryKey: ["events-admin"],
    queryFn: getAllEventsAdmin,
  });

  const {
    data: certificates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["certificates-admin", eventId],
    queryFn: () => getAllCertificatesAdmin(eventId || undefined),
  });

  const { data: allAuditLogs } = useQuery({
    queryKey: ["all-certificate-audit-logs"],
    queryFn: () => getCertificateAuditLogs(),
    enabled: activeTab === "logs",
  });

  const selectedEvent = useMemo(
    () => events?.find((e) => e.id === eventId) ?? null,
    [events, eventId]
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["certificates-admin"] });
    void queryClient.invalidateQueries({ queryKey: ["all-certificate-audit-logs"] });
  };

  // Filtered certificates
  const filteredCertificates = useMemo(() => {
    return (certificates || []).filter((cert) => {
      if (statusFilter !== "all" && cert.status !== statusFilter) return false;
      if (emailStatusFilter !== "all" && cert.emailStatus !== emailStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = cert.recipientName.toLowerCase().includes(q);
        const matchesEmail = (cert.recipientEmail || "").toLowerCase().includes(q);
        const matchesNumber = cert.certificateNumber.toLowerCase().includes(q);
        const matchesRole = (cert.role || "").toLowerCase().includes(q);
        const matchesEvent = (cert.eventTitle || "").toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesNumber && !matchesRole && !matchesEvent) {
          return false;
        }
      }
      return true;
    });
  }, [certificates, statusFilter, emailStatusFilter, searchQuery]);

  // Overall system statistics
  const stats = useMemo(() => {
    const list = certificates ?? [];
    return {
      total: list.length,
      issued: list.filter((c) => c.status === "issued").length,
      revoked: list.filter((c) => c.status === "revoked").length,
      emailSent: list.filter((c) => c.emailStatus === "sent").length,
      emailPending: list.filter((c) => c.emailStatus === "pending" || c.emailStatus === "sending").length,
      emailFailed: list.filter((c) => c.emailStatus === "failed").length,
      totalDownloads: list.reduce((sum, c) => sum + (c.downloadCount || 0), 0),
    };
  }, [certificates]);

  // Handle Role selection and auto-filling
  const handleRoleSelect = (roleId: string) => {
    const preset = findRolePreset(roleId);
    if (!preset) return;

    const eventName = selectedEvent?.title || "Unstop Igniters Club Event";
    const blurb = renderContributionBlurb(preset.contributionTemplate, {
      eventTitle: eventName,
      recipientName: form.recipient_name || "the recipient",
      role: preset.name,
      team: preset.team,
    });

    setForm((prev) => ({
      ...prev,
      role_id: preset.id,
      role: preset.name,
      team: preset.team,
      custom_title: preset.defaultTitle,
      certificate_type: preset.defaultCertificateType,
      template_key: preset.recommendedTheme,
      contribution_summary: blurb,
    }));
  };

  // Single issue mutation
  const issueOneMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("Select an event first.");
      if (!form.recipient_name.trim()) throw new Error("Enter the recipient's name.");

      const cert = await issueCertificate(
        {
          event_id: eventId,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email || null,
          role: form.role,
          team: form.team,
          custom_title: form.custom_title,
          certificate_type: form.certificate_type,
          template_key: form.template_key,
          contribution_summary: form.contribution_summary,
          organizer_organization: form.organizer_organization,
          signer_name: form.signer_name,
          signer_designation: form.signer_designation,
          signer2_name: form.signer2_name,
          signer2_designation: form.signer2_designation,
          issue_date: form.issue_date || null,
        },
        createdBy
      );

      // Auto-email if toggled
      if (form.auto_email && form.recipient_email) {
        try {
          await sendCertificateEmail(cert);
          toast.success(`Issued #${cert.certificateNumber} and dispatched email!`);
        } catch {
          toast.warning(`Issued #${cert.certificateNumber}, but email failed to dispatch.`);
        }
      } else {
        toast.success(`Issued #${cert.certificateNumber}`);
      }

      return cert;
    },
    onSuccess: (cert) => {
      setForm((prev) => ({
        ...prev,
        recipient_name: "",
        recipient_email: "",
      }));
      setPreviewTarget(cert);
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to issue certificate.");
    },
  });

  // Send single email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (cert: Certificate) => {
      return sendCertificateEmail(cert);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Email delivery failed.");
      invalidate();
    },
  });

  // Revoke with reason mutation
  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!revokeTarget) return;
      if (!revokeReason.trim()) throw new Error("Please state a reason for revoking.");
      await setCertificateStatus(revokeTarget.id, "revoked", revokeReason.trim(), createdBy);
    },
    onSuccess: () => {
      toast.success("Certificate revoked and logged in audit trail.");
      setRevokeTarget(null);
      setRevokeReason("");
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to revoke certificate.");
    },
  });

  // Restore status mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await setCertificateStatus(id, "issued", "Restored by admin", createdBy);
    },
    onSuccess: () => {
      toast.success("Certificate restored to active status.");
      invalidate();
    },
  });

  // Delete mutation
  const removeCertificate = useMutation({
    mutationFn: (id: string) => deleteCertificate(id),
    onSuccess: () => {
      toast.success("Certificate permanently deleted.");
      setDeleteTarget(null);
      invalidate();
    },
    onError: () => toast.error("Failed to delete the certificate."),
  });

  // Batch email selected
  const handleBatchEmail = async () => {
    const targets = (certificates || []).filter(
      (c) => selectedCertIds.has(c.id) && c.recipientEmail
    );
    if (targets.length === 0) {
      toast.info("No selected certificates have valid recipient emails.");
      return;
    }

    toast.info(`Sending emails to ${targets.length} recipient(s)…`);
    let sent = 0;
    for (const cert of targets) {
      try {
        await sendCertificateEmail(cert);
        sent++;
      } catch {
        // continue
      }
    }
    toast.success(`Dispatched ${sent} certificate email(s)!`);
    invalidate();
  };

  // Export CSV
  const handleExportCsv = () => {
    const list = selectedCertIds.size > 0
      ? (certificates || []).filter((c) => selectedCertIds.has(c.id))
      : filteredCertificates;

    if (!list.length) {
      toast.info("No certificates to export.");
      return;
    }
    const csv = certificatesToCSV(list);
    downloadTextFile(csv, `uic-certificates-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    toast.success(`Exported ${list.length} certificate record(s) to CSV.`);
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedCertIds.size === filteredCertificates.length) {
      setSelectedCertIds(new Set());
    } else {
      setSelectedCertIds(new Set(filteredCertificates.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedCertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Executive Header & KPI Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Certificates
          </p>
          <p className="text-2xl font-black text-foreground mt-0.5">{stats.total}</p>
        </Card>

        <Card className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Active / Issued
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {stats.issued}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Revoked
          </p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {stats.revoked}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Emails Delivered
          </p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
            {stats.emailSent}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Email Pending/Failed
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {stats.emailPending + stats.emailFailed}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Total Downloads
          </p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {stats.totalDownloads}
          </p>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-11">
          <TabsTrigger value="directory" className="gap-2 text-xs sm:text-sm font-semibold">
            <Award className="h-4 w-4" />
            Registry & Directory
          </TabsTrigger>
          <TabsTrigger value="single" className="gap-2 text-xs sm:text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            Issue Single
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-2 text-xs sm:text-sm font-semibold">
            <FileSpreadsheet className="h-4 w-4" />
            Batch & CSV Wizard
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 text-xs sm:text-sm font-semibold">
            <History className="h-4 w-4" />
            Audit & Email Logs
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: REGISTRY & DIRECTORY ================= */}
        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">Certificate Registry</CardTitle>
                  <CardDescription>
                    Search, verify, download vector PDFs, resend emails, or reissue records.
                  </CardDescription>
                </div>

                {/* Filter and Action Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger className="w-[200px] h-9 text-xs">
                      <SelectValue placeholder="All Events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-events">All Events</SelectItem>
                      {events?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9 text-xs"
                    onClick={handleExportCsv}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </Button>

                  {selectedCertIds.size > 0 && (
                    <Button
                      size="sm"
                      className="gap-1.5 h-9 text-xs bg-gradient-to-r from-blue-600 to-indigo-700 text-white"
                      onClick={handleBatchEmail}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email Selected ({selectedCertIds.size})
                    </Button>
                  )}
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="grid gap-2 pt-3 sm:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recipient, email, role, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="issued">Valid / Issued</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={emailStatusFilter} onValueChange={(v) => setEmailStatusFilter(v as any)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Email Status Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Email Statuses</SelectItem>
                    <SelectItem value="sent">Sent / Delivered</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Loading certificate registry…
                </div>
              ) : isError ? (
                <div className="py-12 text-center text-sm text-destructive">
                  Could not load certificates from database.
                </div>
              ) : !filteredCertificates.length ? (
                <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
                  No matching certificates found in the registry.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              selectedCertIds.size === filteredCertificates.length &&
                              filteredCertificates.length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Certificate ID</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Role & Team</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCertificates.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCertIds.has(cert.id)}
                              onCheckedChange={() => toggleSelectOne(cert.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">
                            {cert.certificateNumber}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-medium text-foreground">
                              {cert.recipientName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {cert.recipientEmail || "No email"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-semibold text-primary">
                                {cert.role || cert.certificateType}
                              </span>
                              {cert.team && (
                                <span className="text-[10px] text-muted-foreground">
                                  {cert.team}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                            {cert.eventTitle || "—"}
                          </TableCell>
                          <TableCell>
                            <CertificateStatusBadge status={cert.status} />
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cert.emailStatus === "sent"
                                  ? "default"
                                  : cert.emailStatus === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[10px] uppercase font-semibold"
                            >
                              {cert.emailStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              {/* Live Preview Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-indigo-600 hover:text-indigo-700"
                                onClick={() => setPreviewTarget(cert)}
                                title="Live Certificate Preview"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {/* Download PDF Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                                onClick={async () => {
                                  try {
                                    await downloadCertificatePdf({
                                      certificateNumber: cert.certificateNumber,
                                      verificationToken: cert.verificationToken,
                                      recipientName: cert.recipientName,
                                      eventTitle: cert.eventTitle || "UIC Event",
                                      eventDate: cert.eventDate,
                                      eventVenue: cert.eventVenue,
                                      eventIsOnline: cert.eventIsOnline,
                                      certificateType: cert.certificateType,
                                      customTitle: cert.customTitle,
                                      role: cert.role,
                                      team: cert.team,
                                      contributionSummary: cert.contributionSummary,
                                      specialRecognition: cert.specialRecognition,
                                      organizerOrganization: cert.organizerOrganization,
                                      signerName: cert.signerName,
                                      signerDesignation: cert.signerDesignation,
                                      signer2Name: cert.signer2Name,
                                      signer2Designation: cert.signer2Designation,
                                      issueDate: cert.issueDate,
                                      themeKey: cert.templateKey,
                                    });
                                    toast.success(`Downloaded PDF for ${cert.recipientName}`);
                                  } catch {
                                    toast.error("Failed to generate PDF.");
                                  }
                                }}
                                title="Download Official PDF"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>

                              {/* Send Email Button */}
                              {cert.recipientEmail && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700"
                                  onClick={() => sendEmailMutation.mutate(cert)}
                                  disabled={sendEmailMutation.isPending}
                                  title="Dispatch Certificate Email"
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {/* Reissue Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-600 hover:text-amber-700"
                                onClick={() => setReissueTarget(cert)}
                                title="Reissue Certificate"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>

                              {/* Audit Logs Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                onClick={() => setAuditTarget(cert)}
                                title="Audit & Email Logs"
                              >
                                <History className="h-3.5 w-3.5" />
                              </Button>

                              {/* QR Code Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                onClick={() => setQrTarget(cert)}
                                title="QR Code Preview"
                              >
                                <QrCode className="h-3.5 w-3.5" />
                              </Button>

                              {/* Revoke / Restore Button */}
                              {cert.status === "issued" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-600"
                                  onClick={() => setRevokeTarget(cert)}
                                  title="Revoke Certificate"
                                >
                                  <ShieldOff className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-emerald-600"
                                  onClick={() => restoreMutation.mutate(cert.id)}
                                  title="Restore Certificate"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => setDeleteTarget(cert)}
                                title="Delete Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: ISSUE SINGLE CERTIFICATE ================= */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Issue Appreciation / Role Certificate
              </CardTitle>
              <CardDescription>
                Assign specific event roles, auto-fill personalized contribution citations, and dispatch directly to recipient.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Picker */}
              <div className="space-y-2">
                <Label>Event *</Label>
                <Select value={eventId} onValueChange={(val) => {
                  setEventId(val);
                  handleRoleSelect(form.role_id);
                }}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient Details */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="single-name">Recipient Full Name *</Label>
                  <Input
                    id="single-name"
                    value={form.recipient_name}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, recipient_name: e.target.value }));
                    }}
                    placeholder="e.g. Aryan Gupta"
                  />
                </div>

                <div>
                  <Label htmlFor="single-email">Recipient Email Address</Label>
                  <Input
                    id="single-email"
                    type="email"
                    value={form.recipient_email}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, recipient_email: e.target.value }));
                    }}
                    placeholder="e.g. aryan@srmap.edu.in"
                  />
                </div>
              </div>

              {/* Role & Team Selector */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Role & Contribution Preset
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Selecting a role auto-configures title, theme, and pre-written appreciation wording.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="single-role-select">Select Specific Role</Label>
                    <Select value={form.role_id} onValueChange={handleRoleSelect}>
                      <SelectTrigger id="single-role-select" className="w-full">
                        <SelectValue placeholder="Select role preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {CERTIFICATE_TEAMS.map((group) => (
                          <div key={group.id}>
                            <p className="px-2 py-1.5 text-[10px] font-bold uppercase text-primary">
                              {group.name}
                            </p>
                            {group.roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="single-template-theme">Design Template Theme</Label>
                    <Select
                      value={form.template_key}
                      onValueChange={(val) => setForm((prev) => ({ ...prev, template_key: val }))}
                    >
                      <SelectTrigger id="single-template-theme" className="w-full">
                        <SelectValue placeholder="Theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cyber-emerald">Cyber Emerald (Hackathons & Tech)</SelectItem>
                        <SelectItem value="royal-sapphire">Royal Sapphire (Championships & Grand Contests)</SelectItem>
                        <SelectItem value="imperial-ruby">Imperial Ruby (Workshops & Creative)</SelectItem>
                        <SelectItem value="amethyst-prestige">Amethyst Prestige (Leadership & Core Organizers)</SelectItem>
                        <SelectItem value="grand-monarch">Grand Monarch (1st Place & High Honors)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="single-custom-title">Certificate Title (Override)</Label>
                    <Input
                      id="single-custom-title"
                      value={form.custom_title}
                      onChange={(e) => setForm((prev) => ({ ...prev, custom_title: e.target.value }))}
                      placeholder="e.g. CERTIFICATE OF APPRECIATION"
                    />
                  </div>

                  <div>
                    <Label htmlFor="single-team">Assigned Team / Department</Label>
                    <Input
                      id="single-team"
                      value={form.team}
                      onChange={(e) => setForm((prev) => ({ ...prev, team: e.target.value }))}
                      placeholder="e.g. Technical Team"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="single-summary">Contribution Citation / Appreciation Summary</Label>
                  <Textarea
                    id="single-summary"
                    rows={3}
                    value={form.contribution_summary}
                    onChange={(e) => setForm((prev) => ({ ...prev, contribution_summary: e.target.value }))}
                    placeholder="Enter the official recognition citation blurb..."
                  />
                </div>
              </div>

              {/* Signatories */}
              <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-primary tracking-wider">
                    Signatory 1
                  </p>
                  <div>
                    <Label htmlFor="s1-name">Name</Label>
                    <Input
                      id="s1-name"
                      value={form.signer_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, signer_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="s1-desig">Designation</Label>
                    <Input
                      id="s1-desig"
                      value={form.signer_designation}
                      onChange={(e) => setForm((prev) => ({ ...prev, signer_designation: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-primary tracking-wider">
                    Signatory 2
                  </p>
                  <div>
                    <Label htmlFor="s2-name">Name</Label>
                    <Input
                      id="s2-name"
                      value={form.signer2_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, signer2_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="s2-desig">Designation</Label>
                    <Input
                      id="s2-desig"
                      value={form.signer2_designation}
                      onChange={(e) => setForm((prev) => ({ ...prev, signer2_designation: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Dispatch Options */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="auto-email-toggle"
                  checked={form.auto_email}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, auto_email: Boolean(checked) }))
                  }
                />
                <Label htmlFor="auto-email-toggle" className="text-xs font-medium cursor-pointer">
                  Automatically dispatch certificate to recipient's email address upon creation
                </Label>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  className="gap-2 bg-gradient-to-r from-emerald-600 via-teal-700 to-green-700 hover:opacity-95 text-white font-medium shadow-sm"
                  onClick={() => issueOneMutation.mutate()}
                  disabled={issueOneMutation.isPending || !form.recipient_name.trim()}
                >
                  <Award className="h-4 w-4" />
                  {issueOneMutation.isPending ? "Generating Certificate…" : "Issue & Save Certificate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 3: BATCH & CSV WIZARD ================= */}
        <TabsContent value="batch">
          <BatchIssueWizard
            createdBy={createdBy}
            initialEventId={eventId}
            onFinished={() => setActiveTab("directory")}
          />
        </TabsContent>

        {/* ================= TAB 4: SYSTEM AUDIT & DELIVERY LOGS ================= */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Official System Audit Trail</CardTitle>
              <CardDescription>
                Chronological ledger of all certificate issuances, reissues, revocations, and status alterations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!allAuditLogs?.length ? (
                <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                  No system audit records logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Admin ID</TableHead>
                        <TableHead>Certificate ID</TableHead>
                        <TableHead>Reason / Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAuditLogs.map((log) => (
                        <TableRow key={log.id} className="text-xs">
                          <TableCell className="font-mono text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase font-bold text-[10px]">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {log.adminId ? `${log.adminId.slice(0, 8)}…` : "System"}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {log.certificateId ? `${log.certificateId.slice(0, 8)}…` : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.reason || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================= MODALS & DIALOGS ================= */}

      {/* 1. Live Certificate Preview Dialog */}
      <CertificatePreviewDialog
        certificate={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />

      {/* 2. Reissue Certificate Dialog */}
      <ReissueCertificateDialog
        certificate={reissueTarget}
        adminId={createdBy}
        onClose={() => setReissueTarget(null)}
        onSuccess={(newCert) => setPreviewTarget(newCert)}
      />

      {/* 3. Certificate Audit Dialog */}
      <CertificateAuditDialog
        certificate={auditTarget}
        onClose={() => setAuditTarget(null)}
      />

      {/* 4. QR Code Preview Dialog */}
      <Dialog open={Boolean(qrTarget)} onOpenChange={(open) => !open && setQrTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Certificate Verification QR</DialogTitle>
            <DialogDescription>
              Scan with mobile phone to verify authenticity against official records.
            </DialogDescription>
          </DialogHeader>
          {qrTarget && (
            <div className="space-y-4 text-center">
              <CertificateQrPreview
                value={buildVerificationUrl(qrTarget.verificationToken)}
                className="mx-auto h-52 w-52"
              />
              <div className="space-y-1">
                <p className="font-mono text-xs font-bold">{qrTarget.certificateNumber}</p>
                <p className="text-xs text-muted-foreground">{qrTarget.recipientName}</p>
              </div>
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    void downloadQrSvg(
                      buildVerificationUrl(qrTarget.verificationToken),
                      `qr-${qrTarget.certificateNumber}`
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                  Download SVG
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(buildVerificationUrl(qrTarget.verificationToken));
                    toast.success("Verification link copied!");
                  }}
                >
                  Copy Link
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. Revoke Reason Dialog */}
      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <ShieldOff className="h-5 w-5" />
              Revoke Certificate
            </DialogTitle>
            <DialogDescription>
              Revoking marks certificate <strong>{revokeTarget?.certificateNumber}</strong> as
              invalid. The record remains for public scanner verification indicating it was revoked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="revoke-reason-input">Reason for Revocation *</Label>
            <Input
              id="revoke-reason-input"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Issued by mistake / Plagiarism / Disciplinary"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!revokeReason.trim() || revokeMutation.isPending}
              onClick={() => revokeMutation.mutate()}
            >
              Confirm Revocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this certificate permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.certificateNumber} for {deleteTarget?.recipientName} will be removed
              from the database. Scanners will see "Certificate Not Found". If you want to keep
              a record of invalidation, use <strong>Revoke</strong> instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && removeCertificate.mutate(deleteTarget.id)}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
