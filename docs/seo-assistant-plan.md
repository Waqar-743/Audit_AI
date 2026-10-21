# Free SEO assistant: implementation contract

- Preserve the existing landing layout, scan routes, and reports. Add `/assistant`, small navigation entries, and replace paid-tier messaging with the free companion invitation.
- Ship a completely free, account-free assistant. No email collection, subscription, provider keys, or locked findings.
- Share deterministic audit rules between the website and a Manifest V3 Chrome side panel. Do not require paid AI inference.
- State what was observed, the extraction mode, and what was not tested. A checklist score is not a ranking, indexing, or AI citation prediction.
- Do not treat character-count suggestions, multiple H1s, empty decorative alt text, missing optional schema, or word count as automatic SEO failures.
- The website inspects a bounded public HTML response. The extension inspects the current rendered DOM locally, only after the user's action. Never send browsing content to an external service.
- Keep personal preferences and the latest 20 reports on the user's device, with export and delete controls. Do not store submitted page HTML on the server.
- Keep the existing charcoal, warm-white, and lime palette. Introduce Pip, a parrot guide, with 15 original SVG illustrations about nesting, learning, and flight.
- Commit and push each finished milestone to `codex/free-seo-assistant`; keep the current production branch intact during development.

## Milestones

1. Original illustration family and build/test foundation.
2. Shared evidence-based audit rules and safe account-free website endpoint.
3. Matching local-first Chrome extension, packaging, and installation instructions.
4. Website assistant, minimal landing integration, personalization, and free messaging.
5. Browser verification, regression fixes, and CI checks.

## Rule references

- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/appearance/snippet
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- https://developer.chrome.com/docs/extensions/develop/concepts/activeTab

Each finding links to relevant documentation. Page-level inspection cannot prove actual indexing, rankings, backlinks, Core Web Vitals, site-wide duplication, or structured-data rich-result eligibility.
