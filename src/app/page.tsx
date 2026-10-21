import ExactLanding from "@/components/landing/ExactLanding";
import { SITE_DESCRIPTION, SITE_URL, RELEASE_URL } from "@/lib/site";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "AuditAI",
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
        sameAs: ["https://github.com/Waqar-743/Audit_AI"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "AuditAI · Pip",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#pip`,
        name: "Pip SEO assistant",
        url: `${SITE_URL}/assistant`,
        description: SITE_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web browser",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        downloadUrl: RELEASE_URL,
        featureList: [
          "Evidence-based page SEO checks",
          "Metadata drafting",
          "Local field notes",
          "Free Chrome extension",
        ],
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <ExactLanding />
    </>
  );
}
