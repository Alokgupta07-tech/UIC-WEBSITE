import { Link } from "react-router-dom";
import { Flame, Mail, MapPin, Phone, Instagram, Linkedin, Twitter, Youtube, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getSettings } from "@/services/settings";
import { supabase } from "@/integrations/supabase/client";

const footerLinks = {
  explore: [
    { name: "Events",  href: "/events" },
    { name: "Team",    href: "/team" },
    { name: "Gallery", href: "/gallery" },
    { name: "About",   href: "/about" },
  ],
  connect: [
    { name: "Contact",  href: "/contact" },
    { name: "Join Us",  href: "/auth" },
  ],
};

export function Footer() {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    staleTime: 1000 * 60 * 5, // cache 5 minutes
  });

  const socialLinks = [
    { icon: Instagram, href: settings?.social.instagram ?? "#", label: "Instagram" },
    { icon: Linkedin, href: settings?.social.linkedin ?? "#", label: "LinkedIn" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Youtube, href: settings?.social.youtube ?? "#", label: "YouTube" },
  ].filter((s) => s.href && s.href !== "#");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubscribing(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({ email });
      if (error && error.code === "23505") {
        toast.info("You're already subscribed!");
      } else if (error) {
        throw error;
      } else {
        toast.success("Subscribed! We'll keep you updated.");
        setEmail("");
      }
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
                <Flame className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight">Unstop Igniters</span>
                <span className="text-xs text-muted-foreground">Club</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground">
              Empowering students to innovate, compete, and grow through exciting opportunities on Unstop.
            </p>
            {/* Social Links */}
            <div className="flex gap-3 flex-wrap">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
              {settings?.social.whatsappCommunity && (
                <a
                  href={settings.social.whatsappCommunity}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-green-600 hover:text-white"
                  aria-label="WhatsApp Community"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">Connect</h4>
            <ul className="space-y-2">
              {footerLinks.connect.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Contact details are configured in the Supabase settings table.</span>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">Stay Updated</h4>
            <p className="mb-4 text-sm text-muted-foreground">
              Subscribe for the latest events and opportunities.
            </p>
            <form className="flex gap-2" onSubmit={handleSubscribe}>
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9"
                required
              />
              <Button type="submit" size="sm" className="bg-gradient-to-r from-primary to-secondary" disabled={isSubscribing}>
                {isSubscribing ? "..." : "Go"}
              </Button>
            </form>
            {settings?.social.whatsappCommunity && (
              <a href={settings.social.whatsappCommunity} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-green-600 hover:underline font-medium">
                <MessageCircle className="h-4 w-4" />
                Join our WhatsApp Community
              </a>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Unstop Igniters Club. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Powered by{" "}
            <a href="https://unstop.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
              Unstop
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
