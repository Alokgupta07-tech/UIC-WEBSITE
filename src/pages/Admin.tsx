import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Settings, Image, CalendarPlus, Users, Pencil, Shield, Eye, EyeOff, Crown } from "lucide-react";
import { getSettings, updateSettings } from "@/services/settings";
import { getAllEventsAdmin } from "@/services/events";
import { getAllTeamAdmin, createTeamMember, updateTeamMember, deleteTeamMember } from "@/services/team";
import { getAdmins, getAllUsers, promoteToAdmin, removeAdmin } from "@/services/userManagement";
import { isSuperAdmin } from "@/config/superAdmin";
import type { TeamMember, ClubEvent } from "@/types";
import type { TeamInput } from "@/services/team";

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
    } catch (e: any) {
      toast.error(e.message || "Failed to update settings");
    }
  };

  // --- Gallery Upload ---
  const [galleryForm, setGalleryForm] = useState({ image_url: "", caption: "", event_id: "" });

  const addPhoto = useMutation({
    mutationFn: async () => {
      const eventId = galleryForm.event_id.trim();
      if (eventId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(eventId)) {
          throw new Error("Event ID must be a valid UUID.");
        }
      }

      const { error } = await supabase.from("event_gallery").insert({
        image_url: galleryForm.image_url.trim(),
        caption: galleryForm.caption.trim() || null,
        event_id: eventId || null,
        uploaded_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Photo added to gallery!");
      setGalleryForm({ image_url: "", caption: "", event_id: "" });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to add photo."),
  });

  const { data: galleryPhotos } = useQuery({
    queryKey: ["gallery"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_gallery").select("*").order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_gallery").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Photo deleted"); queryClient.invalidateQueries({ queryKey: ["gallery"] }); },
  });

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
              <Card>
                <CardHeader><CardTitle>Add Photo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Image URL *</Label><Input value={galleryForm.image_url} onChange={e => setGalleryForm({...galleryForm, image_url: e.target.value})} placeholder="https://..." /></div>
                  <div><Label>Caption</Label><Input value={galleryForm.caption} onChange={e => setGalleryForm({...galleryForm, caption: e.target.value})} /></div>
                  <div><Label>Event ID (optional)</Label><Input value={galleryForm.event_id} onChange={e => setGalleryForm({...galleryForm, event_id: e.target.value})} placeholder="UUID of the event" /></div>
                  <Button onClick={() => addPhoto.mutate()} disabled={addPhoto.isPending || !galleryForm.image_url} className="bg-gradient-to-r from-primary to-secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Gallery
                  </Button>
                </CardContent>
              </Card>

              <div>
                <h3 className="mb-3 font-semibold">Existing Photos ({galleryPhotos?.length ?? 0})</h3>
                <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                  {galleryPhotos?.map((photo) => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden border">
                      <img src={photo.image_url} alt={photo.caption ?? ""} className="aspect-square w-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="destructive" size="sm" onClick={() => deletePhoto.mutate(photo.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="p-2 text-xs truncate">{photo.caption ?? "Gallery Photo"}</p>
                    </div>
                  ))}
                </div>
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
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
