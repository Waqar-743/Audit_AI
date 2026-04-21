import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { CrawlResult, SchemaIssue } from "./types";

/**
 * Analyze content quality and AI digestibility.
 * Optionally uses Gemini API for deeper analysis.
 */
type ContentAiAnalysis = {
  readabilityScore: number;
  factualDensity: number;
  answerFocused: number;
  authorAttribution: number;
  summary: string;
};

const GEMINI_TIMEOUT_MS = 25_000;
const FALLBACK_SUMMARY_MARKER = "neutral fallback metrics";

const NEUTRAL_AI_ANALYSIS: Omit<ContentAiAnalysis, "summary"> = {
  readabilityScore: 5,
  factualDensity: 5,
  answerFocused: 5,
  authorAttribution: 5,
};

const aiAnalysisSchema = z
  .object({
    readabilityScore: z.coerce.number().min(1).max(10),
    factualDensity: z.coerce.number().min(1).max(10),
    answerFocused: z.coerce.number().min(1).max(10),
    authorAttribution: z.coerce.number().min(1).max(10),
    summary: z.string().trim().min(1).max(600),
  })
  .strict();

export async function analyzeContent(
  crawl: CrawlResult
): Promise<{
  score: number;
  issues: SchemaIssue[];
  aiAnalysis?: ContentAiAnalysis;
}> {
  const issues: SchemaIssue[] = [];
  let score = 0;
  const extractionLimited =
    crawl.extractionQuality === "low" ||
    (crawl.wordCount === 0 &&
      Boolean(crawl.title || crawl.metaDescription) &&
      crawl.html.length > 3000);

  // ── Check 1: Heading structure ──
  const headingCount = crawl.headings.length;
  if (headingCount === 0) {
    issues.push({
      id: "content-no-headings",
      severity: extractionLimited ? "warning" : "critical",
      pillar: "content",
      title: "No headings found",
      description:
        "Content without headings is difficult for AI engines to parse and cite.",
      fix: "Structure your content with H1-H6 headings for clear topic hierarchy.",
    });

    if (extractionLimited) {
      score += 6;
    }
  } else if (headingCount < 3) {
    issues.push({
      id: "content-few-headings",
      severity: "warning",
      pillar: "content",
      title: `Only ${headingCount} headings found`,
      description:
        "More headings create clearer content structure for AI comprehension.",
    });
    score += 8;
  } else {
    score += 15;
  }

  if (extractionLimited) {
    issues.push({
      id: "content-js-rendered-limited-extraction",
      severity: "info",
      pillar: "content",
      title: "Limited server-side content extraction detected",
      description:
        "The page appears to rely heavily on client-side rendering, so some content signals may be undercounted.",
      fix: "Expose key headings/content in initial HTML or add structured data for crawler visibility.",
    });

    // Prevent severe under-scoring when parser visibility is limited but metadata exists.
    score += 14;
  }

  // ── Check 2: FAQ/Q&A content detection ──
  const textLower = crawl.textContent.toLowerCase();
  const hasQAPatterns =
    textLower.includes("frequently asked") ||
    textLower.includes("faq") ||
    crawl.headings.some((h) => h.text.includes("?"));

  if (hasQAPatterns) {
    score += 12;
  } else if (!extractionLimited) {
    issues.push({
      id: "content-no-faq",
      severity: "info",
      pillar: "content",
      title: "No FAQ or Q&A content detected",
      description:
        "FAQ-style content is highly favored by AI engines for direct citation.",
      fix: "Add an FAQ section with common questions and clear answers.",
    });
  }

  // ── Check 3: Content length & depth ──
  if (crawl.wordCount >= 1500) {
    score += 15;
  } else if (crawl.wordCount >= 900) {
    score += 12;
  } else if (crawl.wordCount >= 450) {
    score += 9;
  } else if (crawl.wordCount >= 200) {
    score += 6;
    issues.push({
      id: "content-short",
      severity: "warning",
      pillar: "content",
      title: `Content may be too short (${crawl.wordCount} words)`,
      description:
        "Longer, in-depth content is more likely to be cited by AI engines.",
      fix: "Expand your content to 450+ words with substantive information.",
    });
  } else {
    issues.push({
      id: "content-very-short",
      severity: extractionLimited ? "info" : "warning",
      pillar: "content",
      title: `Very short content (${crawl.wordCount} words)`,
      description: extractionLimited
        ? "Visible server-side text extraction was very limited, so content signals may be undercounted."
        : "Extremely short pages are hard for AI systems to cite confidently.",
      fix: extractionLimited
        ? "Expose key content in initial HTML or enrich structured data for crawler visibility."
        : "Add clearer explanations, examples, and supporting details.",
    });

    if (extractionLimited) {
      score += 4;
    }
  }

  // ── Check 4: Author attribution ──
  const hasAuthor =
    textLower.includes("written by") ||
    textLower.includes("author") ||
    textLower.includes("by ") ||
    crawl.jsonLdBlocks.some(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        "author" in (block as Record<string, unknown>)
    );

  if (hasAuthor) {
    score += 10;
  } else if (!extractionLimited) {
    issues.push({
      id: "content-no-author",
      severity: "warning",
      pillar: "content",
      title: "No author attribution found",
      description:
        "AI engines evaluate content credibility through author expertise signals.",
      fix: "Add an author byline with name, credentials, and bio.",
    });
  }

  // ── Check 5: Date stamps ──
  const hasDate =
    crawl.html.match(
      /\b(20[0-9]{2}[-\/][0-1]?[0-9][-\/][0-3]?[0-9])\b/
    ) !== null ||
    crawl.jsonLdBlocks.some(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        ("datePublished" in (block as Record<string, unknown>) ||
          "dateModified" in (block as Record<string, unknown>))
    );

  if (hasDate) {
    score += 10;
  } else if (!extractionLimited) {
    issues.push({
      id: "content-no-date",
      severity: "warning",
      pillar: "content",
      title: "No publication date found",
      description:
        "AI engines prefer citing fresh, dated content to ensure accuracy.",
      fix: "Add visible publication and last-modified dates.",
    });
  }

  // ── Check 6: Lists & structured content ──
  const listCount = (crawl.html.match(/<(ul|ol)[\s>]/gi) || []).length;
  if (listCount >= 2) {
    score += 10;
  } else if (listCount >= 1) {
    score += 5;
  } else if (!extractionLimited) {
    issues.push({
      id: "content-no-lists",
      severity: "info",
      pillar: "content",
      title: "No structured lists found",
      description: "Lists make content more scannable for AI extraction.",
      fix: "Use bullet points and numbered lists for key information.",
    });
  }

  // ── Check 7: External citations ──
  const externalLinks = crawl.links.filter((l) => l.isExternal).length;
  if (externalLinks >= 3) {
    score += 10;
  } else if (externalLinks >= 1) {
    score += 5;
  } else if (!extractionLimited) {
    issues.push({
      id: "content-no-citations",
      severity: "info",
      pillar: "content",
      title: "No external citations or references",
      description:
        "Citing authoritative sources increases your content's trustworthiness for AI engines.",
      fix: "Link to reputable sources that support your claims.",
    });
  }

  // ── Check 8: Table/data presence ──
  const hasTables = crawl.html.includes("<table");
  if (hasTables) {
    score += 5;
  }

  if (extractionLimited) {
    // Neutral buffer so sparse extraction does not produce repeated false-negative penalties.
    score += 8;
  }

  // ── Gemini Analysis (optional) ──
  let aiAnalysis;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && (crawl.textContent.length > 100 || extractionLimited)) {
    try {
      aiAnalysis = await runAiAnalysis(buildAiInput(crawl), apiKey);
      if (aiAnalysis && !isFallbackAiAnalysis(aiAnalysis)) {
        const aiComposite =
          (aiAnalysis.readabilityScore +
            aiAnalysis.factualDensity +
            aiAnalysis.answerFocused +
            aiAnalysis.authorAttribution) /
          4;

        // AI-assisted bonus is intentionally meaningful but bounded.
        score += Math.round(aiComposite * 1.6);

        if (aiComposite < 5) {
          issues.push({
            id: "content-ai-low-quality",
            severity: "warning",
            pillar: "content",
            title: "AI review flagged weak content clarity",
            description: aiAnalysis.summary,
            fix: "Improve direct answers, factual density, and clear author credentials.",
          });
        }
      }
    } catch (error) {
      console.warn("[content-analyzer] Gemini analysis crashed unexpectedly", error);
      aiAnalysis = createFallbackAiAnalysis("unexpected-error");
    }
  }

  return {
    score: Math.min(Math.round((score / 100) * 100), 100),
    issues,
    aiAnalysis: aiAnalysis ?? undefined,
  };
}

async function runAiAnalysis(
  analysisInput: string,
  apiKey: string
): Promise<ContentAiAnalysis> {
  // Keep prompt bounded for stable latency while still allowing deep analysis.
  const content = analysisInput.slice(0, 18000);

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `You are an AI SEO expert auditing content for AI search readiness.
Return ONLY valid JSON.

Required schema (exact keys, no extras):
{
  "readabilityScore": number (1-10),
  "factualDensity": number (1-10),
  "answerFocused": number (1-10),
  "authorAttribution": number (1-10),
  "summary": string
}

Rules:
- No markdown
- No code fences
- No extra keys
- summary must be 2-3 concise sentences

Analyze this content:
${content}`;

  try {
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 700,
        },
      }),
      GEMINI_TIMEOUT_MS,
      `Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms`
    );

    const raw = result.response.text().trim();
    if (!raw) {
      console.warn("[content-analyzer] Gemini returned empty response");
      return createFallbackAiAnalysis("empty-response");
    }

    const parsed = parseModelJson(raw);
    if (!parsed) {
      console.warn("[content-analyzer] Gemini returned non-JSON response");
      return createFallbackAiAnalysis("invalid-json");
    }

    const validated = aiAnalysisSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(
        "[content-analyzer] Gemini response failed schema validation",
        validated.error.issues
      );
      return createFallbackAiAnalysis("invalid-schema");
    }

    return {
      readabilityScore: clampScore(validated.data.readabilityScore),
      factualDensity: clampScore(validated.data.factualDensity),
      answerFocused: clampScore(validated.data.answerFocused),
      authorAttribution: clampScore(validated.data.authorAttribution),
      summary: validated.data.summary.trim(),
    };
  } catch (error) {
    console.warn(
      "[content-analyzer] Gemini analysis failed, using fallback metrics",
      error
    );
    return createFallbackAiAnalysis(
      error instanceof Error ? error.message : "request-failed"
    );
  }
}

function buildAiInput(crawl: CrawlResult): string {
  if (crawl.textContent.length > 120) {
    return crawl.textContent;
  }

  const headingSnapshot = crawl.headings
    .slice(0, 15)
    .map((heading) => `H${heading.level}: ${heading.text}`)
    .join("\n");

  const schemaSnapshot = JSON.stringify(crawl.jsonLdBlocks.slice(0, 5)).slice(0, 4000);

  return [
    `URL: ${crawl.url}`,
    `Title: ${crawl.title || "N/A"}`,
    `Meta Description: ${crawl.metaDescription || "N/A"}`,
    `Extraction Mode: ${crawl.renderMode || "static"}`,
    `Extraction Quality: ${crawl.extractionQuality || "unknown"}`,
    `Word Count: ${crawl.wordCount}`,
    `Heading Count: ${crawl.headings.length}`,
    `External Link Count: ${crawl.links.filter((link) => link.isExternal).length}`,
    `Headings:\n${headingSnapshot || "N/A"}`,
    `JSON-LD:\n${schemaSnapshot || "N/A"}`,
    `HTML Snippet:\n${crawl.html.slice(0, 5000)}`,
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

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.min(10, Math.round(value)));
}

function createFallbackAiAnalysis(reason: string): ContentAiAnalysis {
  const normalizedReason = reason.trim().slice(0, 120) || "unknown";
  return {
    ...NEUTRAL_AI_ANALYSIS,
    summary: `AI analysis unavailable (${normalizedReason}); ${FALLBACK_SUMMARY_MARKER} applied.`,
  };
}

function isFallbackAiAnalysis(analysis: ContentAiAnalysis): boolean {
  return analysis.summary.toLowerCase().includes(FALLBACK_SUMMARY_MARKER);
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
