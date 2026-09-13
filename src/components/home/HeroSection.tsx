import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Users, Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { AnimatedBackground } from "@/components/shared/AnimatedBackground";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

export function HeroSection() {
  const { settings } = useSettings();
  const prefersReducedMotion = usePrefersReducedMotion();

  const stats = [
    {
      icon: Users,
      label: "Community Members",
      value: `${settings?.communityMemberCount || 1200}+`,
    },
    { icon: Calendar, label: "Events Hosted", value: "25+" },
    { icon: Trophy, label: "Competitions Won", value: "15+" },
  ];

  /** Staggered entrance for the hero content. Disabled under reduced motion, so
   *  the class is only applied when animation is actually wanted. */
  const entrance = (delayMs: number) =>
    prefersReducedMotion
      ? undefined
      : { animation: `fade-in 0.6s ease-out ${delayMs}ms both` };

  return (
    <section className="relative overflow-hidden bg-hero-pattern">
      {/* Slow-drifting gradient blobs plus a cursor-reactive glow. */}
      <AnimatedBackground interactive />

      <div className="container relative mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm backdrop-blur-sm"
            style={entrance(0)}
          >
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-muted-foreground">Official Unstop Campus Chapter</span>
          </div>

          {/* Headline */}
          <h1
            className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl"
            style={entrance(80)}
          >
            Ignite Your{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Potential
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl"
            style={entrance(160)}
          >
            Join the Unstop Igniters Club and unlock a world of competitions, workshops,
            and networking opportunities. Transform your ideas into achievements.
          </p>

          {/* CTA Buttons */}
          <div
            className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={entrance(240)}
          >
            <Link to="/auth">
              <Button
                size="lg"
                className="group gap-2 bg-gradient-to-r from-primary to-secondary transition-opacity hover:opacity-90"
              >
                Join the Club
                <ArrowRight
                  className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5"
                  aria-hidden
                />
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
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "rounded-xl border bg-card/50 p-4 backdrop-blur-sm",
                  "transition-[transform,box-shadow,border-color] duration-200 ease-out",
                  "motion-safe:hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                )}
                style={entrance(320 + index * 80)}
              >
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary" aria-hidden />
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
