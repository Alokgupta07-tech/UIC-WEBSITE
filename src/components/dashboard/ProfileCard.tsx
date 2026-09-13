import { CheckCircle2, ExternalLink, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatEventDate } from "@/lib/dates";

export interface ProfileField {
  label: string;
  value: string | null;
  /** Renders as an external link when set. */
  href?: string | null;
}

interface ProfileCardProps {
  fields: ProfileField[];
  bio: string | null;
  /** ISO timestamp of when the member's profile row was created, if known. */
  memberSince: string | null;
  onEdit: () => void;
}

/** Placeholder for a field the member has not filled in. Never a fake value. */
const NOT_PROVIDED = "Not provided";

/**
 * "My Profile" card. Renders only the fields that actually exist on the
 * authenticated user or their `profiles` row; anything missing shows a
 * "Not provided" placeholder rather than invented data.
 */
export function ProfileCard({ fields, bio, memberSince, onEdit }: ProfileCardProps) {
  const joined = formatEventDate(memberSince);

  return (
    <Card className="card-hover h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">My Profile</CardTitle>
            <CardDescription>Your UIC member details</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={onEdit}>
            <Settings className="h-4 w-4" aria-hidden />
            Edit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
          <span>Signed in with Google</span>
        </div>

        <dl className="space-y-3">
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {field.label}
              </dt>
              <dd className="mt-0.5 break-words text-sm">
                {field.value ? (
                  field.href ? (
                    <a
                      href={field.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {field.value}
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                    </a>
                  ) : (
                    field.value
                  )
                ) : (
                  <span className="text-muted-foreground">{NOT_PROVIDED}</span>
                )}
              </dd>
            </div>
          ))}

          {joined && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Member since
              </dt>
              <dd className="mt-0.5 text-sm">{joined}</dd>
            </div>
          )}
        </dl>

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bio
          </h3>
          <p className="mt-1 text-sm">
            {bio || <span className="text-muted-foreground">No bio provided yet.</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
