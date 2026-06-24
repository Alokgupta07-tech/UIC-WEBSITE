import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_SETTINGS, updateSettings } from "@/services/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {
  const qc = useQueryClient();
  const settings = DEFAULT_SETTINGS;
  const isLoading = false;

  const [form, setForm] = useState({
    communityMemberCount: 0,
    instagram: "",
    linkedin: "",
    youtube: "",
    whatsappCommunity: "",
    siteUrl: "",
    siteOgImage: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        communityMemberCount: settings.communityMemberCount,
        instagram: settings.social.instagram || "",
        linkedin: settings.social.linkedin || "",
        youtube: settings.social.youtube || "",
        whatsappCommunity: settings.social.whatsappCommunity || "",
        siteUrl: settings.siteUrl || "",
        siteOgImage: settings.siteOgImage || "",
      });
    }
  }, [settings]);

  const updateMut = useMutation({
    mutationFn: (input: Parameters<typeof updateSettings>[0]) => updateSettings(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit() {
    updateMut.mutate({
      community_member_count: form.communityMemberCount,
      instagram: form.instagram || null,
      linkedin: form.linkedin || null,
      youtube: form.youtube || null,
      whatsapp_community: form.whatsappCommunity || null,
      site_url: form.siteUrl || null,
      site_og_image: form.siteOgImage || null,
    });
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage global site configuration and social links
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Global metrics and SEO</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="comm-count">Community Members Count</Label>
            <Input
              id="comm-count"
              type="number"
              value={form.communityMemberCount}
              onChange={(e) => setForm({ ...form, communityMemberCount: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">Displayed on the home page stats</p>
          </div>
          <div>
            <Label htmlFor="site-url">Site URL</Label>
            <Input
              id="site-url"
              value={form.siteUrl}
              onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
              placeholder="https://uic.example.com"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">Base URL for SEO canonical links</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>URLs for the footer and contact page (leave blank to hide)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="soc-ig">Instagram</Label>
            <Input
              id="soc-ig"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="soc-in">LinkedIn</Label>
            <Input
              id="soc-in"
              value={form.linkedin}
              onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="soc-yt">YouTube</Label>
            <Input
              id="soc-yt"
              value={form.youtube}
              onChange={(e) => setForm({ ...form, youtube: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="soc-wa">WhatsApp Community</Label>
            <Input
              id="soc-wa"
              value={form.whatsappCommunity}
              onChange={(e) => setForm({ ...form, whatsappCommunity: e.target.value })}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={updateMut.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {updateMut.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
