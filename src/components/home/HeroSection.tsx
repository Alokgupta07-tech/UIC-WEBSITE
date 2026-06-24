import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Users, Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";

export function HeroSection() {
  const { settings } = useSettings();

  const stats = [
    { icon: Users, label: "Community Members", value: `${settings?.communityMemberCount ?? 0}+` },
    { icon: Calendar, label: "Events Hosted", value: "25+" },
    { icon: Trophy, label: "Competitions Won", value: "15+" },
  ];

  return (
    <section className="relative overflow-hidden bg-hero-pattern">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />

      <div className="container relative mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Official Unstop Campus Chapter</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            Ignite Your{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Potential
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Join the Unstop Igniters Club and unlock a world of competitions, workshops,
            and networking opportunities. Transform your ideas into achievements.
          </p>

          {/* CTA Buttons */}
          <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                Join the Club
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/events">
              <Button size="lg" variant="outline" className="gap-2">
                Explore Events
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto grid max-w-2xl grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-card/50 p-4 backdrop-blur-sm">
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                <div className="text-2xl font-bold md:text-3xl">{stat.value}</div>
                <div className="text-xs text-muted-foreground md:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
