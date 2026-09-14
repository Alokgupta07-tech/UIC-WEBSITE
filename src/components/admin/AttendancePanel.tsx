import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket, Ban, RefreshCw, Download } from "lucide-react";
import {
  getActiveAttendanceCode,
  generateAttendanceCode,
  revokeAttendanceCode,
  getEventAttendance
} from "@/services/attendance";
import type { ClubEvent } from "@/types";

export function AttendancePanel({ eventsAdmin }: { eventsAdmin?: ClubEvent[] }) {
  const queryClient = useQueryClient();
  const [attendanceEventId, setAttendanceEventId] = useState("");
  const [validHours, setValidHours] = useState("4"); // default 4 hours validity

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

  const generateCodeMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      const validFrom = now;
      const validUntil = new Date(now.getTime() + parseInt(validHours) * 60 * 60 * 1000);
      return generateAttendanceCode(attendanceEventId, validFrom, validUntil);
    },
    onSuccess: (rawCode) => {
      // The raw code is only shown once via toast, but we can also display it in the UI temporarily if we stored it in state,
      // but showing it via an alert is safer.
      alert(`ATTENDANCE CODE GENERATED: ${rawCode}\n\nPlease copy or display this code now. It will not be shown again.`);
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

  const handleDownloadCSV = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) return;
    const event = eventsAdmin?.find((e) => e.id === attendanceEventId);
    const title = event?.title || "event";
    
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
              <Label>Select Event</Label>
              <select
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
                  <Label>Validity (Hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="72"
                    value={validHours}
                    onChange={(e) => setValidHours(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => generateCodeMutation.mutate()}
                  disabled={generateCodeMutation.isPending || !validHours}
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="font-semibold text-green-600 flex items-center">
                      <Ticket className="mr-2 h-4 w-4" /> Active Attendance Window Open
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Valid until: {new Date(activeCode.validUntil).toLocaleString()}
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to revoke the current active code?")) {
                        revokeCodeMutation.mutate();
                      }
                    }}
                    disabled={revokeCodeMutation.isPending}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Revoke Code
                  </Button>
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
    </div>
  );
}
