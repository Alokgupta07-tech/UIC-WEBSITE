import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Target, Users, Trophy, Lightbulb, Heart, GraduationCap, ArrowRight, Quote,
} from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";
import { Seo } from "@/components/seo/Seo";
import { useOrganizationJsonLd } from "@/components/seo/JsonLd";
import { seoForPath } from "@/features/seo/seoConfig";
import { Helmet } from "react-helmet-async";

const values = [
  { icon: Lightbulb, title: "Innovation", description: "We encourage creative thinking and new ideas to solve real-world challenges." },
  { icon: Users, title: "Collaboration", description: "We believe in the power of teamwork and collective growth." },
  { icon: Trophy, title: "Excellence", description: "We strive for the highest standards in everything we do." },
  { icon: Heart, title: "Inclusivity", description: "We welcome everyone regardless of background or experience level." },
];

const milestones = [
  { year: "2023", event: "Club Founded", description: "Started as a small group of 10 passionate students" },
  { year: "2023", event: "First Hackathon", description: "Organized our first campus hackathon with 100+ participants" },
  { year: "2024", event: "Unstop Partnership", description: "Became an official Unstop campus chapter" },
  { year: "2024", event: "50+ Members", description: "Grew to over 50 active members across departments" },
];

const About = () => {
  const orgJsonLd = useOrganizationJsonLd();

  return (
    <Layout>
      <Helmet>
        <title>About Us — Unstop Igniters Club</title>
        <meta name="description" content="Learn about the club" />
      </Helmet>
      <Seo {...seoForPath("/about")} jsonLd={orgJsonLd} />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container relative mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
                About{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Unstop Igniters
                </span>
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                We are a community of ambitious students passionate about learning, competing,
                and growing together through opportunities on Unstop.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2">
            <Reveal>
              <div className="rounded-2xl border bg-card p-8">
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h2 className="mb-4 text-2xl font-bold">Our Mission</h2>
                <p className="text-muted-foreground">
                  To empower students by providing access to workshops, competitions, and networking
                  opportunities that bridge the gap between academic learning and industry requirements.
                  We aim to create a supportive environment where every member can discover their
                  potential and achieve their career goals.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-2xl border bg-card p-8">
                <div className="mb-4 inline-flex rounded-xl bg-secondary/10 p-3">
                  <GraduationCap className="h-6 w-6 text-secondary" />
                </div>
                <h2 className="mb-4 text-2xl font-bold">Our Vision</h2>
                <p className="text-muted-foreground">
                  To become the most impactful student community on campus, known for producing
                  future leaders and innovators. We envision a world where every student has equal
                  access to opportunities that can transform their careers and lives.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Unstop Affiliation */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm">
                <span className="text-2xl">🚀</span>
                <span>Official Campus Chapter</span>
              </div>
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Powered by Unstop</h2>
              <p className="mb-6 text-muted-foreground">
                We are proud to be an official Unstop campus chapter, connecting our members
                with India's largest ecosystem of 15M+ students, 3000+ companies, and countless
                opportunities including competitions, internships, and jobs.
              </p>
              <a href="https://unstop.com" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  Visit Unstop
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Our Values</h2>
              <p className="text-muted-foreground">The principles that guide everything we do</p>
            </div>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value, i) => (
              <Reveal key={value.title} delay={i * 0.05}>
                <div className="rounded-2xl border bg-card p-6 text-center transition-all hover:border-primary/50 hover:shadow-lg">
                  <div className="mx-auto mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 p-3">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Our Journey</h2>
              <p className="text-muted-foreground">Key milestones in our growth story</p>
            </div>
          </Reveal>
          <div className="mx-auto max-w-2xl">
            <div className="relative border-l-2 border-primary/30 pl-8">
              {milestones.map((milestone, index) => (
                <Reveal key={index} delay={index * 0.05}>
                  <div className="relative mb-10 last:mb-0">
                    <div className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {index + 1}
                    </div>
                    <div className="rounded-xl border bg-card p-5">
                      <span className="text-xs font-medium text-primary">{milestone.year}</span>
                      <h3 className="mt-1 text-lg font-semibold">{milestone.event}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <Quote className="mx-auto mb-6 h-12 w-12 text-primary/30" />
              <blockquote className="mb-6 text-2xl font-medium italic md:text-3xl">
                "The best way to predict the future is to create it."
              </blockquote>
              <p className="text-muted-foreground">— Our guiding philosophy</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-primary to-secondary p-8 text-center text-white md:p-12">
              <h2 className="mb-4 text-2xl font-bold md:text-3xl">
                Ready to Start Your Journey?
              </h2>
              <p className="mb-6 text-white/80">
                Join us today and become part of something bigger
              </p>
              <Link to="/events">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  Explore Events
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
};

export default About;
