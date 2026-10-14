import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllTeamAdmin,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  type TeamInput,
} from "@/services/team";
import { uploadTeamPhoto } from "@/services/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Upload, GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { TeamMember } from "@/types";

const EMPTY_FORM: TeamInput = {
  name: "",
  role: "",
  department: "",
  bio: "",
  avatar_url: "",
  linkedin_url: "",
  github_url: "",
  unstop_profile_url: "",
  skills: [],
  is_active: true,
  is_verified: true,
  display_order: 0,
};

export default function AdminTeam() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<TeamInput>({ ...EMPTY_FORM });
  const [skillsStr, setSkillsStr] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: team, isLoading } = useQuery({
    queryKey: ["admin-team"],
    queryFn: getAllTeamAdmin,
  });

  const createMut = useMutation({
    mutationFn: createTeamMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      toast.success("Team member added");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TeamInput> }) =>
      updateTeamMember(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      toast.success("Team member updated");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTeamMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      toast.success("Team member deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, display_order: (team?.length || 0) * 10 });
    setSkillsStr("");
    setDialogOpen(true);
  }

  function openEdit(member: TeamMember) {
    setEditing(member);
    setForm({
      name: member.name,
      role: member.role,
      department: member.department || "",
      bio: member.bio || "",
      avatar_url: member.avatarUrl || "",
      linkedin_url: member.linkedinUrl || "",
      github_url: member.githubUrl || "",
      unstop_profile_url: member.unstopProfileUrl || "",
      skills: member.skills || [],
      is_active: member.isActive ?? true,
      is_verified: member.isVerified ?? true,
      display_order: member.displayOrder ?? 0,
    });
    setSkillsStr((member.skills || []).join(", "));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadTeamPhoto(file);
      setForm((f) => ({ ...f, avatar_url: url }));
      toast.success("Photo uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.role.trim()) return toast.error("Role is required");

    const payload: TeamInput = {
      ...form,
      skills: skillsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (editing) {
      updateMut.mutate({ id: editing.id, input: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage club members and their profiles
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Member</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Loading team...
                  </td>
                </tr>
              ) : team && team.length > 0 ? (
                team.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        {member.displayOrder}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback>
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.department || "No department"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{member.role}</td>
                    <td className="px-4 py-3">
                      {member.isActive ? (
                        <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Team Member" : "Add Team Member"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={form.avatar_url || undefined} />
                <AvatarFallback>Photo</AvatarFallback>
              </Avatar>
              <div>
                <Label>Profile Photo</Label>
                <div className="mt-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tm-name">Name *</Label>
                <Input
                  id="tm-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tm-role">Role *</Label>
                <Input
                  id="tm-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. President, Tech Lead"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tm-dept">Department</Label>
                <Input
                  id="tm-dept"
                  value={form.department || ""}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. B.Tech CSE"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tm-order">Display Order</Label>
                <Input
                  id="tm-order"
                  type="number"
                  value={form.display_order || 0}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tm-bio">Bio</Label>
              <Textarea
                id="tm-bio"
                value={form.bio || ""}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="tm-skills">Skills (comma-separated)</Label>
              <Input
                id="tm-skills"
                value={skillsStr}
                onChange={(e) => setSkillsStr(e.target.value)}
                placeholder="React, Design, Leadership..."
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tm-linkedin">LinkedIn URL</Label>
                <Input
                  id="tm-linkedin"
                  value={form.linkedin_url || ""}
                  onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tm-unstop">Unstop Profile URL</Label>
                <Input
                  id="tm-unstop"
                  value={form.unstop_profile_url || ""}
                  onChange={(e) => setForm({ ...form, unstop_profile_url: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="tm-active"
                  checked={!!form.is_active}
                  onCheckedChange={(c) => setForm({ ...form, is_active: c })}
                />
                <Label htmlFor="tm-active">Active Member</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="tm-verify"
                  checked={!!form.is_verified}
                  onCheckedChange={(c) => setForm({ ...form, is_verified: c })}
                />
                <Label htmlFor="tm-verify">Verified Badge</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add Member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) deleteMut.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
