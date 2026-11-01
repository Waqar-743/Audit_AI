import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { extractSource } from "../src/lib/assistant/extract-source";
import { auditPage } from "../src/shared/seo/audit";
import { reportMarkdown } from "../src/shared/seo/coach";
import type { PageSnapshot, SeoReport } from "../src/shared/seo/types";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "skills", "auditai-seo", "scripts", "audit-snapshot.mjs");

function fixture(): PageSnapshot {
  return extractSource(
    `<!doctype html><html lang="en"><head>
      <title>Practical garden bird care and nesting advice</title>
      <meta name="description" content="Learn to identify garden birds and provide safe nesting space with useful advice for your garden.">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <base href="https://example.com/garden/">
      <link rel="canonical" href="birds">
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":["WebPage","AboutPage"]}]}</script>
    </head><body><h1>Garden birds</h1><h3>Nesting safely</h3>
      <p>Offer clean water and appropriate food.</p>
      <img src="decoration.svg" alt=""><img src="bird.jpg">
      <a href="guide"><img src="guide.jpg" alt="Nesting guide"></a>
      <a href="food" aria-label="Bird food advice"></a>
      <a href="care">Read more</a>
    </body></html>`,
    "https://example.com/garden/birds",
    200,
    "bingbot: noindex, googlebot: index, follow",
  );
}

function isolatedCli(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "AuditAI portable skill "));
  const executable = join(directory, "audit-snapshot.mjs");
  copyFileSync(script, executable);
  t.after(() => {
    // Only remove the explicitly created temporary directory.
    const pathFromTemp = relative(resolve(tmpdir()), resolve(directory));
    assert.ok(pathFromTemp && !pathFromTemp.startsWith(`..${sep}`));
    assert.ok(!pathFromTemp.startsWith(sep));
    rmSync(directory, { recursive: true, force: true });
  });
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [executable, ...args], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
      timeout: 15_000,
      maxBuffer: 4 * 1024 * 1024,
    });
  const input = (value: unknown, name = "page snapshot.json") => {
    const filename = join(directory, name);
    writeFileSync(filename, JSON.stringify(value));
    return filename;
  };
  return { directory, run, input };
}

function stableReport(report: SeoReport) {
  const { id, timestamp, ...stable } = report;
  assert.equal(typeof id, "string");
  assert.ok(Number.isFinite(Date.parse(timestamp)));
  return stable;
}

test("the shipped CLI runs alone in a directory containing spaces and matches the shared engine", (t) => {
  const cli = isolatedCli(t);
  const snapshot = fixture();
  const result = cli.run("--snapshot", cli.input(snapshot));
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.stdout) as SeoReport;
  assert.deepEqual(stableReport(report), stableReport(auditPage(snapshot)));
  assert.equal(report.checks.find((check) => check.id === "image-alt")?.status, "fail");
  assert.equal(report.checks.find((check) => check.id === "header-indexability")?.status, "pass");
});

test("rendered snapshots do not invent an HTTP status or indexing headers", (t) => {
  const cli = isolatedCli(t);
  const snapshot = fixture();
  snapshot.mode = "rendered";
  delete snapshot.statusCode;
  delete snapshot.responseRobots;
  const result = cli.run("--snapshot", cli.input(snapshot), "--format", "json");
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout) as SeoReport;
  assert.deepEqual(stableReport(report), stableReport(auditPage(snapshot)));
  for (const id of ["http-status", "header-indexability"])
    assert.equal(report.checks.find((check) => check.id === id)?.status, "unknown");
  assert.match(report.limitations[0], /rendered document/);
  assert.equal(
    report.score,
    Math.round((100 * report.counts.pass) / (report.counts.pass + report.counts.fail)),
  );
});

test("malformed and incomplete snapshots fail without emitting a report", (t) => {
  const cli = isolatedCli(t);
  const malformed = join(cli.directory, "malformed.json");
  writeFileSync(malformed, "{broken");
  const invalid: unknown[] = [null, [], {}, { ...fixture(), mode: "guessed" }];
  for (const field of ["url", "mode", "titles", "headings", "images", "links", "jsonLd", "truncated"]) {
    const snapshot: Record<string, unknown> = { ...fixture() };
    delete snapshot[field];
    invalid.push(snapshot);
  }
  invalid.push({ ...fixture(), url: "not a valid URL" });
  invalid.push({ ...fixture(), titles: "A title is not an array" });
  invalid.push({ ...fixture(), headings: [{ level: 99, text: "Invalid level" }] });
  for (const filename of [malformed, ...invalid.map((value, index) => cli.input(value, `invalid-${index}.json`))]) {
    const result = cli.run("--snapshot", filename);
    assert.ifError(result.error);
    assert.notEqual(result.status, 0, filename);
    assert.equal(result.stdout, "", filename);
    assert.ok(result.stderr.trim(), filename);
  }
});

test("source snapshots require observed status and header provenance", (t) => {
  const cli = isolatedCli(t);
  for (const field of ["statusCode", "responseRobots"] as const) {
    const snapshot = fixture();
    delete snapshot[field];
    const result = cli.run("--snapshot", cli.input(snapshot, `${field}-missing.json`));
    assert.notEqual(result.status, 0, field);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.trim());
  }
});

test("partial snapshots are refused instead of producing false missing-element findings", (t) => {
  const cli = isolatedCli(t);
  const result = cli.run("--snapshot", cli.input({ ...fixture(), truncated: true }));
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /truncat|partial|incomplete/i);
});

test("the CLI bounds snapshot file reads to 16 MiB", (t) => {
  const cli = isolatedCli(t);
  const filename = join(cli.directory, "oversized snapshot.json");
  writeFileSync(filename, Buffer.alloc(16 * 1024 * 1024 + 1, 0x20));
  const result = cli.run("--snapshot", filename);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /16|limit|large|size/i);
});

test("Markdown export preserves evidence, statuses, references, and scope from the shared report", (t) => {
  const cli = isolatedCli(t);
  const snapshot = fixture();
  const result = cli.run("--snapshot", cli.input(snapshot), "--format", "markdown");
  assert.equal(result.status, 0, result.stderr);
  const expected = reportMarkdown(auditPage(snapshot));
  const withoutCaptureTime = (markdown: string) => markdown.replace(/^Captured: .*$/m, "Captured: [time]").trimEnd();
  assert.equal(withoutCaptureTime(result.stdout), withoutCaptureTime(expected));
  assert.match(result.stdout, /Needs a fix/);
  assert.match(result.stdout, /Reference: https:\/\//);
  assert.match(result.stdout, /JavaScript was not executed/);
});

test("Markdown renders untrusted page markup as text while JSON preserves the original evidence", (t) => {
  const cli = isolatedCli(t);
  const snapshot = fixture();
  const untrustedTitle = '<img src="https://example.invalid/collect"> ![tracking](https://example.invalid/collect)';
  snapshot.titles = [untrustedTitle];
  const filename = cli.input(snapshot);
  const json = cli.run("--snapshot", filename, "--format", "json");
  assert.equal(json.status, 0, json.stderr);
  const report = JSON.parse(json.stdout) as SeoReport;
  const expected = auditPage(snapshot);
  assert.equal(report.title, untrustedTitle);
  assert.equal(report.preview.title, untrustedTitle);
  assert.equal(
    report.checks.find((check) => check.id === "title")?.evidence,
    expected.checks.find((check) => check.id === "title")?.evidence,
  );
  assert.ok(report.checks.find((check) => check.id === "title")?.evidence.includes(untrustedTitle));

  const markdown = cli.run("--snapshot", filename, "--format", "markdown");
  assert.equal(markdown.status, 0, markdown.stderr);
  assert.doesNotMatch(markdown.stdout, /<img\b/i);
  assert.doesNotMatch(markdown.stdout, /!\[tracking\]\(/);
  assert.match(markdown.stdout, /tracking/);
  assert.match(markdown.stdout, /example\.invalid\/collect/);
  assert.match(markdown.stdout, /&lt;img|\\<img/);
});

test("output files are created exclusively and existing work is preserved", (t) => {
  const cli = isolatedCli(t);
  const filename = cli.input(fixture());
  const output = join(cli.directory, "saved report.json");
  const first = cli.run("--snapshot", filename, "--output", output);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stdout, "");
  assert.equal((JSON.parse(readFileSync(output, "utf8")) as SeoReport).version, 1);
  writeFileSync(output, "keep this existing work");
  const second = cli.run("--snapshot", filename, "--output", output);
  assert.notEqual(second.status, 0);
  assert.equal(second.stdout, "");
  assert.equal(readFileSync(output, "utf8"), "keep this existing work");
});

test("help works without input and unsupported arguments fail clearly", (t) => {
  const cli = isolatedCli(t);
  const help = cli.run("--help");
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--snapshot/);
  assert.match(help.stdout, /--format/);
  assert.match(help.stdout, /--output/);
  for (const args of [[], ["--unknown"], ["--snapshot"], ["--snapshot", cli.input(fixture()), "--format", "yaml"]]) {
    const result = cli.run(...args);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.trim());
  }
});

test("the distributable contains one skill and only intended portable resources", () => {
  const artifactDirectory = join(root, "artifacts");
  const archive = readFileSync(join(artifactDirectory, "auditai-seo.zip"));
  const entries = unzipSync(archive);
  const files = Object.keys(entries).filter((name) => !name.endsWith("/"));
  const skillFiles = files.filter((name) => /(^|\/)SKILL\.md$/.test(name));
  assert.equal(skillFiles.length, 1);
  const skillRoot = skillFiles[0].slice(0, -"SKILL.md".length);
  const packageFiles = files.map((name) => {
    assert.ok(name.startsWith(skillRoot), name);
    assert.ok(!name.includes("\\") && !name.split("/").includes(".."), name);
    assert.ok(!name.startsWith("/"), name);
    const path = name.slice(skillRoot.length);
    assert.match(path, /^(SKILL\.md|(?:references|scripts|agents)\/.+)$/, path);
    assert.doesNotMatch(path, /(^|\/)(?:node_modules|\.git|\.env[^/]*)(?:\/|$)/i);
    return path;
  });
  for (const required of ["SKILL.md", "scripts/audit-snapshot.mjs", "scripts/capture-page.js"])
    assert.ok(packageFiles.includes(required), required);
  assert.ok(packageFiles.some((name) => name.startsWith("references/")));
  assert.ok(packageFiles.some((name) => name.startsWith("agents/")));
  assert.deepEqual(
    Buffer.from(entries[`${skillRoot}scripts/audit-snapshot.mjs`]),
    readFileSync(script),
  );
  const checksum = createHash("sha256").update(archive).digest("hex");
  assert.ok(readFileSync(join(artifactDirectory, "auditai-seo.sha256"), "utf8").includes(checksum));
  const metadataFile = join(artifactDirectory, "auditai-seo-build.json");
  assert.ok(existsSync(metadataFile));
  const metadata: unknown = JSON.parse(readFileSync(metadataFile, "utf8"));
  assert.ok(metadata && typeof metadata === "object" && !Array.isArray(metadata));
});

test("complete skill builds produce identical ZIP bytes across timezones", () => {
  let baseline: Buffer | undefined;
  let baselineChecksum: string | undefined;
  // Keep builders sequential: they intentionally regenerate the same artifact files.
  for (const timezone of ["UTC", "Asia/Karachi", "America/New_York"]) {
    const built = spawnSync(process.execPath, [join(root, "scripts", "build-skill.mjs")], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, TZ: timezone },
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    assert.ifError(built.error);
    assert.equal(built.status, 0, `${timezone}: ${built.stderr}`);
    const archive = readFileSync(join(root, "artifacts", "auditai-seo.zip"));
    const checksum = createHash("sha256").update(archive).digest("hex");
    if (baseline) {
      assert.deepEqual(archive, baseline, `${timezone}: ZIP changed with the host timezone`);
      assert.equal(checksum, baselineChecksum, timezone);
    } else {
      baseline = archive;
      baselineChecksum = checksum;
    }
    assert.ok(readFileSync(join(root, "artifacts", "auditai-seo.sha256"), "utf8").includes(checksum));
  }
});
