import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Settings, Image, CalendarPlus, Users, Pencil, Shield, Eye, EyeOff, Crown, UploadCloud, Play, X, Folder, Ticket, Download, Printer } from "lucide-react";
import { getSettings, updateSettings } from "@/services/settings";
import { getAllEventsAdmin } from "@/services/events";
import { getAllTeamAdmin, createTeamMember, updateTeamMember, deleteTeamMember } from "@/services/team";
import { getAdmins, getAllUsers, promoteToAdmin, removeAdmin } from "@/services/userManagement";
import { getGallery, createGalleryItem, deleteGalleryItem, uploadFile, detectMediaType } from "@/services/gallery";
import { getAttendanceCodes, generateAttendanceCodes, codesToCSV, deleteAttendanceCode, deleteAllAttendanceCodes } from "@/services/attendance";
import { isSuperAdmin } from "@/config/superAdmin";
import type { TeamMember, ClubEvent, EventGalleryItem, MediaType, AttendanceCode } from "@/types";
import type { TeamInput } from "@/services/team";

// Inline SVG placeholder shown when an image URL fails to load.
const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#e2e8f0"/>
      <g fill="none" stroke="#94a3b8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="90" y="110" width="220" height="180" rx="12"/>
        <circle cx="150" cy="160" r="18"/>
        <path d="M110 270 L180 200 L230 250 L270 210 L300 270 Z"/>
      </g>
    </svg>`
  );

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [settingsForm, setSettingsForm] = useState({
    communityMemberCount: "0",
    instagram: "",
    linkedin: "",
    youtube: "",
    whatsappCommunity: "",
    siteUrl: "",
    siteOgImage: "",
  });

  // Check admin role
  useEffect(() => {
    let active = true;

    const verifyRole = async () => {
      if (!loading && !user) {
        navigate("/auth", { replace: true });
        if (active) {
          setCheckingRole(false);
        }
        return;
      }

      if (!user) {
        return;
      }

      try {
        // Check for admin OR super_admin role
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "super_admin"])
          .limit(1);

        if (error) throw error;

        const hasRole = data && data.length > 0;

        // Auto-recovery: if this is the super admin email but role is missing, restore it
        if (!hasRole && isSuperAdmin(user.email)) {
          await supabase
            .from("user_roles")
            .upsert(
              { user_id: user.id, role: "super_admin" },
              { onConflict: "user_id,role", ignoreDuplicates: true }
            );
          if (active) {
            setIsAdmin(true);
            setCheckingRole(false);
          }
          return;
        }

        if (!active) {
          return;
        }

        if (hasRole) {
          setIsAdmin(true);
          setCheckingRole(false);
        } else {
          setIsAdmin(false);
          setCheckingRole(false);
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Supabase error:", JSON.stringify(error));
        if (active) {
          setIsAdmin(false);
          setCheckingRole(false);
          navigate("/", { replace: true });
        }
      }
    };

    void verifyRole();

    return () => {
      active = false;
    };
  }, [user, loading, navigate]);

  // --- Site Settings ---
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!settings) return;

    setSettingsForm({
      communityMemberCount: String(settings.communityMemberCount),
      instagram: settings.social.instagram ?? "",
      linkedin: settings.social.linkedin ?? "",
      youtube: settings.social.youtube ?? "",
      whatsappCommunity: settings.social.whatsappCommunity ?? "",
      siteUrl: settings.siteUrl ?? "",
      siteOgImage: settings.siteOgImage ?? "",
    });
  }, [settings]);

  const saveSettings = async () => {
    try {
      await updateSettings({
        community_member_count: Number(settingsForm.communityMemberCount) || 0,
        instagram: settingsForm.instagram || null,
        linkedin: settingsForm.linkedin || null,
        youtube: settingsForm.youtube || null,
        whatsapp_community: settingsForm.whatsappCommunity || null,
        site_url: settingsForm.siteUrl || null,
        site_og_image: settingsForm.siteOgImage || null,
      });
      toast.success("Settings updated!");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update settings");
    }
  };

  // --- Gallery Upload ---
  const [galleryForm, setGalleryForm] = useState({
    media_url: "",
    caption: "",
    album: "",
    event_id: "",
    media_type: "image" as MediaType,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Take the first file — fills the form preview + media_url after upload.
    const file = files[0];
    setPendingFile(file);
    setGalleryForm((f) => ({
      ...f,
      media_url: "",
      media_type: detectMediaType(file.name),
    }));
    setUploadProgress(0);
  };

  const runUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const publicUrl = await uploadFile(pendingFile, (pct) => setUploadProgress(pct));
      setGalleryForm((f) => ({ ...f, media_url: publicUrl, media_type: detectMediaType(pendingFile.name) }));
      setPendingFile(null);
      toast.success("Upload complete — review details and add to gallery.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    setUploadProgress(0);
    setGalleryForm((f) => ({ ...f, media_url: "", media_type: "image" }));
  };

  const addPhoto = useMutation({
    mutationFn: async () => {
      const eventId = galleryForm.event_id.trim();
      if (eventId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(eventId)) {
          throw new Error("Event ID must be a valid UUID.");
        }
      }
      const uploadedUrl = galleryForm.media_url.trim();
      if (!uploadedUrl) {
        throw new Error("Upload an image or paste a URL first.");
      }
      await createGalleryItem({
        image_url: uploadedUrl,
        media_url: uploadedUrl,
        caption: galleryForm.caption.trim() || null,
        album: galleryForm.album.trim() || null,
        media_type: galleryForm.media_type,
        event_id: eventId || null,
        uploaded_by: user?.id || null,
      });
    },
    onSuccess: () => {
      toast.success("Photo added to gallery!");
      setGalleryForm({ media_url: "", caption: "", album: "", event_id: "", media_type: "image" });
      setPendingFile(null);
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to add photo."),
  });

  const { data: galleryPhotos } = useQuery({
    queryKey: ["gallery"],
    queryFn: getGallery,
    enabled: isAdmin,
  });

  const deletePhoto = useMutation({
    mutationFn: (id: string) => deleteGalleryItem(id),
    onSuccess: () => { toast.success("Photo deleted"); queryClient.invalidateQueries({ queryKey: ["gallery"] }); },
  });

  // Group existing gallery photos by album for the admin grid.
  const groupedByAlbum = useMemo(() => {
    const groups = new Map<string, EventGalleryItem[]>();
    for (const photo of galleryPhotos ?? []) {
      const album = photo.album || "General";
      if (!groups.has(album)) groups.set(album, []);
      groups.get(album)!.push(photo);
    }
    return Array.from(groups.entries());
  }, [galleryPhotos]);

  // --- Add Event ---
  const emptyEventForm = {
    title: "", short_description: "", description: "",
    event_date: "", end_date: "", venue: "", location: "",
    is_online: false, meeting_link: "", image_url: "",
    max_participants: "", registration_deadline: "",
  };
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [editEventForm, setEditEventForm] = useState(emptyEventForm);
  const [editEventDialogOpen, setEditEventDialogOpen] = useState(false);

  const { data: eventsAdmin, isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ["events-admin"],
    queryFn: getAllEventsAdmin,
    enabled: isAdmin,
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted!");
      queryClient.invalidateQueries({ queryKey: ["events-admin"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to delete event."),
  });

  const togglePublishEvent = useMutation({
    mutationFn: async (event: ClubEvent) => {
      const { error } = await supabase.from("events").update({ is_published: !event.isPublished }).eq("id", event.id);
      if (error) throw error;
      return event;
    },
    onSuccess: (event) => {
      toast.success(event.isPublished ? "Event unpublished!" : "Event published!");
      queryClient.invalidateQueries({ queryKey: ["events-admin"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to toggle publish status."),
  });

  const updateEventMutation = useMutation({
    mutationFn: async () => {
      if (!editingEvent) throw new Error("No event selected");
      const { error } = await supabase.from("events").update({
        title: editEventForm.title,
        short_description: editEventForm.short_description || null,
        description: editEventForm.description || null,
        event_date: editEventForm.event_date,
        end_date: editEventForm.end_date || null,
        venue: editEventForm.venue || null,
        location: editEventForm.location || null,
        is_online: editEventForm.is_online,
        meeting_link: editEventForm.meeting_link || null,
        image_url: editEventForm.image_url || null,
        max_participants: editEventForm.max_participants ? parseInt(editEventForm.max_participants) : null,
        registration_deadline: editEventForm.registration_deadline || null,
      }).eq("id", editingEvent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event updated!");
      setEditEventDialogOpen(false);
      setEditingEvent(null);
      queryClient.invalidateQueries({ queryKey: ["events-admin"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to update event."),
  });

  const confirmDeleteEvent = (id: string) => {
    if (window.confirm("Delete this event?")) {
      deleteEventMutation.mutate(id);
    }
  };

  const formatDatetimeLocal = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const openEditEventDialog = (event: ClubEvent) => {
    setEditingEvent(event);
    setEditEventForm({
      title: event.title,
      short_description: event.shortDescription ?? "",
      description: event.description ?? "",
      event_date: formatDatetimeLocal(event.eventDate),
      end_date: formatDatetimeLocal(event.endDate),
      venue: event.venue ?? "",
      location: event.location ?? "",
      is_online: event.isOnline ?? false,
      meeting_link: event.meetingLink ?? "",
      image_url: event.bannerImage ?? "",
      max_participants: event.maxParticipants ? String(event.maxParticipants) : "",
      registration_deadline: formatDatetimeLocal(event.registrationDeadline),
    });
    setEditEventDialogOpen(true);
  };

  const addEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert({
        title: eventForm.title,
        short_description: eventForm.short_description || null,
        description: eventForm.description || null,
        event_date: eventForm.event_date,
        end_date: eventForm.end_date || null,
        venue: eventForm.venue || null,
        location: eventForm.location || null,
        is_online: eventForm.is_online,
        meeting_link: eventForm.meeting_link || null,
        image_url: eventForm.image_url || null,
        max_participants: eventForm.max_participants ? parseInt(eventForm.max_participants) : null,
        registration_deadline: eventForm.registration_deadline || null,
        is_published: true,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event created!");
      setEventForm(emptyEventForm);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events-admin"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to create event."),
  });

  // --- Team Members ---
  const emptyTeamForm = {
    name: "", role: "", department: "", bio: "", avatar_url: "",
    linkedin_url: "", github_url: "", unstop_profile_url: "",
    skills: "", is_active: true, is_verified: false, display_order: "",
  };
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState(emptyTeamForm);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: getAllTeamAdmin,
    enabled: isAdmin,
  });

  const buildTeamInput = (form: typeof emptyTeamForm): TeamInput => ({
    name: form.name,
    role: form.role,
    department: form.department || null,
    bio: form.bio || null,
    avatar_url: form.avatar_url || null,
    linkedin_url: form.linkedin_url || null,
    github_url: form.github_url || null,
    unstop_profile_url: form.unstop_profile_url || null,
    skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : null,
    is_active: form.is_active,
    is_verified: form.is_verified,
    display_order: form.display_order ? Number(form.display_order) : null,
  });

  const addTeamMember = useMutation({
    mutationFn: () => createTeamMember(buildTeamInput(teamForm)),
    onSuccess: () => {
      toast.success("Team member added!");
      setTeamForm(emptyTeamForm);
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to add team member."),
  });

  const editTeamMember = useMutation({
    mutationFn: () => {
      if (!editingMember) throw new Error("No member selected");
      return updateTeamMember(editingMember.id, buildTeamInput(editForm));
    },
    onSuccess: () => {
      toast.success("Team member updated!");
      setEditDialogOpen(false);
      setEditingMember(null);
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to update team member."),
  });

  const removeTeamMember = useMutation({
    mutationFn: (id: string) => deleteTeamMember(id),
    onSuccess: () => {
      toast.success("Team member deleted.");
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to delete team member."),
  });

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setEditForm({
      name: member.name,
      role: member.role,
      department: member.department ?? "",
      bio: member.bio ?? "",
      avatar_url: member.avatarUrl ?? "",
      linkedin_url: member.linkedinUrl ?? "",
      github_url: member.githubUrl ?? "",
      unstop_profile_url: member.unstopProfileUrl ?? "",
      skills: member.skills?.join(", ") ?? "",
      is_active: member.isActive ?? true,
      is_verified: member.isVerified ?? false,
      display_order: member.displayOrder != null ? String(member.displayOrder) : "",
    });
    setEditDialogOpen(true);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  // --- User Management ---
  // SECURITY NOTE: This section only works because the current user is a verified admin
  // via user_roles check at page load. RLS policies on user_roles allow admins to manage
  // all roles. Never expose this tab to non-admins.
  const [promoteEmail, setPromoteEmail] = useState("");

  const { data: admins } = useQuery({
    queryKey: ["all-admins"],
    queryFn: getAdmins,
    enabled: isAdmin,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: getAllUsers,
    enabled: isAdmin,
  });

  const promote = useMutation({
    mutationFn: () => promoteToAdmin(promoteEmail),
    onSuccess: () => {
      toast.success("User promoted to admin!");
      setPromoteEmail("");
      queryClient.invalidateQueries({ queryKey: ["all-admins"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to promote user."),
  });

  const demote = useMutation({
    mutationFn: (userId: string) => removeAdmin(userId),
    onSuccess: () => {
      toast.success("Admin role removed.");
      queryClient.invalidateQueries({ queryKey: ["all-admins"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to remove admin."),
  });

  // --- Attendance ---
  const [attendanceEventId, setAttendanceEventId] = useState("");
  const [attendanceCount, setAttendanceCount] = useState("50");
  const [attendancePage, setAttendancePage] = useState(0);
  const ATTENDANCE_PAGE_SIZE = 50;
  // Non-blocking confirm dialogs (replaces window.confirm to fix INP)
  const [deleteCodeTarget, setDeleteCodeTarget] = useState<AttendanceCode | null>(null);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);

  const { data: attendanceCodes, isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance-codes", attendanceEventId],
    queryFn: () => getAttendanceCodes(attendanceEventId),
    enabled: isAdmin && !!attendanceEventId,
  });

  // Reset page when event changes
  const handleAttendanceEventChange = (eventId: string) => {
    setAttendanceEventId(eventId);
    setAttendancePage(0);
  };

  const attendancePageCount = Math.ceil((attendanceCodes?.length ?? 0) / ATTENDANCE_PAGE_SIZE);
  const attendancePagedCodes = attendanceCodes?.slice(
    attendancePage * ATTENDANCE_PAGE_SIZE,
    (attendancePage + 1) * ATTENDANCE_PAGE_SIZE
  ) ?? [];

  const generateCodesMutation = useMutation({
    mutationFn: () => generateAttendanceCodes(attendanceEventId, parseInt(attendanceCount, 10)),
    onSuccess: () => {
      toast.success("Attendance codes generated!");
      queryClient.invalidateQueries({ queryKey: ["attendance-codes", attendanceEventId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to generate codes"),
  });

  const deleteCodeMutation = useMutation({
    mutationFn: (id: string) => deleteAttendanceCode(id),
    onSuccess: () => {
      toast.success("Code deleted.");
      queryClient.invalidateQueries({ queryKey: ["attendance-codes", attendanceEventId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to delete code."),
  });

  const deleteAllCodesMutation = useMutation({
    mutationFn: () => deleteAllAttendanceCodes(attendanceEventId),
    onSuccess: () => {
      toast.success("All codes deleted.");
      setAttendancePage(0);
      queryClient.invalidateQueries({ queryKey: ["attendance-codes", attendanceEventId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to delete codes."),
  });

  // Open dialog immediately (non-blocking) so browser can paint before any work
  const confirmDeleteCode = (code: AttendanceCode) => {
    setDeleteCodeTarget(code);
  };

  const confirmDeleteAllCodes = () => {
    if ((attendanceCodes?.length ?? 0) === 0) return;
    setDeleteAllConfirmOpen(true);
  };

  const downloadCodesCSV = () => {
    if (!attendanceCodes || !attendanceCodes.length) return;
    const event = eventsAdmin?.find(e => e.id === attendanceEventId);
    const title = event?.title || "event";
    const csvStr = codesToCSV(attendanceCodes, title);
    const blob = new Blob([csvStr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-codes.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintCodes = () => {
    window.print();
  };

  const attendanceStats = useMemo(() => {
    if (!attendanceCodes) return { total: 0, used: 0, unused: 0 };
    return attendanceCodes.reduce(
      (acc, code) => {
        acc.total++;
        if (code.status === "used") acc.used++;
        else acc.unused++;
        return acc;
      },
      { total: 0, used: 0, unused: 0 }
    );
  }, [attendanceCodes]);

  // Whether the currently logged-in user is the super admin
  const currentUserIsSuperAdmin = isSuperAdmin(user?.email);

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "super_admin": return "default" as const;
      case "admin":      return "default" as const;
      case "moderator":  return "secondary" as const;
      default:            return "outline" as const;
    }
  };

  const getRoleBadgeClass = (role: string | null) => {
    switch (role) {
      case "super_admin": return "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0";
      case "admin":      return "bg-purple-600 hover:bg-purple-700 text-white";
      case "moderator":  return "bg-blue-600 hover:bg-blue-700 text-white";
      default:            return "";
    }
  };

  if (loading || checkingRole) {
    return <Layout><div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></Layout>;
  }
  if (!isAdmin) return null;

  return (
    <Layout>
      <Helmet><title>Admin Panel — Unstop Igniters Club</title></Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage site content, events, and gallery</p>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="mb-6">
            <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Site Settings</TabsTrigger>
            <TabsTrigger value="events"><CalendarPlus className="mr-2 h-4 w-4" />Add Event</TabsTrigger>
            <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger>
            <TabsTrigger value="gallery"><Image className="mr-2 h-4 w-4" />Gallery</TabsTrigger>
            <TabsTrigger value="users"><Shield className="mr-2 h-4 w-4" />User Management</TabsTrigger>
            <TabsTrigger value="attendance"><Ticket className="mr-2 h-4 w-4" />Attendance</TabsTrigger>
          </TabsList>

          {/* Site Settings */}
          <TabsContent value="settings">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Community Member Count</CardTitle></CardHeader>
                <CardContent>
                  <Input value={settingsForm.communityMemberCount} onChange={(e) => setSettingsForm({ ...settingsForm, communityMemberCount: e.target.value })} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Site URL</CardTitle></CardHeader>
                <CardContent>
                  <Input value={settingsForm.siteUrl} onChange={(e) => setSettingsForm({ ...settingsForm, siteUrl: e.target.value })} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">OG Image</CardTitle></CardHeader>
                <CardContent>
                  <Input value={settingsForm.siteOgImage} onChange={(e) => setSettingsForm({ ...settingsForm, siteOgImage: e.target.value })} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Instagram</CardTitle></CardHeader>
                <CardContent>
                  <Input value={settingsForm.instagram} onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">LinkedIn</CardTitle></CardHeader>
                <CardContent>
                  <Input value={settingsForm.linkedin} onChange={(e) => setSettingsForm({ ...settingsForm, linkedin: e.target.value })} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">YouTube</CardTitle></CardHeader>
                <CardContent>
                  <Input value={settingsForm.youtube} onChange={(e) => setSettingsForm({ ...settingsForm, youtube: e.target.value })} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">WhatsApp Community</CardTitle></CardHeader>
                <CardContent>
                  <Input value={settingsForm.whatsappCommunity} onChange={(e) => setSettingsForm({ ...settingsForm, whatsappCommunity: e.target.value })} />
                </CardContent>
              </Card>
            </div>
            <div className="mt-6">
              <Button onClick={saveSettings} className="bg-gradient-to-r from-primary to-secondary">
                Save Settings
              </Button>
            </div>
          </TabsContent>

          {/* Add Event */}
          <TabsContent value="events" className="space-y-8">
            {/* Create New Event */}
            <Card>
              <CardHeader><CardTitle>Create New Event</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Event Title *</Label><Input value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} /></div>
                  <div><Label>Date & Time *</Label><Input type="datetime-local" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date: e.target.value})} /></div>
                  <div><Label>End Date & Time</Label><Input type="datetime-local" value={eventForm.end_date} onChange={e => setEventForm({...eventForm, end_date: e.target.value})} /></div>
                  <div><Label>Venue / Platform</Label><Input value={eventForm.venue} onChange={e => setEventForm({...eventForm, venue: e.target.value})} placeholder="Room 101 or Zoom" /></div>
                  <div><Label>Location</Label><Input value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} placeholder="City, State" /></div>
                  <div><Label>Max Participants</Label><Input type="number" value={eventForm.max_participants} onChange={e => setEventForm({...eventForm, max_participants: e.target.value})} /></div>
                  <div><Label>Registration Deadline</Label><Input type="datetime-local" value={eventForm.registration_deadline} onChange={e => setEventForm({...eventForm, registration_deadline: e.target.value})} /></div>
                  <div><Label>Meeting / Registration Link</Label><Input value={eventForm.meeting_link} onChange={e => setEventForm({...eventForm, meeting_link: e.target.value})} placeholder="https://unstop.com/o/... or Zoom link" /></div>
                  <div><Label>Event Image URL</Label><Input value={eventForm.image_url} onChange={e => setEventForm({...eventForm, image_url: e.target.value})} placeholder="https://..." /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={eventForm.is_online} onCheckedChange={v => setEventForm({...eventForm, is_online: v})} />
                  <Label>Is Online Event</Label>
                </div>
                <div><Label>Short Description</Label><Input value={eventForm.short_description} onChange={e => setEventForm({...eventForm, short_description: e.target.value})} /></div>
                <div><Label>Full Description</Label><Textarea rows={4} value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} /></div>
                <Button onClick={() => addEvent.mutate()} disabled={addEvent.isPending || !eventForm.title || !eventForm.event_date} className="bg-gradient-to-r from-primary to-secondary">
                  <Plus className="mr-2 h-4 w-4" />
                  {addEvent.isPending ? "Creating..." : "Create Event"}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Events List */}
            <div>
              <h3 className="mb-4 text-xl font-semibold">Existing Events</h3>
              {eventsLoading ? (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : eventsError ? (
                <div className="rounded-xl border bg-destructive/10 p-6 text-center text-destructive">
                  Failed to load events.
                </div>
              ) : eventsAdmin?.length === 0 ? (
                <div className="rounded-xl border bg-muted/50 p-12 text-center text-muted-foreground">
                  No events yet. Create your first event above!
                </div>
              ) : (
                <div className="grid gap-4">
                  {eventsAdmin?.map((event) => (
                    <Card key={event.id} className="overflow-hidden">
                      <CardContent className="flex items-center justify-between p-4 sm:p-6">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold truncate text-lg">{event.title}</h4>
                            <Badge variant={event.isPublished ? "default" : "secondary"} className={event.isPublished ? "bg-green-600 hover:bg-green-700 text-white" : "bg-yellow-600 hover:bg-yellow-700 text-white"}>
                              {event.isPublished ? "Published" : "Draft"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{new Date(event.eventDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            {event.venue && <span>• {event.venue}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => openEditEventDialog(event)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Event</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => togglePublishEvent.mutate(event)} disabled={togglePublishEvent.isPending}>
                                  {event.isPublished ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{event.isPublished ? "Unpublish" : "Publish"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="destructive" size="icon" onClick={() => confirmDeleteEvent(event.id)} disabled={deleteEventMutation.isPending}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Event Dialog */}
            <Dialog open={editEventDialogOpen} onOpenChange={setEditEventDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Event</DialogTitle>
                  <DialogDescription>Update the details for this event.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Event Title *</Label><Input value={editEventForm.title} onChange={e => setEditEventForm({...editEventForm, title: e.target.value})} /></div>
                    <div><Label>Date & Time *</Label><Input type="datetime-local" value={editEventForm.event_date} onChange={e => setEditEventForm({...editEventForm, event_date: e.target.value})} /></div>
                    <div><Label>End Date & Time</Label><Input type="datetime-local" value={editEventForm.end_date} onChange={e => setEditEventForm({...editEventForm, end_date: e.target.value})} /></div>
                    <div><Label>Venue / Platform</Label><Input value={editEventForm.venue} onChange={e => setEditEventForm({...editEventForm, venue: e.target.value})} /></div>
                    <div><Label>Location</Label><Input value={editEventForm.location} onChange={e => setEditEventForm({...editEventForm, location: e.target.value})} /></div>
                    <div><Label>Max Participants</Label><Input type="number" value={editEventForm.max_participants} onChange={e => setEditEventForm({...editEventForm, max_participants: e.target.value})} /></div>
                    <div><Label>Registration Deadline</Label><Input type="datetime-local" value={editEventForm.registration_deadline} onChange={e => setEditEventForm({...editEventForm, registration_deadline: e.target.value})} /></div>
                    <div><Label>Meeting / Registration Link</Label><Input value={editEventForm.meeting_link} onChange={e => setEditEventForm({...editEventForm, meeting_link: e.target.value})} /></div>
                    <div><Label>Event Image URL</Label><Input value={editEventForm.image_url} onChange={e => setEditEventForm({...editEventForm, image_url: e.target.value})} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editEventForm.is_online} onCheckedChange={v => setEditEventForm({...editEventForm, is_online: v})} />
                    <Label>Is Online Event</Label>
                  </div>
                  <div><Label>Short Description</Label><Input value={editEventForm.short_description} onChange={e => setEditEventForm({...editEventForm, short_description: e.target.value})} /></div>
                  <div><Label>Full Description</Label><Textarea rows={4} value={editEventForm.description} onChange={e => setEditEventForm({...editEventForm, description: e.target.value})} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditEventDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => updateEventMutation.mutate()} disabled={updateEventMutation.isPending || !editEventForm.title || !editEventForm.event_date} className="bg-gradient-to-r from-primary to-secondary">
                    {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Team Members */}
          <TabsContent value="team">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Add Member Form */}
              <Card>
                <CardHeader><CardTitle>Add Team Member</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Name *</Label><Input value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} placeholder="John Doe" /></div>
                    <div><Label>Role *</Label><Input value={teamForm.role} onChange={e => setTeamForm({...teamForm, role: e.target.value})} placeholder="President" /></div>
                    <div><Label>Department</Label><Input value={teamForm.department} onChange={e => setTeamForm({...teamForm, department: e.target.value})} placeholder="Technical" /></div>
                    <div><Label>Display Order</Label><Input type="number" value={teamForm.display_order} onChange={e => setTeamForm({...teamForm, display_order: e.target.value})} placeholder="1" /></div>
                    <div><Label>Avatar URL</Label><Input value={teamForm.avatar_url} onChange={e => setTeamForm({...teamForm, avatar_url: e.target.value})} placeholder="https://..." /></div>
                    <div><Label>LinkedIn URL</Label><Input value={teamForm.linkedin_url} onChange={e => setTeamForm({...teamForm, linkedin_url: e.target.value})} placeholder="https://linkedin.com/in/..." /></div>
                    <div><Label>GitHub URL</Label><Input value={teamForm.github_url} onChange={e => setTeamForm({...teamForm, github_url: e.target.value})} placeholder="https://github.com/..." /></div>
                    <div><Label>Unstop Profile URL</Label><Input value={teamForm.unstop_profile_url} onChange={e => setTeamForm({...teamForm, unstop_profile_url: e.target.value})} placeholder="https://unstop.com/u/..." /></div>
                  </div>
                  <div><Label>Skills (comma-separated)</Label><Input value={teamForm.skills} onChange={e => setTeamForm({...teamForm, skills: e.target.value})} placeholder="React, Node.js, Python" /></div>
                  <div><Label>Bio</Label><Textarea rows={3} value={teamForm.bio} onChange={e => setTeamForm({...teamForm, bio: e.target.value})} placeholder="Short bio..." /></div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={teamForm.is_active} onCheckedChange={v => setTeamForm({...teamForm, is_active: v})} />
                      <Label>Active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={teamForm.is_verified} onCheckedChange={v => setTeamForm({...teamForm, is_verified: v})} />
                      <Label>Verified</Label>
                    </div>
                  </div>
                  <Button onClick={() => addTeamMember.mutate()} disabled={addTeamMember.isPending || !teamForm.name || !teamForm.role} className="bg-gradient-to-r from-primary to-secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    {addTeamMember.isPending ? "Adding..." : "Add Member"}
                  </Button>
                </CardContent>
              </Card>

              {/* Member List */}
              <div>
                <h3 className="mb-3 font-semibold">Team Members ({teamMembers?.length ?? 0})</h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {teamMembers?.map((member) => (
                    <Card key={member.id} className="overflow-hidden">
                      <CardContent className="flex items-center gap-4 p-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{member.name}</p>
                            <Badge variant={member.isActive ? "default" : "secondary"} className="text-xs">
                              {member.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{member.role}{member.department ? ` · ${member.department}` : ""}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(member)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => setDeleteConfirmId(member.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {teamMembers?.length === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
                </div>
              </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Team Member</DialogTitle>
                  <DialogDescription>Update the details for {editingMember?.name}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Name *</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                    <div><Label>Role *</Label><Input value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} /></div>
                    <div><Label>Department</Label><Input value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} /></div>
                    <div><Label>Display Order</Label><Input type="number" value={editForm.display_order} onChange={e => setEditForm({...editForm, display_order: e.target.value})} /></div>
                    <div><Label>Avatar URL</Label><Input value={editForm.avatar_url} onChange={e => setEditForm({...editForm, avatar_url: e.target.value})} /></div>
                    <div><Label>LinkedIn URL</Label><Input value={editForm.linkedin_url} onChange={e => setEditForm({...editForm, linkedin_url: e.target.value})} /></div>
                    <div><Label>GitHub URL</Label><Input value={editForm.github_url} onChange={e => setEditForm({...editForm, github_url: e.target.value})} /></div>
                    <div><Label>Unstop Profile URL</Label><Input value={editForm.unstop_profile_url} onChange={e => setEditForm({...editForm, unstop_profile_url: e.target.value})} /></div>
                  </div>
                  <div><Label>Skills (comma-separated)</Label><Input value={editForm.skills} onChange={e => setEditForm({...editForm, skills: e.target.value})} /></div>
                  <div><Label>Bio</Label><Textarea rows={3} value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} /></div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={editForm.is_active} onCheckedChange={v => setEditForm({...editForm, is_active: v})} />
                      <Label>Active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={editForm.is_verified} onCheckedChange={v => setEditForm({...editForm, is_verified: v})} />
                      <Label>Verified</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => editTeamMember.mutate()} disabled={editTeamMember.isPending || !editForm.name || !editForm.role} className="bg-gradient-to-r from-primary to-secondary">
                    {editTeamMember.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete Member</DialogTitle>
                  <DialogDescription>Are you sure you want to delete this team member? This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={() => deleteConfirmId && removeTeamMember.mutate(deleteConfirmId)} disabled={removeTeamMember.isPending}>
                    {removeTeamMember.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Gallery */}
          <TabsContent value="gallery">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Upload / Add Form */}
              <Card>
                <CardHeader><CardTitle>Add Photo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Drag & drop upload area */}
                  <div>
                    <Label>Upload Media</Label>
                    {!pendingFile && !galleryForm.media_url ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          handleFilesSelected(e.dataTransfer.files);
                        }}
                        className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/40"
                        }`}
                      >
                        <UploadCloud className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm font-medium">Drag &amp; drop images here or click to browse</p>
                        <p className="text-xs text-muted-foreground">Images and videos · multiple files allowed</p>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {galleryForm.media_type === "video" ? (
                            <>
                              <video src={pendingFile ? URL.createObjectURL(pendingFile) : galleryForm.media_url} className="h-full w-full object-cover" muted />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/40"><Play className="h-5 w-5 fill-white text-white" /></span>
                            </>
                          ) : (
                            <img src={pendingFile ? URL.createObjectURL(pendingFile) : galleryForm.media_url} alt="preview" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{pendingFile?.name ?? (galleryForm.media_url ? "Uploaded media" : "")}</p>
                          <p className="text-xs text-muted-foreground">
                            {pendingFile ? formatFileSize(pendingFile.size) : "Ready to add to gallery"}
                          </p>
                          {uploading && (
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                            </div>
                          )}
                        </div>
                        {!uploading && (
                          <Button variant="ghost" size="icon" onClick={clearPendingFile} className="shrink-0">
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                    />
                  </div>

                  {/* Upload action + progress */}
                  {pendingFile && !galleryForm.media_url && (
                    <div className="space-y-2">
                      <Button onClick={runUpload} disabled={uploading} className="w-full bg-gradient-to-r from-primary to-secondary">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {uploading ? `Uploading... ${uploadProgress}%` : "Upload to Gallery"}
                      </Button>
                      {uploading && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      )}
                    </div>
                  )}

                  {galleryForm.media_url && (
                    <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">✓ Media uploaded. Add details below.</p>
                  )}

                  <div><Label>Album Name</Label><Input value={galleryForm.album} onChange={e => setGalleryForm({...galleryForm, album: e.target.value})} placeholder="e.g. Orientation 2025, Hackathon 2024" /></div>
                  <div><Label>Caption</Label><Input value={galleryForm.caption} onChange={e => setGalleryForm({...galleryForm, caption: e.target.value})} /></div>
                  <div><Label>Event ID (optional)</Label><Input value={galleryForm.event_id} onChange={e => setGalleryForm({...galleryForm, event_id: e.target.value})} placeholder="UUID of the event" /></div>
                  <div>
                    <Label>Or paste image URL directly</Label>
                    <Input value={galleryForm.media_url} onChange={e => setGalleryForm({...galleryForm, media_url: e.target.value, media_type: detectMediaType(e.target.value)})} placeholder="https://..." />
                  </div>
                  <Button onClick={() => addPhoto.mutate()} disabled={addPhoto.isPending || !galleryForm.media_url} className="bg-gradient-to-r from-primary to-secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    {addPhoto.isPending ? "Adding..." : "Add to Gallery"}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Photos grouped by album */}
              <div>
                <h3 className="mb-3 font-semibold">Existing Photos ({galleryPhotos?.length ?? 0})</h3>
                {galleryPhotos?.length === 0 ? (
                  <div className="rounded-2xl border bg-muted/40 p-12 text-center text-sm text-muted-foreground">
                    <Image className="mx-auto mb-3 h-10 w-10 opacity-50" />
                    No photos yet. Upload your first one!
                  </div>
                ) : (
                  <div className="max-h-[600px] space-y-6 overflow-y-auto pr-1">
                    {groupedByAlbum.map(([album, photos]) => (
                      <div key={album} className="rounded-2xl border bg-card/50 p-3">
                        <div className="mb-3 flex items-center gap-2 px-1">
                          <Folder className="h-4 w-4 text-primary" />
                          <Badge variant="secondary" className="rounded-md text-xs">{album}</Badge>
                          <span className="text-xs text-muted-foreground">{photos.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {photos.map((photo) => (
                            <div
                              key={photo.id}
                              className="group relative aspect-square overflow-hidden rounded-xl shadow-md transition-all duration-300 hover:scale-[1.03] hover:shadow-xl"
                            >
                              {photo.mediaType === "video" ? (
                                <video
                                  src={photo.mediaUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                  loop
                                  autoPlay
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={photo.mediaUrl}
                                  alt={photo.caption ?? ""}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                  onError={(e) => {
                                    const img = e.currentTarget as HTMLImageElement;
                                    img.onerror = null;
                                    img.src = FALLBACK_IMAGE;
                                  }}
                                />
                              )}

                              {/* Hover overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                {photo.caption && (
                                  <p className="px-2 text-center text-xs font-medium text-white">{photo.caption}</p>
                                )}
                              </div>

                              {/* Video play badge */}
                              {photo.mediaType === "video" && (
                                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-black/60 p-1">
                                  <Play className="h-3 w-3 fill-white text-white" />
                                </span>
                              )}

                              {/* Album badge */}
                              <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                {photo.album}
                              </span>

                              {/* Delete button */}
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100"
                                onClick={() => deletePhoto.mutate(photo.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users">
            <div className="space-y-6">
              {/* Promote User — only super admin can promote */}
              {currentUserIsSuperAdmin && (
                <Card>
                  <CardHeader><CardTitle>Promote User to Admin</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Input
                        value={promoteEmail}
                        onChange={e => setPromoteEmail(e.target.value)}
                        placeholder="user@example.com"
                        type="email"
                        className="max-w-sm"
                      />
                      <Button
                        onClick={() => promote.mutate()}
                        disabled={promote.isPending || !promoteEmail.trim()}
                        className="bg-gradient-to-r from-primary to-secondary"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {promote.isPending ? "Promoting..." : "Make Admin"}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Enter the email of a registered user to grant admin privileges.</p>
                  </CardContent>
                </Card>
              )}
              {!currentUserIsSuperAdmin && (
                <Card>
                  <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground">Only the Super Admin can promote or remove admins.</p>
                  </CardContent>
                </Card>
              )}

              {/* Current Admins */}
              <Card>
                <CardHeader><CardTitle>Current Admins ({admins?.length ?? 0})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {admins?.map((admin) => {
                      const isSelf = admin.userId === user?.id;
                      const isThisSuperAdmin = admin.role === "super_admin";
                      return (
                        <div key={admin.userId} className="flex items-center gap-4 rounded-lg border p-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(admin.fullName ?? admin.email ?? "?")}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{admin.fullName ?? "(No name)"}</p>
                              {isThisSuperAdmin && (
                                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 gap-1">
                                  <Crown className="h-3 w-3" />
                                  Super Admin
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{admin.email ?? "(No email)"}</p>
                          </div>
                          {/* Hide remove button for super admin; only super admin user can remove other admins */}
                          {!isThisSuperAdmin && currentUserIsSuperAdmin && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={isSelf || demote.isPending}
                                      onClick={() => demote.mutate(admin.userId)}
                                    >
                                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                                      Remove Admin
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {isSelf && <TooltipContent>Cannot remove yourself</TooltipContent>}
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      );
                    })}
                    {admins?.length === 0 && <p className="text-sm text-muted-foreground">No admins found.</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Registered Users */}
              <Card>
                <CardHeader><CardTitle>Registered Users (latest 20)</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers?.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{getInitials(u.fullName ?? u.email ?? "?")}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{u.fullName ?? "(No name)"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(u.role)} className={getRoleBadgeClass(u.role)}>
                              {u.role === "super_admin" ? (
                                <span className="flex items-center gap-1"><Crown className="h-3 w-3" />Super Admin</span>
                              ) : (u.role ?? "member")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {allUsers?.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No users found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance">
            <div className="space-y-6 print:hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Event Attendance Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Select Event</Label>
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={attendanceEventId}
                        onChange={(e) => handleAttendanceEventChange(e.target.value)}
                      >
                        <option value="" disabled>Select an event...</option>
                        {eventsAdmin?.map(e => (
                          <option key={e.id} value={e.id}>{e.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        max="2000"
                        value={attendanceCount}
                        onChange={(e) => setAttendanceCount(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={() => generateCodesMutation.mutate()}
                      disabled={!attendanceEventId || generateCodesMutation.isPending || parseInt(attendanceCount) <= 0}
                      className="bg-gradient-to-r from-primary to-secondary"
                    >
                      <Ticket className="mr-2 h-4 w-4" />
                      {generateCodesMutation.isPending ? "Generating..." : "Generate Codes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {attendanceEventId && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Codes</CardTitle></CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{attendanceStats.total}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Used Codes</CardTitle></CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{attendanceStats.used}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Unused Codes</CardTitle></CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-muted-foreground">{attendanceStats.unused}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle>Generated Codes</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={downloadCodesCSV} disabled={!attendanceCodes?.length}>
                          <Download className="mr-2 h-4 w-4" /> Download CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrintCodes} disabled={!attendanceCodes?.length}>
                          <Printer className="mr-2 h-4 w-4" /> Print View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={confirmDeleteAllCodes}
                          disabled={!attendanceCodes?.length || deleteAllCodesMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deleteAllCodesMutation.isPending ? "Deleting..." : "Delete All"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {attendanceLoading ? (
                        <div className="py-8 text-center text-muted-foreground">Loading...</div>
                      ) : attendanceCodes && attendanceCodes.length > 0 ? (
                        <>
                          <div className="rounded-md border overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Code</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Redeemed By</TableHead>
                                  <TableHead>Redeemed At</TableHead>
                                  <TableHead className="w-10"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {attendancePagedCodes.map((code) => (
                                  <TableRow key={code.id}>
                                    <TableCell className="font-mono font-medium">{code.code}</TableCell>
                                    <TableCell>
                                      <Badge variant={code.status === "used" ? "default" : "secondary"} className={code.status === "used" ? "bg-green-600" : ""}>
                                        {code.status === "used" ? "Used" : "Unused"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {code.participantName ? (
                                        <div>
                                          <div className="font-medium">{code.participantName}</div>
                                          <div className="text-xs text-muted-foreground">{code.participantEmail}</div>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {code.redeemedAt ? new Date(code.redeemedAt).toLocaleString() : "—"}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => confirmDeleteCode(code)}
                                        disabled={deleteCodeMutation.isPending}
                                        title="Delete code"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          {attendancePageCount > 1 && (
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-sm text-muted-foreground">
                                Showing {attendancePage * ATTENDANCE_PAGE_SIZE + 1}–{Math.min((attendancePage + 1) * ATTENDANCE_PAGE_SIZE, attendanceCodes.length)} of {attendanceCodes.length} codes
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAttendancePage(p => Math.max(0, p - 1))}
                                  disabled={attendancePage === 0}
                                >
                                  Prev
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAttendancePage(p => Math.min(attendancePageCount - 1, p + 1))}
                                  disabled={attendancePage >= attendancePageCount - 1}
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-8 text-center text-muted-foreground">No codes generated yet.</div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Print View for Codes (only visible when printing) */}
            <div className="hidden print:block">
              <h2 className="text-2xl font-bold mb-6 text-center">
                Attendance Codes — {eventsAdmin?.find(e => e.id === attendanceEventId)?.title || "Event"}
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {attendanceCodes?.filter(c => c.status === 'unused').map((code) => (
                  <div key={code.id} className="border-2 border-dashed border-gray-400 p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-sm text-gray-500 mb-2">Code:</span>
                    <span className="text-2xl font-mono font-bold tracking-widest">{code.code}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Non-blocking delete-code confirm dialog */}
          <AlertDialog open={!!deleteCodeTarget} onOpenChange={(open) => { if (!open) setDeleteCodeTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Code</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete code <span className="font-mono font-bold">{deleteCodeTarget?.code}</span>?
                  {deleteCodeTarget?.status === "used" && " This code has already been redeemed."}
                  {" "}This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (deleteCodeTarget) {
                      deleteCodeMutation.mutate(deleteCodeTarget.id);
                      setDeleteCodeTarget(null);
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Non-blocking delete-all confirm dialog */}
          <AlertDialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Codes</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete all <span className="font-bold">{attendanceCodes?.length ?? 0}</span> codes
                  for <span className="font-bold">{eventsAdmin?.find(e => e.id === attendanceEventId)?.title ?? "this event"}</span>?
                  Any photocopies already handed out will stop working. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    deleteAllCodesMutation.mutate();
                    setDeleteAllConfirmOpen(false);
                  }}
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
