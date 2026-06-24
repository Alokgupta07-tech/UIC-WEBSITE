import { Lightbulb, Rocket, Users, Award, BookOpen, Globe } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";

const features = [
  {
    icon: Lightbulb,
    title: "Workshops & Training",
    description: "Hands-on sessions covering the latest skills in tech, business, and leadership.",
  },
  {
    icon: Rocket,
    title: "Hackathons & Competitions",
    description: "Participate in exciting challenges on Unstop and win amazing prizes.",
  },
  {
    icon: Users,
    title: "Networking Events",
    description: "Connect with industry professionals, alumni, and peers from across campuses.",
  },
  {
    icon: Award,
    title: "Certifications",
    description: "Earn verified certificates and badges to showcase your achievements.",
  },
  {
    icon: BookOpen,
    title: "Resource Library",
    description: "Access curated materials, templates, and guides to accelerate your growth.",
  },
  {
    icon: Globe,
    title: "Global Exposure",
    description: "Get visibility on Unstop's platform with 15M+ students and 3000+ companies.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <Reveal>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Why Join{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Unstop Igniters?
            </span>
          </h2>
          <p className="text-muted-foreground">
            We provide the platform, resources, and community to help you excel in your career journey.
          </p>
        </div>
        </Reveal>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 p-3">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>

              {/* Content */}
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>

              {/* Hover Effect */}
              <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
