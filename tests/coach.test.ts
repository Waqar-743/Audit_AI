import { test } from "node:test";
import assert from "node:assert/strict";
import {
  askPip,
  metadataSnippet,
  normalizePreferences,
  schemaSnippet,
  isSeoReport,
} from "../src/shared/seo/coach";
import { auditPage } from "../src/shared/seo/audit";
import { extractSource } from "../src/lib/assistant/extract-source";

const report = auditPage(
  extractSource(
    "<html><head><title>Birds</title></head><body><h1>Birds</h1><p>Care for nesting birds.</p></body></html>",
    "https://example.com",
    200,
    "",
  ),
);

test("metadata and JSON-LD drafts cannot break out of their markup contexts", () => {
  assert.equal(
    metadataSnippet("</title><script>alert(1)</script>", '" onload="bad'),
    '<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>\n<meta name="description" content="&quot; onload=&quot;bad">',
  );
  const snippet = schemaSnippet(
    report,
    "</script><script>bad</script>",
    "Draft",
  );
  assert.equal((snippet.match(/<\/script>/g) || []).length, 1);
  const json = snippet.slice(
    snippet.indexOf("\n") + 1,
    snippet.lastIndexOf("\n"),
  );
  assert.equal(JSON.parse(json).name, "</script><script>bad</script>");
});
test("local coach retrieves observed findings and declines unmeasured ranking claims", () => {
  assert.ok(
    askPip(report, "Explain canonical and indexing").checks.some(
      (check) => check.id === "canonical",
    ),
  );
  assert.match(
    askPip(report, "What are my rankings?").message,
    /does not measure rankings/,
  );
  assert.ok(
    askPip(report, "What should I fix first?").checks.every((check) =>
      ["fail", "review"].includes(check.status),
    ),
  );
});
test("untrusted stored preferences and invalid reports are rejected", () => {
  assert.deepEqual(
    normalizePreferences({ nickname: 42, bird: "../../bad", goal: "anything" }),
    { nickname: "", bird: "parrot", goal: "my site" },
  );
  assert.equal(isSeoReport(null), false);
  assert.equal(isSeoReport({ version: 1 }), false);
  assert.equal(isSeoReport(report), true);
});
