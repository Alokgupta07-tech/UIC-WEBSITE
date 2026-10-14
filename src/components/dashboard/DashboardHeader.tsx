import { Link } from "react-router-dom";
import { LogOut, Shield, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/shared/AnimatedBackground";
import { Progress } from "@/components/ui/progress";

export interface DashboardIdentity {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  role: string;
}

interface DashboardHeaderProps {
  identity: DashboardIdentity;
  /** Percentage of the optional profile fields the member has filled in. */
  profileCompletion: number;
  isAdmin: boolean;
  onSignOut: () => void;
}

/** Time-of-day greeting so the header does not read identically all day. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Dashboard hero: who you are, which Google account you are signed in with, and
 * how complete your profile is. All values come from the authenticated user and
 * their `profiles` row — nothing is hardcoded.
 */
export function DashboardHeader({
  identity,
  profileCompletion,
  isAdmin,
  onSignOut,
}: DashboardHeaderProps) {
  const firstName = identity.fullName.trim().split(/\s+/)[0] || "there";

  return (
    <section className="relative overflow-hidden border-b bg-hero-pattern">
      <AnimatedBackground interactive />

      <div className="container relative mx-auto px-4 py-10 md:py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 shrink-0 ring-4 ring-primary/10">
              {identity.avatarUrl && (
                <AvatarImage
                  src={identity.avatarUrl}
                  alt={`${identity.fullName}'s profile photo`}
                  referrerPolicy="no-referrer"
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-xl text-primary-foreground">
                {identity.initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{greeting()},</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {firstName}
                </span>{" "}
                <span aria-hidden>👋</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Here is your UIC activity, events and certificates.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 font-medium backdrop-blur-sm">
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">{identity.email}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                  {identity.role}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 md:items-end">
            <div className="flex flex-wrap gap-2 md:justify-end">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="secondary" size="sm" className="gap-2">
                    <Shield className="h-4 w-4" aria-hidden />
                    Admin Panel
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={onSignOut} className="gap-2">
                <LogOut className="h-4 w-4" aria-hidden />
                Sign Out
              </Button>
            </div>

            {profileCompletion < 100 && (
              <div className="w-full min-w-0 rounded-xl border bg-background/70 p-3 backdrop-blur-sm md:w-60">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Profile completion</span>
                  <span className="font-semibold">{profileCompletion}%</span>
                </div>
                <Progress
                  value={profileCompletion}
                  className="h-1.5"
                  aria-label="Profile completion"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
