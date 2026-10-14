import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGallery,
  createGalleryItem,
  deleteGalleryItem,
} from "@/services/gallery";
import { getAllEventsAdmin } from "@/services/events";
import { uploadGalleryMedia } from "@/services/storage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminGallery() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [eventId, setEventId] = useState<string>("none");
  const [uploading, setUploading] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: getGallery,
  });

  const { data: events } = useQuery({
    queryKey: ["admin-events"],
    queryFn: getAllEventsAdmin,
  });

  const deleteMut = useMutation({
    mutationFn: deleteGalleryItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery"] });
      toast.success("Image deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setFile(null);
    setCaption("");
    setEventId("none");
    setDialogOpen(true);
  }

  async function handleUpload() {
    if (!file) return toast.error("Please select a file");
    
    setUploading(true);
    try {
      const url = await uploadGalleryMedia(file);
      await createGalleryItem({
        media_url: url,
        media_type: file.type.startsWith("video/") ? "video" : "image",
        caption: caption || null,
        event_id: eventId === "none" ? null : eventId,
        uploaded_by: user!.id,
      });
      
      qc.invalidateQueries({ queryKey: ["admin-gallery"] });
      toast.success("Media uploaded successfully");
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gallery</h1>
          <p className="text-sm text-muted-foreground">
            Manage photos and videos from your events
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Upload Media
        </Button>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-xl border bg-card"
            >
              <img
                src={item.mediaUrl}
                alt={item.caption || "Gallery item"}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col justify-between bg-black/60 p-4 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-medium text-white line-clamp-2">
                    {item.caption || "No caption"}
                  </p>
                  {item.eventTitle && (
                    <p className="text-xs text-white/80 line-clamp-1">
                      Event: {item.eventTitle}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-white/60">
                    {item.createdAt && format(new Date(item.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center">
          <ImageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No Gallery Items</h3>
          <p className="mb-4 text-muted-foreground">
            Upload some photos to showcase your past events!
          </p>
          <Button onClick={openCreate}>Upload Media</Button>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Select File</Label>
              <div className="mt-1 flex items-center gap-3">
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-8 hover:bg-muted">
                  <div className="text-center">
                    <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {file ? file.name : "Click to select an image or video"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Brief description..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Link to Event (Optional)</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {events?.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload"}
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
            <AlertDialogTitle>Delete Media?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The media file will be permanently removed from the gallery.
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
