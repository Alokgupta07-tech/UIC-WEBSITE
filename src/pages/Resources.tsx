import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Reveal } from "@/components/shared/Reveal";
import { ExternalLink, Briefcase, FileText, BookOpen, Presentation } from "lucide-react";
import { Helmet } from "react-helmet-async";

const resources = [
  {
    title: "Unstop Job Portal",
    description: "Access premium job and internship opportunities from top companies actively hiring.",
    icon: Briefcase,
    link: "https://unstop.com/jobs",
    color: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-500"
  },
  {
    title: "Job-Ready Resources for Freshers",
    description: "Curated guides, interview questions, and prep materials specifically for graduating students.",
    icon: Presentation,
    link: "https://unstop.com/resources",
    color: "from-purple-500/10 to-pink-500/10",
    iconColor: "text-purple-500"
  },
  {
    title: "Resource Centre",
    description: "Comprehensive guides on various tech stacks, business concepts, and industry trends.",
    icon: BookOpen,
    link: "https://unstop.com/blog",
    color: "from-green-500/10 to-emerald-500/10",
    iconColor: "text-green-500"
  },
  {
    title: "Resume Makeover Handbook",
    description: "Actionable tips, ATS-friendly templates, and examples to make your resume stand out.",
    icon: FileText,
    link: "https://unstop.com/resume-builder",
    color: "from-orange-500/10 to-amber-500/10",
    iconColor: "text-orange-500"
  }
];

const Resources = () => {
  return (
    <Layout>
      <Helmet>
        <title>Resources — Unstop Igniters Club</title>
        <meta name="description" content="Helpful resources for students and job seekers" />
      </Helmet>
      <Seo 
        title="Resources" 
        description="Helpful resources for students and job seekers"
      />

      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Resource Library
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Everything you need to accelerate your career journey, curated by Unstop.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2">
            {resources.map((resource, index) => (
              <Reveal key={resource.title} delay={index * 0.1}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
                  {/* Background Wash */}
                  <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${resource.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                  
                  <div className="mb-4 flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm ${resource.iconColor}`}>
                      <resource.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">{resource.title}</h3>
                  </div>

                  <p className="mb-8 flex-1 text-muted-foreground">
                    {resource.description}
                  </p>

                  <a
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    Explore Resource
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Resources;
