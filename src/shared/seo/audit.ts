import type { PageSnapshot, SeoCheck, SeoReport, CheckStatus } from "./types";

const docs = "https://developers.google.com/search/docs/";
const references = {
  discovery: `${docs}crawling-indexing/robots-meta-tag`,
  canonical: `${docs}crawling-indexing/consolidate-duplicate-urls`,
  title: `${docs}appearance/title-link`,
  description: `${docs}appearance/snippet`,
  content: `${docs}fundamentals/creating-helpful-content`,
  images: `${docs}appearance/google-images`,
  links: `${docs}crawling-indexing/links-crawlable`,
  schema: `${docs}appearance/structured-data/intro-structured-data`,
};

// Preserve agent scoping across comma-separated X-Robots-Tag directives.
// Other crawlers' instructions must not be attributed to Googlebot.
export function googleHeaderDirectives(value: string): string {
  let agent = "*";
  const relevant: string[] = [];
  const valued = new Set(["max-snippet", "max-image-preview", "max-video-preview", "unavailable_after"]);
  for (const segment of value.toLowerCase().split(",")) {
    const part = segment.trim();
    const match = part.match(/^([\w*-]+):\s*(.*)$/);
    if (match && !valued.has(match[1])) {
      agent = match[1];
      if (agent === "*" || agent === "googlebot") relevant.push(match[2]);
    } else if (agent === "*" || agent === "googlebot") relevant.push(part);
  }
  return relevant.join(", ");
}

function tokens(value: string): string[] {
  return value.toLowerCase().split(/[\s,;]+/).filter(Boolean);
}

function schemaTypes(value: unknown, depth = 0): string[] {
  if (depth > 16 || !value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((entry) => schemaTypes(entry, depth + 1));
  const node = value as Record<string, unknown>;
  const current = typeof node["@type"] === "string" ? [node["@type"]] : Array.isArray(node["@type"]) ? node["@type"].filter((type): type is string => typeof type === "string") : [];
  return [...current, ...Object.entries(node).filter(([key]) => key !== "@context" && key !== "@type").flatMap(([, child]) => schemaTypes(child, depth + 1))];
}

export function auditPage(page: PageSnapshot): SeoReport {
  const checks: SeoCheck[] = [];
  const add = (check: SeoCheck) => checks.push(check);
  const title = page.titles[0]?.trim() || "";
  const description = page.descriptions[0]?.trim() || "";
  const current = new URL(page.url);
  const noindex = (value: string) => tokens(value).some((token) => token === "noindex" || token === "none");
  const robots = page.robots.filter((meta) => /^(robots|googlebot)$/i.test(meta.agent));
  const blockedMeta = robots.filter((meta) => noindex(meta.content));
  const headerBlock = page.responseRobots !== undefined && noindex(googleHeaderDirectives(page.responseRobots));

  add({ id: "http-status", category: "Discovery", status: page.statusCode === undefined ? "unknown" : page.statusCode >= 200 && page.statusCode < 300 ? "pass" : "fail", priority: "high", title: "Page response", evidence: page.statusCode === undefined ? "A rendered DOM snapshot does not include the original response status." : `Final response: HTTP ${page.statusCode}.`, advice: "Public pages intended for search should return a successful response. A successful response alone does not prove indexing.", reference: `${docs}crawling-indexing/http-network-errors` });
  add({ id: "meta-indexability", category: "Discovery", status: blockedMeta.length ? "fail" : "pass", priority: "high", title: "Page indexing instructions", evidence: blockedMeta.length ? blockedMeta.map((meta) => `${meta.agent}: ${meta.content}`).join("; ") : "No noindex or none directive found in robots/Googlebot meta tags.", advice: "Keep noindex on private or intentionally excluded pages. Remove it only if this page should appear in search. This check cannot confirm actual indexing.", reference: references.discovery, selector: 'meta[name="robots" i], meta[name="googlebot" i]' });
  add({ id: "header-indexability", category: "Discovery", status: page.responseRobots === undefined ? "unknown" : headerBlock ? "fail" : "pass", priority: "high", title: "HTTP indexing instructions", evidence: page.responseRobots === undefined ? "X-Robots-Tag headers were not observed in this browser-only audit." : page.responseRobots || "No X-Robots-Tag header in the fetched response.", advice: "A noindex HTTP header can exclude a page even when its HTML permits indexing. Confirm exclusions are intentional.", reference: references.discovery });
  add({ id: "https", category: "Discovery", status: current.protocol === "https:" ? "pass" : "review", priority: "medium", title: "Secure page address", evidence: `${current.protocol} page address.`, advice: "Use HTTPS for public pages and redirect their HTTP versions. A local development URL may intentionally use HTTP.", reference: `${docs}crawling-indexing/https` });

  let canonical = "";
  let canonicalValid = true;
  const suppliedCanonical = page.canonicals[0]?.trim() || "";
  if (suppliedCanonical) {
    try { const parsed = new URL(suppliedCanonical, page.baseUrl || page.url); canonical = parsed.href; canonicalValid = /^(https?:)$/.test(parsed.protocol); } catch { canonicalValid = false; }
  }
  add({ id: "canonical", category: "Discovery", status: page.canonicals.length > 1 || !canonicalValid || (page.canonicals.length === 1 && !suppliedCanonical) ? "fail" : canonical ? "pass" : "review", priority: "medium", title: "Canonical declaration", evidence: `${page.canonicals.length} HTML canonical declaration(s). ${canonical || (suppliedCanonical ? "Invalid URL." : "No canonical URL supplied.")}`, advice: "Use one valid preferred URL when declaring an HTML canonical. A canonical is a hint; its absence is not an automatic indexing failure. HTTP Link canonicals are outside this check.", reference: references.canonical, selector: 'link[rel~="canonical" i]' });
  if (canonical && canonicalValid) {
    const preferred = new URL(canonical);
    const normalized = (url: URL) => `${url.origin}${url.pathname.replace(/\/$/, "")}${url.search}`;
    add({ id: "canonical-target", category: "Discovery", status: normalized(preferred) === normalized(current) ? "pass" : "review", priority: "medium", title: "Preferred page target", evidence: `This page: ${page.url}\nCanonical: ${canonical}`, advice: "An alternative canonical may intentionally consolidate duplicates. Verify the preferred page is correct and accessible; this audit has not fetched that target.", reference: references.canonical });
  }

  add({ id: "title", category: "Search appearance", status: title && page.titles.length === 1 ? "pass" : "fail", priority: "high", title: "Page title", evidence: `${page.titles.length} title element(s). ${title || "No nonempty title found."}`, advice: "Provide one descriptive title that distinguishes this page. Avoid repeating boilerplate or stuffing keywords.", reference: references.title, selector: "title" });
  if (title) add({ id: "title-length", category: "Search appearance", status: title.length > 65 || title.length < 15 ? "review" : "pass", priority: "low", title: "Title length guidance", evidence: `${title.length} characters. This is an editorial heuristic, not a Google character limit.`, advice: "Check that the title is useful and concise. Search display depends on available width, language, and Google's title selection.", reference: references.title });
  add({ id: "description", category: "Search appearance", status: description ? page.descriptions.length > 1 ? "review" : "pass" : "review", priority: "medium", title: "Search description", evidence: `${page.descriptions.length} description tag(s). ${description || "No nonempty meta description found; search engines may generate a snippet from page content."}`, advice: "Write a useful page-specific summary. Google may show a different snippet. Missing descriptions are an opportunity, not proof of a ranking problem.", reference: references.description, selector: 'meta[name="description" i]' });
  if (description) add({ id: "description-length", category: "Search appearance", status: description.length < 50 || description.length > 170 ? "review" : "pass", priority: "low", title: "Description length guidance", evidence: `${description.length} characters. Search engines do not specify a fixed meta-description limit.`, advice: "Keep the important information early. Review snippet appearance on different screen sizes rather than chasing a strict count.", reference: references.description });
  add({ id: "social-preview", category: "Search appearance", status: page.og.title && page.og.description && page.og.image ? "pass" : "review", priority: "low", title: "Social sharing preview", evidence: ["title", "description", "image"].map((key) => `og:${key}: ${page.og[key] ? "present" : "missing"}`).join("; "), advice: "Add Open Graph metadata if this page will be shared. These tags are for sharing previews, not a Google ranking requirement.", reference: "https://ogp.me/" });

  const h1s = page.headings.filter((heading) => heading.level === 1 && heading.text);
  add({ id: "main-heading", category: "Content", status: h1s.length === 1 ? "pass" : "review", priority: "medium", title: "Clear main heading", evidence: `${h1s.length} nonempty H1 heading(s). ${h1s.map((h) => h.text).join(" / ")}`, advice: "Make the page's main topic clear. Multiple H1s can be valid; review the hierarchy in context rather than treating their count as a ranking penalty.", reference: references.title, selector: "h1" });
  const skipped = page.headings.some((heading, index) => index > 0 && heading.level > page.headings[index - 1].level + 1);
  add({ id: "heading-hierarchy", category: "Content", status: skipped ? "review" : page.headings.length ? "pass" : "review", priority: "low", title: "Heading structure", evidence: page.headings.length ? page.headings.slice(0, 24).map((heading) => `H${heading.level}: ${heading.text || "(empty)"}`).join("\n") : "No headings were found in this snapshot.", advice: "Use headings to describe sections and a logical hierarchy for readers and assistive technology. A skipped level is a manual review, not an automatic SEO failure.", reference: "https://www.w3.org/WAI/tutorials/page-structure/headings/", selector: "h1, h2, h3, h4, h5, h6" });
  add({ id: "page-text", category: "Content", status: page.wordCount === 0 ? "review" : "pass", priority: "medium", title: "Readable page text", evidence: `Approximately ${page.wordCount} whitespace-delimited words in ${page.mode === "source" ? "the HTML response" : "the rendered document"}. This count is not a quality score and may undercount languages without spaces.`, advice: "Answer the visitor's task clearly. There is no universal SEO word-count target. Short useful pages can perform well.", reference: references.content });
  add({ id: "language", category: "Content", status: page.language ? "pass" : "review", priority: "low", title: "Document language", evidence: page.language ? `html lang="${page.language}". Declaration observed; language-code validity was not tested.` : "No document language declaration found.", advice: "Declare the page's main language to help assistive technology. Google also uses visible content to determine language.", reference: "https://www.w3.org/WAI/tutorials/page-structure/content/", selector: "html" });
  add({ id: "viewport", category: "Content", status: /width\s*=\s*device-width/i.test(page.viewport) ? "pass" : "review", priority: "medium", title: "Mobile viewport", evidence: page.viewport || "No viewport declaration found.", advice: "Set a responsive viewport and test the actual mobile layout. This declaration alone does not prove mobile usability.", reference: "https://web.dev/articles/responsive-web-design-basics", selector: 'meta[name="viewport" i]' });

  const missingAlt = page.images.filter((image) => image.alt === null);
  const decorative = page.images.filter((image) => image.alt === "");
  add({ id: "image-alt", category: "Images & links", status: !page.images.length ? "unknown" : missingAlt.length ? "fail" : "pass", priority: "medium", title: "Image text alternatives", evidence: `${page.images.length} images; ${missingAlt.length} omit alt; ${decorative.length} declare empty alt (potentially decorative).${missingAlt.length ? ` Examples: ${missingAlt.slice(0, 3).map((image) => image.src).join(", ")}` : ""}`, advice: "Give informative images meaningful alt text. Keep alt=\"\" on decorative images; verify that choice in context. This check covers img elements, not CSS backgrounds or every SVG.", reference: "https://www.w3.org/WAI/tutorials/images/", selector: "img:not([alt])" });
  const crawlable = page.links.filter((link) => { try { return /^(https?:)$/.test(new URL(link.href, page.baseUrl || page.url).protocol) && !!link.href.trim() && !link.href.startsWith("#"); } catch { return false; } });
  const unnamed = crawlable.filter((link) => !link.text.trim());
  const generic = crawlable.filter((link) => /^(click here|here|read more|learn more)$/i.test(link.text.trim()));
  add({ id: "link-names", category: "Images & links", status: !crawlable.length ? "unknown" : unnamed.length ? "fail" : "pass", priority: "medium", title: "Descriptive link names", evidence: `${crawlable.length} HTTP(S) links; ${unnamed.length} have no detected text, aria-label, or linked-image alt.`, advice: "Describe a link's destination. Automated extraction may miss names provided by aria-labelledby or unusual controls, so verify highlighted links manually.", reference: references.links, selector: "a[href]" });
  if (generic.length) add({ id: "generic-links", category: "Images & links", status: "review", priority: "low", title: "Link text in context", evidence: `${generic.length} link(s) use generic text such as “${generic[0].text}”.`, advice: "Check whether surrounding context makes the destination clear. Use descriptive text where it helps readers.", reference: references.links, selector: "a[href]" });

  let invalid = 0;
  const types: string[] = [];
  for (const raw of page.jsonLd) {
    try { types.push(...schemaTypes(JSON.parse(raw))); } catch { invalid += 1; }
  }
  add({ id: "schema-json", category: "Structured data", status: page.jsonLdTruncated ? "unknown" : page.jsonLd.length ? invalid ? "fail" : "pass" : "unknown", priority: "medium", title: "JSON-LD syntax", evidence: page.jsonLdTruncated ? "Structured data exceeded the extraction limit. Syntax cannot be judged from a partial block." : `${page.jsonLd.length} JSON-LD block(s), ${invalid} JSON parsing error(s).`, advice: "Fix invalid JSON before testing structured data. Valid JSON alone does not establish Schema.org validity or rich-result eligibility.", reference: references.schema, selector: 'script[type="application/ld+json" i]' });
  add({ id: "schema-types", category: "Structured data", status: types.length ? "pass" : "review", priority: "low", title: "Structured data opportunities", evidence: types.length ? `Detected @type values: ${[...new Set(types)].slice(0, 20).join(", ")}. Type names were observed, not validated.` : page.hasOtherStructuredData ? "Microdata or RDFa attributes detected; they were not validated." : "No JSON-LD @type detected. Structured data is optional for many pages.", advice: "Use only markup that accurately describes visible content. Validate supported rich-result types with Google's Rich Results Test. Do not add FAQ, author, or review markup unless it applies.", reference: "https://search.google.com/test/rich-results" });
  add({ id: "link-health", category: "Images & links", status: "unknown", priority: "medium", title: "Destination response checks", evidence: "Linked pages and image URLs were not fetched.", advice: "Use a site crawler to verify broken links and redirects across the website. Link presence is not proof a destination works.", reference: references.links });
  add({ id: "robots-file", category: "Discovery", status: "unknown", priority: "high", title: "robots.txt crawl access", evidence: "robots.txt rules and crawler-specific access were not evaluated.", advice: "Check the rules for the intended search crawler and exact URL. Crawl access and indexability are separate.", reference: `${docs}crawling-indexing/robots/intro` });
  add({ id: "field-performance", category: "Content", status: "unknown", priority: "medium", title: "Core Web Vitals", evidence: "No representative field-performance data was collected.", advice: "Use PageSpeed Insights or Search Console for lab and field measurements. A DOM snapshot cannot supply real Core Web Vitals.", reference: "https://pagespeed.web.dev/" });

  const counts: Record<CheckStatus, number> = { pass: 0, fail: 0, review: 0, unknown: 0 };
  checks.forEach((check) => counts[check.status]++);
  const measured = counts.pass + counts.fail;
  const score = measured ? Math.round(100 * counts.pass / measured) : null;
  const stage = counts.fail > 2 ? "nest" : counts.fail > 0 || counts.review > 4 ? "fledgling" : "flight";
  return {
    version: 1, id: crypto.randomUUID(), url: page.url, title: title || current.hostname,
    timestamp: new Date().toISOString(), mode: page.mode, score, counts, stage, checks,
    metrics: { words: page.wordCount, headings: page.headings.length, images: page.images.length, links: page.links.length, schemaBlocks: page.jsonLd.length },
    preview: { title, description, canonical },
    limitations: [
      page.mode === "source" ? "Website audit: initial HTML only. JavaScript was not executed; use the extension to inspect the rendered page." : "Extension audit: current rendered document only. Content depends on the current session, viewport, and interactions.",
      "The checklist score is the percentage of passed pass/fail checks. Manual reviews and unknown checks are excluded; scores across extraction modes may differ.",
      "No ranking, actual indexing, AI citation visibility, backlinks, site-wide duplicate content, or rich-result eligibility was measured.",
      ...(page.truncated ? ["Extraction limits were reached. Counts and checks cover a partial snapshot; inspect the full page manually."] : []),
    ],
  };
}
