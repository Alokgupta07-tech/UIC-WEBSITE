import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Flame, ArrowLeft, Home } from "lucide-react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  return (
    <Layout>
      <Helmet>
        <title>404 — Page Not Found | Unstop Igniters Club</title>
      </Helmet>
      <div className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
        {/* Animated Logo */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20">
          <Flame className="h-12 w-12 text-primary animate-pulse" />
        </div>

        {/* 404 */}
        <h1 className="mb-2 text-8xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="mb-4 text-2xl font-semibold">Page Not Found</h2>
        <p className="mb-8 max-w-md text-muted-foreground">
          Looks like this page took a wrong turn. Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Link to="/">
            <Button className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm">
          {[
            { label: "Events",  href: "/events" },
            { label: "Gallery", href: "/gallery" },
            { label: "Team",    href: "/team" },
            { label: "Contact", href: "/contact" },
          ].map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
