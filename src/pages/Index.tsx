import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { UpcomingEventsSection } from "@/components/home/UpcomingEventsSection";
import { TeamPreviewSection } from "@/components/home/TeamPreviewSection";
import { CTASection } from "@/components/home/CTASection";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useOrganizationJsonLd } from "@/components/seo/JsonLd";
import { seoForPath } from "@/features/seo/seoConfig";
import { Helmet } from "react-helmet-async";

const Index = () => {
  const orgJsonLd = useOrganizationJsonLd();

  return (
    <Layout>
      <Helmet>
        <title>Unstop Igniters Club | Home</title>
        <meta name="description" content="Official Unstop campus club" />
      </Helmet>
      <Seo {...seoForPath("/")} jsonLd={orgJsonLd} />
      <HeroSection />
      <FeaturesSection />
      <UpcomingEventsSection />
      <TeamPreviewSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
