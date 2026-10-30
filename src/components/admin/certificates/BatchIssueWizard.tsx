import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  FileSpreadsheet,
  Upload,
  UserCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Download,
  Trash2,
  Sparkles,
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { getAllEventsAdmin } from "@/services/events";
import { getEventAttendance } from "@/services/attendance";
import {
  issueCertificate,
  getAllCertificatesAdmin,
  parseRecipientsCSV,
  sendCertificateEmail,
  type CertificateRecipient,
} from "@/services/certificates";
import {
  CERTIFICATE_TEAMS,
  ALL_ROLES,
  findRolePreset,
  getDefaultRecipientCategory,
  renderContributionBlurb,
} from "@/lib/certificateRoles";
import type { Certificate } from "@/types";
import { DEFAULT_CERTIFICATE_SIGNATORIES } from "@/lib/certificateSignatories";
import { getCertificateSignatoryConfiguration } from "@/services/settings";

interface BatchIssueWizardProps {
  createdBy: string | null;
  initialEventId?: string;
  onFinished: () => void;
}

export function BatchIssueWizard({
  createdBy,
  initialEventId = "",
  onFinished,
}: BatchIssueWizardProps) {
  const queryClient = useQueryClient();
  const { data: certificateSignatories = DEFAULT_CERTIFICATE_SIGNATORIES } = useQuery({
    queryKey: ["certificate-signatories"],
    queryFn: getCertificateSignatoryConfiguration,
  });
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [eventId, setEventId] = useState(initialEventId);

  // Shared defaults
  const [defaultRoleId, setDefaultRoleId] = useState("participant");

  // Mode: "attendance" or "csv"
  const [sourceMode, setSourceMode] = useState<"attendance" | "csv">("csv");
  const [csvRawText, setCsvRawText] = useState("");

  // Recipient list to be issued
  const [recipients, setRecipients] = useState<CertificateRecipient[]>([]);

  // Execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [issuedResults, setIssuedResults] = useState<Certificate[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  // Email state
  const [isEmailingAll, setIsEmailingAll] = useState(false);
  const [emailedCount, setEmailedCount] = useState(0);

  const { data: events } = useQuery({
    queryKey: ["events-admin"],
    queryFn: getAllEventsAdmin,
  });

  const selectedEvent = useMemo(
    () => events?.find((e) => e.id === eventId) ?? null,
    [events, eventId]
  );

  // Existing certificates for duplicate checking
  const { data: existingCerts } = useQuery({
    queryKey: ["certificates-admin", eventId],
    queryFn: () => getAllCertificatesAdmin(eventId || undefined),
    enabled: Boolean(eventId),
  });

  const existingEmails = useMemo(() => {
    return new Set(
      (existingCerts || [])
        .map((c) => c.recipientEmail?.toLowerCase())
        .filter((e): e is string => Boolean(e))
    );
  }, [existingCerts]);

  // Load from attendance
  const loadFromAttendance = async () => {
    if (!eventId) {
      toast.error("Please select an event first.");
      return;
    }
    try {
      const records = await getEventAttendance(eventId);
      const verified = records.filter(
        (r) => r.status === "verified" && r.userName && r.userName.trim().length > 0
      );
      if (verified.length === 0) {
        toast.info("No verified attendees recorded for this event yet.");
        return;
      }

      const defaultRolePreset = findRolePreset(defaultRoleId);
      const mapped: CertificateRecipient[] = verified.map((v) => ({
        name: v.userName as string,
        email: v.userEmail ?? null,
        role: defaultRolePreset?.name || "Active Participant",
        team: defaultRolePreset?.team || "Participants",
        certificateType: defaultRolePreset?.defaultCertificateType || "Certificate of Participation",
        recipientCategory: defaultRolePreset ? getDefaultRecipientCategory(defaultRolePreset.id) : "participant",
      }));

      setRecipients(mapped);
      toast.success(`Loaded ${mapped.length} attendee(s) from event attendance.`);
      setStep(3);
    } catch {
      toast.error("Failed to load attendees.");
    }
  };

  // Parse CSV
  const handleParseCsv = () => {
    try {
      if (!csvRawText.trim()) {
        toast.error("Please paste CSV text or select a file.");
        return;
      }
      const parsed = parseRecipientsCSV(csvRawText);
      if (parsed.length === 0) {
        toast.error("No valid recipient rows found in CSV.");
        return;
      }

      const defaultRolePreset = findRolePreset(defaultRoleId);
      const enriched = parsed.map((r) => ({
        ...r,
        role: r.role || defaultRolePreset?.name || "Participant",
        team: r.team || defaultRolePreset?.team || "Participants",
        certificateType: r.certificateType || defaultRolePreset?.defaultCertificateType || "Certificate of Participation",
        recipientCategory: r.recipientCategory || (defaultRolePreset ? getDefaultRecipientCategory(defaultRolePreset.id) : null),
      }));

      setRecipients(enriched);
      toast.success(`Parsed ${enriched.length} recipient(s) successfully!`);
      setStep(3);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to parse CSV.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);
    };
    reader.readAsText(file);
  };

  const downloadSampleCsv = () => {
    const sample = `Name,Email,Role,Team,Category,ContributionSummary\n"John Doe","john.doe@example.com","Technical Lead","Technical Team","organizer","Supported the technical delivery of the event."\n"Jane Smith","jane.smith@example.com","Event Coordinator","Organizing & Leadership","organizer","Coordinated event logistics."\n"Alex Kumar","alex@example.com","Active Participant","Participants","participant","Participated in the event."\n`;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "uic-certificate-recipients-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Assign a role to all recipients in review table
  const applyRoleToAll = (roleId: string) => {
    const preset = findRolePreset(roleId);
    if (!preset) return;
    setRecipients((prev) =>
      prev.map((r) => ({
        ...r,
        role: preset.name,
        team: preset.team,
        certificateType: preset.defaultCertificateType,
        recipientCategory: getDefaultRecipientCategory(preset.id),
      }))
    );
    toast.success(`Assigned "${preset.name}" to all ${recipients.length} recipients.`);
  };

  // Remove recipient row
  const removeRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Execute Batch Issuing
  const executeBatch = async () => {
    if (!eventId) {
      toast.error("Please select an event.");
      return;
    }
    if (recipients.length === 0) {
      toast.error("No recipients to issue certificates to.");
      return;
    }
    if (recipients.some((recipient) => !recipient.recipientCategory)) {
      toast.error("Review and select a verified category for every recipient before issuing.");
      return;
    }

    setIsProcessing(true);
    setProgressPercent(0);
    const issued: Certificate[] = [];
    let skipped = 0;

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const email = r.email?.toLowerCase().trim() || null;

      // Duplicate check
      if (email && existingEmails.has(email)) {
        skipped++;
        setProgressPercent(Math.round(((i + 1) / recipients.length) * 100));
        continue;
      }

      const rolePreset = r.role ? findRolePreset(r.role) : undefined;
      const category = r.recipientCategory || (rolePreset ? getDefaultRecipientCategory(rolePreset.id) : "participant");
      const isParticipant = category === "participant" || category === "winner";
      const themeKey = isParticipant ? "participant-emerald" : "organizer-forest";

      let contribution = r.contributionSummary;
      if (!contribution && rolePreset) {
        contribution = renderContributionBlurb(rolePreset.contributionTemplate, {
          eventTitle: selectedEvent?.title || "UIC Event",
          recipientName: r.name,
          role: r.role || undefined,
          team: r.team || undefined,
        });
      }

      try {
        const cert = await issueCertificate(
          {
            event_id: eventId,
            recipient_name: r.name,
            recipient_email: email,
            certificate_type: r.certificateType || "Certificate of Appreciation",
            recipient_category: r.recipientCategory,
            role: r.role || null,
            team: r.team || null,
            contribution_summary: contribution || null,
            template_key: themeKey,
          },
          createdBy
        );
        issued.push(cert);
      } catch {
        // Skip failed row and continue
        skipped++;
      }

      setProgressPercent(Math.round(((i + 1) / recipients.length) * 100));
    }

    setIsProcessing(false);
    setIssuedResults(issued);
    setSkippedCount(skipped);
    setStep(4);
    void queryClient.invalidateQueries({ queryKey: ["certificates-admin", eventId] });
    toast.success(`Batch complete: ${issued.length} issued, ${skipped} skipped.`);
  };

  // Email all newly issued certificates
  const handleEmailAllIssued = async () => {
    if (issuedResults.length === 0) return;
    setIsEmailingAll(true);
    let count = 0;

    for (const cert of issuedResults) {
      if (cert.recipientEmail) {
        try {
          await sendCertificateEmail(cert);
          count++;
          setEmailedCount(count);
        } catch {
          // Continue with next
        }
      }
    }

    setIsEmailingAll(false);
    toast.success(`Dispatched emails to ${count} recipient(s).`);
    void queryClient.invalidateQueries({ queryKey: ["certificates-admin", eventId] });
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header Progress */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Batch Certificate & Appreciation Wizard
          </h2>
          <p className="text-xs text-muted-foreground">
            Fast, multi-recipient issuance with team roles, auto-generated citations, and email dispatch
          </p>
        </div>

        {/* Step indicator badges */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: "Event & Signatories" },
            { num: 2, label: "Source Data" },
            { num: 3, label: "Review & Roles" },
            { num: 4, label: "Results" },
          ].map((s) => (
            <Badge
              key={s.num}
              variant={step === s.num ? "default" : "outline"}
              className="hidden sm:inline-flex text-xs py-1"
            >
              {s.num}. {s.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* STEP 1: Select Event and Signatories */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 1: Event & Shared Authority</CardTitle>
            <CardDescription>
              Select the event and confirm the official signatories that will appear on all batch certificates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Target Event *</Label>
              <Select value={eventId} onValueChange={setEventId}>
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

            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
              <div className="rounded-lg border p-3">
                <img src={certificateSignatories.facultyCoordinator.signaturePath} alt="Faculty Coordinator signature preview" className="h-12 w-40 object-contain" />
                <p className="text-sm font-semibold">{certificateSignatories.facultyCoordinator.printedName}</p>
                <p className="text-xs text-muted-foreground">{certificateSignatories.facultyCoordinator.designation}</p>
              </div>
              <div className="rounded-lg border p-3">
                <img src={certificateSignatories.president.signaturePath} alt="President signature preview" className="h-12 w-40 object-contain" />
                <p className="text-sm font-semibold">{certificateSignatories.president.printedName}</p>
                <p className="text-xs text-muted-foreground">{certificateSignatories.president.designation}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                className="gap-2 bg-gradient-to-r from-primary to-secondary text-white"
                onClick={() => {
                  if (!eventId) {
                    toast.error("Please select an event.");
                    return;
                  }
                  setStep(2);
                }}
              >
                Proceed to Recipient Source <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Choose Source (Attendance or CSV) */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2: Recipient Source</CardTitle>
            <CardDescription>
              Import recipients from event verified attendees or upload/paste a CSV spreadsheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Button
                type="button"
                variant={sourceMode === "csv" ? "default" : "outline"}
                className="gap-2 h-14 flex-col"
                onClick={() => setSourceMode("csv")}
              >
                <FileSpreadsheet className="h-5 w-5" />
                <span>Upload / Paste CSV</span>
              </Button>

              <Button
                type="button"
                variant={sourceMode === "attendance" ? "default" : "outline"}
                className="gap-2 h-14 flex-col"
                onClick={() => setSourceMode("attendance")}
              >
                <UserCheck className="h-5 w-5" />
                <span>Event Attendance</span>
              </Button>
            </div>

            {sourceMode === "csv" ? (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="max-w-xs text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={downloadSampleCsv}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Sample CSV Template
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="csv-paste">Or Paste CSV Text directly</Label>
                  <Textarea
                    id="csv-paste"
                    rows={6}
                    value={csvRawText}
                    onChange={(e) => setCsvRawText(e.target.value)}
                    placeholder={`Name,Email,Role,Team,ContributionSummary\n"John Doe","john@srmap.edu.in","Technical Lead","Technical Team","Architected platform"\n"Alice Smith","alice@srmap.edu.in","Volunteer","Organizing & Leadership","On-ground ops"`}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Required header: <strong>Name</strong>. Optional headers: Email, Role, Team, ContributionSummary.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="gap-2 bg-gradient-to-r from-primary to-secondary text-white"
                    onClick={handleParseCsv}
                  >
                    Parse & Review Recipients <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Pulls all attendees who have redeemed attendance codes or were verified for{" "}
                  <strong>{selectedEvent?.title}</strong>.
                </p>

                <div className="flex items-center justify-between pt-3">
                  <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="gap-2 bg-gradient-to-r from-primary to-secondary text-white"
                    onClick={loadFromAttendance}
                  >
                    Import Verified Attendees <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Review, Assign Roles & Validate */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Step 3: Review & Role Assignment ({recipients.length} recipients)
                </CardTitle>
                <CardDescription>
                  Review parsed recipients, verify email linkages, and assign specific team roles.
                </CardDescription>
              </div>

              {/* Quick assign to all */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Assign to all:</span>
                <Select value={defaultRoleId} onValueChange={applyRoleToAll}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Bulk apply role" />
                  </SelectTrigger>
                  <SelectContent>
                    {CERTIFICATE_TEAMS.map((group) => (
                      <div key={group.id}>
                        <p className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                          {group.name}
                        </p>
                        {group.roles.map((r) => (
                          <SelectItem key={r.id} value={r.id} className="text-xs">
                            {r.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[380px] overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Recipient Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r, idx) => {
                    const isDup = r.email && existingEmails.has(r.email.toLowerCase());
                    return (
                      <TableRow key={idx} className={isDup ? "bg-amber-500/10" : ""}>
                        <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-xs">
                          {r.name}
                          {isDup && (
                            <Badge variant="outline" className="ml-2 text-[10px] border-amber-500 text-amber-600">
                              Already has cert
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.email || "—"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={
                              ALL_ROLES.find((preset) => preset.name === r.role)?.id ||
                              "participant"
                            }
                            onValueChange={(val) => {
                              const p = findRolePreset(val);
                              if (!p) return;
                              setRecipients((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        role: p.name,
                                        team: p.team,
                                        certificateType: p.defaultCertificateType,
                                        recipientCategory: getDefaultRecipientCategory(p.id),
                                      }
                                    : item
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs w-[160px]">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_ROLES.map((role) => (
                                <SelectItem key={role.id} value={role.id} className="text-xs">
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={r.recipientCategory || ""} onValueChange={(value) => setRecipients((prev) => prev.map((item, i) => i === idx ? { ...item, recipientCategory: value as NonNullable<CertificateRecipient["recipientCategory"]> } : item))}>
                            <SelectTrigger className="h-7 w-[150px] text-xs" aria-label={`Category for ${r.name}`}><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="participant">Participant</SelectItem>
                              <SelectItem value="winner">Winner</SelectItem>
                              <SelectItem value="organizer">Organizer</SelectItem>
                              <SelectItem value="volunteer">Volunteer</SelectItem>
                              <SelectItem value="team_member">Team member</SelectItem>
                              <SelectItem value="faculty_coordinator">Faculty coordinator</SelectItem>
                              <SelectItem value="mentor">Mentor</SelectItem>
                              <SelectItem value="speaker">Speaker</SelectItem>
                              <SelectItem value="judge">Judge</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.team || "Participants"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeRecipient(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {isProcessing && (
              <div className="space-y-2 py-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Issuing certificates…</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            <div className="flex items-center justify-between pt-3">
              <Button variant="ghost" onClick={() => setStep(2)} disabled={isProcessing}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                className="gap-2 bg-gradient-to-r from-emerald-600 via-teal-700 to-green-700 text-white font-medium shadow-sm"
                onClick={executeBatch}
                disabled={isProcessing || recipients.length === 0}
              >
                <CheckCircle className="h-4 w-4" />
                {isProcessing ? "Processing Batch…" : `Issue ${recipients.length} Certificate(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Results & Email Dispatch */}
      {step === 4 && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Batch Issuance Completed!
            </CardTitle>
            <CardDescription>
              {issuedResults.length} certificates successfully generated and logged in official registry.
              {skippedCount > 0 && ` (${skippedCount} skipped due to duplicates or errors).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-card border text-sm space-y-2">
              <div className="flex justify-between">
                <span>Total Issued:</span>
                <span className="font-bold text-emerald-600">{issuedResults.length}</span>
              </div>
              <div className="flex justify-between">
                <span>With Valid Recipient Email:</span>
                <span className="font-bold">
                  {issuedResults.filter((c) => Boolean(c.recipientEmail)).length}
                </span>
              </div>
              {skippedCount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Skipped / Existing:</span>
                  <span className="font-bold">{skippedCount}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium"
                onClick={handleEmailAllIssued}
                disabled={isEmailingAll || issuedResults.length === 0}
              >
                <Mail className="h-4 w-4" />
                {isEmailingAll
                  ? `Sending Emails (${emailedCount}/${issuedResults.length})…`
                  : `Email Certificates to All Recipients (${issuedResults.filter((c) => Boolean(c.recipientEmail)).length})`}
              </Button>

              <Button variant="outline" onClick={onFinished}>
                Return to Certificate Registry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
