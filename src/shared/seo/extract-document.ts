import type { PageSnapshot } from "./types";

// Self-contained so chrome.scripting can serialize this function into the active tab.
export function extractDocument(): PageSnapshot {
  const clean = (value: string | null | undefined) =>
    (value || "").replace(/\s+/g, " ").trim();
  const all = (selector: string) =>
    Array.from(document.querySelectorAll(selector));
  const meta = (name: string) =>
    all(`meta[name="${name}" i]`).map((element) =>
      clean(element.getAttribute("content")),
    );
  const headingNodes = all("h1, h2, h3, h4, h5, h6");
  const imageNodes = all("img");
  const linkNodes = all("a[href]");
  const schemaNodes = all('script[type="application/ld+json" i]');
  const text = clean(document.body?.innerText || "");
  const limitedText = text.slice(0, 200_000);
  const og: Record<string, string> = {};
  all('meta[property^="og:" i]')
    .slice(0, 40)
    .forEach((element) => {
      og[(element.getAttribute("property") || "").slice(3).toLowerCase()] =
        clean(element.getAttribute("content")).slice(0, 2_000);
    });
  return {
    url: location.href,
    baseUrl: document.baseURI,
    mode: "rendered",
    titles: all("head title")
      .slice(0, 20)
      .map((element) => clean(element.textContent).slice(0, 2_000)),
    descriptions: meta("description")
      .slice(0, 20)
      .map((value) => value.slice(0, 2_000)),
    canonicals: all('link[rel~="canonical" i]')
      .slice(0, 20)
      .map((element) => clean(element.getAttribute("href")).slice(0, 2_048)),
    robots: ["robots", "googlebot"].flatMap((agent) =>
      meta(agent)
        .slice(0, 20)
        .map((content) => ({ agent, content: content.slice(0, 2_000) })),
    ),
    language: document.documentElement.lang.slice(0, 100),
    viewport: meta("viewport")[0] || "",
    headings: headingNodes.slice(0, 1_000).map((element) => ({
      level: Number(element.tagName.slice(1)),
      text: clean(element.textContent).slice(0, 500),
    })),
    images: imageNodes.slice(0, 5_000).map((element) => ({
      src: (
        element.getAttribute("src") ||
        element.getAttribute("srcset") ||
        "(no source)"
      ).slice(0, 2_048),
      alt: element.hasAttribute("alt")
        ? clean(element.getAttribute("alt")).slice(0, 1_000)
        : null,
    })),
    links: linkNodes.slice(0, 5_000).map((element) => {
      const labelledBy = (element.getAttribute("aria-labelledby") || "")
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent || "")
        .join(" ");
      const text =
        clean(element.getAttribute("aria-label")) ||
        clean(labelledBy) ||
        clean((element as HTMLElement).innerText) ||
        Array.from(element.querySelectorAll("img[alt]"))
          .map((image) => image.getAttribute("alt"))
          .join(" ");
      return {
        href: (element.getAttribute("href") || "").slice(0, 2_048),
        text: clean(text).slice(0, 500),
        rel: element.getAttribute("rel") || "",
      };
    }),
    jsonLd: schemaNodes
      .slice(0, 50)
      .map((element) => (element.textContent || "").slice(0, 200_000)),
    jsonLdTruncated:
      schemaNodes.length > 50 ||
      schemaNodes.some(
        (element) => (element.textContent || "").length > 200_000,
      ),
    hasOtherStructuredData: !!document.querySelector("[itemscope], [typeof]"),
    wordCount: limitedText ? limitedText.split(/\s+/).length : 0,
    excerpt: limitedText.slice(0, 3_000),
    og,
    truncated:
      text.length > 200_000 ||
      headingNodes.length > 1_000 ||
      imageNodes.length > 5_000 ||
      linkNodes.length > 5_000 ||
      schemaNodes.length > 50 ||
      schemaNodes.some(
        (element) => (element.textContent || "").length > 200_000,
      ),
  };
}
