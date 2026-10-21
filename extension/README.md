# Pip, the free AuditAI SEO companion

No sign-in, paid features, API keys, or background page collection. All extension audits run on this device. The site and extension share the same deterministic checklist.

## Install the release download

1. Download [auditai-pip.zip from Pip v1.0.0](https://github.com/Waqar-743/Audit_AI/releases/download/pip-v1.0.0/auditai-pip.zip).
2. Extract the ZIP into a permanent folder.
3. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
4. Select the extracted folder containing `manifest.json`.
5. Pin **AuditAI · Pip SEO assistant**, open a webpage, click its toolbar icon, and select **Audit this page**.

The download requires desktop Chrome 120 or later. No Node.js installation, build tools, account, or API key are needed to use it. Keep the extracted folder on your computer. This is a manually installed extension; it has not been published to the Chrome Web Store.

Release assets also include the original [parrot SVG](https://github.com/Waqar-743/Audit_AI/releases/download/pip-v1.0.0/parrot.svg) and `SHA256SUMS.txt`. See the [release notes](https://github.com/Waqar-743/Audit_AI/releases/tag/pip-v1.0.0) for features, scope, and installation guidance.

## Build from source

1. Run `npm ci` in the repository root, then `npm run build:extension`.
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the absolute folder `extension/dist` inside your checkout.
4. Pin **AuditAI · Pip SEO assistant**. Open a webpage, click the toolbar icon, and select **Audit this page** in the side panel.

The generated `public/downloads/auditai-pip.zip` contains the same extension. Extract the ZIP and choose its extracted folder using Load unpacked. A ZIP is not installed by dragging it into Chrome. This is an unpacked build, not a Chrome Web Store publication.

## Daily use

- **Page audit:** findings, evidence, priorities, reference documentation, category filters, and temporary page highlights. Click the toolbar icon again after changing to a different website to renew activeTab access.
- **Workbench:** edit a title and description, see an illustrative preview, and copy safely escaped metadata or a generic WebPage JSON-LD draft. No edits are automatically published.
- **Field notes:** optional name and work goal, 15 original companion illustrations, and the latest 20 reports stored locally. Export a report as JSON or Markdown; delete reports or reset all local data whenever you want.
- **Ask Pip:** a local rule-based guide that retrieves relevant findings. It does not send content to an AI provider or invent answers about traffic or rankings.

## Permissions and scope

Manifest V3, Chrome 120+. Requests only activeTab, scripting, storage, and sidePanel. No host_permissions, cookies, history, or remote scripts. CSP blocks extension network requests. Reading occurs only after an explicit audit click.

The extension sees the current rendered DOM, which may include signed-in content. Reports contain URLs and short evidence excerpts: review before sharing them. HTTP response headers, actual indexing, robots.txt access, broken-link destinations, field Core Web Vitals, backlinks, and site-wide duplicate content remain explicitly untested. Optional schema, short content, multiple H1s, and decorative empty alt attributes are not automatically penalized.

## Regression verification

`npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` cover the shared rules, package, and website. After `npx playwright install chromium`, run `npm run test:browser`. The browser test invokes the real extension toolbar action through Chrome's debugging protocol and exercises the unpacked service worker, DOM audit, highlights, permission expiry, storage, export, and workbench. Screenshots and a machine-readable summary are saved to ignored `artifacts/`.
