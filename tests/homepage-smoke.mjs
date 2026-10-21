import assert from "node:assert/strict";
import { load } from "cheerio";
import sharp from "sharp";

export async function verifyHomepage({
  website,
  context,
  base,
  source,
  results,
}) {
  const html = await context.request.get(base);
  assert.equal(html.status(), 200);
  const $ = load(await html.text());
  assert.match($("title").text(), /Free SEO Assistant/);
  assert.match($('meta[name="description"]').attr("content"), /No signup/);
  assert.equal(
    new URL($('link[rel="canonical"]').attr("href")).href,
    "https://audit-ai-fawn.vercel.app/",
  );
  assert.equal($("h1").length, 1);
  assert.equal(
    $('meta[property="og:image"]').attr("content"),
    "https://audit-ai-fawn.vercel.app/social/pip-preview.png",
  );
  const graph = JSON.parse(
    $('script[type="application/ld+json"]').first().text(),
  )["@graph"];
  assert.equal(
    graph.find((item) => item["@type"] === "WebApplication").offers.price,
    "0",
  );
  assert.ok(
    !graph.some((item) => item.aggregateRating),
    "No invented ratings in structured data",
  );
  const image = await context.request.get(`${base}/social/pip-preview.png`);
  const dimensions = await sharp(await image.body()).metadata();
  assert.equal(dimensions.width, 1200);
  assert.equal(dimensions.height, 630);
  const icon = await context.request.get(`${base}/icon.svg`);
  assert.equal(icon.status(), 200);
  assert.match(await icon.text(), /<svg/);
  const robots = await context.request.get(`${base}/robots.txt`);
  assert.match(
    await robots.text(),
    /Sitemap: https:\/\/audit-ai-fawn.vercel.app\/sitemap.xml/,
  );
  const sitemap = await context.request.get(`${base}/sitemap.xml`);
  const sitemapText = await sitemap.text();
  assert.equal((sitemapText.match(/<loc>/g) || []).length, 3);
  assert.ok(!sitemapText.includes("/scan/"));
  const queryPage = load(
    await (
      await context.request.get(
        `${base}/assistant?url=https%3A%2F%2Fexample.com&start=1`,
      )
    ).text(),
  );
  assert.match(queryPage('meta[name="robots"]').attr("content"), /noindex/);
  assert.equal(
    queryPage('link[rel="canonical"]').attr("href"),
    "https://audit-ai-fawn.vercel.app/assistant",
  );
  const reportPage = load(
    await (await context.request.get(`${base}/scan/homepage-smoke`)).text(),
  );
  assert.match(reportPage('meta[name="robots"]').attr("content"), /noindex/);

  await website.setViewportSize({ width: 1380, height: 1000 });
  await website.evaluate(
    (report) =>
      localStorage.setItem(
        "auditai-pip-v1",
        JSON.stringify({
          reports: [report],
          preferences: {
            nickname: "Garden keeper",
            goal: "my site",
            bird: "parrot",
          },
        }),
      ),
    source,
  );
  await website.goto(base);
  await website
    .getByText("Welcome back, Garden keeper.", { exact: true })
    .waitFor();
  await website
    .getByRole("link", { name: "AuditAI with Pip, home" })
    .click({ trial: true });
  assert.equal(await website.locator(".hero-headline").count(), 1);
  await website.locator("#url-input").focus();
  const inputStyle = await website.locator("#url-input").evaluate((node) => ({
    border: getComputedStyle(node).borderTopStyle,
    outline: getComputedStyle(node).outlineStyle,
  }));
  assert.equal(
    inputStyle.border,
    "solid",
    "Homepage input has a visible boundary",
  );
  assert.equal(inputStyle.outline, "solid", "Keyboard focus remains visible");
  await website.getByText("Make Pip your companion", { exact: false }).click();
  await website.locator("#home-nickname").fill("Waqar");
  await website
    .getByRole("button", { name: "Client work", exact: true })
    .click();
  await website
    .getByRole("heading", {
      name: "Bring a little clarity to your next review.",
    })
    .waitFor();
  let saved = await website.evaluate(() =>
    JSON.parse(localStorage.getItem("auditai-pip-v1")),
  );
  assert.equal(
    saved.reports.length,
    1,
    "Homepage personalization preserves existing reports",
  );
  assert.equal(saved.preferences.nickname, "Waqar");
  assert.equal(saved.preferences.goal, "client work");
  await website
    .getByRole("link", { name: "Open your 1 saved field note ↗" })
    .click();
  await website.locator("#pip-view-notebook").waitFor({ state: "visible" });
  assert.equal(await website.locator("#pip-nickname").inputValue(), "Waqar");
  assert.equal(await website.locator(".pip-history-row").count(), 1);

  await website.goto(base);
  await website
    .getByRole("button", { name: "Start free audit ↗", exact: true })
    .click();
  await website.locator("#home-url-error").waitFor();
  await website.locator("#url-input").fill("ftp://example.com/file");
  await website
    .getByRole("button", { name: "Start free audit ↗", exact: true })
    .click();
  assert.match(
    await website.locator("#home-url-error").innerText(),
    /webpage address/,
  );
  let requests = 0;
  await website.route("**/api/assistant", async (route) => {
    requests++;
    assert.equal(
      route.request().postDataJSON().url,
      "https://example.com/birds",
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(source),
    });
  });
  await website.locator("#url-input").fill("example.com/birds");
  await website
    .getByRole("button", { name: "Start free audit ↗", exact: true })
    .click();
  await website.getByRole("heading", { name: "Measured checklist" }).waitFor();
  assert.equal(requests, 1, "Homepage starts the chosen audit exactly once");
  assert.equal(
    new URL(website.url()).search,
    "",
    "Audit target is removed from the navigation URL",
  );
  saved = await website.evaluate(() =>
    JSON.parse(localStorage.getItem("auditai-pip-v1")),
  );
  assert.equal(saved.reports.length, 2);
  assert.equal(saved.preferences.goal, "client work");
  assert.equal(saved.preferences.nickname, "Waqar");

  await website.goBack();
  await website.locator("#url-input").waitFor();
  assert.equal(
    await website.locator("#url-input").isEnabled(),
    true,
    "Returning from an audit leaves the homepage ready for another page",
  );
  const firstFaq = website.locator("#faq details").first();
  await firstFaq.locator("summary").click();
  assert.equal(await firstFaq.getAttribute("open"), "");
  await firstFaq.locator("summary").press("Enter");
  assert.equal(await firstFaq.getAttribute("open"), null);
  await website.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    scrollTo({ top: 0, behavior: "instant" });
  });
  await website.screenshot({
    path: "artifacts/website-home-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await website.locator("#pricing").screenshot({
    path: "artifacts/website-pip-invitation.png",
    animations: "disabled",
  });
  await website.route("**/api/scan", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "Controlled original scanner response" }),
    }),
  );
  await website.locator("#original-scanner summary").click();
  await website.locator("#cta-url-input").fill("example.com");
  await website
    .getByRole("button", { name: "Run original scan", exact: true })
    .click();
  const dialog = website.getByRole("dialog");
  await dialog.getByRole("alert").waitFor();
  await dialog.press("Tab");
  assert.equal(
    await website.evaluate(() => document.activeElement?.textContent),
    "Close scanner",
  );
  await dialog.press("Escape");
  await dialog.waitFor({ state: "detached" });
  assert.equal(
    await website.evaluate(() => document.activeElement?.textContent),
    "Run original scan",
  );

  await website.setViewportSize({ width: 390, height: 844 });
  await website.goto(base);
  await website.getByRole("button", { name: "Open navigation" }).click();
  assert.equal(
    await website.locator("#home-menu-toggle").getAttribute("aria-expanded"),
    "true",
  );
  await website.locator("#home-navigation a").first().focus();
  await website.keyboard.press("Escape");
  assert.equal(
    await website.locator("#home-menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(
    await website.evaluate(() => document.activeElement?.id),
    "home-menu-toggle",
  );
  await website.getByRole("button", { name: "Open navigation" }).click();
  await website
    .getByRole("link", { name: "What Pip checks", exact: true })
    .click();
  assert.equal(
    await website.locator("#home-menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  await website.evaluate(() => scrollTo(0, 0));
  await website.screenshot({
    path: "artifacts/website-home-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const width of [320, 390, 768, 1380]) {
    await website.setViewportSize({ width, height: 844 });
    assert.ok(
      await website.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No homepage horizontal overflow at ${width}px`,
    );
  }
  const noJs = await context.browser().newContext({
    javaScriptEnabled: false,
    viewport: { width: 1380, height: 1000 },
  });
  try {
    const page = await noJs.newPage();
    await page.goto(base);
    assert.equal(await page.locator("h1").isVisible(), true);
    assert.equal(
      await page.locator("#pricing .section-title").isVisible(),
      true,
      "Story remains readable without client animation",
    );
    await page.locator("#faq details").first().locator("summary").click();
    assert.equal(await page.locator("#faq details[open]").count(), 1);
  } finally {
    await noJs.close();
  }
  results.push(
    "Homepage: SVG branding, metadata, canonical URLs, social image, structured data, sitemap, report noindex, personalization, saved notes, one-click audit handoff, original scanner, keyboard navigation, native FAQs, no-JS content, and 320–1380px layouts verified",
  );
}
