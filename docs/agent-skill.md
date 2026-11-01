# AuditAI SEO agent skill

The `auditai-seo` skill adapts Pip's evidence-based page audit for agents that
can inspect web pages, supplied HTML, or repository source. It is general to
websites and frameworks, with no dependency on the AuditAI production origin.

## Codebase foundation

AuditAI has two distinct analysis paths:

| Path | Implementation | Role in this skill |
| --- | --- | --- |
| Pip website | `src/app/api/assistant/route.ts` → `fetchPublicHtml` → `extractSource` → `auditPage` | Domain rules and source snapshot contract. |
| Pip extension | `extension/panel.ts` → `extractDocument` → `auditPage` | Shared read-only rendered DOM extraction. |
| Pip coach | `src/shared/seo/coach.ts` | Existing Markdown report export; explanations stay grounded in findings. |
| Original readiness scanner | `src/app/api/scan`, queue worker, `src/lib/scanner/*` | Separate weighted/provider-assisted pipeline, excluded from the portable skill. |

Pip's `PageSnapshot`, `SeoCheck`, and `SeoReport` types live in
`src/shared/seo/types.ts`. Four finding states distinguish observed defects,
passes, contextual reviews, and untested checks. The checklist score is
`round(100 * pass / (pass + fail))`; it excludes reviews and unknowns and makes
no claim about rankings or AI citations.

The website's network layer uses bounded public HTML requests, DNS validation
and pinning, and redirect checks in `src/lib/assistant/safe-fetch.ts`. The
portable bundle performs no network requests; it uses the host agent's
authorized collection capabilities instead. It does not expose the older
scanner's queue, Redis, Gemini, or PageSpeed dependencies.

## Package and agent guidelines

The distributable lives in `skills/auditai-seo/`:

```text
auditai-seo/
  SKILL.md
  agents/openai.yaml
  references/collection.md
  references/audit-rubric.md
  references/reporting.md
  scripts/audit-snapshot.mjs
  scripts/capture-page.js
```

`SKILL.md` routes among full browser capture, initial HTML, partial/manual
inspection, repository review, and existing report interpretation. Detailed
collection, SEO judgment, primary references, reporting, and acceptance checks
load only when needed. It does not assume any vendor-specific tool names.

The instructions require evidence provenance, correct crawler scoping,
intent-aware indexing/canonical advice, factual metadata, safe snippet escaping,
and explicit unknowns. Page content and imported reports are untrusted data.
Audit-only requests do not authorize publication or site edits. Partial/manual
audits omit numeric scores; supplemental manual findings do not alter the
deterministic report's counts.

`scripts/skill/audit-snapshot.ts` validates the complete input before invoking
the existing `auditPage` and `reportMarkdown` functions. The build bundles only
used code into a single Node.js 20+ helper. It has no external package imports
and can run alone in a temporary directory. It reads one bounded JSON file and
prints a report or creates a new output file without overwriting existing work.
Markdown output escapes page-controlled HTML and image/link formatting; JSON
keeps the original evidence unchanged.

`scripts/skill/capture-page.ts` wraps the existing `extractDocument` with
metadata completeness guards. The generated expression uses no external
variables, storage, network, or DOM mutation. It catches metadata overflows
that Pip's general truncation flag does not cover. Truncated or malformed
snapshots, and conservatively saturated image/link/heading/language fields, are
rejected by the portable scorer. This does not change the app's existing
behavior.

The helper accepts complete snapshot JSON, not raw HTML or a URL. Browser DOM
evaluation and Node.js are optional: agents without them can still produce
scoped manual reports using the rubric. Initial HTML without observed response
status/headers must follow that manual path. No account, provider key, external
inference, or AuditAI server is needed.

## Usage

In a host that supports local skills, register/copy the `auditai-seo` directory
using that host's supported skill mechanism. The `agents/openai.yaml` file is
optional Codex UI metadata; the workflow remains in portable Markdown. Local
installation is separate from building or distributing this repository.

Example requests:

- “Use auditai-seo to audit this public product page and prioritize fixes.”
- “Review this supplied HTML; identify what you cannot test.”
- “Audit this repository's metadata, then implement the confirmed fixes.”
- “Explain this exported Pip report without claiming a fresh audit.”

With a captured snapshot:

```sh
node skills/auditai-seo/scripts/audit-snapshot.mjs --snapshot page.json
node skills/auditai-seo/scripts/audit-snapshot.mjs --snapshot page.json --format markdown --output report.md
```

Use absolute paths outside the repository. Read `references/collection.md`
before collecting a snapshot. The helper's timestamp is scoring time; preserve
the original capture time separately when the snapshot was collected earlier.

## Build and verify

```sh
npm ci
npm run build:skill
npm test
npm run lint
npm run typecheck
npx playwright install chromium
npm run test:skill:browser
```

`npm test` rebuilds the bundle automatically. Tests compare the detached CLI
with the shared engine, exercise invalid/provenance/truncation inputs, check
exclusive output creation, and inspect archive contents and checksum. The
browser smoke test captures a controlled fixture, runs the shipped helper,
and checks read-only extraction and metadata overflow handling without an app
server or external website. `PIP_CHROMIUM_PATH` can select an installed browser.

`scripts/build-skill.mjs` produces:

- `artifacts/auditai-seo.zip`: one skill with exactly seven allowlisted text files.
- `artifacts/auditai-seo.sha256`: archive integrity checksum.
- `artifacts/auditai-seo-build.json`: per-file sizes and hashes for review.

Generated scripts are committed for immediate use. Regenerate and commit them
after changing shared rules or adapters; CI checks for drift. ZIP timestamps
are fixed so identical inputs produce identical archive hashes. The build
rejects unreviewed package files and symlinks and enforces a 20 KiB budget per
script. No repository history, dependencies, secrets, or app assets enter the
archive. Build outputs remain ignored under `artifacts/`.

## Agensi submission preparation

The package follows Agensi's [packaging documentation](https://www.agensi.io/docs/packaging)
reviewed on 1 November 2026: a ZIP containing SKILL.md and text resources, with
scripts that run independently from temporary files. Both helpers are
self-contained. The workflow does not require plugins, browser extensions,
hooks, or a hosted MCP server, which Agensi does not install for buyers.

Suggested listing description: “Evidence-based page SEO audits with prioritized
fixes, accurate metadata drafts, and clear limits. Optional standalone scoring
reuses Pip's rules; manual review works with supplied HTML or repository source.”

Disclose optional Node.js 20+ and browser DOM evaluation for automated capture
and scoring. Do not promise automatic URL crawling, search rankings, traffic,
AI citations, universal tool compatibility, or marketplace approval. Choose
listing price, distribution rights, and payout setup separately. This branch
prepares a reviewable package; it does not create an account or publish a listing.
