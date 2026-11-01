import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillDirectory = join(root, "skills", "auditai-seo", "scripts");
const captureExpression = await readFile(join(skillDirectory, "capture-page.js"), "utf8");
const directory = await mkdtemp(join(tmpdir(), "AuditAI browser skill "));
const executable = join(directory, "standalone audit.mjs");
const svg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
const fixture = (extraHead = "", extraBody = "") => `<!doctype html><html lang="en"><head>
  <meta charset="utf-8"><title>Practical advice for caring for garden birds</title>
  <meta name="description" content="Learn to care for garden birds, provide safe nesting spaces, and choose suitable food with practical seasonal guidance.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="https://auditai-skill.test/garden/">
  <link rel="canonical" href="birds">
  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":["WebPage","AboutPage"],"author":{"@type":"Person","name":"Fixture author"}}]}</script>
  ${extraHead}
</head><body>
  <h1>Garden birds</h1><h1>Care through the seasons</h1>
  <p>Offer fresh water and a safe place to build a nest.</p>
  <img src="${svg}" alt="">
  <a href="feeding" aria-label="Bird feeding advice">Read more</a>
  <span id="guide">Seasonal</span><span id="topic">nesting guide</span>
  <a href="nesting" aria-labelledby="guide topic"></a>
  <a href="identification"><img src="${svg}" alt="Identify garden birds"></a>
  <a href="care" aria-label="   " aria-labelledby="missing">Bird care checklist</a>
  ${extraBody}
  <script>const heading=document.createElement('h2');heading.textContent='Rendered seasonal checklist';document.body.append(heading);</script>
</body></html>`;

let browser;
try {
  await copyFile(join(skillDirectory, "audit-snapshot.mjs"), executable);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PIP_CHROMIUM_PATH
      ? { executablePath: process.env.PIP_CHROMIUM_PATH }
      : {}),
  });
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  let documentHtml = fixture();
  let requests = 0;
  const pageErrors = [];
  page.on("request", () => requests++);
  page.on("pageerror", (error) => pageErrors.push(error.message));
  // Every request is intercepted; fixtures need no server, DNS, or remote assets.
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() === "document")
      await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: documentHtml });
    else await route.abort();
  });

  async function captureReadOnly(name) {
    await page.goto(`https://auditai-skill.test/garden/birds?fixture=${name}`, { waitUntil: "networkidle" });
    const beforeHtml = await page.evaluate(() => document.documentElement.outerHTML);
    const beforeRequests = requests;
    const snapshot = await page.evaluate(captureExpression);
    // Let browser request events drain before checking the extractor's side effects.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => done())));
    assert.equal(await page.evaluate(() => document.documentElement.outerHTML), beforeHtml, `${name}: extractor mutated the DOM`);
    assert.equal(requests, beforeRequests, `${name}: extractor made a network request`);
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    return snapshot;
  }

  async function audit(snapshot, name) {
    const filename = join(directory, `${name} snapshot.json`);
    await writeFile(filename, JSON.stringify(snapshot));
    const result = spawnSync(process.execPath, [executable, "--snapshot", filename], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
      timeout: 15_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
    assert.ifError(result.error);
    return result;
  }

  const snapshot = await captureReadOnly("complete");
  assert.equal(snapshot.mode, "rendered");
  assert.equal(snapshot.statusCode, undefined);
  assert.equal(snapshot.responseRobots, undefined);
  assert.equal(snapshot.truncated, false);
  assert.ok(snapshot.headings.some((heading) => heading.text === "Rendered seasonal checklist"));
  assert.deepEqual(snapshot.links.map((link) => link.text), [
    "Bird feeding advice", "Seasonal nesting guide", "Identify garden birds", "Bird care checklist",
  ]);
  assert.equal(snapshot.images[0].alt, "");
  const completed = await audit(snapshot, "complete");
  assert.equal(completed.status, 0, completed.stderr);
  assert.equal(completed.stderr, "");
  const report = JSON.parse(completed.stdout);
  const check = (id) => {
    const finding = report.checks.find((item) => item.id === id);
    assert.ok(finding, `Missing finding: ${id}`);
    return finding;
  };
  assert.equal(check("http-status").status, "unknown");
  assert.equal(check("header-indexability").status, "unknown");
  assert.equal(check("image-alt").status, "pass");
  assert.equal(check("link-names").status, "pass");
  assert.equal(check("main-heading").status, "review");
  assert.equal(check("schema-json").status, "pass");
  assert.equal(check("schema-types").status, "pass");
  for (const type of ["WebPage", "AboutPage", "Person"])
    assert.ok(check("schema-types").evidence.includes(type), type);
  assert.match(report.limitations[0], /rendered document/);

  for (const [name, head] of [
    ["robots count overflow", `${'<meta name="robots" content="index">'.repeat(20)}<meta name="robots" content="noindex">`],
    ["robots content overflow", `<meta name="robots" content="${"index, ".repeat(334)}noindex">`],
  ]) {
    documentHtml = fixture(head);
    const partial = await captureReadOnly(name);
    assert.equal(partial.truncated, true, `${name}: metadata loss must be disclosed`);
    const rejected = await audit(partial, name);
    assert.notEqual(rejected.status, 0, `${name}: incomplete snapshots must not be scored`);
    assert.equal(rejected.stdout, "");
    assert.match(rejected.stderr, /truncat|partial|incomplete/i);
  }

  documentHtml = fixture("", `<a href="${" ".repeat(2_048)}https://example.com/unnamed"></a>`);
  const saturatedLink = await captureReadOnly("link href overflow");
  assert.equal(saturatedLink.links.length, 5, "Existing named links and the unnamed destination must be captured");
  assert.equal(saturatedLink.links.at(-1).href, " ".repeat(2_048));
  assert.equal(saturatedLink.truncated, true, "A sliced href must not hide an unnamed HTTP link from the audit");
  const rejectedLink = await audit(saturatedLink, "link href overflow");
  assert.notEqual(rejectedLink.status, 0);
  assert.equal(rejectedLink.stdout, "");
  assert.match(rejectedLink.stderr, /truncat|partial|incomplete/i);

  process.stdout.write("Portable skill browser smoke passed: read-only capture, rendered evidence, accessible names, nested schema, metadata overflow, and sliced link destinations.\n");
} finally {
  await browser?.close();
  // Resolve and validate the explicitly created temporary directory before removal.
  const temporaryRoot = resolve(tmpdir());
  const target = resolve(directory);
  const pathFromTemp = relative(temporaryRoot, target);
  assert.ok(pathFromTemp && !isAbsolute(pathFromTemp) && pathFromTemp !== ".." && !pathFromTemp.startsWith(`..${sep}`));
  await rm(target, { recursive: true, force: true });
}
