import * as cheerio from "cheerio";
import type { CrawlResult } from "./types";

const REQUEST_TIMEOUT_MS = 30_000;
const DYNAMIC_RENDER_NAV_TIMEOUT_MS = 12_000;
const DYNAMIC_RENDER_POST_LOAD_WAIT_MS = 1_200;
const MIN_DYNAMIC_WORD_BOOST = 120;
const MIN_DYNAMIC_RICHNESS_BOOST = 120;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

/**
 * Crawl a URL and extract structured page signals.
 * Throws on blocked or challenge responses so callers can fail the scan cleanly.
 */
export async function crawlUrl(url: string): Promise<CrawlResult> {
  const fullUrl = normalizeInputUrl(url);
  const startTime = Date.now();

  const response = await fetch(fullUrl, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  const html = await response.text();
  const responseTime = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(buildHttpError(response.status, html));
  }

  const staticResult = parseHtml(html, response.url || fullUrl);
  let finalResult = staticResult;
  let renderMode: "static" | "dynamic" = "static";
  const extractionNotes: string[] = [];

  if (isLikelyChallengePage(staticResult.title, staticResult.textContent, html)) {
    throw new Error(
      "Crawler was blocked by anti-bot protection. Try again later or scan a different URL."
    );
  }

  if (shouldAttemptDynamicRender(staticResult, html)) {
    const dynamicHtml = await renderPageWithPlaywright(response.url || fullUrl);
    if (dynamicHtml) {
      const dynamicResult = parseHtml(dynamicHtml, response.url || fullUrl);

      if (
        !isLikelyChallengePage(
          dynamicResult.title,
          dynamicResult.textContent,
          dynamicHtml
        ) &&
        isMeaningfullyRicher(dynamicResult, staticResult)
      ) {
        finalResult = dynamicResult;
        renderMode = "dynamic";
        extractionNotes.push("Dynamic browser render improved content extraction coverage.");
      } else {
        extractionNotes.push(
          "Dynamic render did not provide a richer extraction profile; static parsing retained."
        );
      }
    } else {
      extractionNotes.push(
        "Dynamic render was unavailable in this environment; static parsing retained."
      );
    }
  }

  const extractionQuality = estimateExtractionQuality(finalResult);

  return {
    ...finalResult,
    url: fullUrl,
    finalUrl: response.url || fullUrl,
    hasHttps: (response.url || fullUrl).startsWith("https"),
    responseTime,
    statusCode: response.status,
    renderMode,
    extractionQuality,
    extractionNotes: extractionNotes.length > 0 ? extractionNotes : undefined,
  };
}

function parseHtml(
  html: string,
  baseUrl: string
): Omit<CrawlResult, "url" | "finalUrl" | "hasHttps" | "responseTime" | "statusCode"> {
  const $ = cheerio.load(html);
  const baseHost = safeHostname(baseUrl);

  const title = normalizeText($("title").first().text());
  const metaDescription = extractMeta($, "description");
  const metaRobots = extractMeta($, "robots");
  const canonical = extractCanonical($);
  const viewport = extractMeta($, "viewport");

  const ogTags: Record<string, string> = {};
  $("meta[property]").each((_, el) => {
    const property = (($(el).attr("property") || "").trim().toLowerCase());
    if (!property.startsWith("og:")) {
      return;
    }

    const value = normalizeText($(el).attr("content") || "");
    if (!value) {
      return;
    }

    ogTags[property.slice(3)] = value;
  });

  const headings: { level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = (el.tagName || "").toLowerCase();
    const level = Number.parseInt(tag.slice(1), 10);
    const text = normalizeText($(el).text());

    if (!Number.isFinite(level) || !text) {
      return;
    }

    headings.push({ level, text });
  });

  const jsonLdBlocks: unknown[] = [];
  $("script[type]").each((_, el) => {
    const scriptType = (($(el).attr("type") || "").trim().toLowerCase());
    if (!scriptType.includes("ld+json")) {
      return;
    }

    const raw = normalizeJsonLdSource($(el).html() || "");
    if (!raw) {
      return;
    }

    for (const value of parseJsonLd(raw)) {
      jsonLdBlocks.push(value);
    }
  });

  const links: { href: string; text: string; isExternal: boolean }[] = [];
  $("a[href]").each((_, el) => {
    const href = (($(el).attr("href") || "").trim());
    if (!href) {
      return;
    }

    links.push({
      href,
      text: normalizeText($(el).text()),
      isExternal: isExternalLink(href, baseHost),
    });
  });

  const images: { src: string; alt: string }[] = [];
  $("img[src]").each((_, el) => {
    const src = (($(el).attr("src") || "").trim());
    if (!src) {
      return;
    }

    images.push({
      src,
      alt: normalizeText($(el).attr("alt") || ""),
    });
  });

  const bodyClone = $("body").clone();
  bodyClone.find("script, style, noscript, template, svg").remove();
  const textContent = normalizeText(bodyClone.text());
  const wordCount = textContent ? textContent.split(/\s+/).filter(Boolean).length : 0;

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

function extractMeta($: cheerio.CheerioAPI, key: string): string {
  const target = key.toLowerCase();

  const content = $("meta")
    .toArray()
    .map((el) => {
      const node = $(el);
      const name = (node.attr("name") || "").trim().toLowerCase();
      const property = (node.attr("property") || "").trim().toLowerCase();
      const value = node.attr("content") || "";
      return { name, property, value };
    })
    .find((meta) => meta.name === target || meta.property === target);

  return normalizeText(content?.value || "");
}

function extractCanonical($: cheerio.CheerioAPI): string {
  const canonical = $("link[rel]")
    .toArray()
    .find((el) => {
      const rel = (($(el).attr("rel") || "").toLowerCase());
      return rel.split(/\s+/).includes("canonical");
    });

  return normalizeText(canonical ? $(canonical).attr("href") || "" : "");
}

function parseJsonLd(raw: string): unknown[] {
  const candidates = [
    raw,
    raw.replace(/^<!--|-->$/g, "").trim(),
    raw.replace(/;\s*$/, "").trim(),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [parsed];
    } catch {
      // Try next candidate.
    }
  }

  return [];
}

function shouldAttemptDynamicRender(
  result: Omit<CrawlResult, "url" | "finalUrl" | "hasHttps" | "responseTime" | "statusCode">,
  html: string
): boolean {
  const sparseExtraction =
    result.wordCount < 220 ||
    result.headings.length < 2 ||
    result.links.length < 6 ||
    (!result.metaDescription && !result.canonical);

  if (!sparseExtraction) {
    return false;
  }

  const htmlLower = html.slice(0, 20_000).toLowerCase();
  const jsSignals = [
    "id=\"__next\"",
    "__next_data__",
    "hydrate",
    "reactroot",
    "window.__nuxt__",
    "window.__apollo_state__",
    "webpack",
    "application/json",
  ];

  return jsSignals.some((signal) => htmlLower.includes(signal));
}

function isMeaningfullyRicher(
  dynamicResult: Omit<CrawlResult, "url" | "finalUrl" | "hasHttps" | "responseTime" | "statusCode">,
  staticResult: Omit<CrawlResult, "url" | "finalUrl" | "hasHttps" | "responseTime" | "statusCode">
): boolean {
  const staticRichness = extractionRichnessScore(staticResult);
  const dynamicRichness = extractionRichnessScore(dynamicResult);

  const hasWordBoost =
    dynamicResult.wordCount >= staticResult.wordCount + MIN_DYNAMIC_WORD_BOOST;
  const hasRichnessBoost =
    dynamicRichness >= staticRichness + MIN_DYNAMIC_RICHNESS_BOOST;

  const hasSignalBoost =
    dynamicResult.headings.length >= staticResult.headings.length + 2 ||
    dynamicResult.links.length >= staticResult.links.length + 5 ||
    dynamicResult.jsonLdBlocks.length > staticResult.jsonLdBlocks.length;

  return hasWordBoost || hasRichnessBoost || (hasSignalBoost && dynamicResult.wordCount > 120);
}

function extractionRichnessScore(
  result: Omit<CrawlResult, "url" | "finalUrl" | "hasHttps" | "responseTime" | "statusCode">
): number {
  const wordComponent = Math.min(result.wordCount, 1_000);
  const headingComponent = result.headings.length * 40;
  const linkComponent = result.links.length * 4;
  const schemaComponent = result.jsonLdBlocks.length * 80;
  const ogComponent = Object.keys(result.ogTags).length * 16;
  const metaComponent =
    (result.title ? 50 : 0) +
    (result.metaDescription ? 50 : 0) +
    (result.viewport ? 20 : 0) +
    (result.canonical ? 20 : 0);

  return (
    wordComponent +
    headingComponent +
    linkComponent +
    schemaComponent +
    ogComponent +
    metaComponent
  );
}

function estimateExtractionQuality(
  result: Omit<CrawlResult, "url" | "finalUrl" | "hasHttps" | "responseTime" | "statusCode">
): "low" | "medium" | "high" {
  const richness = extractionRichnessScore(result);
  if (richness >= 850) {
    return "high";
  }
  if (richness >= 360) {
    return "medium";
  }
  return "low";
}

async function renderPageWithPlaywright(url: string): Promise<string | null> {
  try {
    const playwright = await import("playwright");
    const browser = await playwright.chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
    });

    try {
      const context = await browser.newContext({
        userAgent: BROWSER_HEADERS["User-Agent"],
        locale: "en-US",
        viewport: { width: 1366, height: 900 },
      });

      try {
        const page = await context.newPage();
        await page.setExtraHTTPHeaders({
          Accept: BROWSER_HEADERS.Accept,
          "Accept-Language": BROWSER_HEADERS["Accept-Language"],
          "Cache-Control": BROWSER_HEADERS["Cache-Control"],
          Pragma: BROWSER_HEADERS.Pragma,
        });

        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: DYNAMIC_RENDER_NAV_TIMEOUT_MS,
        });

        try {
          await page.waitForLoadState("networkidle", { timeout: 4_000 });
        } catch {
          // Some pages never reach network idle due to analytics polling.
        }

        await page.waitForTimeout(DYNAMIC_RENDER_POST_LOAD_WAIT_MS);
        return await page.content();
      } finally {
        await context.close().catch(() => undefined);
      }
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch {
    return null;
  }
}

function isExternalLink(href: string, baseHost: string): boolean {
  const lowered = href.toLowerCase();
  if (
    lowered.startsWith("#") ||
    lowered.startsWith("/") ||
    lowered.startsWith("mailto:") ||
    lowered.startsWith("tel:") ||
    lowered.startsWith("javascript:")
  ) {
    return false;
  }

  try {
    const parsed = new URL(href, `https://${baseHost}`);
    return !!baseHost && parsed.hostname !== baseHost;
  } catch {
    return false;
  }
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function normalizeInputUrl(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeJsonLdSource(value: string): string {
  return value.replace(/\u0000/g, "").trim();
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function buildHttpError(status: number, html: string): string {
  const lowered = html.slice(0, 5000).toLowerCase();
  const blocked =
    status === 403 ||
    status === 429 ||
    lowered.includes("cf-challenge") ||
    lowered.includes("captcha") ||
    lowered.includes("verify you are human") ||
    lowered.includes("access denied");

  if (blocked) {
    return `Crawler blocked or rate limited (HTTP ${status}).`;
  }

  return `Crawler request failed (HTTP ${status}).`;
}

function isLikelyChallengePage(title: string, textContent: string, html: string): boolean {
  const titleLower = title.toLowerCase();
  const textLower = textContent.slice(0, 2500).toLowerCase();
  const htmlLower = html.slice(0, 5000).toLowerCase();

  const titleSignals = [
    "just a moment",
    "attention required",
    "security check",
    "verify you are human",
  ];
  const bodySignals = [
    "cf-challenge",
    "captcha",
    "hcaptcha",
    "turnstile",
    "checking your browser",
    "enable javascript and cookies",
  ];

  const hasTitleSignal = titleSignals.some((signal) => titleLower.includes(signal));
  const hasBodySignal = bodySignals.some(
    (signal) => htmlLower.includes(signal) || textLower.includes(signal)
  );

  return hasTitleSignal && hasBodySignal;
}
