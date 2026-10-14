import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MemberProfile } from "@/hooks/useMemberProfile";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MemberProfile;
  onSave: (profile: MemberProfile) => void;
  isSaving: boolean;
}

/**
 * Edit the member's own profile fields.
 *
 * Same fields and same `profiles` columns as before the dashboard rework — the
 * form was moved out of the page so the dashboard stays readable.
 */
export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
  isSaving,
}: EditProfileDialogProps) {
  const [form, setForm] = useState<MemberProfile>(profile);

  // Reload the latest saved values each time the dialog opens.
  useEffect(() => {
    if (open) setForm(profile);
  }, [open, profile]);

  const update = <K extends keyof MemberProfile>(key: K, value: MemberProfile[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            These details are saved to your UIC member profile.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(form);
          }}
        >
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="+91 XXXXXXXXXX"
            />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(event) => update("bio", event.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
            <Input
              id="linkedinUrl"
              value={form.linkedinUrl}
              onChange={(event) => update("linkedinUrl", event.target.value)}
              placeholder="https://linkedin.com/in/yourhandle"
            />
          </div>
          <div>
            <Label htmlFor="unstopProfileUrl">Unstop Profile URL</Label>
            <Input
              id="unstopProfileUrl"
              value={form.unstopProfileUrl}
              onChange={(event) => update("unstopProfileUrl", event.target.value)}
              placeholder="https://unstop.com/u/yourhandle"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-secondary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
