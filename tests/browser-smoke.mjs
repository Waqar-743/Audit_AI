import assert from "node:assert/strict";
import { verifyHomepage } from "./homepage-smoke.mjs";
import { createServer } from "node:http";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { build } from "esbuild";

const base = process.env.PIP_TEST_URL || "http://localhost:3000";
await mkdir("artifacts", { recursive: true });
const runtime = await build({
  stdin: {
    contents:
      'export {auditPage} from "./src/shared/seo/audit"; export {extractSource} from "./src/lib/assistant/extract-source"; export {extractDocument} from "./src/shared/seo/extract-document";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  packages: "external",
  format: "esm",
});
await writeFile("artifacts/test-runtime.mjs", runtime.outputFiles[0].text);
const { auditPage, extractSource, extractDocument } = await import(
  pathToFileURL(path.resolve("artifacts/test-runtime.mjs")).href
);
const fixtureHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>A practical guide to caring for garden birds</title><meta name="description" content="Learn how to care for garden birds with safe nesting places, useful feeding advice, and a practical seasonal checklist."><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="/birds"><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"}]}</script><style>body{font:20px system-ui;max-width:800px;margin:60px auto}img{width:90px;height:80px;background:#b9d299}</style></head><body><h1>Care for garden birds</h1><p>Give birds a safe place to build a nest.</p><h2>Nesting season</h2><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt=""><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"><a href="/feeding" aria-label="Bird feeding guide">Read more</a><a href="/empty"></a><span id="named">Garden guide</span><a href="/named" aria-labelledby="named"></a><script>const h=document.createElement('h2');h.textContent='A JavaScript-loaded section';document.body.append(h);</script></body></html>`;
const fixtureServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(fixtureHtml);
});
await new Promise((resolve) => fixtureServer.listen(0, "127.0.0.1", resolve));
const fixtureUrl = `http://127.0.0.1:${fixtureServer.address().port}/birds`;
const directory = path.resolve("extension/dist");
const profile = await mkdtemp(path.resolve("artifacts/chrome-profile-"));
const context = await chromium.launchPersistentContext(profile, {
  ...(process.env.PIP_CHROMIUM_PATH
    ? { executablePath: process.env.PIP_CHROMIUM_PATH }
    : { channel: "chromium" }),
  headless: true,
  viewport: { width: 1380, height: 1000 },
  args: [
    `--disable-extensions-except=${directory}`,
    `--load-extension=${directory}`,
    "--enable-unsafe-extension-debugging",
  ],
});
const pageErrors = [];
context.on("page", (page) =>
  page.on("pageerror", (error) => pageErrors.push(error.message)),
);
const results = [];
try {
  const fixture = await context.newPage();
  await fixture.goto(fixtureUrl);
  const snapshot = await fixture.evaluate(extractDocument);
  assert.equal(
    snapshot.headings.length,
    3,
    "Rendered extraction includes JavaScript-inserted content",
  );
  const rendered = auditPage(snapshot);
  assert.equal(
    rendered.checks.find((item) => item.id === "image-alt").status,
    "fail",
  );
  assert.equal(
    rendered.checks.find((item) => item.id === "header-indexability").status,
    "unknown",
  );
  assert.equal(
    rendered.checks.find((item) => item.id === "link-names").status,
    "fail",
  );
  const source = auditPage(
    extractSource(fixtureHtml, "https://example.com/birds", 200, ""),
  );
  assert.equal(source.metrics.headings, 2);
  results.push(
    "Source/rendered extraction, dynamic content, image alternatives, and link names verified",
  );

  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const extensionId = worker.url().split("/")[2];
  const session = await context.browser().newBrowserCDPSession();
  const { targetInfos } = await session.send("Target.getTargets", {
    filter: [{ type: "tab", exclude: false }],
  });
  const tabTarget = targetInfos.find((target) => target.url === fixture.url());
  assert.ok(tabTarget, `Tab target available: ${JSON.stringify(targetInfos)}`);
  await session.send("Extensions.triggerAction", {
    id: extensionId,
    targetId: tabTarget.targetId,
  });
  const panel = await context.newPage();
  await panel.setViewportSize({ width: 400, height: 1000 });
  await panel.goto(`chrome-extension://${extensionId}/panel.html`);
  await fixture.bringToFront();
  await panel.locator("#audit").click();
  await panel.locator("#report .pip-score").waitFor({ timeout: 15_000 });
  assert.ok(
    await panel
      .locator("#report")
      .innerText()
      .then((text) => text.includes("127.0.0.1")),
  );
  const imageFinding = panel
    .locator("details.pip-check")
    .filter({ hasText: "Image text alternatives" });
  await imageFinding.locator("summary").click();
  await imageFinding.getByRole("button", { name: "Show on page" }).click();
  await panel.locator("#message").filter({ hasText: "highlighted" }).waitFor();
  assert.ok(
    (await fixture.locator('div[aria-hidden="true"]').count()) > 0,
    "Real extension injected temporary highlights",
  );
  await panel.screenshot({
    path: "artifacts/extension-audit.png",
    fullPage: true,
  });
  await panel.locator("#tab-tools").click();
  await panel.locator("#draft-title").fill("A clearer garden bird guide");
  await panel
    .locator("#draft-description")
    .fill("Practical steps to help nesting birds in your garden.");
  assert.match(
    await panel.locator("#preview").innerText(),
    /A clearer garden bird guide/,
  );
  await panel.locator("#tab-notebook").click();
  await panel.locator("#nickname").fill("Garden keeper");
  await panel.locator("#nickname").press("Tab");
  await panel
    .locator("summary")
    .filter({ hasText: "Choose Pip's look" })
    .click();
  assert.equal(await panel.locator("#bird-picker button").count(), 15);
  await panel
    .getByRole("button", { name: "Choose flight", exact: true })
    .click();
  const stored = await worker.evaluate(() =>
    chrome.storage.local.get(["pipReports", "pipPreferences"]),
  );
  assert.equal(stored.pipReports.length, 1);
  assert.equal(stored.pipPreferences.bird, "flight");
  await panel.locator("#tab-audit").click();
  const downloadPromise = panel.waitForEvent("download");
  await panel.getByRole("button", { name: "Export JSON" }).click();
  assert.match(
    (await downloadPromise).suggestedFilename(),
    /pip-audit-127.0.0.1.json/,
  );
  await panel.locator("#tab-notebook").click();
  await panel.locator("#reset").click();
  const cleared = await worker.evaluate(() =>
    chrome.storage.local.get(["pipReports", "pipPreferences"]),
  );
  assert.equal(cleared.pipReports.length, 0);
  assert.equal(cleared.pipPreferences.nickname, "");
  await fixture.goto(
    "http://localhost:" + fixtureServer.address().port + "/birds",
  );
  await fixture.bringToFront();
  await panel.locator("#audit").click();
  await panel.locator("#error").waitFor({ state: "visible" });
  assert.match(
    await panel.locator("#error").innerText(),
    /access expired|toolbar icon/i,
  );
  results.push(
    "Actual unpacked extension: toolbar action, activeTab access, local audit, highlights, workbench, export, preferences, reset, and permission expiry verified",
  );

  if (!process.env.PIP_EXTENSION_ONLY) {
    const website = await context.newPage();
    await website.goto(`${base}/assistant`);
    await website.getByRole("heading", { name: /Good pages grow/ }).waitFor();
    await website.locator(".pip-brand").click({ trial: true });
    assert.equal(
      await website
        .locator(".pip-nav-links")
        .evaluate((node) => getComputedStyle(node).position),
      "static",
      "Legacy fixed navigation cannot cover the assistant header",
    );
    await website.screenshot({
      path: "artifacts/website-assistant-desktop.png",
      fullPage: true,
      animations: "disabled",
    });
    assert.ok(
      await website.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await website.route("**/api/assistant", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(source),
      }),
    );
    await website.locator("#pip-url").fill("https://example.com/birds");
    await website.getByRole("button", { name: "Audit this page" }).click();
    await website
      .getByRole("heading", { name: "Measured checklist" })
      .waitFor();
    await website
      .getByRole("button", { name: "Needs a fix", exact: true })
      .click();
    assert.ok(
      (await website
        .locator("#pip-view-audit > .pip-layout > div > details")
        .count()) > 0,
    );
    await website.getByRole("tab", { name: "Workbench" }).click();
    await website
      .locator("#pip-draft-title")
      .fill("Garden birds, well cared for");
    assert.match(
      await website.locator(".pip-preview").innerText(),
      /Garden birds, well cared for/,
    );
    await website.getByRole("tab", { name: "Field notes" }).click();
    assert.equal(await website.locator(".pip-history-row").count(), 1);
    await website.locator("#pip-nickname").fill("Garden keeper");
    await website
      .getByRole("button", { name: "Choose homecoming", exact: true })
      .click();
    await website.reload();
    await website.getByRole("tab", { name: "Field notes" }).click();
    assert.equal(
      await website.locator("#pip-nickname").inputValue(),
      "Garden keeper",
    );
    await website.getByRole("button", { name: "Open report" }).click();
    await website.locator("#pip-question").fill("Explain schema");
    await website.getByRole("button", { name: "Ask Pip", exact: true }).click();
    assert.match(
      await website.locator('[aria-live="polite"]').innerText(),
      /actually observed/,
    );
    await website.screenshot({
      path: "artifacts/website-assistant-report.png",
      fullPage: true,
    });
    await website.getByRole("tab", { name: "Field notes" }).click();
    await website.getByRole("button", { name: "Reset all local data" }).click();
    assert.equal(await website.locator(".pip-history-row").count(), 0);
    assert.equal(await website.locator("#pip-nickname").inputValue(), "");
    await website.setViewportSize({ width: 390, height: 844 });
    await website.getByRole("tab", { name: "Page audit" }).click();
    assert.ok(
      await website.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "No mobile horizontal overflow",
    );
    await website.screenshot({
      path: "artifacts/website-assistant-mobile.png",
      fullPage: true,
      animations: "disabled",
    });
    await website.getByRole("tab", { name: "Chrome extension" }).click();
    const zipResponse = await context.request.get(
      `${base}/downloads/auditai-pip.zip`,
    );
    assert.equal(zipResponse.status(), 200);
    assert.ok((await zipResponse.body()).byteLength > 10_000);
    await website.goto(`${base}/assistant#extension`);
    await website
      .getByRole("heading", { name: "Keep Pip beside the page." })
      .waitFor();
    await website.goto(`${base}/assistant/privacy`);
    await website
      .getByRole("heading", { name: "Your work stays yours." })
      .waitFor();
    await verifyHomepage({ website, context, base, source, results });

    const blocked = await context.request.post(`${base}/api/assistant`, {
      data: { url: "http://127.0.0.1" },
    });
    assert.equal(blocked.status(), 422);
    const malformed = await context.request.post(`${base}/api/assistant`, {
      data: { unexpected: "value" },
    });
    assert.equal(malformed.status(), 400);
    const oversized = await context.request.post(`${base}/api/assistant`, {
      data: { url: "a".repeat(10_000) },
    });
    assert.equal(oversized.status(), 413);
    if (!process.env.PIP_SKIP_PUBLIC_AUDIT) {
      const live = await context.request.post(`${base}/api/assistant`, {
        data: { url: "https://example.com" },
        timeout: 30_000,
      });
      assert.equal(live.status(), 200, await live.text());
      const liveReport = await live.json();
      assert.equal(liveReport.mode, "source");
      assert.ok(liveReport.checks.length >= 20);
      results.push(
        "Live public HTTPS audit through the production API verified",
      );
    }
    results.push(
      "Real website API: private-network rejection, malformed input, and oversized request verified",
    );
  }
  assert.deepEqual(pageErrors, [], `Browser errors: ${pageErrors.join("; ")}`);
  await writeFile(
    "artifacts/browser-results.json",
    JSON.stringify({ passed: true, results, pageErrors }, null, 2),
  );
  console.log(results.join("\n"));
} finally {
  await context.close();
  await new Promise((resolve) => fixtureServer.close(resolve));
}
