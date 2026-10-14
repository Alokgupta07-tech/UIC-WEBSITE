import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Award,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  History,
  Loader2,
  ScanLine,
  Sparkles,
} from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { seoForPath } from "@/features/seo/seoConfig";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/Reveal";

import {
  EMPTY_MEMBER_PROFILE,
  profileCompletion,
  profileInitials,
  useMemberProfile,
  useSaveMemberProfile,
} from "@/hooks/useMemberProfile";
import { getMemberActivity } from "@/services/dashboard";
import type { Certificate } from "@/types";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EditProfileDialog } from "@/components/dashboard/EditProfileDialog";
import { ProfileCard, type ProfileField } from "@/components/dashboard/ProfileCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProgressSection } from "@/components/dashboard/ProgressSection";
import { ScanCertificateCard } from "@/components/dashboard/ScanCertificateCard";
import { MemberEventCard } from "@/components/dashboard/MemberEventCard";
import { CertificateCard } from "@/components/dashboard/CertificateCard";
import {
  EmptyState,
  ErrorState,
  SectionHeading,
  SkeletonBlock,
  SkeletonCards,
} from "@/components/dashboard/SectionStates";

// The scanner pulls in the QR decoder, so it is only fetched when a member
// actually opens it. Same for the certificate detail view.
const QrScannerDialog = lazy(() => import("@/components/certificates/QrScannerDialog"));
const CertificateDetailDialog = lazy(
  () => import("@/components/certificates/CertificateDetailDialog")
);

/** How many attended events to name in the "Events Attended" summary. */
const RECENT_ATTENDED_LIMIT = 3;

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  const profileQuery = useMemberProfile(user);
  const profile = profileQuery.data?.profile ?? EMPTY_MEMBER_PROFILE;
  const isAdmin = profileQuery.data?.isAdmin ?? false;
  const saveProfile = useSaveMemberProfile(user, () => setIsEditOpen(false));

  // Activity loads in parallel with the profile so a slow query never blocks
  // the header from rendering.
  const activityQuery = useQuery({
    queryKey: ["member-activity", user?.id],
    enabled: Boolean(user?.id),
    queryFn: getMemberActivity,
    staleTime: 2 * 60 * 1000,
  });

  const activity = activityQuery.data;

  const identity = useMemo(
    () => ({
      fullName: profile.fullName,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      initials: profileInitials(profile.fullName),
      role: profile.role,
    }),
    [profile]
  );

  const profileFields = useMemo<ProfileField[]>(
    () => [
      { label: "Full name", value: profile.fullName || null },
      { label: "Email", value: profile.email || null },
      { label: "Phone", value: profile.phone || null },
      { label: "Membership", value: profile.role || null },
      {
        label: "LinkedIn",
        value: profile.linkedinUrl ? "View profile" : null,
        href: profile.linkedinUrl || null,
      },
      {
        label: "Unstop",
        value: profile.unstopProfileUrl ? "View profile" : null,
        href: profile.unstopProfileUrl || null,
      },
    ],
    [profile]
  );

  const handleCopyCertificateId = useCallback(async (certificate: Certificate) => {
    try {
      await navigator.clipboard.writeText(certificate.certificateNumber);
      toast.success("Certificate ID copied.");
    } catch {
      toast.error("Could not copy the certificate ID.");
    }
  }, []);

  const refreshActivity = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["member-activity", user?.id] });
  }, [queryClient, user?.id]);

  // ---------------------------------------------------------------------
  // Auth gates
  // ---------------------------------------------------------------------
  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div
            role="status"
            aria-label="Loading your dashboard"
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          />
        </div>
      </Layout>
    );
  }

  // A signed-out visitor never sees the private dashboard.
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const stats = activity?.stats;
  const recentAttended = (activity?.attended ?? []).slice(0, RECENT_ATTENDED_LIMIT);

  return (
    <Layout>
      <Helmet>
        <title>Dashboard — Unstop Igniters Club</title>
        <meta name="description" content="Member dashboard for Unstop Igniters Club." />
      </Helmet>
      <Seo {...seoForPath("/dashboard")} />

      {profileQuery.isLoading ? (
        <div className="border-b bg-hero-pattern">
          <div className="container mx-auto flex items-center gap-4 px-4 py-10 md:py-14">
            <SkeletonBlock className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-8 w-48" />
              <SkeletonBlock className="h-3 w-64" />
            </div>
          </div>
        </div>
      ) : (
        <DashboardHeader
          identity={identity}
          profileCompletion={profileCompletion(profile)}
          isAdmin={isAdmin}
          onSignOut={signOut}
        />
      )}

      <div className="container mx-auto space-y-10 px-4 py-8 md:py-12">
        {profileQuery.isError && (
          <ErrorState
            title="Could not load your profile"
            description="Your profile details are unavailable right now. Everything else still works."
            onRetry={() => void profileQuery.refetch()}
            isRetrying={profileQuery.isFetching}
          />
        )}

        {/* ---------------------------------------------------------- */}
        {/* Quick stats                                                */}
        {/* ---------------------------------------------------------- */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Activity summary
          </h2>

          {activityQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <SkeletonBlock key={index} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : activityQuery.isError ? (
            <ErrorState
              title="Could not load your activity"
              description="We could not reach your events and certificates just now."
              onRetry={() => void activityQuery.refetch()}
              isRetrying={activityQuery.isFetching}
            />
          ) : (
            stats && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Certificates"
                  value={stats.totalCertificates}
                  icon={Award}
                  index={0}
                  hint={
                    stats.totalCertificates !== stats.validCertificates
                      ? `${stats.validCertificates} currently valid`
                      : undefined
                  }
                />
                <StatCard
                  label="Events attended"
                  value={stats.eventsAttended}
                  icon={CalendarCheck}
                  index={1}
                />
                <StatCard
                  label="Upcoming events"
                  value={stats.upcomingEvents}
                  icon={CalendarClock}
                  index={2}
                />
                <StatCard
                  label="Completed events"
                  value={stats.completedEvents}
                  icon={History}
                  index={3}
                />
              </div>
            )
          )}
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Scan certificate                                           */}
        {/* ---------------------------------------------------------- */}
        <Reveal variant="fade-up">
          <ScanCertificateCard onScan={() => setIsScannerOpen(true)} />
        </Reveal>

        {/* ---------------------------------------------------------- */}
        {/* Profile + progress                                         */}
        {/* ---------------------------------------------------------- */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal variant="fade-up">
            {profileQuery.isLoading ? (
              <SkeletonBlock className="h-80 rounded-2xl" />
            ) : (
              <ProfileCard
                fields={profileFields}
                bio={profile.bio || null}
                memberSince={profile.createdAt}
                onEdit={() => setIsEditOpen(true)}
              />
            )}
          </Reveal>

          <Reveal variant="fade-up" delay={0.08}>
            {activityQuery.isLoading ? (
              <SkeletonBlock className="h-80 rounded-2xl" />
            ) : (
              activity && <ProgressSection progress={activity.progress} stats={activity.stats} />
            )}
          </Reveal>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Events attended summary                                    */}
        {/* ---------------------------------------------------------- */}
        {activity && activity.attended.length > 0 && (
          <Reveal variant="fade-up">
            <Card className="card-hover overflow-hidden">
              <CardContent className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center">
                <div className="flex items-center gap-4 md:w-64 md:shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
                    <CalendarCheck className="h-7 w-7 text-primary-foreground" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Events attended</p>
                    <p className="text-3xl font-bold tabular-nums">
                      {String(activity.stats.eventsAttended).padStart(2, "0")}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Most recent
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {recentAttended.map((item) => (
                      <li key={item.event.id} className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        <Link
                          to={`/events/${item.event.id}`}
                          className="min-w-0 truncate transition-colors hover:text-primary"
                        >
                          {item.event.title}
                        </Link>
                        {item.certificates.some(
                          (certificate) => certificate.status === "issued"
                        ) && (
                          <span className="shrink-0 text-xs text-success">· certificate</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* ---------------------------------------------------------- */}
        {/* My upcoming events                                         */}
        {/* ---------------------------------------------------------- */}
        <section aria-labelledby="upcoming-heading">
          <SectionHeading
            id="upcoming-heading"
            title="My Events"
            description="Events you have registered for that are still ahead."
            action={
              <Link to="/events">
                <Button variant="outline" size="sm">
                  Browse all events
                </Button>
              </Link>
            }
          />

          {activityQuery.isLoading ? (
            <SkeletonCards count={3} />
          ) : activityQuery.isError ? (
            <ErrorState
              onRetry={() => void activityQuery.refetch()}
              isRetrying={activityQuery.isFetching}
            />
          ) : activity && activity.upcoming.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activity.upcoming.map((item, index) => (
                <Reveal key={item.event.id} variant="fade-up" delay={index * 0.05}>
                  <MemberEventCard item={item} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="No upcoming events"
              description="Registrations for UIC events happen on Unstop. Once you are registered for an upcoming event, it will show up here."
              action={
                <Link to="/events">
                  <Button className="bg-gradient-to-r from-primary to-secondary">
                    Explore events
                  </Button>
                </Link>
              }
            />
          )}
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Past / attended events                                     */}
        {/* ---------------------------------------------------------- */}
        <section aria-labelledby="past-heading">
          <SectionHeading
            id="past-heading"
            title="Past Events"
            description="Events you took part in, with their attendance and certificate status."
          />

          {activityQuery.isLoading ? (
            <SkeletonCards count={3} />
          ) : activityQuery.isError ? (
            <ErrorState
              onRetry={() => void activityQuery.refetch()}
              isRetrying={activityQuery.isFetching}
            />
          ) : activity && activity.past.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activity.past.map((item, index) => (
                <Reveal key={item.event.id} variant="fade-up" delay={index * 0.05}>
                  <MemberEventCard
                    item={item}
                    onViewCertificate={(certificate) => setSelectedCertificate(certificate)}
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarX}
              title="No attended events yet"
              description="Attendance is recorded when you redeem the code handed out at a UIC event. Once that happens, the event appears here."
              action={
                <Link to="/attendance">
                  <Button variant="outline">Mark attendance</Button>
                </Link>
              }
            />
          )}
        </section>

        {/* ---------------------------------------------------------- */}
        {/* My certificates                                            */}
        {/* ---------------------------------------------------------- */}
        <section aria-labelledby="certificates-heading">
          <SectionHeading
            id="certificates-heading"
            title="My Certificates"
            description="Certificates issued to you for UIC events."
            action={
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsScannerOpen(true)}
              >
                <ScanLine className="h-4 w-4" aria-hidden />
                Scan a certificate
              </Button>
            }
          />

          {activityQuery.isLoading ? (
            <SkeletonCards count={3} cardClassName="h-56" />
          ) : activityQuery.isError ? (
            <ErrorState
              onRetry={() => void activityQuery.refetch()}
              isRetrying={activityQuery.isFetching}
            />
          ) : activity && activity.certificates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activity.certificates.map((certificate, index) => (
                <Reveal key={certificate.id} variant="fade-up" delay={index * 0.05}>
                  <CertificateCard
                    certificate={certificate}
                    onView={setSelectedCertificate}
                    onCopyId={handleCopyCertificateId}
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Award}
              title="No certificates yet"
              description="Certificates you earn at UIC events show up here. If you are holding a printed certificate, scan its QR code to verify it."
              action={
                <Button
                  className="gap-2 bg-gradient-to-r from-primary to-secondary"
                  onClick={() => setIsScannerOpen(true)}
                >
                  <ScanLine className="h-4 w-4" aria-hidden />
                  Scan Certificate
                </Button>
              }
            />
          )}
        </section>
      </div>

      {/* Dialogs */}
      <EditProfileDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        profile={profile}
        onSave={(next) => saveProfile.mutate(next)}
        isSaving={saveProfile.isPending}
      />

      <Suspense fallback={<DialogLoading />}>
        {isScannerOpen && (
          <QrScannerDialog
            open={isScannerOpen}
            onOpenChange={setIsScannerOpen}
            onVerified={refreshActivity}
          />
        )}

        {selectedCertificate && (
          <CertificateDetailDialog
            certificate={selectedCertificate}
            open={Boolean(selectedCertificate)}
            onOpenChange={(open) => {
              if (!open) setSelectedCertificate(null);
            }}
          />
        )}
      </Suspense>
    </Layout>
  );
};

/** Shown for the moment a lazily loaded dialog chunk is in flight. */
function DialogLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
    >
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
    </div>
  );
}

export default Dashboard;
