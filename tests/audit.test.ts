import { test } from "node:test";
import assert from "node:assert/strict";
import { auditPage, googleHeaderDirectives } from "../src/shared/seo/audit";
import { extractSource } from "../src/lib/assistant/extract-source";
import {
  decodeHtml,
  isPublicAddress,
  normalizePublicUrl,
} from "../src/lib/assistant/safe-fetch";

function report(body = "", head = "") {
  return auditPage(
    extractSource(
      `<!doctype html><html lang="en"><head><title>A useful page about garden birds</title><meta name="description" content="Learn to identify garden birds and provide a safe nesting space with practical advice for your own garden."><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body><h1>Garden birds</h1>${body}</body></html>`,
      "https://example.com/birds",
      200,
      "",
    ),
  );
}
const check = (result: ReturnType<typeof report>, id: string) =>
  result.checks.find((entry) => entry.id === id)!;

test("decorative images are allowed; absent alt is separately detected", () => {
  assert.equal(
    check(report('<img src="leaf.svg" alt="">'), "image-alt").status,
    "pass",
  );
  assert.equal(
    check(report('<img src="bird.jpg">'), "image-alt").status,
    "fail",
  );
  assert.equal(check(report(), "image-alt").status, "unknown");
});
test("noindex, none, and multiple robots tags use the restrictive instruction", () => {
  for (const value of ["noindex, follow", "NONE", "index, noindex"])
    assert.equal(
      check(
        report("", `<meta name="robots" content="${value}">`),
        "meta-indexability",
      ).status,
      "fail",
    );
  assert.equal(
    check(
      report(
        "",
        '<meta name="robots" content="index"><meta name="googlebot" content="noindex">',
      ),
      "meta-indexability",
    ).status,
    "fail",
  );
  assert.equal(
    check(
      report("", '<meta name="bingbot" content="noindex">'),
      "meta-indexability",
    ).status,
    "pass",
  );
});
test("header robots retain crawler scoping and do not confuse valued directives", () => {
  assert.equal(googleHeaderDirectives("bingbot: noindex, nofollow"), "");
  assert.equal(
    googleHeaderDirectives("max-snippet:50, noindex"),
    "max-snippet:50, noindex",
  );
  assert.equal(
    googleHeaderDirectives("bingbot: noindex, googlebot: index, follow"),
    "index, follow",
  );
});
test("canonical conflicts and invalid URLs fail; an intentional alternate is a review", () => {
  assert.equal(
    check(
      report("", '<link rel="canonical" href="/birds">'),
      "canonical-target",
    ).status,
    "pass",
  );
  assert.equal(
    check(
      report("", '<link rel="canonical" href="/other">'),
      "canonical-target",
    ).status,
    "review",
  );
  assert.equal(
    check(
      report("", '<link rel="canonical" href="javascript:alert(1)">'),
      "canonical",
    ).status,
    "fail",
  );
  assert.equal(
    check(
      report(
        "",
        '<link rel="canonical" href="/birds"><link rel="canonical" href="/other">',
      ),
      "canonical",
    ).status,
    "fail",
  );
});
test("multiple H1s, short content, optional schema, and long titles are not automatic failures", () => {
  const result = report("<h1>Another section</h1><p>Short and useful.</p>");
  assert.equal(check(result, "main-heading").status, "review");
  assert.equal(check(result, "page-text").status, "pass");
  assert.equal(check(result, "schema-types").status, "review");
  assert.equal(check(result, "schema-json").status, "unknown");
});
test("JSON-LD detects invalid syntax and traverses graph arrays without requiring a fixed type", () => {
  assert.equal(
    check(
      report("", '<script type="application/ld+json">{bad}</script>'),
      "schema-json",
    ).status,
    "fail",
  );
  const result = report(
    "",
    '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":["WebPage","AboutPage"]}]}</script>',
  );
  assert.match(check(result, "schema-types").evidence, /AboutPage/);
  assert.equal(check(result, "schema-json").status, "pass");
});
test("image links, aria labels, and labelledby have usable names", () => {
  const result = report(
    '<a href="/a"><img src="a.jpg" alt="Garden guide"></a><a href="/b" aria-label="Nesting guide"></a><span id="label">Bird food</span><a href="/c" aria-labelledby="label"></a>',
  );
  assert.equal(check(result, "link-names").status, "pass");
});
test("duplicate matching canonicals are a review; trailing slash differences are preserved", () => {
  assert.equal(
    check(
      report(
        "",
        '<link rel="canonical" href="/birds"><link rel="canonical" href="/birds">',
      ),
      "canonical",
    ).status,
    "review",
  );
  assert.equal(
    check(
      report("", '<link rel="canonical" href="/birds/">'),
      "canonical-target",
    ).status,
    "review",
  );
});
test("empty accessibility labels fall back to visible link text", () => {
  assert.equal(
    check(
      report(
        '<a href="/guide" aria-label="   " aria-labelledby="missing unknown">Bird care guide</a>',
      ),
      "link-names",
    ).status,
    "pass",
  );
});
test("score excludes reviews and unknowns and clearly states extraction limitations", () => {
  const result = report();
  assert.equal(
    result.score,
    Math.round(
      (result.counts.pass / (result.counts.pass + result.counts.fail)) * 100,
    ),
  );
  assert.ok(result.counts.unknown > 0 && result.counts.review > 0);
  assert.match(result.limitations[0], /JavaScript was not executed/);
});
test("oversized structured data is reported as untested, not malformed", () => {
  const result = report(
    "",
    `<script type="application/ld+json">${JSON.stringify({ "@type": "WebPage", text: "x".repeat(210_000) })}</script>`,
  );
  assert.equal(check(result, "schema-json").status, "unknown");
  assert.ok(result.limitations.some((item) => /partial snapshot/.test(item)));
});
test("HTML decoding honors response headers and meta charset", () => {
  assert.equal(
    decodeHtml(
      Buffer.from([0x63, 0x61, 0x66, 0xe9]),
      "text/html; charset=iso-8859-1",
    ),
    "café",
  );
  const page = Buffer.concat([
    Buffer.from('<meta charset="windows-1252"><title>'),
    Buffer.from([0xe9]),
    Buffer.from("</title>"),
  ]);
  assert.match(decodeHtml(page, "text/html"), /<title>é<\/title>/);
});
test("private, loopback, mapped IPv6, and metadata addresses cannot be requested", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "172.16.0.5",
    "192.168.0.1",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fd00::1",
    "fe80::1",
    "2001:db8::1",
    "2002:7f00:1::",
  ])
    assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
  for (const url of [
    "http://127.1",
    "http://2130706433",
    "http://0x7f000001",
    "https://[::1]",
    "http://localhost",
    "http://x.local",
    "https://user:pass@example.com",
    "https://example.com:8080",
    "file:///etc/passwd",
  ])
    assert.throws(() => normalizePublicUrl(url), /./, url);
  assert.equal(
    normalizePublicUrl("example.com/birds").href,
    "https://example.com/birds",
  );
});
