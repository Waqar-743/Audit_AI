export type Category = "Discovery" | "Search appearance" | "Content" | "Images & links" | "Structured data";
export type CheckStatus = "pass" | "fail" | "review" | "unknown";
export type Priority = "high" | "medium" | "low";

export interface PageSnapshot {
  url: string;
  baseUrl?: string;
  mode: "source" | "rendered";
  titles: string[];
  descriptions: string[];
  canonicals: string[];
  robots: { agent: string; content: string }[];
  responseRobots?: string;
  statusCode?: number;
  language: string;
  viewport: string;
  headings: { level: number; text: string }[];
  images: { src: string; alt: string | null }[];
  links: { href: string; text: string; rel: string }[];
  jsonLd: string[];
  jsonLdTruncated?: boolean;
  hasOtherStructuredData: boolean;
  wordCount: number;
  excerpt: string;
  og: Record<string, string>;
  truncated: boolean;
}

export interface SeoCheck {
  id: string;
  category: Category;
  status: CheckStatus;
  priority: Priority;
  title: string;
  evidence: string;
  advice: string;
  reference: string;
  selector?: string;
}

export interface SeoReport {
  version: 1;
  id: string;
  url: string;
  title: string;
  timestamp: string;
  mode: PageSnapshot["mode"];
  score: number | null;
  counts: Record<CheckStatus, number>;
  stage: "nest" | "fledgling" | "flight";
  checks: SeoCheck[];
  metrics: { words: number; headings: number; images: number; links: number; schemaBlocks: number };
  preview: { title: string; description: string; canonical: string };
  limitations: string[];
}

export const birds = ["parrot", "nest", "egg", "hatching", "fledgling", "flight", "feather", "branch", "scout", "map", "leaf", "compass", "sunrise", "flock", "homecoming"] as const;
export type Bird = (typeof birds)[number];
export interface Preferences { nickname: string; goal: "my site" | "client work" | "learning SEO"; bird: Bird }
export const categories: Category[] = ["Discovery", "Search appearance", "Content", "Images & links", "Structured data"];
