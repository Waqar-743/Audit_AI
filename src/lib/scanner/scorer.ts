import type { ScanResult, PillarScore } from "./types";
import { crawlUrl } from "./crawler";
import { analyzeSchema } from "./schema-analyzer";
import { analyzeTechnicalSeo } from "./tech-seo";
import { analyzeContent } from "./content-analyzer";
import { analyzeTrustSignals } from "./trust-signals";

const WEIGHTS = { schema: 0.2, content: 0.35, technical: 0.3, trust: 0.15 };

export async function runFullScan(
  url: string,
  onStep?: (step: number, text: string) => void
): Promise<ScanResult> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Step 0: Crawl
  onStep?.(0, "Fetching & rendering page...");
  const crawl = await crawlUrl(url);

  // Step 1: Schema
  onStep?.(1, "Extracting JSON-LD schema...");
  const schema = await analyzeSchema(crawl);

  // Step 2: Content
  onStep?.(2, "Analyzing content structure...");
  const content = await analyzeContent(crawl);

  // Step 3: Technical
  onStep?.(3, "Running technical checks...");
  const technical = await analyzeTechnicalSeo(crawl);

  // Step 4: Trust
  onStep?.(4, "Evaluating trust signals...");
  const trust = await analyzeTrustSignals(crawl);

  // Step 5: Score
  onStep?.(5, "Computing AI readiness score...");

  const pillars = {
    schema: makePillar(
      "Schema Markup",
      calibratePillarScore(schema.score, 0.84, 14),
      schema.issues
    ),
    content: makePillar(
      "Content Quality",
      calibratePillarScore(content.score, 0.9, 8),
      content.issues
    ),
    technical: makePillar(
      "Technical SEO",
      calibratePillarScore(technical.score, 0.88, 10),
      technical.issues
    ),
    trust: makePillar(
      "Trust Signals",
      calibratePillarScore(trust.score, 0.84, 14),
      trust.issues
    ),
  };

  const analysisConfidence = estimateAnalysisConfidence(crawl, technical.pageSpeed);

  const rawOverallScore = Math.round(
    pillars.schema.percentage * WEIGHTS.schema +
    pillars.content.percentage * WEIGHTS.content +
    pillars.technical.percentage * WEIGHTS.technical +
    pillars.trust.percentage * WEIGHTS.trust
  );

  const overallScore = blendScoreByConfidence(rawOverallScore, analysisConfidence);

  const allIssues = [
    ...schema.issues,
    ...content.issues,
    ...technical.issues,
    ...trust.issues,
  ];

  if (analysisConfidence < 0.65) {
    allIssues.push({
      id: "analysis-low-confidence",
      severity: "info",
      pillar: "technical",
      title: "Scan confidence is limited for this page",
      description:
        "Crawler extraction quality was limited, so some issue flags may be less precise than usual.",
      fix: "Ensure key content and metadata are visible in initial HTML or use structured data to improve crawler visibility.",
    });
  }

  allIssues.sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    return sev[a.severity] - sev[b.severity];
  });

  return {
    id,
    url,
    timestamp,
    overallScore,
    analysisConfidence,
    pillars,
    issues: allIssues,
    pageSpeed: technical.pageSpeed,
    aiAnalysis: content.aiAnalysis,
  };
}

function estimateAnalysisConfidence(
  crawl: { wordCount: number; headings: { level: number; text: string }[]; links: { href: string; text: string; isExternal: boolean }[]; extractionQuality?: "low" | "medium" | "high"; renderMode?: "static" | "dynamic" },
  pageSpeed?: { performance: number; seo: number }
): number {
  let confidence = 0.45;

  if (crawl.wordCount >= 250) confidence += 0.2;
  if (crawl.headings.length >= 2) confidence += 0.12;
  if (crawl.links.length >= 8) confidence += 0.08;
  if (pageSpeed) confidence += 0.1;
  if (crawl.renderMode === "dynamic") confidence += 0.08;

  if (crawl.extractionQuality === "high") confidence += 0.1;
  if (crawl.extractionQuality === "medium") confidence += 0.03;
  if (crawl.extractionQuality === "low") confidence -= 0.15;

  return Math.max(0.35, Math.min(1, Number(confidence.toFixed(2))));
}

function blendScoreByConfidence(rawScore: number, confidence: number): number {
  const neutralBaseline = 55;
  return Math.round(rawScore * confidence + neutralBaseline * (1 - confidence));
}

function calibratePillarScore(raw: number, multiplier: number, offset: number): number {
  const normalized = raw * multiplier + offset;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function makePillar(name: string, score: number, issues: import("./types").SchemaIssue[]): PillarScore {
  return { name, score, maxScore: 100, percentage: score, issues };
}
