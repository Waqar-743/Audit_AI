import type { CrawlResult, SchemaIssue } from "./types";

type PageSpeedMetrics = {
  performance: number;
  seo: number;
  lcp: string;
  fcp: string;
  cls: string;
  tti: string;
  speedIndex: string;
};

/**
 * Run technical SEO checks on the crawled page.
 * Optionally calls Google PageSpeed Insights API if API key is available.
 */
export async function analyzeTechnicalSeo(
  crawl: CrawlResult
): Promise<{
  score: number;
  issues: SchemaIssue[];
  pageSpeed?: PageSpeedMetrics;
}> {
  const issues: SchemaIssue[] = [];
  let score = 0;
  const limitedExtraction =
    crawl.extractionQuality === "low" ||
    (crawl.wordCount === 0 &&
      Boolean(crawl.title || crawl.metaDescription) &&
      crawl.html.length > 3000);

  if (crawl.statusCode >= 400) {
    issues.push({
      id: "tech-crawl-http-error",
      severity: "critical",
      pillar: "technical",
      title: `Page returned HTTP ${crawl.statusCode}`,
      description:
        "The crawler could not access a valid page response, so technical SEO checks are incomplete.",
      fix: "Verify the URL is public and does not block server-side requests.",
    });

    return {
      score: 0,
      issues,
    };
  }

  // ── Check 1: HTTPS ──
  if (crawl.hasHttps) {
    score += 10;
  } else {
    issues.push({
      id: "tech-no-https",
      severity: "critical",
      pillar: "technical",
      title: "Site is not served over HTTPS",
      description:
        "HTTPS is mandatory for AI search engines. Insecure sites are deprioritized or excluded.",
      fix: "Install an SSL certificate and redirect all HTTP traffic to HTTPS.",
    });
  }

  // ── Check 2: Response time ──
  if (crawl.responseTime < 1500) {
    score += 10;
  } else if (crawl.responseTime < 3500) {
    score += 7;
    issues.push({
      id: "tech-slow-response",
      severity: "warning",
      pillar: "technical",
      title: `Slow response time (${(crawl.responseTime / 1000).toFixed(1)}s)`,
      description:
        "AI crawlers have timeouts. Slow responses risk incomplete content extraction.",
      fix: "Optimize server response time. Target under 1.5 seconds.",
    });
  } else {
    issues.push({
      id: "tech-very-slow",
      severity: "critical",
      pillar: "technical",
      title: `Very slow response (${(crawl.responseTime / 1000).toFixed(1)}s)`,
      description:
        "Response time exceeds 3 seconds. AI crawlers may abandon the page.",
      fix: "Investigate server performance, caching, and CDN setup.",
    });
  }

  // ── Check 3: Meta description ──
  if (crawl.metaDescription) {
    score += 8;
    if (crawl.metaDescription.length < 50) {
      issues.push({
        id: "tech-short-meta",
        severity: "info",
        pillar: "technical",
        title: "Meta description is too short",
        description: `Your meta description is only ${crawl.metaDescription.length} characters. Aim for 120-160 characters.`,
        fix: "Write a compelling meta description between 120-160 characters.",
      });
    } else if (crawl.metaDescription.length > 160) {
      issues.push({
        id: "tech-long-meta",
        severity: "info",
        pillar: "technical",
        title: "Meta description is too long",
        description: `Your meta description is ${crawl.metaDescription.length} characters. It may be truncated.`,
        fix: "Keep meta descriptions under 160 characters.",
      });
    }
  } else {
    issues.push({
      id: "tech-no-meta-desc",
      severity: limitedExtraction ? "warning" : "critical",
      pillar: "technical",
      title: "No meta description found",
      description:
        "Meta descriptions help AI engines understand page content before full parsing.",
      fix: "Add a meta description tag between 120-160 characters.",
      codeSnippet: `<meta name="description" content="Your compelling page description here (120-160 chars)" />`,
    });
  }

  // ── Check 4: Title tag ──
  if (crawl.title) {
    score += 8;
    if (crawl.title.length > 60) {
      issues.push({
        id: "tech-long-title",
        severity: "info",
        pillar: "technical",
        title: "Title tag is too long",
        description: `Your title is ${crawl.title.length} characters. Aim for under 60.`,
      });
    }
  } else {
    issues.push({
      id: "tech-no-title",
      severity: limitedExtraction ? "warning" : "critical",
      pillar: "technical",
      title: "No title tag found",
      description: "The page is missing a title tag. This is critical for all search engines.",
      fix: "Add a descriptive title tag under 60 characters.",
    });
  }

  // ── Check 5: Viewport meta ──
  if (crawl.viewport) {
    score += 5;
  } else {
    issues.push({
      id: "tech-no-viewport",
      severity: "warning",
      pillar: "technical",
      title: "No viewport meta tag found",
      description: "Mobile-first design is critical for modern SEO.",
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1" />.',
    });
  }

  // ── Check 6: Canonical tag ──
  if (crawl.canonical) {
    score += 5;
  } else {
    issues.push({
      id: "tech-no-canonical",
      severity: "warning",
      pillar: "technical",
      title: "No canonical URL specified",
      description:
        "Without a canonical tag, AI engines may index duplicate versions of your page.",
      fix: "Add a canonical link tag pointing to the preferred URL.",
      codeSnippet: `<link rel="canonical" href="${crawl.url}" />`,
    });
  }

  // ── Check 7: Heading hierarchy ──
  const h1Count = crawl.headings.filter((h) => h.level === 1).length;

  if (h1Count === 0) {
    issues.push({
      id: "tech-no-h1",
      severity: limitedExtraction ? "warning" : "critical",
      pillar: "technical",
      title: "No H1 heading found",
      description:
        "Every page should have exactly one H1 heading for AI engines to identify the main topic.",
      fix: "Add a single H1 heading that describes the page's main topic.",
    });

    if (limitedExtraction) {
      score += 3;
    }
  } else if (h1Count === 1) {
    score += 10;
  } else {
    issues.push({
      id: "tech-multiple-h1",
      severity: "warning",
      pillar: "technical",
      title: `Multiple H1 headings found (${h1Count})`,
      description: "Having multiple H1 tags dilutes the page's topic signal.",
      fix: "Use only one H1 per page. Use H2-H6 for sub-sections.",
    });
    score += 5;
  }

  // Check heading nesting
  let lastLevel = 0;
  let nestingIssues = 0;
  for (const h of crawl.headings) {
    if (h.level > lastLevel + 1 && lastLevel > 0) {
      nestingIssues++;
    }
    lastLevel = h.level;
  }
  if (nestingIssues === 0 && crawl.headings.length > 0) {
    score += 7;
  } else if (nestingIssues > 0) {
    issues.push({
      id: "tech-heading-nesting",
      severity: "warning",
      pillar: "technical",
      title: `Heading hierarchy skips levels (${nestingIssues} issues)`,
      description:
        "Skipping heading levels (e.g., H1 → H3) makes content structure unclear for AI engines.",
      fix: "Use headings in sequential order: H1 → H2 → H3, etc.",
    });
    score += 3;
  }

  // ── Check 8: Images without alt text ──
  const imagesWithoutAlt = crawl.images.filter((img) => !img.alt);
  if (crawl.images.length === 0) {
    score += 4;
  } else if (imagesWithoutAlt.length > 0) {
    issues.push({
      id: "tech-images-no-alt",
      severity: "warning",
      pillar: "technical",
      title: `${imagesWithoutAlt.length} images missing alt text`,
      description:
        "Alt text helps AI engines understand image content and context.",
      fix: "Add descriptive alt attributes to all images.",
    });
  } else if (crawl.images.length > 0) {
    score += 7;
  }

  // ── Check 9: Robots meta ──
  if (crawl.metaRobots) {
    if (
      crawl.metaRobots.includes("noindex") ||
      crawl.metaRobots.includes("nofollow")
    ) {
      issues.push({
        id: "tech-robots-blocked",
        severity: "critical",
        pillar: "technical",
        title: "Page blocked by robots meta tag",
        description: `Your robots meta contains "${crawl.metaRobots}". AI crawlers will skip this page.`,
        fix: "Remove noindex/nofollow unless intentional.",
      });
    } else {
      score += 5;
    }
  } else {
    score += 5; // No robots meta = default allow
  }

  // ── Check 10: Word count ──
  if (crawl.wordCount < 250) {
    issues.push({
      id: "tech-thin-content",
      severity: "warning",
      pillar: "technical",
      title: `Thin content (${crawl.wordCount} words)`,
      description:
        "Very short pages are less likely to be cited by AI engines.",
      fix: "Add more substantive, relevant content. Aim for at least 400+ words where possible.",
    });
  } else if (crawl.wordCount < 500) {
    score += 6;
  } else {
    score += 10;
  }

  // ── PageSpeed Insights API (optional) ──
  let pageSpeed: PageSpeedMetrics | null = null;
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (apiKey) {
    try {
      pageSpeed = await fetchPageSpeed(crawl.url, apiKey);
      if (pageSpeed) {
        const isSeoSignalLikelyUnreliable =
          pageSpeed.seo <= 1 && pageSpeed.performance >= 50;

        const blendedScore = isSeoSignalLikelyUnreliable
          ? Math.round(pageSpeed.performance * 0.85 + 15)
          : Math.round(pageSpeed.performance * 0.55 + pageSpeed.seo * 0.45);

        if (isSeoSignalLikelyUnreliable) {
          issues.push({
            id: "tech-pagespeed-seo-unreliable",
            severity: "info",
            pillar: "technical",
            title: "Lighthouse SEO subscore appears unreliable for this page",
            description:
              "PageSpeed returned SEO 0/100 while performance is healthy, which can happen on heavily scripted pages or partial renders.",
            fix: "Treat this as directional data and verify with Search Console plus rendered-page checks.",
          });
        }

        if (blendedScore >= 85) {
          score += 18;
        } else if (blendedScore >= 60) {
          score += 12;
          issues.push({
            id: "tech-moderate-speed",
            severity: "warning",
            pillar: "technical",
            title: `Moderate Lighthouse technical score (${blendedScore}/100)`,
            description: `Performance ${pageSpeed.performance}/100, SEO ${pageSpeed.seo}/100. LCP: ${pageSpeed.lcp}, FCP: ${pageSpeed.fcp}.`,
          });
        } else {
          score += 6;
          issues.push({
            id: "tech-poor-speed",
            severity: "critical",
            pillar: "technical",
            title: `Poor Lighthouse technical score (${blendedScore}/100)`,
            description: `Performance ${pageSpeed.performance}/100, SEO ${pageSpeed.seo}/100. LCP: ${pageSpeed.lcp}, FCP: ${pageSpeed.fcp}.`,
            fix: "Optimize images, enable compression, minimize JavaScript, and use a CDN.",
          });
        }
      }
    } catch {
      // PageSpeed API unavailable — skip
    }
  } else {
    // No API key — give partial credit based on response time
    if (crawl.responseTime < 2000) score += 9;
    else if (crawl.responseTime < 3500) score += 6;
    else score += 3;
  }

  return {
    score: clampToPercentage(score),
    issues,
    pageSpeed: pageSpeed ?? undefined,
  };
}

async function fetchPageSpeed(
  url: string,
  apiKey: string
): Promise<PageSpeedMetrics | null> {
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`;

  const res = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return null;

  const data = await res.json();
  const audits = data.lighthouseResult?.audits;
  const categories = data.lighthouseResult?.categories;

  if (!audits || !categories) return null;

  return {
    performance: Math.round((categories.performance?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100),
    lcp: audits["largest-contentful-paint"]?.displayValue || "N/A",
    fcp: audits["first-contentful-paint"]?.displayValue || "N/A",
    cls: audits["cumulative-layout-shift"]?.displayValue || "N/A",
    tti: audits["interactive"]?.displayValue || "N/A",
    speedIndex: audits["speed-index"]?.displayValue || "N/A",
  };
}

function clampToPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
