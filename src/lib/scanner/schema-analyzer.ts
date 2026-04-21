import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { CrawlResult, SchemaIssue } from "./types";

type SchemaAiReview = {
  coverageScore: number;
  machineReadabilityScore: number;
  summary: string;
};

const SCHEMA_AI_TIMEOUT_MS = 12_000;

const schemaAiReviewSchema = z
  .object({
    coverageScore: z.coerce.number().min(1).max(10),
    machineReadabilityScore: z.coerce.number().min(1).max(10),
    summary: z.string().trim().min(1).max(500),
  })
  .strict();

/**
 * Analyze JSON-LD schema markup and Open Graph tags.
 * Uses deterministic checks as baseline and optionally augments scoring with Gemini.
 */
export async function analyzeSchema(crawl: CrawlResult): Promise<{
  score: number;
  issues: SchemaIssue[];
}> {
  const issues: SchemaIssue[] = [];
  let score = 0;
  const extractionLimited = crawl.extractionQuality === "low";

  const hasCoreMetadata = Boolean(crawl.title && crawl.metaDescription);

  // Baseline credit for parseable metadata even before full schema support.
  if (crawl.title) score += 4;
  if (crawl.metaDescription) score += 4;
  if (crawl.headings.some((h) => h.level === 1)) score += 4;

  const jsonLd = crawl.jsonLdBlocks;
  const hasJsonLd = jsonLd.length > 0;

  // ── Check 1: JSON-LD presence ──
  if (!hasJsonLd) {
    issues.push({
      id: "schema-no-jsonld",
      severity: hasCoreMetadata || extractionLimited ? "warning" : "critical",
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

    // If the page still has clean metadata and hierarchy, do not collapse schema score to near-zero.
    if (hasCoreMetadata) {
      score += 6;
    }
  } else {
    score += 24;
  }

  // ── Check 2: Schema types ──
  const allTypes = hasJsonLd ? extractSchemaTypes(jsonLd) : new Set<string>();
  const urlLower = crawl.url.toLowerCase();
  const likelyEditorialPage =
    crawl.wordCount >= 600 ||
    urlLower.includes("/blog") ||
    urlLower.includes("/article") ||
    urlLower.includes("/news");

  if (hasJsonLd) {
    // Article / BlogPosting
    if (!allTypes.has("Article") && !allTypes.has("BlogPosting") && !allTypes.has("NewsArticle")) {
      issues.push({
        id: "schema-no-article",
        severity: likelyEditorialPage ? "warning" : "info",
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
      score += 12;
    }

    // Organization
    if (!allTypes.has("Organization") && !allTypes.has("LocalBusiness")) {
      issues.push({
        id: "schema-no-org",
        severity: "info",
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
      score += 8;
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
      score += 7;
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
  }

  // ── Check 3: Schema validation ──
  if (hasJsonLd) {
    let contextIssues = 0;
    for (const block of jsonLd) {
      const blockObj = block as Record<string, unknown>;
      if (!blockObj["@context"]) {
        contextIssues += 1;
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

    score += contextIssues === 0 ? 8 : 3;
  }

  // ── Check 4: Open Graph tags ──
  const ogKeys = Object.keys(crawl.ogTags);
  if (ogKeys.length === 0) {
    issues.push({
      id: "schema-no-og",
      severity: hasJsonLd ? "info" : "warning",
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
    score += 12;
    if (!crawl.ogTags["image"]) {
      issues.push({
        id: "schema-no-og-image",
        severity: "info",
        pillar: "schema",
        title: "Missing og:image tag",
        description: "An og:image tag helps AI engines associate a visual with your content.",
      });
    } else {
      score += 8;
    }
  }

  // ── Check 5: Optional Gemini schema review ──
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey && (hasJsonLd || ogKeys.length > 0 || hasCoreMetadata)) {
    const aiReview = await runSchemaAiReview(crawl, apiKey);
    if (aiReview) {
      const aiAverage =
        (aiReview.coverageScore + aiReview.machineReadabilityScore) / 2;

      // Keep AI as an augmentor, not a replacement for deterministic checks.
      score += Math.max(0, Math.round((aiAverage - 4) * 1.5));

      if (aiAverage < 5) {
        issues.push({
          id: "schema-ai-low-confidence",
          severity: "warning",
          pillar: "schema",
          title: "AI review found weak machine-readable structure",
          description: aiReview.summary,
          fix: "Expand structured data coverage and align schema types with page intent.",
        });
      }
    }
  }

  return {
    score: clampToPercentage(score),
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

async function runSchemaAiReview(
  crawl: CrawlResult,
  apiKey: string
): Promise<SchemaAiReview | null> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const schemaSnapshot = JSON.stringify(crawl.jsonLdBlocks.slice(0, 8)).slice(0, 7000);
  const headingSnapshot = crawl.headings
    .slice(0, 15)
    .map((heading) => `H${heading.level}: ${heading.text}`)
    .join("\n");

  const prompt = `You are an AI-readiness schema auditor.
Return ONLY valid JSON with this exact shape:
{
  "coverageScore": number (1-10),
  "machineReadabilityScore": number (1-10),
  "summary": string
}

Score how complete and machine-readable this page's structured signals are.
Focus on practical extraction quality for AI systems.
Keep summary to 2 concise sentences.

URL: ${crawl.url}
Title: ${crawl.title}
Meta Description: ${crawl.metaDescription}
Open Graph keys: ${Object.keys(crawl.ogTags).join(", ") || "none"}
Headings:
${headingSnapshot || "none"}

JSON-LD blocks:
${schemaSnapshot || "none"}`;

  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.15,
          maxOutputTokens: 300,
        },
      }),
      SCHEMA_AI_TIMEOUT_MS,
      `Schema AI request timed out after ${SCHEMA_AI_TIMEOUT_MS}ms`
    );

    const raw = result.response.text().trim();
    if (!raw) {
      return null;
    }

    const parsed = parseModelJson(raw);
    if (!parsed) {
      return null;
    }

    const validated = schemaAiReviewSchema.safeParse(parsed);
    if (!validated.success) {
      return null;
    }

    return {
      coverageScore: clampScaleScore(validated.data.coverageScore),
      machineReadabilityScore: clampScaleScore(
        validated.data.machineReadabilityScore
      ),
      summary: validated.data.summary.trim(),
    };
  } catch {
    return null;
  }
}

function parseModelJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function clampScaleScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.min(10, Math.round(value)));
}

function clampToPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
