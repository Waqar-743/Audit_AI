import type { CrawlResult } from "./types";

/**
 * Crawl a URL and extract structured data from the page.
 * Uses fetch + DOM parsing for static sites.
 * Falls back gracefully if Playwright is not available.
 */
export async function crawlUrl(url: string): Promise<CrawlResult> {
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const startTime = Date.now();

  try {
    const response = await fetch(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AuditAI/1.0; +https://auditai.com/bot)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });

    const html = await response.text();
    const responseTime = Date.now() - startTime;

    // Parse HTML using regex-based extraction (works in Edge Runtime)
    const result = parseHtml(html, fullUrl);

    return {
      ...result,
      url: fullUrl,
      finalUrl: response.url,
      hasHttps: response.url.startsWith("https"),
      responseTime,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      url: fullUrl,
      finalUrl: fullUrl,
      html: "",
      title: "",
      metaDescription: "",
      metaRobots: "",
      canonical: "",
      viewport: "",
      ogTags: {},
      headings: [],
      jsonLdBlocks: [],
      links: [],
      images: [],
      textContent: "",
      wordCount: 0,
      hasHttps: fullUrl.startsWith("https"),
      responseTime: Date.now() - startTime,
      statusCode: 0,
      error: error instanceof Error ? error.message : "Unknown crawl error",
    };
  }
}

function parseHtml(html: string, baseUrl: string): Omit<CrawlResult, "url" | "finalUrl" | "hasHttps" | "responseTime" | "statusCode"> {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Extract meta tags
  const metaDescription = extractMeta(html, "description");
  const metaRobots = extractMeta(html, "robots");
  const canonical = extractLink(html, "canonical");
  const viewport = extractMeta(html, "viewport");

  // Extract OG tags
  const ogTags: Record<string, string> = {};
  const ogRegex = /<meta\s+property="og:([^"]+)"\s+content="([^"]*)"[^>]*>/gi;
  let ogMatch;
  while ((ogMatch = ogRegex.exec(html)) !== null) {
    ogTags[ogMatch[1]] = ogMatch[2];
  }

  // Extract headings
  const headings: { level: number; text: string }[] = [];
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let headingMatch;
  while ((headingMatch = headingRegex.exec(html)) !== null) {
    headings.push({
      level: parseInt(headingMatch[1]),
      text: stripTags(headingMatch[2]).trim(),
    });
  }

  // Extract JSON-LD blocks
  const jsonLdBlocks: unknown[] = [];
  const jsonLdRegex =
    /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      jsonLdBlocks.push(JSON.parse(jsonLdMatch[1]));
    } catch {
      // invalid JSON-LD
    }
  }

  // Extract links
  const links: { href: string; text: string; isExternal: boolean }[] = [];
  const linkRegex = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const href = linkMatch[1];
    const text = stripTags(linkMatch[2]).trim();
    const isExternal =
      href.startsWith("http") && !href.includes(new URL(baseUrl).hostname);
    links.push({ href, text, isExternal });
  }

  // Extract images
  const images: { src: string; alt: string }[] = [];
  const imgRegex = /<img\s+[^>]*src="([^"]*)"[^>]*/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const altMatch = imgMatch[0].match(/alt="([^"]*)"/i);
    images.push({
      src: imgMatch[1],
      alt: altMatch ? altMatch[1] : "",
    });
  }

  // Extract text content
  const textContent = stripTags(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
  ).trim();

  const wordCount = textContent.split(/\s+/).filter(Boolean).length;

  return {
    html,
    title,
    metaDescription,
    metaRobots,
    canonical,
    viewport,
    ogTags,
    headings,
    jsonLdBlocks,
    links,
    images,
    textContent,
    wordCount,
  };
}

function extractMeta(html: string, name: string): string {
  const regex = new RegExp(
    `<meta\\s+name="${name}"\\s+content="([^"]*)"[^>]*>`,
    "i"
  );
  const match = html.match(regex);
  if (match) return match[1];
  // Try property variant
  const regex2 = new RegExp(
    `<meta\\s+content="([^"]*)"\\s+name="${name}"[^>]*>`,
    "i"
  );
  const match2 = html.match(regex2);
  return match2 ? match2[1] : "";
}

function extractLink(html: string, rel: string): string {
  const regex = new RegExp(
    `<link\\s+[^>]*rel="${rel}"[^>]*href="([^"]*)"[^>]*>`,
    "i"
  );
  const match = html.match(regex);
  if (match) return match[1];
  const regex2 = new RegExp(
    `<link\\s+[^>]*href="([^"]*)"[^>]*rel="${rel}"[^>]*>`,
    "i"
  );
  const match2 = html.match(regex2);
  return match2 ? match2[1] : "";
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}
