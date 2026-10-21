<p align="center">
  <img src="https://raw.githubusercontent.com/Waqar-743/Audit_AI/pip-v1.0.0/public/birds/parrot.svg" width="160" height="134" alt="Pip, the lime-green parrot SEO companion">
</p>
<h2 align="center">Meet Pip. Give your page wings.</h2>
<p align="center">
  A small, free SEO companion for careful audits and useful next steps.<br>
  No signup. No payment. No API keys. Your extension audits stay on your device.
</p>

## Download

- [Chrome extension ZIP](https://github.com/Waqar-743/Audit_AI/releases/download/pip-v1.0.0/auditai-pip.zip) — the complete, ready-to-load extension.
- [Pip parrot SVG](https://github.com/Waqar-743/Audit_AI/releases/download/pip-v1.0.0/parrot.svg) — the original scalable companion illustration.
- [SHA-256 checksums](https://github.com/Waqar-743/Audit_AI/releases/download/pip-v1.0.0/SHA256SUMS.txt) — checksums for both downloadable files.

Use **auditai-pip.zip** for installation. GitHub's automatically generated “Source code” archives contain the project source and are not the installable extension.

## Give Pip a home in Chrome

1. Download and extract `auditai-pip.zip` into a permanent folder.
2. Open `chrome://extensions` in **Chrome 120 or later**.
3. Turn on **Developer mode**, click **Load unpacked**, and select the extracted folder containing `manifest.json`.
4. Pin **AuditAI · Pip SEO assistant** to your toolbar.
5. Open a webpage, click Pip's toolbar icon, and select **Audit this page**.

Keep the extracted folder on your computer. After changing to another website, click the toolbar icon again to grant access to that page. This release is installed manually; it is not a Chrome Web Store publication.

## From first egg to stronger wings

- **Look closely:** audit the rendered page's titles, descriptions, canonicals, indexing meta tags, headings, image alternatives, link names, and JSON-LD syntax. Findings include evidence, priorities, and documentation.
- **Make a useful change:** draft a title or description, preview it, and copy safely escaped metadata or a generic WebPage JSON-LD draft. Pip never publishes changes to your site.
- **Keep the lesson:** save the latest 20 reports in this browser, export JSON or Markdown, and delete local data whenever you want.
- **Make it yours:** choose from 15 original bird illustrations and add an optional name and work goal. Nest, hatchling, and flight scenes guide the journey.
- **Ask about the evidence:** Pip's local rule-based coach retrieves findings from the current report without calling an AI service.

The extension uses the existing AuditAI charcoal, warm-white, and lime palette. It requests only `activeTab`, `scripting`, `storage`, and `sidePanel`; there are no all-sites host permissions or extension network requests.

## What the audit means

Confirmed findings, manual reviews, and untested areas are separated. The checklist score counts passed pass/fail checks and excludes reviews and untested checks. It does not predict rankings, actual indexing, or AI citations.

The extension does not observe HTTP status or response headers, evaluate robots.txt rules, fetch link destinations, measure field Core Web Vitals, or validate all rich-result requirements. Those checks remain explicitly untested. Reports can contain URLs and short excerpts from the current page, including signed-in content; review them before sharing.

## Verification and source

This build passed 16 automated rule and snippet tests, TypeScript checks, the production build, and real Chromium workflows for toolbar access, local audits, highlights, exports, storage, personalization, reset, and permission expiry. Website checks also covered desktop/mobile flows and a live public-page audit. Lint completed with no errors and four existing warnings.

The source includes the companion website assistant at `/assistant`; the existing production website is not redeployed by this extension release. See the [README at this release](https://github.com/Waqar-743/Audit_AI/blob/pip-v1.0.0/README.md) for source setup and the separate website workflow.
