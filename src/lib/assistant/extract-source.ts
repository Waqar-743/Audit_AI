import * as cheerio from "cheerio";
import type { PageSnapshot } from "@/shared/seo/types";

export function extractSource(html: string, url: string, statusCode: number, responseRobots: string): PageSnapshot {
  const $ = cheerio.load(html);
  const clean = (value: string) => value.replace(/\s+/g, " ").trim();
  const meta = (name: string) => $("meta").toArray().filter((element) => ($(element).attr("name") || "").toLowerCase() === name).map((element) => clean($(element).attr("content") || ""));
  const headingNodes = $("h1,h2,h3,h4,h5,h6").toArray();
  const imageNodes = $("img").toArray();
  const linkNodes = $("a[href]").toArray();
  const schemaNodes = $("script[type]").toArray().filter((element) => ($(element).attr("type") || "").toLowerCase() === "application/ld+json");
  const body = $("body").clone();
  body.find("script,style,noscript,template,svg").remove();
  const text = clean(body.text());
  const limitedText = text.slice(0, 200_000);
  const og: Record<string, string> = {};
  $("meta[property]").each((_, element) => {
    const key = ($(element).attr("property") || "").toLowerCase();
    if (key.startsWith("og:")) og[key.slice(3)] = clean($(element).attr("content") || "").slice(0, 2_000);
  });
  let baseUrl = url;
  try { baseUrl = new URL($("base[href]").first().attr("href") || url, url).href; } catch { /* Invalid base URL: fall back to the response URL. */ }
  return {
    url, baseUrl, mode: "source", statusCode, responseRobots,
    titles: $("head title").toArray().slice(0, 20).map((element) => clean($(element).text()).slice(0, 2_000)),
    descriptions: meta("description").slice(0, 20).map((value) => value.slice(0, 2_000)),
    canonicals: $("link[rel]").toArray().filter((element) => ($(element).attr("rel") || "").toLowerCase().split(/\s+/).includes("canonical")).slice(0, 20).map((element) => ($(element).attr("href") || "").slice(0, 2_048)),
    robots: ["robots", "googlebot"].flatMap((agent) => meta(agent).slice(0, 20).map((content) => ({ agent, content: content.slice(0, 2_000) }))),
    language: ($("html").attr("lang") || "").slice(0, 100), viewport: meta("viewport")[0] || "",
    headings: headingNodes.slice(0, 1_000).map((element) => ({ level: Number(element.tagName.slice(1)), text: clean($(element).text()).slice(0, 500) })),
    images: imageNodes.slice(0, 5_000).map((element) => ({ src: ($(element).attr("src") || $(element).attr("srcset") || "(no source)").slice(0, 2_048), alt: $(element).attr("alt") === undefined ? null : clean($(element).attr("alt") || "").slice(0, 1_000) })),
    links: linkNodes.slice(0, 5_000).map((element) => {
      const label = ($(element).attr("aria-labelledby") || "").split(/\s+/).filter(Boolean).map((id) => $("[id]").filter((_, el) => $(el).attr("id") === id).text()).join(" ");
      return { href: ($(element).attr("href") || "").slice(0, 2_048), text: clean($(element).attr("aria-label") || label || $(element).text() || $(element).find("img[alt]").toArray().map((image) => $(image).attr("alt")).join(" ")).slice(0, 500), rel: $(element).attr("rel") || "" };
    }),
    jsonLd: schemaNodes.slice(0, 50).map((element) => $(element).text().slice(0, 200_000)),
    jsonLdTruncated: schemaNodes.length > 50 || schemaNodes.some((element) => $(element).text().length > 200_000),
    hasOtherStructuredData: $("[itemscope],[typeof]").length > 0,
    wordCount: limitedText ? limitedText.split(/\s+/).length : 0, excerpt: limitedText.slice(0, 3_000), og,
    truncated: text.length > 200_000 || headingNodes.length > 1_000 || imageNodes.length > 5_000 || linkNodes.length > 5_000 || schemaNodes.length > 50 || schemaNodes.some((element) => $(element).text().length > 200_000),
  };
}
