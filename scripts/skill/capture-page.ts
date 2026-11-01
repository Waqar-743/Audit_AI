import { extractDocument } from "../../src/shared/seo/extract-document";

// Preserve Pip's extraction behavior; refuse to score metadata hidden by its
// per-field limits, which do not all contribute to its general truncated flag.
export function capturePage() {
  const snapshot = extractDocument();
  const bounded = (selector: string, maxItems: number, maxText: number, attribute?: string) => {
    const elements = Array.from(document.querySelectorAll(selector));
    return elements.length > maxItems || elements.some((element) =>
      (attribute ? element.getAttribute(attribute) || "" : element.textContent || "").length > maxText);
  };
  snapshot.truncated ||= [
    bounded("head title", 20, 2_000),
    bounded('meta[name="description" i]', 20, 2_000, "content"),
    bounded('meta[name="robots" i]', 20, 2_000, "content"),
    bounded('meta[name="googlebot" i]', 20, 2_000, "content"),
    bounded('link[rel~="canonical" i]', 20, 2_048, "href"),
    bounded('meta[property^="og:" i]', 40, 2_000, "content"),
    // A value at its cap may have lost data in the shared extractor. Refuse
    // conservatively rather than let a sliced URL/name change a finding.
    snapshot.language.length >= 100,
    snapshot.headings.some((heading) => heading.text.length >= 500),
    snapshot.images.some((image) => image.src.length >= 2_048 || (image.alt?.length || 0) >= 1_000),
    snapshot.links.some((link) => link.href.length >= 2_048 || link.text.length >= 500),
  ].some(Boolean);
  return snapshot;
}
