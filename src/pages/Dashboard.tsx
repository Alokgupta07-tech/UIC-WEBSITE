import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Seo } from "@/components/seo/Seo";
import { seoForPath } from "@/features/seo/seoConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, LogOut, Settings, Shield } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DashboardProfile = {
  fullName: string;
  email: string;
  phone: string;
  bio: string;
  linkedinUrl: string;
  unstopProfileUrl: string;
  role: string;
};

const EMPTY_PROFILE: DashboardProfile = {
  fullName: "",
  email: "",
  phone: "",
  bio: "",
  linkedinUrl: "",
  unstopProfileUrl: "",
  role: "Member",
};

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<DashboardProfile>(EMPTY_PROFILE);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) {
        return { profile: EMPTY_PROFILE, isAdmin: false };
      }

      const [{ data: profileRow, error: profileError }, { data: adminRole, error: roleError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, full_name, email, phone, bio, linkedin_url, unstop_profile_url, role")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
      ]);

      if (profileError) {
        throw profileError;
      }

      if (roleError) {
        throw roleError;
      }

      const fallbackName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        (user.email?.split("@")[0] ?? "Member");

      const isAdmin = Boolean(adminRole);
      const profile: DashboardProfile = {
        fullName: profileRow?.full_name ?? fallbackName,
        email: profileRow?.email ?? user.email ?? "",
        phone: profileRow?.phone ?? "",
        bio: profileRow?.bio ?? "",
        linkedinUrl: profileRow?.linkedin_url ?? "",
        unstopProfileUrl: profileRow?.unstop_profile_url ?? "",
        role: isAdmin ? "Admin" : (profileRow?.role ?? "Member"),
      };

      return { profile, isAdmin };
    },
  });

  useEffect(() => {
    if (data?.profile) {
      setEditData(data.profile);
    }
  }, [data]);

  const saveProfile = useMutation({
    mutationFn: async (payload: DashboardProfile) => {
      if (!user) return;

      const { data: existing, error: existingError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      const updatePayload = {
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone || null,
        bio: payload.bio || null,
        linkedin_url: payload.linkedinUrl || null,
        unstop_profile_url: payload.unstopProfileUrl || null,
      };

      if (existing) {
        const { error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            ...updatePayload,
          });

        if (error) {
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Profile updated successfully.");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["dashboard-profile", user?.id] });
    },
    onError: () => {
      toast.error("Failed to update profile.");
    },
  });

  const profile = data?.profile ?? EMPTY_PROFILE;

  const initials = useMemo(() => {
    if (!profile.fullName) return "U";
    return profile.fullName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile.fullName]);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Could not load profile</CardTitle>
              <CardDescription>Please try refreshing the page in a moment.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>Dashboard — Unstop Igniters Club</title>
        <meta name="description" content="Member dashboard for Unstop Igniters Club." />
      </Helmet>
      <Seo {...seoForPath("/dashboard")} />

      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile.fullName}. Your account data is synced from Supabase.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:self-start">
            {data?.isAdmin && (
              <Link to="/admin">
                <Button variant="secondary" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Go to Admin Panel
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Card className="h-fit md:col-span-1">
            <CardContent className="pt-6 text-center">
              <Avatar className="mx-auto mb-4 h-24 w-24 ring-4 ring-primary/10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-2xl text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{profile.fullName}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>

              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <User className="h-3 w-3" />
                {profile.role}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Profile Details</CardTitle>
                  <CardDescription>Update your details saved in Supabase</CardDescription>
                </div>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setEditData(profile)}
                    >
                      <Settings className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={editData.fullName}
                          onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={editData.phone}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          placeholder="+91 XXXXXXXXXX"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={editData.bio}
                          onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                          placeholder="Tell us about yourself..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                        <Input
                          id="linkedinUrl"
                          value={editData.linkedinUrl}
                          onChange={(e) => setEditData({ ...editData, linkedinUrl: e.target.value })}
                          placeholder="https://linkedin.com/in/yourhandle"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unstopProfileUrl">Unstop Profile URL</Label>
                        <Input
                          id="unstopProfileUrl"
                          value={editData.unstopProfileUrl}
                          onChange={(e) => setEditData({ ...editData, unstopProfileUrl: e.target.value })}
                          placeholder="https://unstop.com/u/yourhandle"
                        />
                      </div>
                      <Button
                        className="w-full bg-gradient-to-r from-primary to-secondary"
                        onClick={() => saveProfile.mutate(editData)}
                        disabled={saveProfile.isPending}
                      >
                        {saveProfile.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Bio</h3>
                <p className="text-sm">{profile.bio || "No bio provided yet."}</p>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Phone</h3>
                <p className="text-sm">{profile.phone || "Not provided"}</p>
              </div>
              <div className="flex gap-4">
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                    LinkedIn Profile
                  </a>
                )}
                {profile.unstopProfileUrl && (
                  <a href={profile.unstopProfileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                    Unstop Profile
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
