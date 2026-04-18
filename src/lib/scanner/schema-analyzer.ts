import type { CrawlResult, SchemaIssue } from "./types";

/**
 * Analyze JSON-LD schema markup and Open Graph tags.
 * Returns issues and a score for the Schema pillar.
 */
export function analyzeSchema(crawl: CrawlResult): {
  score: number;
  issues: SchemaIssue[];
} {
  const issues: SchemaIssue[] = [];
  let score = 0;
  const maxScore = 100;

  const jsonLd = crawl.jsonLdBlocks;
  const hasJsonLd = jsonLd.length > 0;

  // ── Check 1: JSON-LD presence ──
  if (!hasJsonLd) {
    issues.push({
      id: "schema-no-jsonld",
      severity: "critical",
      pillar: "schema",
      title: "No JSON-LD structured data found",
      description:
        "Your page has no JSON-LD schema markup. AI search engines rely heavily on structured data to understand your content.",
      fix: "Add a JSON-LD script block to your page's <head> section.",
      codeSnippet: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "${crawl.title || "Your Page Title"}",
  "description": "${crawl.metaDescription || "Your page description"}",
  "url": "${crawl.url}"
}
</script>`,
    });
  } else {
    score += 20;
  }

  // ── Check 2: Schema types ──
  const allTypes = extractSchemaTypes(jsonLd);

  // Article / BlogPosting
  if (!allTypes.has("Article") && !allTypes.has("BlogPosting") && !allTypes.has("NewsArticle")) {
    issues.push({
      id: "schema-no-article",
      severity: "warning",
      pillar: "schema",
      title: "No Article schema found",
      description:
        "Article schema helps AI engines identify your content as a citable article with author, date, and publisher info.",
      fix: "Add Article or BlogPosting schema with author and datePublished.",
      codeSnippet: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${crawl.title}",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "datePublished": "${new Date().toISOString().split("T")[0]}",
  "publisher": {
    "@type": "Organization",
    "name": "Your Organization"
  }
}
</script>`,
    });
  } else {
    score += 15;
  }

  // Organization
  if (!allTypes.has("Organization") && !allTypes.has("LocalBusiness")) {
    issues.push({
      id: "schema-no-org",
      severity: "warning",
      pillar: "schema",
      title: "No Organization schema found",
      description:
        "Organization schema establishes your brand identity for AI engines.",
      fix: "Add Organization schema with name, logo, and contact info.",
    });
  } else {
    score += 10;
  }

  // FAQPage
  if (!allTypes.has("FAQPage")) {
    issues.push({
      id: "schema-no-faq",
      severity: "info",
      pillar: "schema",
      title: "No FAQ schema found",
      description:
        "FAQ schema allows AI engines to extract question-answer pairs directly.",
      fix: "If your page has FAQ content, wrap it in FAQPage schema.",
    });
  } else {
    score += 15;
  }

  // BreadcrumbList
  if (!allTypes.has("BreadcrumbList")) {
    issues.push({
      id: "schema-no-breadcrumb",
      severity: "info",
      pillar: "schema",
      title: "No BreadcrumbList schema found",
      description:
        "Breadcrumb schema helps AI engines understand your site hierarchy.",
    });
  } else {
    score += 10;
  }

  // WebSite with SearchAction
  if (!allTypes.has("WebSite")) {
    issues.push({
      id: "schema-no-website",
      severity: "info",
      pillar: "schema",
      title: "No WebSite schema found",
      description: "WebSite schema with potentialAction helps search integration.",
    });
  } else {
    score += 5;
  }

  // ── Check 3: Schema validation ──
  if (hasJsonLd) {
    for (const block of jsonLd) {
      const blockObj = block as Record<string, unknown>;
      if (!blockObj["@context"]) {
        issues.push({
          id: "schema-no-context",
          severity: "warning",
          pillar: "schema",
          title: "JSON-LD missing @context",
          description: "One or more JSON-LD blocks are missing the @context property.",
          fix: 'Add "@context": "https://schema.org" to your JSON-LD.',
        });
      }
    }
    score += 5;
  }

  // ── Check 4: Open Graph tags ──
  const ogKeys = Object.keys(crawl.ogTags);
  if (ogKeys.length === 0) {
    issues.push({
      id: "schema-no-og",
      severity: "warning",
      pillar: "schema",
      title: "No Open Graph tags found",
      description:
        "Open Graph tags enhance how your content appears when shared and help AI engines understand your page.",
      fix: "Add og:title, og:description, og:image, and og:type meta tags.",
      codeSnippet: `<meta property="og:title" content="${crawl.title}" />
<meta property="og:description" content="${crawl.metaDescription}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${crawl.url}" />`,
    });
  } else {
    score += 10;
    if (!crawl.ogTags["image"]) {
      issues.push({
        id: "schema-no-og-image",
        severity: "info",
        pillar: "schema",
        title: "Missing og:image tag",
        description: "An og:image tag helps AI engines associate a visual with your content.",
      });
    } else {
      score += 10;
    }
  }

  return {
    score: Math.min(Math.round((score / maxScore) * 100), 100),
    issues,
  };
}

function extractSchemaTypes(jsonLdBlocks: unknown[]): Set<string> {
  const types = new Set<string>();

  function extract(obj: unknown) {
    if (Array.isArray(obj)) {
      obj.forEach(extract);
    } else if (obj && typeof obj === "object") {
      const record = obj as Record<string, unknown>;
      if (record["@type"]) {
        if (Array.isArray(record["@type"])) {
          (record["@type"] as string[]).forEach((t) => types.add(t));
        } else {
          types.add(record["@type"] as string);
        }
      }
      if (record["@graph"]) {
        extract(record["@graph"]);
      }
    }
  }

  jsonLdBlocks.forEach(extract);
  return types;
}
