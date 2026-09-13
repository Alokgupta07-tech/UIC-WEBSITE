import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Reveal } from "@/components/shared/Reveal";
import { certifiedStudents } from "@/data/certifiedStudents";
import { Award, GraduationCap, Trophy, MapPin, Linkedin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";

const CertifiedStudents = () => {
  return (
    <Layout>
      <Helmet>
        <title>Certified Students — Unstop Igniters Club</title>
        <meta name="description" content="Meet our top achieving certified students" />
      </Helmet>
      <Seo 
        title="Certified Students" 
        description="Meet our top achieving certified students"
      />

      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Certified Students
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Celebrating the outstanding achievements of our top performers
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {certifiedStudents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certifiedStudents.map((student, index) => (
                <Reveal key={student.id} delay={index * 0.1}>
                  <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
                    {/* Top Accent */}
                    <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary to-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                    
                    <div className="mb-6 flex items-start justify-between">
                      <Avatar className="h-16 w-16 ring-4 ring-primary/10">
                        <AvatarImage src={student.imageUrl} alt={student.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold">
                          {student.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Award className="h-3 w-3" />
                        {student.achievement}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <h3 className="mb-1 text-xl font-bold">{student.name}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <GraduationCap className="h-4 w-4" />
                        <span>{student.department}, {student.year}</span>
                      </div>
                    </div>

                    <div className="mb-6 space-y-2 rounded-xl bg-muted/50 p-4 border">
                      <div className="flex items-center gap-2 text-sm">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{student.position}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{student.event}</span>
                      </div>
                    </div>

                    {student.linkedInUrl && (
                      <a
                        href={student.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <Linkedin className="h-4 w-4" />
                        Connect on LinkedIn
                      </a>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Award className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Certified Students Yet</h3>
              <p className="mb-4 text-muted-foreground">
                Participate in our events to earn certificates and feature here!
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default CertifiedStudents;
