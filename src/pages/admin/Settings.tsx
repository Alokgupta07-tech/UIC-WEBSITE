import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_SETTINGS, updateSettings, getSettings } from "@/services/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_CERTIFICATE_SIGNATORIES, normalizeCertificateSignaturePath } from "@/lib/certificateSignatories";

export default function AdminSettings() {
  const qc = useQueryClient();
  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const [form, setForm] = useState({
    communityMemberCount: 0,
    instagram: "",
    linkedin: "",
    siteUrl: "",
    siteOgImage: "",
    certificateSignatories: DEFAULT_CERTIFICATE_SIGNATORIES,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        communityMemberCount: settings.communityMemberCount,
        instagram: settings.social.instagram || "",
        linkedin: settings.social.linkedin || "",
        siteUrl: settings.siteUrl || "",
        siteOgImage: settings.siteOgImage || "",
        certificateSignatories: settings.certificateSignatories,
      });
    }
  }, [settings]);

  const updateMut = useMutation({
    mutationFn: (input: Parameters<typeof updateSettings>[0]) => updateSettings(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["certificate-signatories"] });
      toast.success("Settings saved successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit() {
    updateMut.mutate({
      community_member_count: form.communityMemberCount,
      instagram: form.instagram || null,
      linkedin: form.linkedin || null,
      site_url: form.siteUrl || null,
      site_og_image: form.siteOgImage || null,
      certificate_signatories: form.certificateSignatories,
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certificate Signatories</CardTitle>
          <CardDescription>
            These details are saved onto newly issued certificates. Signature images must be PNG files under public/assets/certificates/signatures; existing issued certificates keep their saved signatory details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {(["facultyCoordinator", "president"] as const).map((key) => {
            const signer = form.certificateSignatories[key];
            const label = key === "facultyCoordinator" ? "Faculty Coordinator" : "President";
            let previewPath: string | null = null;
            try { previewPath = normalizeCertificateSignaturePath(signer.signaturePath); } catch { /* Show a validation hint below. */ }
            return (
              <section key={key} className="space-y-3 rounded-lg border p-4">
                <h3 className="font-semibold">{label}</h3>
                <div className="space-y-1.5">
                  <Label htmlFor={`${key}-name`}>Printed name</Label>
                  <Input
                    id={`${key}-name`}
                    maxLength={80}
                    value={signer.printedName}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      certificateSignatories: {
                        ...current.certificateSignatories,
                        [key]: { ...current.certificateSignatories[key], printedName: event.target.value },
                      },
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${key}-designation`}>Designation</Label>
                  <Input
                    id={`${key}-designation`}
                    maxLength={140}
                    value={signer.designation}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      certificateSignatories: {
                        ...current.certificateSignatories,
                        [key]: { ...current.certificateSignatories[key], designation: event.target.value },
                      },
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${key}-signature`}>Signature image path</Label>
                  <Input
                    id={`${key}-signature`}
                    value={signer.signaturePath}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      certificateSignatories: {
                        ...current.certificateSignatories,
                        [key]: { ...current.certificateSignatories[key], signaturePath: event.target.value },
                      },
                    }))}
                  />
                </div>
                <div className="flex min-h-16 items-center justify-center rounded bg-muted/30 p-2">
                  {previewPath
                    ? <img src={previewPath} alt={`${label} signature preview`} className="max-h-14 max-w-full object-contain" />
                    : <p className="text-xs text-destructive">Use a file path from the site's certificate signatures folder.</p>}
                </div>
              </section>
            );
          })}
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
