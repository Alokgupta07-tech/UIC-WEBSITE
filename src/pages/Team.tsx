import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Linkedin, ExternalLink, BadgeCheck, Users } from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { seoForPath } from "@/features/seo/seoConfig";
import { useOrganizationJsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getActiveTeam } from "@/services/team";
import type { TeamMember } from "@/types";
import { TeamMemberDialog } from "@/components/team/TeamMemberDialog";

const Team = () => {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const orgJsonLd = useOrganizationJsonLd();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Team", path: "/team" },
  ]);

  const { data: teamMembers, isLoading, error } = useQuery({
    queryKey: ["team-members"],
    queryFn: getActiveTeam,
  });

  console.log("Team:", teamMembers, error);

  if (error) {
    console.error("Team Error:", error.message);
  }

  const roles = useMemo(() => {
    if (!teamMembers) return [];
    const uniqueRoles = [...new Set(teamMembers.map((m) => m.role))];
    return uniqueRoles;
  }, [teamMembers]);

  const filteredMembers = useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.role.toLowerCase().includes(search.toLowerCase()) ||
        member.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchesRole = !selectedRole || member.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [teamMembers, search, selectedRole]);

  return (
    <Layout>
      <Helmet>
        <title>Our Team — Unstop Igniters Club</title>
        <meta name="description" content="Meet the team" />
      </Helmet>
      <Seo
        {...seoForPath("/team")}
        jsonLd={[orgJsonLd, breadcrumb]}
      />
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              Our{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Team
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Meet the passionate individuals driving Unstop Igniters forward
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b bg-background py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, role, or skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedRole === null ? "default" : "outline"}
                onClick={() => setSelectedRole(null)}
                className={selectedRole === null ? "bg-gradient-to-r from-primary to-secondary" : ""}
              >
                All Roles
              </Button>
              {roles.map((role) => (
                <Button
                  key={role}
                  size="sm"
                  variant={selectedRole === role ? "default" : "outline"}
                  onClick={() => setSelectedRole(role)}
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border bg-card p-12 text-center text-red-500">
              <p>Failed to load team members: {error.message}</p>
            </div>
          ) : filteredMembers && filteredMembers.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="group overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer"
                >
                  {/* Avatar Section */}
                  <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 p-6 text-center">
                    <Avatar className="mx-auto h-24 w-24 ring-4 ring-background transition-all group-hover:scale-105">
                      <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-2xl text-primary-foreground">
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>

                    {member.isVerified && (
                      <div className="absolute right-3 top-3">
                        <Badge className="gap-1 bg-primary">
                          <BadgeCheck className="h-3 w-3" />
                          Verified
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-5">
                    <h3 className="mb-1 text-lg font-semibold">{member.name}</h3>
                    <p className="text-sm font-medium text-primary">{member.role}</p>
                    {member.department && (
                      <p className="text-xs text-muted-foreground">{member.department}</p>
                    )}

                    {/* Reduced details - Bio and Skills moved to Dialog */}
                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" size="sm" className="w-full text-xs">
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Team Members Found</h3>
              <p className="mb-4 text-muted-foreground">
                {search || selectedRole
                  ? "Try adjusting your filters"
                  : "Team members will be added soon!"}
              </p>
              {(search || selectedRole) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setSelectedRole(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      <TeamMemberDialog
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </Layout>
  );
};

export default Team;
