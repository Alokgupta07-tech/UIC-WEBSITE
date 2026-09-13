import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Flame, Loader2, ScanLine, ShieldQuestion } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { seoForPath, withSuffix } from "@/features/seo/seoConfig";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/shared/AnimatedBackground";
import { Reveal } from "@/components/shared/Reveal";
import { CertificateRecord } from "@/components/certificates/CertificateRecord";
import { CertificateActions } from "@/components/certificates/CertificateActions";
import { VerificationVerdict } from "@/components/certificates/VerificationVerdict";
import { verdictHeading } from "@/components/certificates/verdictCopy";
import { ErrorState } from "@/components/dashboard/SectionStates";
import { verifyCertificate } from "@/services/certificates";

/**
 * Public certificate verification page — `/verify/certificate/:token`.
 *
 * Anyone holding the link (or scanning the QR code on a printed certificate) can
 * open this without signing in. It renders only what the `verify_certificate`
 * RPC returns, which excludes emails, account ids, tokens and any other private
 * account data. It is deliberately a standalone page, not a view of anybody's
 * dashboard.
 */
const VerifyCertificate = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["certificate-verification", token.toLowerCase()],
    enabled: token.length > 0,
    queryFn: () => verifyCertificate(token),
    retry: 1,
    staleTime: 60 * 1000,
  });

  const pageTitle = data
    ? withSuffix(`${verdictHeading(data.verdict)}${data.certificateNumber ? ` · ${data.certificateNumber}` : ""}`)
    : withSuffix("Verify Certificate");

  const handleCopyId = async () => {
    if (!data?.certificateNumber) return;
    try {
      await navigator.clipboard.writeText(data.certificateNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const showRecord =
    data && data.verdict !== "not_found" && data.verdict !== "invalid";

  return (
    <Layout>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Seo
        {...seoForPath("/verify/certificate")}
        path={`/verify/certificate/${token}`}
        indexable={false}
      />

      {/* Branded header so a verifier can see at a glance who issued the record */}
      <section className="relative overflow-hidden border-b bg-hero-pattern">
        <AnimatedBackground />
        <div className="container relative mx-auto px-4 py-10 text-center md:py-14">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
            <Flame className="h-7 w-7 text-primary-foreground" aria-hidden />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Unstop Igniters Club</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
            Certificate{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Verification
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            This page checks a certificate against the club's official records.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        {/* No token in the URL at all */}
        {!token && (
          <div className="rounded-2xl border border-dashed bg-card/50 p-8 text-center">
            <ShieldQuestion
              className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
              aria-hidden
            />
            <h2 className="mb-1 text-base font-semibold">No certificate code provided</h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Open the verification link printed on the certificate, or scan its QR code from
              your member dashboard.
            </p>
          </div>
        )}

        {token && isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 py-16"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Verifying certificate…</p>
          </div>
        )}

        {token && isError && (
          <ErrorState
            title="Unable to verify this certificate"
            description="We could not reach the verification service. Please check your connection and try again."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        )}

        {token && data && (
          <div className="space-y-5">
            <Reveal variant="fade-up">
              <VerificationVerdict verdict={data.verdict} />
            </Reveal>

            {showRecord && (
              <>
                <Reveal variant="fade-up" delay={0.06}>
                  <CertificateRecord data={data} />
                </Reveal>

                <Reveal variant="fade-up" delay={0.12}>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Share is omitted here: this page's own URL is the share link. */}
                    <CertificateActions data={data} token={token} showShare={false} />
                    {data.certificateNumber && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={handleCopyId}
                        aria-label={`Copy certificate ID ${data.certificateNumber}`}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-success" aria-hidden />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden />
                        )}
                        Copy certificate ID
                      </Button>
                    )}
                  </div>
                </Reveal>
              </>
            )}

            <Reveal variant="fade-in" delay={0.16}>
              <div className="rounded-2xl border bg-muted/30 p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Holding a UIC certificate of your own? Sign in to see all your certificates
                  and scan them straight from your dashboard.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link to="/dashboard">
                    <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-secondary">
                      <ScanLine className="h-4 w-4" aria-hidden />
                      Go to my dashboard
                    </Button>
                  </Link>
                  <Link to="/events">
                    <Button size="sm" variant="outline">
                      Explore UIC events
                    </Button>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VerifyCertificate;
