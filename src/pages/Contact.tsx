import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone, Send, CheckCircle } from "lucide-react";
import { sendMessage } from "@/services/messages";
import { toast } from "sonner";
import { z } from "zod";
import { Seo } from "@/components/seo/Seo";
import { Reveal } from "@/components/shared/Reveal";
import { useOrganizationJsonLd } from "@/components/seo/JsonLd";
import { useSettings } from "@/contexts/SettingsContext";
import { seoForPath } from "@/features/seo/seoConfig";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { Helmet } from "react-helmet-async";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const Contact = () => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const orgJsonLd = useOrganizationJsonLd();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      setIsSubmitted(true);
      return;
    }
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await sendMessage(formData);
      setIsSubmitted(true);
      toast.success("Message sent successfully!");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  return (
    <Layout>
      <Helmet>
        <title>Contact — Unstop Igniters Club</title>
        <meta name="description" content="Get in touch" />
      </Helmet>
      <Seo {...seoForPath("/contact")} jsonLd={orgJsonLd} />

      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                Get in{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Touch
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Have questions? We'd love to hear from you.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Contact Info */}
              <Reveal>
                <div>
                  <h2 className="mb-6 text-2xl font-bold">Contact Information</h2>
                  <p className="mb-8 text-muted-foreground">
                    Reach out to us for collaborations, queries, or just to say hello!
                  </p>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Email</h3>
                        <p className="text-muted-foreground">igniters@college.edu</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Location</h3>
                        <p className="text-muted-foreground">
                          Student Activity Center<br />
                          SRM University AP, Campus Building
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Phone</h3>
                        <p className="text-muted-foreground">+91 98765 43210</p>
                      </div>
                    </div>
                  </div>

                  {/* Social Links from settings */}
                  <div className="mt-10">
                    <h3 className="mb-4 font-semibold">Follow Us</h3>
                    <SocialLinks
                      iconOnly={false}
                      linkClassName="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                    />
                  </div>
                </div>
              </Reveal>

              {/* Contact Form */}
              <Reveal delay={0.1}>
                <div className="rounded-2xl border bg-card p-8">
                  {isSubmitted ? (
                    <div className="py-12 text-center">
                      <CheckCircle className="mx-auto mb-4 h-16 w-16 text-success" />
                      <h3 className="mb-2 text-xl font-semibold">Message Sent!</h3>
                      <p className="mb-6 text-muted-foreground">
                        Thank you for reaching out. We'll get back to you soon.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsSubmitted(false);
                          setFormData({ name: "", email: "", subject: "", message: "" });
                        }}
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div style={{ display: "none" }} aria-hidden="true">
                        <input type="text" name="honeypot" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Your name" className="mt-1" />
                        {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" className="mt-1" />
                        {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} placeholder="What's this about?" className="mt-1" />
                        {errors.subject && <p className="mt-1 text-sm text-destructive">{errors.subject}</p>}
                      </div>
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder="Tell us more..." rows={5} className="mt-1" />
                        {errors.message && <p className="mt-1 text-sm text-destructive">{errors.message}</p>}
                      </div>
                      <Button type="submit" className="w-full gap-2 bg-gradient-to-r from-primary to-secondary" disabled={isSubmitting}>
                        {isSubmitting ? "Sending..." : <><Send className="h-4 w-4" />Send Message</>}
                      </Button>
                    </form>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
