/**
 * Contest Participants - Admin verification management
 */

import { useState } from "react";
import { 
  useAllContestParticipants, 
  useUpdateParticipantVerification,
  useImportUnstopCSV,
  useAddManualParticipant,
  useDeleteParticipant
} from "@/hooks/useContest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Upload, 
  Search,
  UserPlus,
  Filter,
  Trash2,
  Download,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import type { VerificationStatus } from "@/types";

interface ContestParticipantsProps {
  eventId: string;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some((cell) => cell)) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  row.push(field.trim());
  if (row.some((cell) => cell)) rows.push(row);
  return rows;
}

export function ContestParticipants({ eventId }: ContestParticipantsProps) {
  const { data: participants, isLoading } = useAllContestParticipants(eventId);
  const updateVerification = useUpdateParticipantVerification();
  const importCSV = useImportUnstopCSV();
  const addParticipantMutation = useAddManualParticipant();
  const deleteParticipantMutation = useDeleteParticipant();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<VerificationStatus | "all">("all");
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verificationNote, setVerificationNote] = useState("");
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [csvFile, setCSVFile] = useState<File | null>(null);

  // Manual Add state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUnstopId, setNewUnstopId] = useState("");
  const [newStatus, setNewStatus] = useState<VerificationStatus>("verified");
  const [newNote, setNewNote] = useState("");

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      return;
    }

    await addParticipantMutation.mutateAsync({
      eventId,
      participantName: newName,
      participantEmail: newEmail,
      unstopRegistrationId: newUnstopId.trim() || undefined,
      verificationStatus: newStatus,
      note: newNote.trim() || undefined,
    });

    setShowAddDialog(false);
    setNewName("");
    setNewEmail("");
    setNewUnstopId("");
    setNewNote("");
  };

  const handleDelete = async (participant: any) => {
    if (!confirm(`Are you sure you want to remove ${participant.participantName} from this contest?`)) {
      return;
    }
    await deleteParticipantMutation.mutateAsync({
      participantId: participant.id,
      eventId,
    });
  };

  const handleExportCSV = () => {
    if (!participants || participants.length === 0) return;

    const headers = ["Name", "Email", "Unstop ID", "Status", "Source", "Verified At", "Admin Note"];
    const rows = participants.map((p) => [
      `"${p.participantName.replace(/"/g, '""')}"`,
      `"${p.participantEmail.replace(/"/g, '""')}"`,
      `"${(p.unstopRegistrationId || "").replace(/"/g, '""')}"`,
      p.verificationStatus,
      p.verificationSource,
      p.verifiedAt || "",
      `"${(p.rejectionOrAdminNote || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contest_participants_${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredParticipants = participants?.filter((p) => {
    const matchesSearch = 
      p.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.participantEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || p.verificationStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const handleVerify = (participant: any) => {
    setSelectedParticipant(participant);
    setVerificationNote(participant.rejectionOrAdminNote || "");
    setShowVerifyDialog(true);
  };

  const handleSubmitVerification = async (status: VerificationStatus) => {
    if (!selectedParticipant) return;

    await updateVerification.mutateAsync({
      participantId: selectedParticipant.id,
      status,
      note: verificationNote || undefined,
    });

    setShowVerifyDialog(false);
    setSelectedParticipant(null);
    setVerificationNote("");
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;

    const text = await csvFile.text();
    const rows = parseCsv(text);
    if (!rows.length) { alert("The CSV file is empty."); return; }
    const headers = rows[0].map((h) => h.toLowerCase());

    // Detect columns
    const emailCol = headers.findIndex(h => 
      h.includes("email") || h.includes("e-mail") || h.includes("participant email")
    );
    const nameCol = headers.findIndex(h => 
      h.includes("name") || h.includes("participant name") || h.includes("full name")
    );
    const idCol = headers.findIndex(h => 
      h.includes("registration") || h.includes("unstop") || h.includes("reg id")
    );

    if (emailCol === -1 || nameCol === -1) {
      alert("Could not detect email and name columns. Please check CSV format.");
      return;
    }

    const seen = new Set<string>();
    const csvData = rows.slice(1).map((cols) => ({
      email: (cols[emailCol] || "").trim().toLowerCase(),
      name: (cols[nameCol] || "").trim(),
      unstopId: idCol !== -1 ? (cols[idCol] || "").trim() : undefined,
    })).filter((row) => {
      if (!row.email || !row.name || seen.has(row.email)) return false;
      seen.add(row.email);
      return true;
    });

    await importCSV.mutateAsync({ eventId, csvData });
    setShowCSVUpload(false);
    setCSVFile(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Participant Management</CardTitle>
              <CardDescription>
                Verify Unstop registrations, add participants, and manage access
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Participant
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCSVUpload(true)} className="gap-1.5">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={!participants || participants.length === 0} className="gap-1.5">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{participants?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {participants?.filter(p => p.verificationStatus === "verified").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {participants?.filter(p => p.verificationStatus === "pending").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {participants?.filter(p => p.verificationStatus === "rejected").length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Unstop ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Verified Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants && filteredParticipants.length > 0 ? (
                  filteredParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.participantName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {participant.participantEmail}
                      </TableCell>
                      <TableCell className="text-sm">
                        {participant.unstopRegistrationId || "-"}
                      </TableCell>
                      <TableCell>
                        {participant.verificationStatus === "verified" && (
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {participant.verificationStatus === "pending" && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {participant.verificationStatus === "rejected" && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {participant.userId ? (
                          <Badge variant="outline">Linked</Badge>
                        ) : (
                          <Badge variant="secondary">Not Signed Up</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {participant.verifiedAt
                          ? format(new Date(participant.verifiedAt), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerify(participant)}
                          >
                            Manage
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            onClick={() => handleDelete(participant)}
                            title="Delete participant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery || filterStatus !== "all"
                        ? "No participants match your filters"
                        : "No participants yet. Import a CSV or click 'Add Participant' to get started."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Manual Add Participant Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <form onSubmit={handleAddParticipant}>
            <DialogHeader>
              <DialogTitle>Add Contest Participant</DialogTitle>
              <DialogDescription>
                Manually register a participant for this contest
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="part-name">Full Name *</Label>
                <Input
                  id="part-name"
                  required
                  placeholder="e.g., Alok Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-email">Email Address *</Label>
                <Input
                  id="part-email"
                  type="email"
                  required
                  placeholder="e.g., student@srmap.edu.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-unstop">Unstop Registration ID (Optional)</Label>
                <Input
                  id="part-unstop"
                  placeholder="e.g., UNSTOP-109283"
                  value={newUnstopId}
                  onChange={(e) => setNewUnstopId(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-status">Initial Verification Status</Label>
                <Select value={newStatus} onValueChange={(val: any) => setNewStatus(val)}>
                  <SelectTrigger id="part-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified (Can submit & rate immediately)</SelectItem>
                    <SelectItem value="pending">Pending (Awaiting approval)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-note">Admin Note (Optional)</Label>
                <Input
                  id="part-note"
                  placeholder="e.g., Verified via Discord registration"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addParticipantMutation.isPending}>
                {addParticipantMutation.isPending ? "Adding..." : "Add Participant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Participant Verification</DialogTitle>
            <DialogDescription>
              Verify or reject {selectedParticipant?.participantName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <p className="text-sm font-medium">{selectedParticipant?.participantName}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{selectedParticipant?.participantEmail}</p>
            </div>
            <div>
              <Label>Unstop Registration ID</Label>
              <p className="text-sm text-muted-foreground">
                {selectedParticipant?.unstopRegistrationId || "Not provided"}
              </p>
            </div>
            <div>
              <Label>Current Status</Label>
              <p className="text-sm font-medium capitalize">{selectedParticipant?.verificationStatus}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note">Admin Note (Optional)</Label>
              <Textarea
                id="note"
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                placeholder="Add a note about verification..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowVerifyDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSubmitVerification("rejected")}
              disabled={updateVerification.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleSubmitVerification("verified")}
              disabled={updateVerification.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={showCSVUpload} onOpenChange={setShowCSVUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Unstop Participants CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV with participant data. Required columns: Email, Name. Optional: Unstop ID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv">CSV File</Label>
              <Input
                id="csv"
                type="file"
                accept=".csv"
                onChange={(e) => setCSVFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Auto-detects columns: email, name, unstop id (case-insensitive)
              </p>
            </div>

            {csvFile && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected: {csvFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  Size: {(csvFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCSVUpload(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCSVUpload}
              disabled={!csvFile || importCSV.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {importCSV.isPending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
