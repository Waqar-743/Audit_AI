import {
  birds,
  type Preferences,
  type SeoCheck,
  type SeoReport,
} from "./types";

export function normalizePreferences(value: unknown): Preferences {
  const saved =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    nickname:
      typeof saved.nickname === "string" ? saved.nickname.slice(0, 40) : "",
    goal:
      saved.goal === "client work" || saved.goal === "learning SEO"
        ? saved.goal
        : "my site",
    bird: birds.includes(saved.bird as Preferences["bird"])
      ? (saved.bird as Preferences["bird"])
      : "parrot",
  };
}

export const statusLabels = {
  pass: "Passed",
  fail: "Needs a fix",
  review: "Review",
  unknown: "Not checked",
};
export const stageStories = {
  nest: {
    title: "Let's strengthen the nest.",
    text: "Start with the confirmed issues below. Each careful fix gives your page a stronger foundation.",
    bird: "nest",
  },
  fledgling: {
    title: "A little care. Stronger wings.",
    text: "Your page has useful foundations. Work through the fixes, then review the choices that need a human eye.",
    bird: "fledgling",
  },
  flight: {
    title: "Good foundations. Keep exploring.",
    text: "The measured basics look healthy. Review the remaining questions and untested areas before calling this page ready.",
    bird: "flight",
  },
} as const;

const priority = { high: 0, medium: 1, low: 2 };
export function nextSteps(report: SeoReport): SeoCheck[] {
  return report.checks
    .filter((check) => check.status === "fail" || check.status === "review")
    .sort(
      (a, b) =>
        Number(a.status !== "fail") - Number(b.status !== "fail") ||
        priority[a.priority] - priority[b.priority],
    );
}

export function askPip(
  report: SeoReport,
  question: string,
): { message: string; checks: SeoCheck[] } {
  const value = question.toLowerCase();
  const groups: [RegExp, string[]][] = [
    [/title|headline/, ["title", "title-length", "main-heading"]],
    [
      /description|snippet|preview/,
      ["description", "description-length", "social-preview"],
    ],
    [/schema|json|structured|rich result/, ["schema-json", "schema-types"]],
    [
      /index|robots|crawl|canonical/,
      [
        "meta-indexability",
        "header-indexability",
        "canonical",
        "canonical-target",
        "robots-file",
      ],
    ],
    [/image|alt|picture/, ["image-alt"]],
    [/link|anchor/, ["link-names", "generic-links", "link-health"]],
    [/mobile|speed|performance|vitals/, ["viewport", "field-performance"]],
    [
      /heading|content|word|language/,
      ["main-heading", "heading-hierarchy", "page-text", "language"],
    ],
  ];
  const match = groups.find(([pattern]) => pattern.test(value));
  if (match)
    return {
      message:
        "Here's what I actually observed for that topic. Open a finding to see its evidence and the next step.",
      checks: report.checks.filter((check) => match[1].includes(check.id)),
    };
  if (/rank|backlink|citation|traffic|position/.test(value))
    return {
      message:
        "This page audit does not measure rankings, backlinks, traffic, or AI citations. I can help with the on-page evidence below; use verified search-performance data for visibility questions.",
      checks: nextSteps(report).slice(0, 3),
    };
  return {
    message:
      "I suggest this order: confirmed issues first, then useful manual reviews. I'm a local rule-based guide; my answers come from this report, without an AI service.",
    checks: nextSteps(report).slice(0, 4),
  };
}

export function reportMarkdown(report: SeoReport): string {
  return [
    `# SEO field notes: ${report.title}`,
    `URL: ${report.url}`,
    `Captured: ${report.timestamp}`,
    `Mode: ${report.mode}`,
    `Checklist: ${report.counts.pass} passed, ${report.counts.fail} need a fix, ${report.counts.review} review, ${report.counts.unknown} not checked.`,
    "",
    ...report.checks.flatMap((check) => [
      `## ${check.title} — ${statusLabels[check.status]}`,
      check.evidence,
      "",
      `Next step: ${check.advice}`,
      `Reference: ${check.reference}`,
      "",
    ]),
    "## Scope",
    ...report.limitations.map((item) => `- ${item}`),
  ].join("\n");
}

export function metadataSnippet(title: string, description: string): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  return `<title>${escape(title.trim())}</title>\n<meta name="description" content="${escape(description.trim())}">`;
}

// Only generic WebPage markup, with editable facts from this audited page.
export function schemaSnippet(
  report: SeoReport,
  title: string,
  description: string,
): string {
  return `<script type="application/ld+json">\n${JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title.trim() || report.title, url: report.url, ...(description.trim() ? { description: description.trim() } : {}) }, null, 2).replace(/</g, "\\u003c")}\n</script>`;
}

export function isSeoReport(value: unknown): value is SeoReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<SeoReport>;
  try {
    const url = new URL(report.url || "");
    if (!/^(https?:)$/.test(url.protocol) || !url.hostname) return false;
  } catch {
    return false;
  }
  return (
    report.version === 1 &&
    typeof report.id === "string" &&
    typeof report.title === "string" &&
    typeof report.url === "string" &&
    /^https?:\/\//.test(report.url) &&
    typeof report.timestamp === "string" &&
    Number.isFinite(Date.parse(report.timestamp)) &&
    (report.score === null ||
      (typeof report.score === "number" &&
        Number.isFinite(report.score) &&
        report.score >= 0 &&
        report.score <= 100)) &&
    ["rendered", "source"].includes(report.mode || "") &&
    ["nest", "fledgling", "flight"].includes(report.stage || "") &&
    !!report.counts &&
    [
      report.counts.pass,
      report.counts.fail,
      report.counts.review,
      report.counts.unknown,
    ].every((count) => Number.isInteger(count) && count >= 0) &&
    !!report.preview &&
    [
      report.preview.title,
      report.preview.description,
      report.preview.canonical,
    ].every((text) => typeof text === "string") &&
    Array.isArray(report.limitations) &&
    report.limitations.every((item) => typeof item === "string") &&
    Array.isArray(report.checks) &&
    report.checks.every(
      (check) =>
        !!check &&
        typeof check === "object" &&
        typeof check.id === "string" &&
        typeof check.title === "string" &&
        typeof check.evidence === "string" &&
        typeof check.advice === "string" &&
        typeof check.reference === "string" &&
        ["high", "medium", "low"].includes(check.priority) &&
        ["pass", "fail", "review", "unknown"].includes(check.status),
    )
  );
}
