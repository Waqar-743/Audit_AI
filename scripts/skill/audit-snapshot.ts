import { readFileSync, statSync, writeFileSync } from "node:fs";
import { auditPage } from "../../src/shared/seo/audit";
import { reportMarkdown } from "../../src/shared/seo/coach";
import type { PageSnapshot } from "../../src/shared/seo/types";

const help = `AuditAI SEO snapshot audit (Node.js 20+; no network or dependencies)
Usage: node audit-snapshot.mjs --snapshot FILE [--format json|markdown] [--output FILE]
       node audit-snapshot.mjs --help

Reads a complete PageSnapshot JSON file, up to 16 MiB. Partial snapshots are
refused. Source mode requires observed statusCode and responseRobots fields.
Writes to stdout unless --output names a NEW file; existing files are preserved.
This checklist does not measure rankings, actual indexing, or AI citations.
`;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireField(condition: boolean, field: string): asserts condition {
  if (!condition) throw new Error(`Invalid or missing snapshot field: ${field}.`);
}

function isText(value: unknown, max = 200_000): value is string {
  return typeof value === "string" && value.length <= max;
}

function httpUrl(value: unknown): boolean {
  if (!isText(value, 2_048)) return false;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

// Page data must stay textual when the export is opened in a Markdown viewer.
// Keep the original evidence intact in JSON; only escape fields rendered below.
function markdownText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/([\\`*_\[\]#!])/g, "\\$1");
}

function validate(value: unknown): asserts value is PageSnapshot {
  requireField(record(value), "object");
  requireField(httpUrl(value.url), "url (absolute HTTP(S), no credentials)");
  if (value.baseUrl !== undefined)
    requireField(httpUrl(value.baseUrl), "baseUrl");
  requireField(value.mode === "source" || value.mode === "rendered", "mode");
  requireField(typeof value.truncated === "boolean", "truncated");
  if (value.truncated || value.jsonLdTruncated)
    throw new Error("Partial/truncated snapshots cannot be scored. Use a scoped manual audit.");
  if (value.jsonLdTruncated !== undefined)
    requireField(typeof value.jsonLdTruncated === "boolean", "jsonLdTruncated");
  for (const field of ["language", "viewport", "excerpt"])
    requireField(isText(value[field]), field);
  requireField(typeof value.hasOtherStructuredData === "boolean", "hasOtherStructuredData");
  requireField(Number.isSafeInteger(value.wordCount) && Number(value.wordCount) >= 0, "wordCount");

  for (const [field, maxItems, maxText] of [
    ["titles", 20, 2_000], ["descriptions", 20, 2_000],
    ["canonicals", 20, 2_048], ["jsonLd", 50, 200_000],
  ] as const) {
    const entries = value[field];
    requireField(Array.isArray(entries) && entries.length <= maxItems &&
      entries.every((entry) => isText(entry, maxText)), field);
  }
  for (const [field, maxItems, entryValid] of [
    ["robots", 40, (entry: Record<string, unknown>) => isText(entry.agent, 100) && isText(entry.content, 2_000)],
    ["headings", 1_000, (entry: Record<string, unknown>) => Number.isInteger(entry.level) && Number(entry.level) >= 1 && Number(entry.level) <= 6 && isText(entry.text, 500)],
    ["images", 5_000, (entry: Record<string, unknown>) => isText(entry.src, 2_048) && (entry.alt === null || isText(entry.alt, 1_000))],
    ["links", 5_000, (entry: Record<string, unknown>) => isText(entry.href, 2_048) && isText(entry.text, 500) && isText(entry.rel, 2_000)],
  ] as const) {
    const entries = value[field];
    requireField(Array.isArray(entries) && entries.length <= maxItems &&
      entries.every((entry) => record(entry) && entryValid(entry)), field);
  }
  requireField(record(value.og) && Object.entries(value.og).length <= 40 &&
    Object.entries(value.og).every(([key, text]) => key.length <= 200 && isText(text, 2_000)), "og");
  if (value.mode === "source" || value.statusCode !== undefined)
    requireField(Number.isInteger(value.statusCode) && Number(value.statusCode) >= 100 && Number(value.statusCode) <= 599, "statusCode");
  if (value.mode === "source" || value.responseRobots !== undefined)
    requireField(isText(value.responseRobots, 16_384), "responseRobots (empty only when header absence was observed)");
}

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write(help);
  } else {
    const options = new Map<string, string>();
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index];
      const value = args[index + 1];
      if (!["--snapshot", "--format", "--output"].includes(key) ||
        !value || value.startsWith("--") || options.has(key))
        throw new Error("Unsupported, duplicate, or incomplete argument. Use --help.");
      options.set(key, value);
    }
    const input = options.get("--snapshot");
    if (!input) throw new Error("Supply --snapshot FILE. Use --help.");
    const format = options.get("--format") || "json";
    if (format !== "json" && format !== "markdown")
      throw new Error("--format must be json or markdown.");
    const stat = statSync(input);
    if (!stat.isFile() || stat.size > 16 * 1024 * 1024)
      throw new Error("Snapshot must be a regular file within the 16 MiB size limit.");
    const snapshot: unknown = JSON.parse(readFileSync(input, "utf8").replace(/^\uFEFF/, ""));
    validate(snapshot);
    const report = auditPage(snapshot);
    const output = `${format === "json" ? JSON.stringify(report, null, 2) : reportMarkdown({
      ...report, title: markdownText(report.title), url: markdownText(report.url),
      checks: report.checks.map((check) => ({ ...check, evidence: markdownText(check.evidence) })),
    })}\n`;
    const destination = options.get("--output");
    if (destination) writeFileSync(destination, output, { flag: "wx", encoding: "utf8" });
    else process.stdout.write(output);
  }
} catch (error) {
  process.stderr.write(`AuditAI: ${error instanceof Error ? error.message : "Audit failed."}\n`);
  process.exitCode = 1;
}
