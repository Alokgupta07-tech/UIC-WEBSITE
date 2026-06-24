import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllEventsAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
  type EventInput,
} from "@/services/events";
import { getCategories } from "@/services/categories";
import { uploadEventBanner } from "@/services/storage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ClubEvent, EventStatus } from "@/types";

const EMPTY_FORM: EventInput = {
  title: "",
  description: "",
  short_description: "",
  banner_image: "",
  event_date: "",
  end_date: "",
  venue: "",
  location: "",
  is_online: false,
  event_type: "",
  unstop_registration_link: "",
  category_id: "",
  status: "draft",
};

export default function AdminEvents() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const [form, setForm] = useState<EventInput>({ ...EMPTY_FORM });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: getAllEventsAdmin,
  });

  const { data: categories } = useQuery({
    queryKey: ["event-categories"],
    queryFn: getCategories,
  });

  const createMut = useMutation({
    mutationFn: (input: EventInput) => createEvent(input, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Event created");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EventInput> }) =>
      updateEvent(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Event updated");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Event deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(event: ClubEvent) {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description || "",
      short_description: event.shortDescription || "",
      banner_image: event.bannerImage || "",
      event_date: event.eventDate ? event.eventDate.slice(0, 16) : "",
      end_date: event.endDate ? event.endDate.slice(0, 16) : "",
      venue: event.venue || "",
      location: event.location || "",
      is_online: event.isOnline || false,
      event_type: event.eventType || "",
      unstop_registration_link: event.unstopRegistrationLink || "",
      category_id: event.category?.id || "",
      status: event.status,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function handleBannerUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadEventBanner(file);
      setForm((f) => ({ ...f, banner_image: url }));
      toast.success("Banner uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.event_date) return toast.error("Event date is required");

    const payload: EventInput = {
      ...form,
      category_id: form.category_id || null,
      end_date: form.end_date || null,
    };

    if (editing) {
      updateMut.mutate({ id: editing.id, input: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  function statusBadge(status: EventStatus) {
    const colors: Record<EventStatus, string> = {
      published: "bg-green-500/10 text-green-600",
      draft: "bg-yellow-500/10 text-yellow-600",
      archived: "bg-gray-500/10 text-gray-600",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}
      >
        {status}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">
            Manage club events and registrations
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Create Event
        </Button>
      </div>

      {/* Events Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Event</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Loading events...
                  </td>
                </tr>
              ) : events && events.length > 0 ? (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {event.bannerImage && (
                          <img
                            src={event.bannerImage}
                            alt=""
                            className="h-10 w-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium line-clamp-1">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {event.venue || (event.isOnline ? "Online" : "TBA")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(event.eventDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">{statusBadge(event.status)}</td>
                    <td className="px-4 py-3">
                      {event.category ? (
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: event.category.color || undefined,
                            color: event.category.color ? "#fff" : undefined,
                          }}
                        >
                          {event.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {event.unstopRegistrationLink && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              window.open(
                                event.unstopRegistrationLink!,
                                "_blank"
                              )
                            }
                            aria-label="Open Unstop link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(event)}
                          aria-label="Edit event"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(event.id)}
                          aria-label="Delete event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No events yet. Create your first event!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Event" : "Create Event"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div>
              <Label htmlFor="ev-title">Title *</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Event title"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea
                id="ev-desc"
                value={form.description || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Short Description */}
            <div>
              <Label htmlFor="ev-short">Short Description</Label>
              <Input
                id="ev-short"
                value={form.short_description || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, short_description: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            {/* Banner */}
            <div>
              <Label>Banner Image</Label>
              <div className="mt-1 flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBannerUpload(file);
                    }}
                  />
                </label>
                {form.banner_image && (
                  <img
                    src={form.banner_image}
                    alt="Banner preview"
                    className="h-14 w-24 rounded-lg object-cover"
                  />
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ev-date">Event Date *</Label>
                <Input
                  id="ev-date"
                  type="datetime-local"
                  value={form.event_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, event_date: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ev-end">End Date</Label>
                <Input
                  id="ev-end"
                  type="datetime-local"
                  value={form.end_date || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, end_date: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Venue / Online */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ev-venue">Venue</Label>
                <Input
                  id="ev-venue"
                  value={form.venue || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, venue: e.target.value }))
                  }
                  placeholder="e.g. Seminar Hall"
                  className="mt-1"
                />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch
                  id="ev-online"
                  checked={!!form.is_online}
                  onCheckedChange={(c) =>
                    setForm((f) => ({ ...f, is_online: c }))
                  }
                />
                <Label htmlFor="ev-online">Online Event</Label>
              </div>
            </div>

            {/* Category / Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category_id || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      category_id: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status || "draft"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as EventStatus,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unstop Link */}
            <div>
              <Label htmlFor="ev-unstop">Unstop Registration Link</Label>
              <Input
                id="ev-unstop"
                value={form.unstop_registration_link || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    unstop_registration_link: e.target.value,
                  }))
                }
                placeholder="https://unstop.com/..."
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update Event" : "Create Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The event will be permanently
              removed.
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
