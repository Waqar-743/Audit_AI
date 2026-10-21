import { auditPage } from "../src/shared/seo/audit";
import { extractDocument } from "../src/shared/seo/extract-document";
import {
  birds,
  categories,
  type Preferences,
  type SeoCheck,
  type SeoReport,
} from "../src/shared/seo/types";
import {
  askPip,
  isSeoReport,
  metadataSnippet,
  normalizePreferences,
  reportMarkdown,
  schemaSnippet,
  stageStories,
  statusLabels,
} from "../src/shared/seo/coach";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
let report: SeoReport | null = null;
let history: SeoReport[] = [];
let auditedTab: number | null = null;
let filter = "All";
let prefs: Preferences = normalizePreferences(null);

function notify(message: string, error = false) {
  $("message").hidden = true;
  $("error").hidden = true;
  const node = $(error ? "error" : "message");
  node.textContent = message;
  node.hidden = false;
}
async function persist() {
  try {
    await chrome.storage.local.set({
      pipReports: history,
      pipPreferences: prefs,
    });
  } catch {
    notify(
      "The audit is ready, but local storage is unavailable. Export the report to keep it.",
    );
  }
}
function greet() {
  const goal =
    prefs.goal === "my site"
      ? "your website"
      : prefs.goal === "client work"
        ? "your client work"
        : "your next SEO lesson";
  $("greeting").textContent =
    `${prefs.nickname ? `Hello, ${prefs.nickname}. ` : "I'm Pip. "}Let's find the next useful fix for ${goal}.`;
  $<HTMLImageElement>("mascot").src = `birds/${prefs.bird}.svg`;
}
function switchView(name: string) {
  for (const view of ["audit", "tools", "notebook"]) {
    const active = view === name;
    $("view-" + view).hidden = !active;
    $("tab-" + view).setAttribute("aria-selected", String(active));
    $("tab-" + view).tabIndex = active ? 0 : -1;
  }
}
function download(format: "json" | "md") {
  if (!report) return;
  const content =
    format === "json"
      ? JSON.stringify(report, null, 2)
      : reportMarkdown(report);
  const url = URL.createObjectURL(
    new Blob([content], {
      type: format === "json" ? "application/json" : "text/markdown",
    }),
  );
  const link = element("a");
  link.href = url;
  link.download = `pip-audit-${new URL(report.url).hostname}.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
async function highlight(check: SeoCheck) {
  if (!report || !check.selector || auditedTab === null) {
    notify("Run a fresh audit on the current page before highlighting.");
    return;
  }
  try {
    const tab = await chrome.tabs.get(auditedTab);
    if (tab.url !== report.url) {
      notify("The page has changed. Run a fresh audit before highlighting.");
      return;
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: auditedTab },
      func: (selector: string, id: string) => {
        const nodes = Array.from(document.querySelectorAll(selector))
          .filter((node) => {
            if (id !== "link-names") return true;
            const labelled = (node.getAttribute("aria-labelledby") || "")
              .split(/\s+/)
              .filter(Boolean)
              .map((key) => document.getElementById(key)?.textContent || "")
              .join("");
            const imageText = Array.from(node.querySelectorAll("img[alt]"))
              .map((img) => img.getAttribute("alt") || "")
              .join("");
            return !(
              (node.getAttribute("aria-label") || "").trim() ||
              labelled.trim() ||
              ((node as HTMLElement).innerText || "").trim() ||
              imageText
            ).trim();
          })
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        if (!nodes.length) return 0;
        nodes[0].scrollIntoView({ behavior: "instant", block: "center" });
        for (const node of nodes.slice(0, 30)) {
          const rect = node.getBoundingClientRect();
          const overlay = document.createElement("div");
          Object.assign(overlay.style, {
            position: "fixed",
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            outline: "3px solid #a8ff57",
            outlineOffset: "3px",
            background: "rgba(168,255,87,.10)",
            pointerEvents: "none",
            zIndex: "2147483647",
            borderRadius: "3px",
          });
          overlay.setAttribute("aria-hidden", "true");
          document.documentElement.append(overlay);
          setTimeout(() => overlay.remove(), 4_000);
        }
        return nodes.length;
      },
      args: [check.selector, check.id],
    });
    notify(
      results[0]?.result
        ? "Matching page elements are highlighted for four seconds."
        : "This finding has no visible matching element. Review the evidence or page source.",
    );
  } catch {
    notify(
      "Page access expired. Click Pip's toolbar icon on this page, then audit it again.",
      true,
    );
  }
}
function finding(check: SeoCheck): HTMLDetailsElement {
  const details = element("details", "pip-check");
  const summary = element("summary");
  const heading = element("span", "pip-check-title", check.title);
  heading.append(
    element("small", "", `${check.category} · ${check.priority} priority`),
  );
  const status = element("span", "pip-status", statusLabels[check.status]);
  status.dataset.status = check.status;
  summary.append(heading, status);
  const body = element("div", "pip-check-body");
  body.append(
    element("div", "pip-evidence", check.evidence),
    element("p", "", check.advice),
  );
  const actions = element("div", "pip-check-actions");
  const link = element("a", "", "Read the guidance ↗");
  link.href = check.reference.startsWith("https://")
    ? check.reference
    : "https://developers.google.com/search/docs/";
  link.target = "_blank";
  link.rel = "noreferrer";
  actions.append(link);
  if (check.selector && auditedTab !== null) {
    const button = element("button", "pip-text-button", "Show on page");
    button.onclick = () => void highlight(check);
    actions.append(button);
  }
  body.append(actions);
  details.append(summary, body);
  return details;
}
function renderPreview() {
  const preview = $("preview");
  preview.replaceChildren();
  preview.append(
    element(
      "small",
      "",
      report ? new URL(report.url).hostname : "your-website.com",
    ),
    element(
      "strong",
      "",
      $<HTMLInputElement>("draft-title").value || "Your page title",
    ),
    element(
      "p",
      "",
      $<HTMLTextAreaElement>("draft-description").value ||
        "Your useful page summary will appear here.",
    ),
  );
}
function renderReport() {
  $("empty").hidden = !!report;
  $("report").hidden = !report;
  const container = $("report");
  container.replaceChildren();
  if (!report) return;
  const current = report;
  const story = stageStories[current.stage];
  const storyNode = element("section", "pip-card pip-story");
  const image = element("img");
  image.src = `birds/${story.bird}.svg`;
  image.alt = "";
  storyNode.append(
    image,
    element("h2", "", story.title),
    element("p", "", story.text),
  );
  container.append(storyNode);
  const caption = element("p", "pip-muted", current.url);
  caption.style.overflowWrap = "anywhere";
  container.append(caption);
  const score = element("div", "pip-score");
  const number = element(
    "div",
    "pip-score-number",
    current.score === null ? "—" : String(current.score),
  );
  number.append(element("small", "", "/100"));
  const label = element("div");
  label.append(
    element("h3", "", "Measured checklist"),
    element(
      "p",
      "pip-help",
      "Pass/fail checks only. Review and untested checks are excluded. This is not a ranking score.",
    ),
  );
  score.append(number, label);
  container.append(score);
  const stats = element("div", "pip-stats");
  for (const status of ["pass", "fail", "review", "unknown"] as const) {
    const stat = element("div", "pip-stat");
    stat.append(
      element("strong", "", String(current.counts[status])),
      element("span", "", statusLabels[status]),
    );
    stats.append(stat);
  }
  container.append(stats);
  const filters = element("div", "pip-filters");
  for (const name of ["All", "Needs a fix", "Review", ...categories]) {
    const button = element("button", "", name);
    button.setAttribute("aria-pressed", String(filter === name));
    button.onclick = () => {
      filter = name;
      renderReport();
    };
    filters.append(button);
  }
  container.append(filters);
  const findings = current.checks.filter(
    (check) =>
      filter === "All" ||
      (filter === "Needs a fix"
        ? check.status === "fail"
        : filter === "Review"
          ? check.status === "review"
          : check.category === filter),
  );
  if (!findings.length)
    container.append(element("p", "pip-notice", "No findings in this view."));
  const order = { fail: 0, review: 1, pass: 2, unknown: 3 };
  findings
    .sort((a, b) => order[a.status] - order[b.status])
    .forEach((check) => container.append(finding(check)));
  const ask = element("section", "pip-card");
  ask.append(
    element("h3", "", "Ask Pip about this page"),
    element(
      "p",
      "pip-help",
      "A free local guide, grounded in this report. Try “What should I fix first?” or “Explain schema”.",
    ),
  );
  const form = element("form");
  const labelNode = element("label", "", "Your question");
  labelNode.htmlFor = "ask-pip";
  const input = element("input");
  input.id = "ask-pip";
  input.maxLength = 300;
  input.placeholder = "What should I fix first?";
  const answer = element("div");
  answer.setAttribute("aria-live", "polite");
  const button = element("button", "pip-secondary", "Ask Pip");
  button.type = "submit";
  form.append(labelNode, input, button);
  form.onsubmit = (event) => {
    event.preventDefault();
    const response = askPip(current, input.value);
    answer.replaceChildren(
      element("p", "pip-notice", response.message),
      ...response.checks.map(finding),
    );
  };
  ask.append(form, answer);
  container.append(ask);
  const actions = element("div", "pip-actions");
  for (const format of ["json", "md"] as const) {
    const button = element(
      "button",
      "pip-secondary",
      `Export ${format === "json" ? "JSON" : "notes"}`,
    );
    button.onclick = () => download(format);
    actions.append(button);
  }
  container.append(actions);
  const scope = element("details", "pip-section");
  scope.append(
    element("summary", "pip-help", "What this audit can and cannot tell you"),
  );
  const list = element("ul", "pip-list");
  current.limitations.forEach((item) => list.append(element("li", "", item)));
  scope.append(list);
  container.append(scope);
}
function showReport(value: SeoReport, tab: number | null = null) {
  report = value;
  auditedTab = tab;
  filter = "All";
  $<HTMLInputElement>("draft-title").value = value.preview.title;
  $<HTMLTextAreaElement>("draft-description").value = value.preview.description;
  renderReport();
  renderPreview();
  switchView("audit");
}
function renderHistory() {
  const container = $("history");
  container.replaceChildren();
  if (!history.length)
    container.append(
      element(
        "p",
        "pip-notice",
        "Your first field note is waiting. Run a page audit to start.",
      ),
    );
  for (const item of history) {
    const row = element("article", "pip-history-row");
    const info = element("div");
    info.append(
      element("strong", "", item.title),
      element(
        "small",
        "",
        `${new URL(item.url).hostname} · ${new Date(item.timestamp).toLocaleString()} · ${item.mode}`,
      ),
    );
    const button = element("button", "pip-secondary", "Open");
    button.onclick = () => showReport(item);
    row.append(info, button);
    container.append(row);
  }
}
async function runAudit() {
  $<HTMLButtonElement>("audit").disabled = true;
  $("loading").hidden = false;
  $("empty").hidden = true;
  $("report").hidden = true;
  $("error").hidden = true;
  $("message").hidden = true;
  switchView("audit");
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (
      !tab?.id ||
      !tab.url ||
      !/^https?:\/\//.test(tab.url) ||
      /^https:\/\/(chromewebstore.google.com|chrome.google.com\/webstore)/.test(
        tab.url,
      )
    )
      throw new Error(
        "Open a regular HTTP or HTTPS webpage, then click Pip's toolbar icon. Browser settings and store pages cannot be audited.",
      );
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractDocument,
    });
    const snapshot = results[0]?.result;
    if (!snapshot)
      throw new Error(
        "No page content was returned. Wait for the page to finish loading and try again.",
      );
    const value = auditPage(snapshot);
    history = [value, ...history].slice(0, 20);
    showReport(value, tab.id);
    renderHistory();
    await persist();
  } catch (error) {
    notify(
      error instanceof Error &&
        !/Cannot access|permission|extensions gallery|frame.*removed|No tab/i.test(
          error.message,
        )
        ? error.message
        : "Page access expired. Click Pip's toolbar icon on this webpage, then try the audit again.",
      true,
    );
  } finally {
    $<HTMLButtonElement>("audit").disabled = false;
    $("loading").hidden = true;
    $("empty").hidden = !!report;
    $("report").hidden = !report;
  }
}

async function initialize() {
  try {
    const stored = await chrome.storage.local.get([
      "pipReports",
      "pipPreferences",
    ]);
    history = Array.isArray(stored.pipReports)
      ? stored.pipReports.filter(isSeoReport).slice(0, 20)
      : [];
    prefs = normalizePreferences(stored.pipPreferences);
  } catch {
    notify(
      "Local storage is unavailable. You can still audit and export reports.",
    );
  }
  $<HTMLInputElement>("nickname").value = prefs.nickname;
  $<HTMLSelectElement>("goal").value = prefs.goal;
  greet();
  renderHistory();
  renderPreview();
  for (const bird of birds) {
    const button = element("button");
    button.title = bird;
    button.setAttribute("aria-label", `Choose ${bird}`);
    button.setAttribute("aria-pressed", String(bird === prefs.bird));
    const image = element("img");
    image.src = `birds/${bird}.svg`;
    image.alt = "";
    button.append(image);
    button.onclick = () => {
      prefs.bird = bird;
      $("bird-picker")
        .querySelectorAll("button")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      greet();
      void persist();
    };
    $("bird-picker").append(button);
  }
}
$("audit").onclick = () => void runAudit();
for (const view of ["audit", "tools", "notebook"]) {
  $("tab-" + view).onclick = () => switchView(view);
  $("tab-" + view).onkeydown = (event) => {
    const names = ["audit", "tools", "notebook"];
    const index = names.indexOf(view);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 3
        : event.key === "ArrowLeft"
          ? (index + 2) % 3
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 2
              : -1;
    if (next >= 0) {
      event.preventDefault();
      switchView(names[next]);
      $("tab-" + names[next]).focus();
    }
  };
}
for (const id of ["draft-title", "draft-description"])
  $(id).oninput = renderPreview;
for (const id of ["nickname", "goal"])
  $(id).onchange = () => {
    prefs = normalizePreferences({
      ...prefs,
      nickname: $<HTMLInputElement>("nickname").value.trim(),
      goal: $<HTMLSelectElement>("goal").value,
    });
    greet();
    void persist();
  };
async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    notify("Copied. Review the draft before publishing.");
  } catch {
    notify(
      "Clipboard access was unavailable. Try again with the panel focused.",
      true,
    );
  }
}
$("copy-meta").onclick = () => {
  const title = $<HTMLInputElement>("draft-title").value;
  const description = $<HTMLTextAreaElement>("draft-description").value;
  if (!title.trim() || !description.trim()) {
    notify("Add a title and description before copying metadata.", true);
    return;
  }
  void copy(metadataSnippet(title, description));
};
$("copy-schema").onclick = () => {
  if (!report) {
    notify("Audit a page first so the draft uses its real URL.", true);
    return;
  }
  void copy(
    schemaSnippet(
      report,
      $<HTMLInputElement>("draft-title").value,
      $<HTMLTextAreaElement>("draft-description").value,
    ),
  );
};
async function clear(reset: boolean) {
  history = [];
  report = null;
  auditedTab = null;
  if (reset) {
    prefs = { nickname: "", goal: "my site", bird: "parrot" };
    $<HTMLInputElement>("nickname").value = "";
    $<HTMLSelectElement>("goal").value = "my site";
    $("bird-picker")
      .querySelectorAll("button")
      .forEach((button) =>
        button.setAttribute("aria-pressed", String(button.title === "parrot")),
      );
    greet();
  }
  $<HTMLInputElement>("draft-title").value = "";
  $<HTMLTextAreaElement>("draft-description").value = "";
  await persist();
  renderReport();
  renderHistory();
  renderPreview();
  notify(
    reset
      ? "Your reports and preferences have been reset on this device."
      : "Saved audits and the current report have been deleted.",
  );
}
$("clear-history").onclick = () => void clear(false);
$("reset").onclick = () => void clear(true);
void initialize();
