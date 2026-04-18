/* ─── Scanner Types ─── */

export interface CrawlResult {
  url: string;
  finalUrl: string;
  html: string;
  title: string;
  metaDescription: string;
  metaRobots: string;
  canonical: string;
  viewport: string;
  ogTags: Record<string, string>;
  headings: { level: number; text: string }[];
  jsonLdBlocks: unknown[];
  links: { href: string; text: string; isExternal: boolean }[];
  images: { src: string; alt: string }[];
  textContent: string;
  wordCount: number;
  hasHttps: boolean;
  responseTime: number;
  statusCode: number;
  error?: string;
}

export interface SchemaIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  pillar: "schema" | "content" | "technical" | "trust";
  title: string;
  description: string;
  fix?: string;
  codeSnippet?: string;
}

export interface PillarScore {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  issues: SchemaIssue[];
}

export interface ScanResult {
  id: string;
  url: string;
  timestamp: string;
  overallScore: number;
  pillars: {
    schema: PillarScore;
    content: PillarScore;
    technical: PillarScore;
    trust: PillarScore;
  };
  issues: SchemaIssue[];
  pageSpeed?: {
    performance: number;
    lcp: string;
    fcp: string;
    cls: string;
    tti: string;
    speedIndex: string;
  };
  aiAnalysis?: {
    readabilityScore: number;
    factualDensity: number;
    answerFocused: number;
    authorAttribution: number;
    summary: string;
  };
}

export interface ScanStatus {
  id: string;
  status: "pending" | "crawling" | "analyzing" | "complete" | "error";
  step: number;
  stepText: string;
  progress: number;
  error?: string;
  result?: ScanResult;
}
