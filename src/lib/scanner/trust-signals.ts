import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { CrawlResult, SchemaIssue } from "./types";

type TrustAiReview = {
  expertiseScore: number;
  transparencyScore: number;
  safetyScore: number;
  summary: string;
};

const TRUST_AI_TIMEOUT_MS = 12_000;

const trustAiReviewSchema = z
  .object({
    expertiseScore: z.coerce.number().min(1).max(10),
    transparencyScore: z.coerce.number().min(1).max(10),
    safetyScore: z.coerce.number().min(1).max(10),
    summary: z.string().trim().min(1).max(500),
  })
  .strict();

export async function analyzeTrustSignals(crawl: CrawlResult): Promise<{
  score: number;
  issues: SchemaIssue[];
}> {
  const issues: SchemaIssue[] = [];
  let score = crawl.hasHttps ? 20 : 6;
  const textLower = crawl.textContent.toLowerCase();
  const htmlLower = crawl.html.toLowerCase();
  const urlLower = crawl.url.toLowerCase();

  const likelyEditorialPage =
    crawl.wordCount >= 700 ||
    urlLower.includes("/blog") ||
    urlLower.includes("/article") ||
    urlLower.includes("/news");

  const likelyCommercialPage =
    textLower.includes("pricing") ||
    textLower.includes("checkout") ||
    textLower.includes("cart") ||
    textLower.includes("book now") ||
    textLower.includes("get started") ||
    urlLower.includes("/pricing") ||
    urlLower.includes("/product") ||
    urlLower.includes("/services");

  const extractionLimited =
    crawl.extractionQuality === "low" ||
    (crawl.wordCount === 0 &&
      crawl.links.length === 0 &&
      Boolean(crawl.title || crawl.metaDescription) &&
      crawl.html.length > 3000);

  if (!crawl.hasHttps) {
    issues.push({
      id: "trust-no-https",
      severity: "critical",
      pillar: "trust",
      title: "Site is not served over HTTPS",
      description: "Secure transport is a foundational trust signal for users and AI systems.",
      fix: "Enable HTTPS and redirect all HTTP traffic to HTTPS.",
    });
  }

  if (extractionLimited) {
    issues.push({
      id: "trust-limited-extraction-context",
      severity: "info",
      pillar: "trust",
      title: "Limited trust-signal extraction context",
      description:
        "This page appears heavily client-rendered or sparsely exposed to crawler HTML, so policy/contact trust links may be undercounted.",
      fix: "Expose core trust links and organization details in initial HTML or schema markup.",
    });

    if (crawl.metaDescription) score += 6;
    if (crawl.title) score += 4;
    if (Object.keys(crawl.ogTags).length > 0) score += 6;
    if (crawl.jsonLdBlocks.length > 0) score += 8;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) {
      const aiReview = await runTrustAiReview(crawl, apiKey);
      if (aiReview) {
        const aiAverage =
          (aiReview.expertiseScore + aiReview.transparencyScore + aiReview.safetyScore) / 3;

        score += Math.max(0, Math.round((aiAverage - 3) * 3));

        if (aiAverage < 5) {
          issues.push({
            id: "trust-ai-low-confidence",
            severity: "warning",
            pillar: "trust",
            title: "AI review found weak trust clarity",
            description: aiReview.summary,
            fix: "Improve transparency signals: ownership, authorship, policies, and source references.",
          });
        }
      }
    }

    return { score: clampToPercentage(score), issues };
  }

  // About page
  const hasAbout = crawl.links.some(l => l.href.includes("/about") || l.text.toLowerCase().includes("about"));
  if (hasAbout) { score += 10; } else {
    issues.push({ id: "trust-no-about", severity: "warning", pillar: "trust", title: "No About page link found", description: "An About page establishes organizational credibility.", fix: "Create an About page with company history, team, and mission." });
  }

  // Contact info
  const hasContact = crawl.links.some(l => l.href.includes("/contact") || l.text.toLowerCase().includes("contact"));
  const hasEmail = htmlLower.includes("mailto:") || /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(crawl.textContent);
  if (hasContact || hasEmail) { score += 12; } else {
    issues.push({ id: "trust-no-contact", severity: "warning", pillar: "trust", title: "No contact information found", description: "Contact details are key trust signals.", fix: "Add a Contact page or visible contact information." });
  }

  // Privacy policy
  const hasPrivacy = crawl.links.some(l => l.href.includes("privacy") || l.text.toLowerCase().includes("privacy"));
  if (hasPrivacy) {
    score += likelyCommercialPage ? 8 : 5;
  } else {
    issues.push({
      id: "trust-no-privacy",
      severity: likelyCommercialPage ? "warning" : "info",
      pillar: "trust",
      title: "No privacy policy link found",
      description: "A privacy policy is a common trust indicator, especially for commercial sites.",
      fix: "Add a privacy policy page.",
    });
  }

  // Terms
  const hasTerms = crawl.links.some(l => l.href.includes("terms") || l.text.toLowerCase().includes("terms"));
  if (hasTerms) { score += 5; } else {
    issues.push({ id: "trust-no-terms", severity: "info", pillar: "trust", title: "No terms of service link found", description: "Terms add legitimacy." });
  }

  // Author
  const hasAuthor = textLower.includes("author") || textLower.includes("written by") || htmlLower.includes('rel="author"');
  if (hasAuthor) { score += 10; } else {
    issues.push({
      id: "trust-no-author",
      severity: likelyEditorialPage ? "warning" : "info",
      pillar: "trust",
      title: "No author profiles detected",
      description: "Author profiles with credentials boost E-E-A-T, especially on editorial content.",
      fix: "Add author bios with expertise and social links.",
    });
  }

  // Social links
  const socialDomains = ["twitter.com", "x.com", "linkedin.com", "facebook.com", "youtube.com", "github.com"];
  const socialCount = crawl.links.filter(l => socialDomains.some(s => l.href.includes(s))).length;
  if (socialCount >= 3) { score += 8; } else if (socialCount >= 1) { score += 5; } else {
    issues.push({ id: "trust-no-social", severity: "info", pillar: "trust", title: "No social media links found", description: "Social profiles strengthen authority.", fix: "Link to your official social media profiles." });
  }

  // Copyright
  if (textLower.includes("©") || textLower.includes("copyright")) score += 4;

  // Address
  const hasAddr = textLower.includes("address") || textLower.includes("headquarter");
  if (hasAddr) { score += 5; } else {
    issues.push({ id: "trust-no-address", severity: "info", pillar: "trust", title: "No physical address detected", description: "A business address increases perceived legitimacy." });
  }

  // Testimonials
  if (textLower.includes("testimonial") || textLower.includes("review") || textLower.includes("case study")) {
    score += 4;
  }

  // Stable pages with successful fetches get a small trust baseline boost.
  if (crawl.statusCode >= 200 && crawl.statusCode < 400) {
    score += 4;
  }

  // Optional Gemini trust review for nuance.
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey && crawl.textContent.length > 120) {
    const aiReview = await runTrustAiReview(crawl, apiKey);
    if (aiReview) {
      const aiAverage =
        (aiReview.expertiseScore + aiReview.transparencyScore + aiReview.safetyScore) / 3;

      score += Math.max(0, Math.round((aiAverage - 4) * 1.8));

      if (aiAverage < 5) {
        issues.push({
          id: "trust-ai-low-confidence",
          severity: "warning",
          pillar: "trust",
          title: "AI review found weak trust clarity",
          description: aiReview.summary,
          fix: "Improve transparency signals: ownership, authorship, policies, and source references.",
        });
      }
    }
  }

  return { score: clampToPercentage(score), issues };
}

async function runTrustAiReview(
  crawl: CrawlResult,
  apiKey: string
): Promise<TrustAiReview | null> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const analysisInput = buildTrustAiInput(crawl);

  const prompt = `You are an AI-readiness trust auditor.
Return ONLY valid JSON with this exact shape:
{
  "expertiseScore": number (1-10),
  "transparencyScore": number (1-10),
  "safetyScore": number (1-10),
  "summary": string
}

Evaluate trust and credibility signals for AI systems.
Keep summary to 2 concise sentences.

URL: ${crawl.url}
Analysis Input:
${analysisInput}`;

  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 320,
        },
      }),
      TRUST_AI_TIMEOUT_MS,
      `Trust AI request timed out after ${TRUST_AI_TIMEOUT_MS}ms`
    );

    const raw = result.response.text().trim();
    if (!raw) {
      return null;
    }

    const parsed = parseModelJson(raw);
    if (!parsed) {
      return null;
    }

    const validated = trustAiReviewSchema.safeParse(parsed);
    if (!validated.success) {
      return null;
    }

    return {
      expertiseScore: clampScaleScore(validated.data.expertiseScore),
      transparencyScore: clampScaleScore(validated.data.transparencyScore),
      safetyScore: clampScaleScore(validated.data.safetyScore),
      summary: validated.data.summary.trim(),
    };
  } catch {
    return null;
  }
}

function buildTrustAiInput(crawl: CrawlResult): string {
  const headingSnapshot = crawl.headings
    .slice(0, 12)
    .map((heading) => `H${heading.level}: ${heading.text}`)
    .join("\n");

  const textSnapshot = crawl.textContent.slice(0, 8_000);
  const schemaSnapshot = JSON.stringify(crawl.jsonLdBlocks.slice(0, 5)).slice(0, 4_000);

  return [
    `Title: ${crawl.title || "N/A"}`,
    `Meta Description: ${crawl.metaDescription || "N/A"}`,
    `Extraction Mode: ${crawl.renderMode || "static"}`,
    `Extraction Quality: ${crawl.extractionQuality || "unknown"}`,
    `Link Count: ${crawl.links.length}`,
    `External Link Count: ${crawl.links.filter((link) => link.isExternal).length}`,
    `Headings:\n${headingSnapshot || "none"}`,
    `Text Snapshot:\n${textSnapshot || "none"}`,
    `JSON-LD Snapshot:\n${schemaSnapshot || "none"}`,
    `HTML Snapshot:\n${crawl.html.slice(0, 4000)}`,
  ].join("\n\n");
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
