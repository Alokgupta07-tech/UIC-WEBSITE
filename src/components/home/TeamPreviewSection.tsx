import { Link } from "react-router-dom";
import { ArrowRight, Linkedin, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { getActiveTeam } from "@/services/team";

export function TeamPreviewSection() {
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: getActiveTeam,
  });

  const previewMembers = (teamMembers ?? []).slice(0, 4);

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="mb-2 text-3xl font-bold md:text-4xl">Meet Our Team</h2>
            <p className="text-muted-foreground">The passionate individuals driving our mission forward</p>
          </div>
          <Link to="/team">
            <Button variant="outline" className="gap-2">
              View Full Team
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Team Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : previewMembers.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {previewMembers.map((member) => (
              <div
                key={member.id}
                className="group overflow-hidden rounded-2xl border bg-card p-6 text-center transition-all hover:border-primary/50 hover:shadow-lg"
              >
                {/* Avatar */}
                <Avatar className="mx-auto mb-4 h-24 w-24 ring-4 ring-primary/10 transition-all group-hover:ring-primary/30">
                  <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-2xl text-primary-foreground">
                    {member.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>

                {/* Name & Role */}
                <div className="mb-3">
                  <h3 className="flex items-center justify-center gap-1 text-lg font-semibold">
                    {member.name}
                    {member.isVerified && (
                      <BadgeCheck className="h-5 w-5 text-primary" />
                    )}
                  </h3>
                  <p className="text-sm text-primary">{member.role}</p>
                  {member.department && (
                    <p className="text-xs text-muted-foreground">{member.department}</p>
                  )}
                </div>

                {/* Skills */}
                {member.skills && member.skills.length > 0 && (
                  <div className="mb-4 flex flex-wrap justify-center gap-1">
                    {member.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Social Links */}
                {member.linkedinUrl && (
                  <a
                    href={member.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <p className="text-muted-foreground">Team members coming soon!</p>
          </div>
        )}
      </div>
    </section>
  );
}
