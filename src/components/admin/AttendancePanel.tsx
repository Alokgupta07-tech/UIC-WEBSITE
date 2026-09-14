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
import { Ticket, Ban, RefreshCw, Download, Copy, MonitorPlay } from "lucide-react";
import {
  getActiveAttendanceCode,
  generateAttendanceCode,
  revokeAttendanceCode,
  getEventAttendance
} from "@/services/attendance";
import type { AttendanceCode, ClubEvent } from "@/types";

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

function parseValidityHours(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_VALIDITY_HOURS) return null;
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
    const rows = attendanceRecords.map((r: any) =>
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
                    {attendanceRecords.map((record: any) => (
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
