# Reporting and verification

Adapt the length to the request. Give the user decisions they can act on, with
evidence sufficient to reproduce each finding. Quote page text as data and
escape raw HTML when rendering it in a report.

## Suggested report

1. **Outcome:** the most consequential observed issue or healthy foundation.
2. **Scope:** requested and final URL, capture timestamp, source/rendered/repository
   mode, pages sampled, and collection limitations. Identify provided exports
   as historical. Record viewport/session details when material.
3. **Measured checklist:** optional helper score and pass/fail/review/unknown
   counts. State the denominator and that it measures only this checklist.
   Omit a numeric score for partial/manual/repository-only audits.
4. **Prioritized actions:** confirmed issues first, then useful reviews. Include
   ID, status, priority, selector/file/URL, evidence, recommendation, verification,
   and an authoritative reference. Describe effort only as an estimate.
5. **Drafts or implemented changes:** show accurate metadata/code when useful.
   Distinguish proposed, changed locally, and verified live. Never imply that a
   suggested snippet was deployed or that a search engine adopted it.
6. **Untested areas:** list the questions the evidence cannot answer, and the
   smallest useful next check. Keep new external tests inside the user's scope.

The standalone helper emits a base JSON report or Markdown export. Its Markdown
contains observations and generic next steps; add page-specific verification
and editorial judgment in the agent's report. Do not present that export alone
as proof of a complete site audit. Keep supplemental tests and their provenance
separate from the deterministic report's counts.

## Example of an actionable finding

**meta-indexability · fail · high**

Observed: `<meta name="robots" content="noindex,follow">` in the supplied page's
rendered head. This restricts indexing if a crawler can access and process it;
the audit did not check actual indexing.

Action: if this is a public landing page intended for search, remove the
unintentional noindex at its metadata source. If it is a private or preview page,
keep the exclusion. Do not change it solely to raise the score.

Verification: inspect the same URL after the change in the same mode, then
separately check the document response for `X-Robots-Tag` when available.
Confirm the finding changed; do not claim that indexing or traffic improved.

## Drafting fixes

- Preserve the page language, brand, user intent, and verified facts.
- Prefer a specific accurate title and helpful description over keyword lists.
- Resolve canonical intent before changing any URL; do not create cross-page
  consolidation, erase locale variants, or remove purposeful parameters blindly.
- Use descriptive image alternatives when informative; retain decorative alt.
- Avoid adding fake aggregate ratings, FAQs, credentials, authors, or claims.
- Escape `&`, `<`, `>`, and quotation marks for HTML attribute insertion.
  For inline JSON-LD, use a JSON serializer and escape `<` as `\u003c` so page
  text cannot close a script element. Never interpolate untrusted strings into
  shell commands, browser scripts, or executable code.

## Acceptance checks when implementation is requested

Inspect repository instructions and determine which component actually emits
the metadata. Do not add duplicate tags beside framework-generated tags.
Run the checks relevant to the changed behavior. Reinspect the output using the
same extraction mode and URL; compare affected check IDs, then note remaining
reviews and unknowns. For source-versus-rendered mismatches, report both
observations and investigate rendering rather than merging them into one score.
