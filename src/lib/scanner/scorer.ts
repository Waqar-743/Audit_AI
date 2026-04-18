import type { CrawlResult, ScanResult, PillarScore } from "./types";
import { crawlUrl } from "./crawler";
import { analyzeSchema } from "./schema-analyzer";
import { analyzeTechnicalSeo } from "./tech-seo";
import { analyzeContent } from "./content-analyzer";
import { analyzeTrustSignals } from "./trust-signals";

const WEIGHTS = { schema: 0.25, content: 0.3, technical: 0.25, trust: 0.2 };

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
  const schema = analyzeSchema(crawl);

  // Step 2: Content
  onStep?.(2, "Analyzing content structure...");
  const content = await analyzeContent(crawl);

  // Step 3: Technical
  onStep?.(3, "Running technical checks...");
  const technical = await analyzeTechnicalSeo(crawl);

  // Step 4: Trust
  onStep?.(4, "Evaluating trust signals...");
  const trust = analyzeTrustSignals(crawl);

  // Step 5: Score
  onStep?.(5, "Computing AI readiness score...");

  const pillars = {
    schema: makePillar("Schema Markup", schema.score, schema.issues),
    content: makePillar("Content Quality", content.score, content.issues),
    technical: makePillar("Technical SEO", technical.score, technical.issues),
    trust: makePillar("Trust Signals", trust.score, trust.issues),
  };

  const overallScore = Math.round(
    pillars.schema.percentage * WEIGHTS.schema +
    pillars.content.percentage * WEIGHTS.content +
    pillars.technical.percentage * WEIGHTS.technical +
    pillars.trust.percentage * WEIGHTS.trust
  );

  const allIssues = [
    ...schema.issues,
    ...content.issues,
    ...technical.issues,
    ...trust.issues,
  ].sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    return sev[a.severity] - sev[b.severity];
  });

  return {
    id,
    url,
    timestamp,
    overallScore,
    pillars,
    issues: allIssues,
    pageSpeed: technical.pageSpeed,
    aiAnalysis: content.aiAnalysis,
  };
}

function makePillar(name: string, score: number, issues: import("./types").SchemaIssue[]): PillarScore {
  return { name, score, maxScore: 100, percentage: score, issues };
}
