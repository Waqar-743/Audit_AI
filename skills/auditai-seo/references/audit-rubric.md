# Page audit rubric

Use the site's actual purpose, language, and intended audience. Findings describe
what was measured, not predicted search performance. A missing or inaccessible
field is unknown unless its absence was established by a complete extraction.

## Discovery

- **http-status:** assess only the observed final document response. A successful
  response does not establish indexing. A rendered snapshot without recorded
  navigation response data has unknown status.
- **meta-indexability / header-indexability:** inspect all `robots` and
  `googlebot` meta tags, plus observed `X-Robots-Tag` headers. Recognize `none`
  and `noindex`; preserve restrictive instructions. Do not attribute a
  `bingbot: noindex` header to Googlebot. Directives such as `max-snippet:50`
  have values, not crawler names. Preserve agent scope across comma-separated
  header segments. Keep exclusions on private, staging, or deliberately omitted
  pages. Noindex controls search visibility, not access; private content still
  needs appropriate access controls. Do not call a page indexed because no
  noindex was found.
- **https:** HTTP deserves contextual review, especially on local development
  pages. HTTPS presence alone does not establish site security.
- **canonical / canonical-target:** resolve relative declarations using the
  document's effective base URL. Non-HTTP(S), empty, or conflicting targets are
  defects; repeated identical declarations need cleanup review. Missing
  canonicals and alternate canonical targets require context, not automatic
  failure. Ignore fragments when comparing; preserve trailing slashes and query
  strings. Do not silently point every page at the homepage. Target
  accessibility and search engine canonical selection require separate evidence.
- **robots-file:** crawl access and indexing are different. Mark robots.txt
  unknown unless the exact file, crawler, and target path were evaluated.

References: [robots and HTTP directives](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag),
[HTTP responses](https://developers.google.com/search/docs/crawling-indexing/http-network-errors),
[canonicals](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls),
[robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

## Search appearance

- **title:** one nonempty descriptive title; distinguish the page accurately.
  Duplicate/missing title elements are observed defects, not a quantified
  ranking loss. Judge the text against the page's actual intent.
- **title-length / description-length:** length is editorial guidance. Pip uses
  15–65 and 50–170 characters as review heuristics, respectively. They are not
  Google limits, and language and display width matter. Do not pad useful copy
  merely to reach a count.
- **description:** an absent description is an opportunity for review. Search
  engines may generate snippets from content. Avoid promises of exact rendering.
- **social-preview:** Open Graph title, description, and image help sharing;
  they are not a universal Google ranking requirement.

References: [titles](https://developers.google.com/search/docs/appearance/title-link),
[snippets](https://developers.google.com/search/docs/appearance/snippet),
[Open Graph](https://ogp.me/).

## Content and presentation

- **main-heading / heading-hierarchy:** assess whether visitors can identify the
  page topic and follow sections. Multiple H1s or skipped levels require review,
  not an automatic ranking penalty.
- **page-text:** check whether content answers the visitor's task. There is no
  universal word-count target. Whitespace word counts are approximate and
  unsuitable as quality scores, especially for languages without spaces.
- **language:** an observed `html lang` declaration helps accessibility; its
  presence does not establish validity or translation quality.
- **viewport:** a responsive viewport declaration is a useful signal. Check the
  actual layout separately before claiming mobile usability.
- **field-performance:** leave Core Web Vitals unknown without appropriate
  measurements. A lab test is not representative field data; identify the
  device, tool, date, and whether data is URL-level or origin-level.

References: [helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content),
[headings](https://www.w3.org/WAI/tutorials/page-structure/headings/),
[language](https://www.w3.org/WAI/tutorials/page-structure/content/),
[responsive design](https://web.dev/articles/responsive-web-design-basics),
[PageSpeed Insights](https://pagespeed.web.dev/).

## Images and links

- **image-alt:** distinguish a missing `alt` attribute from `alt=""`. Informative
  images need meaningful alternatives; decorative images can intentionally have
  empty alt. Automated extraction cannot decide an image's purpose. No images
  means this check is unknown, not an invented failure.
- **link-names:** inspect HTTP(S) anchors and their accessible labels, referenced
  labels, visible text, and linked-image alt. Empty labels must fall back to
  usable text. A full accessible-name calculation may require browser tooling.
- **generic-links:** phrases such as “read more” require contextual review.
- **link-health:** a link's presence does not prove its destination works. Keep
  destination responses unknown unless actually tested with bounded requests.

References: [image alternatives](https://www.w3.org/WAI/tutorials/images/),
[crawlable links and anchor text](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

## Structured data

- **schema-json:** parse JSON-LD, including arrays and nested graphs. Malformed
  JSON is a defect only when the complete block was observed. A truncated block
  is unknown, not malformed. Never execute it as JavaScript.
- **schema-types:** observed `@type` values do not validate the vocabulary,
  required properties, factual accuracy, or rich-result eligibility. Missing
  optional schema requires review; do not demand one universal schema type.
- Mark microdata/RDFa as detected, not validated, unless appropriate tooling
  checked them. Any drafted schema must match visible, verified content.

References: [structured-data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data),
[Rich Results Test](https://search.google.com/test/rich-results).

## Interpretation and limits

For automated reports use the helper's statuses and evidence unchanged; explain
intent separately. For example, an intentional noindex remains a measured
restriction, with “keep this exclusion” as the recommendation. Do not manipulate
counts to make a score look better.

Backlinks, rankings, traffic, AI citations, actual indexing, site-wide duplicate
content, real-user performance, and business outcomes cannot be inferred from
a page snapshot. Use separately authorized, relevant sources for those tasks.
