import type { Metadata } from "next";

export const SITE_URL = "https://audit-ai-fawn.vercel.app";
export const RELEASE_URL =
  "https://github.com/Waqar-743/Audit_AI/releases/tag/pip-v1.0.1";
export const EXTENSION_DOWNLOAD_URL =
  "https://github.com/Waqar-743/Audit_AI/releases/download/pip-v1.0.1/auditai-pip.zip";
export const SITE_DESCRIPTION =
  "Meet Pip, your free SEO assistant. Check page titles, metadata, headings, links, images, and structured data. No signup, payment, or API keys.";

export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "AuditAI · Pip",
      type: "website",
      locale: "en_US",
      images: [
        {
          url: `${SITE_URL}/social/pip-preview.png`,
          width: 1200,
          height: 630,
          alt: "Pip, the AuditAI parrot guide, beside the words Free SEO help. One page at a time.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/social/pip-preview.png`],
    },
  };
}
