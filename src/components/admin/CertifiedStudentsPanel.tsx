import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Award } from "lucide-react";
import { toast } from "sonner";
import {
  getAllCertifiedStudentsAdmin,
  createCertifiedStudent,
  updateCertifiedStudent,
  deleteCertifiedStudent
} from "@/services/certifiedStudents";
import type { CertifiedStudent } from "@/types";

const emptyStudentForm = {
  name: "",
  department: "",
  year: "",
  achievement: "",
  event: "",
  position: "",
  imageUrl: "",
  linkedInUrl: "",
  displayOrder: "",
  isActive: true,
};

export function CertifiedStudentsPanel() {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState(emptyStudentForm);
  const [editingStudent, setEditingStudent] = useState<CertifiedStudent | null>(null);
  const [editForm, setEditForm] = useState(emptyStudentForm);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ["certified-students-admin"],
    queryFn: getAllCertifiedStudentsAdmin,
  });

  const buildInput = (f: typeof emptyStudentForm) => ({
    name: f.name.trim(),
    department: f.department.trim() || null,
    year: f.year.trim() || null,
    achievement: f.achievement.trim(),
    event: f.event.trim(),
    position: f.position.trim() || null,
    imageUrl: f.imageUrl.trim() || null,
    linkedInUrl: f.linkedInUrl.trim() || null,
    displayOrder: f.displayOrder ? Number(f.displayOrder) : 0,
    isActive: f.isActive,
  });

  const addStudent = useMutation({
    mutationFn: () => createCertifiedStudent(buildInput(form)),
    onSuccess: () => {
      toast.success("Certified student added!");
      setForm(emptyStudentForm);
      queryClient.invalidateQueries({ queryKey: ["certified-students-admin"] });
      queryClient.invalidateQueries({ queryKey: ["certified-students"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to add student."),
  });

  const editStudent = useMutation({
    mutationFn: () => {
      if (!editingStudent) throw new Error("No student selected");
      return updateCertifiedStudent(editingStudent.id, buildInput(editForm));
    },
    onSuccess: () => {
      toast.success("Student updated!");
      setEditDialogOpen(false);
      setEditingStudent(null);
      queryClient.invalidateQueries({ queryKey: ["certified-students-admin"] });
      queryClient.invalidateQueries({ queryKey: ["certified-students"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to update student."),
  });

  const removeStudent = useMutation({
    mutationFn: (id: string) => deleteCertifiedStudent(id),
    onSuccess: () => {
      toast.success("Student deleted.");
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["certified-students-admin"] });
      queryClient.invalidateQueries({ queryKey: ["certified-students"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to delete student."),
  });

  const openEditDialog = (student: CertifiedStudent) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name,
      department: student.department ?? "",
      year: student.year ?? "",
      achievement: student.achievement,
      event: student.event,
      position: student.position ?? "",
      imageUrl: student.imageUrl ?? "",
      linkedInUrl: student.linkedInUrl ?? "",
      displayOrder: String(student.displayOrder),
      isActive: student.isActive,
    });
    setEditDialogOpen(true);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Add Student Form */}
      <Card>
        <CardHeader><CardTitle>Add Certified Student</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" /></div>
            <div><Label>Achievement *</Label><Input value={form.achievement} onChange={e => setForm({...form, achievement: e.target.value})} placeholder="Winner / 1st Place" /></div>
            <div><Label>Event *</Label><Input value={form.event} onChange={e => setForm({...form, event: e.target.value})} placeholder="Hackathon 2024" /></div>
            <div><Label>Position</Label><Input value={form.position} onChange={e => setForm({...form, position: e.target.value})} placeholder="1st Place" /></div>
            <div><Label>Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="Computer Engineering" /></div>
            <div><Label>Year</Label><Input value={form.year} onChange={e => setForm({...form, year: e.target.value})} placeholder="2026" /></div>
            <div><Label>Image URL</Label><Input value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} placeholder="https://..." /></div>
            <div><Label>LinkedIn URL</Label><Input value={form.linkedInUrl} onChange={e => setForm({...form, linkedInUrl: e.target.value})} placeholder="https://linkedin.com/in/..." /></div>
            <div><Label>Display Order</Label><Input type="number" value={form.displayOrder} onChange={e => setForm({...form, displayOrder: e.target.value})} placeholder="1" /></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => setForm({...form, isActive: v})} />
              <Label>Active (Publicly Visible)</Label>
            </div>
          </div>
          <Button onClick={() => addStudent.mutate()} disabled={addStudent.isPending || !form.name || !form.achievement || !form.event} className="bg-gradient-to-r from-primary to-secondary">
            <Plus className="mr-2 h-4 w-4" />
            {addStudent.isPending ? "Adding..." : "Add Student"}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <div>
        <h3 className="mb-3 font-semibold">Certified Students ({students?.length ?? 0})</h3>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {students?.map((student) => (
              <Card key={student.id} className="overflow-hidden">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={student.imageUrl ?? undefined} alt={student.name} />
                    <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{student.name}</p>
                      <Badge variant={student.isActive ? "default" : "secondary"} className="text-xs">
                        {student.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{student.achievement} • {student.event}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(student)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setDeleteConfirmId(student.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {students?.length === 0 && <p className="text-sm text-muted-foreground">No certified students found.</p>}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Certified Student</DialogTitle>
            <DialogDescription>Update details for {editingStudent?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Name *</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
              <div><Label>Achievement *</Label><Input value={editForm.achievement} onChange={e => setEditForm({...editForm, achievement: e.target.value})} /></div>
              <div><Label>Event *</Label><Input value={editForm.event} onChange={e => setEditForm({...editForm, event: e.target.value})} /></div>
              <div><Label>Position</Label><Input value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} /></div>
              <div><Label>Department</Label><Input value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} /></div>
              <div><Label>Year</Label><Input value={editForm.year} onChange={e => setEditForm({...editForm, year: e.target.value})} /></div>
              <div><Label>Image URL</Label><Input value={editForm.imageUrl} onChange={e => setEditForm({...editForm, imageUrl: e.target.value})} /></div>
              <div><Label>LinkedIn URL</Label><Input value={editForm.linkedInUrl} onChange={e => setEditForm({...editForm, linkedInUrl: e.target.value})} /></div>
              <div><Label>Display Order</Label><Input type="number" value={editForm.displayOrder} onChange={e => setEditForm({...editForm, displayOrder: e.target.value})} /></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={editForm.isActive} onCheckedChange={v => setEditForm({...editForm, isActive: v})} />
                <Label>Active (Publicly Visible)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => editStudent.mutate()} disabled={editStudent.isPending || !editForm.name || !editForm.achievement || !editForm.event} className="bg-gradient-to-r from-primary to-secondary">
              {editStudent.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Certified Student</DialogTitle>
            <DialogDescription>Are you sure you want to delete this student? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && removeStudent.mutate(deleteConfirmId)} disabled={removeStudent.isPending}>
              {removeStudent.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
