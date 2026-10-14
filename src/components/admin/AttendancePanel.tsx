import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket, Ban, RefreshCw, Download, Copy, MonitorPlay, Printer, Layers } from "lucide-react";
import {
  getActiveAttendanceCode,
  generateAttendanceCode,
  revokeAttendanceCode,
  getEventAttendance,
  generateParticipantCodes,
  getParticipantBatches,
  getParticipantBatchCodes,
  revokeParticipantBatch,
  type ParticipantBatch,
  type GeneratedBatch,
} from "@/services/attendance";
import type { AttendanceCode, AttendanceRecord, ClubEvent } from "@/types";

/** UI-only status derived from server timestamps. The backend remains the authority. */
type CodeStatus = "upcoming" | "active" | "expired" | "revoked";

function resolveCodeStatus(code: AttendanceCode): CodeStatus {
  const now = Date.now();
  if (!code.isActive) return "revoked";
  if (now < new Date(code.validFrom).getTime()) return "upcoming";
  if (now > new Date(code.validUntil).getTime()) return "expired";
  return "active";
}

const STATUS_LABEL: Record<CodeStatus, { text: string; className: string }> = {
  active: { text: "ACTIVE — Attendance window open", className: "text-green-600" },
  upcoming: { text: "UPCOMING — Window not started", className: "text-amber-600" },
  expired: { text: "EXPIRED — Window closed", className: "text-red-600" },
  revoked: { text: "REVOKED — Code invalidated", className: "text-muted-foreground" },
};

const MAX_VALIDITY_HOURS = 72;
const MAX_BATCH_SIZE = 5000;

function parseValidityHours(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_VALIDITY_HOURS) return null;
  return n;
}

function parseBatchCount(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_BATCH_SIZE) return null;
  return n;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AttendancePanel({ eventsAdmin }: { eventsAdmin?: ClubEvent[] }) {
  const queryClient = useQueryClient();
  const [attendanceEventId, setAttendanceEventId] = useState("");
  const [validHours, setValidHours] = useState("4"); // default 4 hours validity
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [displayModeOpen, setDisplayModeOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const { data: activeCode, isLoading: codeLoading } = useQuery({
    queryKey: ["active-attendance-code", attendanceEventId],
    queryFn: () => getActiveAttendanceCode(attendanceEventId),
    enabled: !!attendanceEventId,
  });

  const { data: attendanceRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["event-attendance", attendanceEventId],
    queryFn: () => getEventAttendance(attendanceEventId),
    enabled: !!attendanceEventId,
  });

  // Lightweight countdown tick. Visual convenience only — the backend decides
  // validity. When the countdown hits zero we revalidate against the server.
  const status = activeCode ? resolveCodeStatus(activeCode) : null;
  useEffect(() => {
    if (status !== "active") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status === "active" && activeCode && now > new Date(activeCode.validUntil).getTime()) {
      queryClient.invalidateQueries({ queryKey: ["active-attendance-code", attendanceEventId] });
    }
  }, [now, status, activeCode, attendanceEventId, queryClient]);

  const validity = parseValidityHours(validHours);

  const generateCodeMutation = useMutation({
    mutationFn: () => generateAttendanceCode(attendanceEventId, validity ?? 1),
    onSuccess: () => {
      toast.success("Attendance code generated!");
      queryClient.invalidateQueries({ queryKey: ["active-attendance-code", attendanceEventId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to generate code"),
  });

  const revokeCodeMutation = useMutation({
    mutationFn: () => revokeAttendanceCode(attendanceEventId),
    onSuccess: () => {
      toast.success("Active code revoked.");
      queryClient.invalidateQueries({ queryKey: ["active-attendance-code", attendanceEventId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to revoke code"),
  });

  const selectedEvent = useMemo(
    () => eventsAdmin?.find((e) => e.id === attendanceEventId),
    [eventsAdmin, attendanceEventId]
  );

  // ------------------- Participant code batches (Method B) -------------------
  const [batchCount, setBatchCount] = useState("500");
  const [lastBatch, setLastBatch] = useState<GeneratedBatch | null>(null);

  const batchCountValue = parseBatchCount(batchCount);

  const batchesQuery = useQuery({
    queryKey: ["participant-batches", attendanceEventId],
    queryFn: () => getParticipantBatches(attendanceEventId),
    enabled: !!attendanceEventId,
  });

  const generateBatchMutation = useMutation({
    mutationFn: () => generateParticipantCodes(attendanceEventId, batchCountValue ?? 1, validity ?? 1),
    onSuccess: (batch) => {
      setLastBatch(batch);
      toast.success(`${batch.generatedCount} attendance codes generated successfully.`);
      queryClient.invalidateQueries({ queryKey: ["participant-batches", attendanceEventId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to generate codes"),
  });

  const revokeBatchMutation = useMutation({
    mutationFn: (batchId: string) => revokeParticipantBatch(batchId),
    onSuccess: () => {
      toast.success("Batch revoked. Unused codes are now invalid.");
      queryClient.invalidateQueries({ queryKey: ["participant-batches", attendanceEventId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to revoke batch"),
  });

  const handleGenerateBatch = () => {
    if (!attendanceEventId) {
      toast.error("Please select an event first.");
      return;
    }
    if (batchCountValue == null) {
      toast.error(`Number of codes must be a whole number between 1 and ${MAX_BATCH_SIZE}.`);
      return;
    }
    if (validity == null) {
      toast.error(`Validity must be a whole number between 1 and ${MAX_VALIDITY_HOURS} hours.`);
      return;
    }
    generateBatchMutation.mutate();
  };

  const downloadBatchCsv = async (batch: ParticipantBatch) => {
    const codes = await getParticipantBatchCodes(batch.id);
    const header = "Serial,Attendance Code\n";
    const rows = codes.map((c) => `${c.serial},"${c.code}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-codes-${batch.label}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /** Open a print window with one card per code (browser "Save as PDF" gives
   *  the printable file). Codes never split across pages: each card is a
   *  page-break-avoiding block. */
  const printBatch = async (batch: ParticipantBatch) => {
    const codes = await getParticipantBatchCodes(batch.id);
    const eventName = selectedEvent?.title ?? batch.label;
    const cards = codes
      .map(
        (c) => `
        <div class="card">
          <div class="brand">UIC ATTENDANCE</div>
          <div class="code">${c.code}</div>
          <div class="event">Enter this code at:<br/><strong>${eventName}</strong></div>
        </div>`
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${batch.label}</title>
      <style>
        @page { margin: 12mm; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
        .card { border: 2px solid #333; border-radius: 6px; padding: 6mm 4mm;
                text-align: center; page-break-inside: avoid; break-inside: avoid; }
        .brand { font-size: 11pt; letter-spacing: 3px; color: #555; margin-bottom: 4mm; }
        .code { font-family: "Courier New", monospace; font-size: 20pt; font-weight: bold;
                letter-spacing: 2px; margin-bottom: 4mm; }
        .event { font-size: 10pt; color: #444; }
      </style></head>
      <body><div class="grid">${cards}</div>
      <script>window.onload = () => { window.print(); }</script></body></html>`;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error("The browser blocked the print window. Allow pop-ups and try again.");
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const batchActionButton = (batch: ParticipantBatch, label: string, fn: () => void) => (
    <Button key={label} size="sm" variant="outline" onClick={fn}>
      {label === "Download CSV" ? <Download className="mr-2 h-4 w-4" /> : <Printer className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );

  const handleCopyCode = async () => {
    if (!activeCode?.codeDisplay) return;
    try {
      await navigator.clipboard.writeText(activeCode.codeDisplay);
      toast.success("Attendance code copied");
    } catch {
      toast.error("Could not copy. Please copy the code manually.");
    }
  };

  const handleGenerateClick = () => {
    if (!attendanceEventId) {
      toast.error("Please select an event first.");
      return;
    }
    if (validity == null) {
      toast.error(`Validity must be a whole number between 1 and ${MAX_VALIDITY_HOURS} hours.`);
      return;
    }
    // Regenerating invalidates the current code — confirm if one is live.
    if (activeCode && resolveCodeStatus(activeCode) === "active") {
      setRegenerateConfirmOpen(true);
      return;
    }
    generateCodeMutation.mutate();
  };

  const handleDownloadCSV = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) return;
    const title = selectedEvent?.title || "event";

    const header = "Name,Email,Status,Marked At\n";
    const rows = attendanceRecords.map((r: AttendanceRecord) =>
      `"${r.userName || ''}","${r.userEmail || ''}",${r.status},"${new Date(r.markedAt).toLocaleString()}"`
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="attendance-event">Select Event</Label>
              <select
                id="attendance-event"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={attendanceEventId}
                onChange={(e) => setAttendanceEventId(e.target.value)}
              >
                <option value="" disabled>Select an event...</option>
                {eventsAdmin?.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>

            {attendanceEventId && (
              <>
                <div className="w-32 space-y-2">
                  <Label htmlFor="validity-hours">Validity (Hours)</Label>
                  <Input
                    id="validity-hours"
                    type="number"
                    min="1"
                    max={MAX_VALIDITY_HOURS}
                    step="1"
                    value={validHours}
                    onChange={(e) => setValidHours(e.target.value)}
                    aria-invalid={validHours !== "" && validity == null}
                  />
                </div>
                <Button
                  onClick={handleGenerateClick}
                  disabled={generateCodeMutation.isPending}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${generateCodeMutation.isPending ? "animate-spin" : ""}`} />
                  {activeCode ? "Regenerate Code" : "Generate Code"}
                </Button>
              </>
            )}
          </div>

          {attendanceEventId && (
            <div className="rounded-lg border p-4 bg-muted/30">
              {codeLoading ? (
                <div className="text-sm text-muted-foreground">Loading active code status...</div>
              ) : activeCode ? (
                <div className="space-y-4">
                  {/* LIVE ATTENDANCE CODE — projector-friendly */}
                  <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-background p-6 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Live Attendance Code
                    </p>
                    <p className="font-mono text-3xl font-bold tracking-[0.2em] sm:text-5xl">
                      {activeCode.codeDisplay ?? "••••-••••"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent?.title ?? "Event"}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span>Valid from: {new Date(activeCode.validFrom).toLocaleString()}</span>
                      <span>Valid until: {new Date(activeCode.validUntil).toLocaleString()}</span>
                      {status === "active" && (
                        <span className="font-mono font-semibold text-foreground">
                          Expires in {formatCountdown(new Date(activeCode.validUntil).getTime() - now)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      <Button size="sm" onClick={handleCopyCode}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Code
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDisplayModeOpen(true)}>
                        <MonitorPlay className="mr-2 h-4 w-4" /> Display Code
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleGenerateClick} disabled={generateCodeMutation.isPending}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Code
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => revokeCodeMutation.mutate()}
                        disabled={revokeCodeMutation.isPending || status === "revoked"}
                      >
                        <Ban className="mr-2 h-4 w-4" /> Revoke Code
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ticket className={`h-4 w-4 ${STATUS_LABEL[status!].className}`} />
                    <Badge variant="outline" className={STATUS_LABEL[status!].className}>
                      {STATUS_LABEL[status!].text}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No active attendance code for this event. Generate one to open attendance.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {attendanceEventId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" /> Participant Codes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Generate unique single-use codes for printing and physical distribution — one code per
              participant. Each code works only for this event, only during the validity window, and
              only once.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-40 space-y-2">
                <Label htmlFor="batch-count">Number of Codes</Label>
                <Input
                  id="batch-count"
                  type="number"
                  min="1"
                  max={MAX_BATCH_SIZE}
                  step="1"
                  value={batchCount}
                  onChange={(e) => setBatchCount(e.target.value)}
                  aria-invalid={batchCount !== "" && batchCountValue == null}
                />
              </div>
              <div className="w-32 space-y-2">
                <Label htmlFor="batch-hours">Validity (Hours)</Label>
                <Input
                  id="batch-hours"
                  type="number"
                  min="1"
                  max={MAX_VALIDITY_HOURS}
                  step="1"
                  value={validHours}
                  onChange={(e) => setValidHours(e.target.value)}
                />
              </div>
              <Button
                onClick={handleGenerateBatch}
                disabled={generateBatchMutation.isPending}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${generateBatchMutation.isPending ? "animate-spin" : ""}`} />
                {generateBatchMutation.isPending
                  ? `Generating ${batchCountValue ?? ""} codes...`
                  : "Generate Participant Codes"}
              </Button>
            </div>

            {/* Last generated batch summary */}
            {lastBatch && (
              <div className="rounded-lg border border-green-500/40 bg-green-500/5 p-4 space-y-3">
                <div className="font-semibold text-green-600">
                  {lastBatch.generatedCount} codes generated successfully — Batch {lastBatch.label}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>Event: {selectedEvent?.title ?? lastBatch.eventId}</span>
                  <span>Valid until: {new Date(lastBatch.validUntil).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Codes are shown below under “Batch {lastBatch.label}” — download and print them from
                  there. The raw codes are only retrievable by admins.
                </p>
              </div>
            )}

            {/* Batch history with live DB stats */}
            {batchesQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading batches...</div>
            ) : batchesQuery.data && batchesQuery.data.length > 0 ? (
              <div className="space-y-4">
                {batchesQuery.data.map((batch) => {
                  const isRevoked = batch.revokedAt != null;
                  const isExpired = Date.now() > new Date(batch.validUntil).getTime();
                  return (
                    <div key={batch.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold font-mono">{batch.label}</div>
                        <Badge
                          variant="outline"
                          className={
                            isRevoked
                              ? "text-muted-foreground"
                              : isExpired
                                ? "text-red-600"
                                : "text-green-600"
                          }
                        >
                          {isRevoked ? "REVOKED" : isExpired ? "EXPIRED" : "ACTIVE"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                        <span>Generated: {new Date(batch.createdAt).toLocaleString()}</span>
                        <span>Codes: {batch.codeCount}</span>
                        <span>Used: {batch.usedCount}</span>
                        <span>Remaining: {batch.remainingCount}</span>
                        <span>Valid until: {new Date(batch.validUntil).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {batchActionButton(batch, "Download CSV", () => void downloadBatchCsv(batch))}
                        {batchActionButton(batch, "Download Printable PDF", () => void printBatch(batch))}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm(`Revoke batch ${batch.label}? All unused codes in it become invalid. Existing attendance records are kept.`)) {
                              revokeBatchMutation.mutate(batch.id);
                            }
                          }}
                          disabled={revokeBatchMutation.isPending || isRevoked}
                        >
                          <Ban className="mr-2 h-4 w-4" /> Revoke Batch
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No participant code batches for this event yet.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {attendanceEventId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Verified Attendees ({attendanceRecords?.length || 0})</CardTitle>
            <Button variant="outline" size="sm" onClick={handleDownloadCSV} disabled={!attendanceRecords?.length}>
              <Download className="mr-2 h-4 w-4" /> Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            {recordsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading attendees...</div>
            ) : attendanceRecords && attendanceRecords.length > 0 ? (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marked At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record: AttendanceRecord) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.userName || "Unknown"}</TableCell>
                        <TableCell>{record.userEmail || "Unknown"}</TableCell>
                        <TableCell>{record.status}</TableCell>
                        <TableCell>{new Date(record.markedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No attendance recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Regenerate confirmation — protects a live event from accidental invalidation */}
      <AlertDialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate attendance code?</AlertDialogTitle>
            <AlertDialogDescription>
              Regenerating this code will immediately invalidate the current attendance code.
              Participants holding the old code will no longer be able to mark attendance. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRegenerateConfirmOpen(false);
                generateCodeMutation.mutate();
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Display mode — clean large-screen view for projecting at the venue */}
      <AlertDialog open={displayModeOpen} onOpenChange={setDisplayModeOpen}>
        <AlertDialogContent className="max-w-lg text-center">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <AlertDialogTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Unstop Igniters Club — Attendance
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="font-mono text-5xl font-bold tracking-[0.15em] text-foreground sm:text-7xl">
                  {activeCode?.codeDisplay ?? ""}
                </p>
                <p className="text-base font-medium text-foreground">{selectedEvent?.title}</p>
                <p className="text-sm">
                  Valid until {activeCode ? new Date(activeCode.validUntil).toLocaleString() : ""}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
