"use client";

/* Original SVGs are deliberately served as plain images for parity with the extension. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  birds,
  categories,
  type Preferences,
  type SeoCheck,
  type SeoReport,
} from "@/shared/seo/types";
import {
  askPip,
  isSeoReport,
  metadataSnippet,
  nextSteps,
  normalizePreferences,
  reportMarkdown,
  schemaSnippet,
  stageStories,
  statusLabels,
} from "@/shared/seo/coach";

type View = "audit" | "tools" | "notebook" | "extension";
const views: { key: View; title: string }[] = [
  { key: "audit", title: "Page audit" },
  { key: "tools", title: "Workbench" },
  { key: "notebook", title: "Field notes" },
  { key: "extension", title: "Chrome extension" },
];
const storageKey = "auditai-pip-v1";

function Finding({ check }: { check: SeoCheck }) {
  return (
    <details className="pip-check">
      <summary>
        <span className="pip-check-title">
          {check.title}
          <small>
            {check.category} · {check.priority} priority
          </small>
        </span>
        <span className="pip-status" data-status={check.status}>
          {statusLabels[check.status]}
        </span>
      </summary>
      <div className="pip-check-body">
        <div className="pip-evidence">{check.evidence}</div>
        <p>{check.advice}</p>
        <div className="pip-check-actions">
          <a
            href={
              check.reference.startsWith("https://")
                ? check.reference
                : "https://developers.google.com/search/docs/"
            }
            target="_blank"
            rel="noreferrer"
          >
            Read the guidance ↗
          </a>
        </div>
      </div>
    </details>
  );
}

export default function AssistantClient({
  initialUrl = "",
  autoStart = false,
}: {
  initialUrl?: string;
  autoStart?: boolean;
}) {
  const [view, setView] = useState<View>("audit");
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState<SeoReport | null>(null);
  const [history, setHistory] = useState<SeoReport[]>([]);
  const [prefs, setPrefs] = useState<Preferences>(normalizePreferences(null));
  const [restored, setRestored] = useState(false);
  const [filter, setFilter] = useState("All");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ReturnType<typeof askPip> | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const hydratedRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    async function restore() {
      try {
        const raw = await Promise.resolve(localStorage.getItem(storageKey));
        const saved = raw ? JSON.parse(raw) : null;
        if (!mounted) return;
        setHistory(
          Array.isArray(saved?.reports)
            ? saved.reports.filter(isSeoReport).slice(0, 20)
            : [],
        );
        setPrefs(normalizePreferences(saved?.preferences));
        const hashView = window.location.hash.slice(1);
        if (views.some((item) => item.key === hashView))
          setView(hashView as View);
      } catch {
        if (mounted)
          setNotice(
            "Local storage is unavailable. You can still audit a page and export its report.",
          );
      } finally {
        if (mounted) {
          hydratedRef.current = true;
          setRestored(true);
        }
      }
    }
    void restore();
    return () => {
      mounted = false;
      requestRef.current?.abort();
    };
  }, [initialUrl, autoStart]);

  // Submit only after restored reports/preferences have committed to the form's handler.
  useEffect(() => {
    if (!restored || !initialUrl || !autoStart || autoStartedRef.current)
      return;
    const frame = requestAnimationFrame(() => {
      autoStartedRef.current = true;
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.hash,
      );
      formRef.current?.requestSubmit();
    });
    return () => cancelAnimationFrame(frame);
  }, [restored, initialUrl, autoStart]);

  function persist(reports: SeoReport[], preferences: Preferences) {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ reports, preferences }),
      );
    } catch {
      setNotice(
        "This browser could not save your field notes. Export the report to keep a copy.",
      );
    }
  }
  function changePreferences(next: Preferences) {
    setPrefs(next);
    persist(history, next);
  }
  function openReport(value: SeoReport) {
    setReport(value);
    setDraftTitle(value.preview.title);
    setDraftDescription(value.preview.description);
    setQuestion("");
    setAnswer(null);
    setFilter("All");
    setView("audit");
  }
  async function runAudit(event: FormEvent) {
    event.preventDefault();
    if (!url.trim()) {
      setError("Enter a public website address to start.");
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    setView("audit");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(25_000),
        ]),
      });
      const data = await response.json();
      if (!response.ok || !isSeoReport(data))
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "The scan could not be completed. Try again.",
        );
      const reports = [data, ...history].slice(0, 20);
      setHistory(reports);
      persist(reports, prefs);
      openReport(data);
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(
        failure instanceof Error && failure.name !== "TimeoutError"
          ? failure.message
          : "The scan timed out. Try again or audit the loaded page with the Chrome extension.",
      );
    } finally {
      if (requestRef.current === controller) {
        setBusy(false);
        requestRef.current = null;
      }
    }
  }
  function cancelAudit() {
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(false);
    setNotice("Scan stopped. Your previous field notes are still here.");
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(
        "Copied. Review the draft before publishing it on your website.",
      );
    } catch {
      setError(
        "Clipboard access is unavailable. Focus this page and try again.",
      );
    }
  }
  function exportReport(format: "json" | "md") {
    if (!report) return;
    const text =
      format === "json"
        ? JSON.stringify(report, null, 2)
        : reportMarkdown(report);
    const objectUrl = URL.createObjectURL(
      new Blob([text], {
        type: format === "json" ? "application/json" : "text/markdown",
      }),
    );
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `pip-audit-${new URL(report.url).hostname}.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }
  function deleteLocalData(reset: boolean) {
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(false);
    const next = reset ? normalizePreferences(null) : prefs;
    setHistory([]);
    setReport(null);
    setAnswer(null);
    setQuestion("");
    setDraftTitle("");
    setDraftDescription("");
    setPrefs(next);
    setError("");
    persist([], next);
    setNotice(
      reset
        ? "Your reports and preferences have been reset on this device."
        : "Saved audits and the current report have been deleted.",
    );
  }
  const ordered =
    report?.checks
      .filter(
        (check) =>
          filter === "All" ||
          (filter === "Needs a fix"
            ? check.status === "fail"
            : filter === "Review"
              ? check.status === "review"
              : check.category === filter),
      )
      .sort(
        (a, b) =>
          ({ fail: 0, review: 1, pass: 2, unknown: 3 })[a.status] -
          { fail: 0, review: 1, pass: 2, unknown: 3 }[b.status],
      ) || [];
  const story = report ? stageStories[report.stage] : null;

  return (
    <div className="pip">
      <a className="pip-skip" href="#pip-main">
        Skip to your audit
      </a>
      <div className="pip-shell">
        <header className="pip-nav">
          <Link href="/" className="pip-brand">
            <img src="/birds/parrot.svg" alt="" width="42" height="36" />
            AuditAI<span className="pip-kicker">/ Pip</span>
          </Link>
          <nav className="pip-nav-links" aria-label="Main navigation">
            <Link href="/" className="pip-hide-mobile">
              Original scanner
            </Link>
            <button
              className="pip-text-button"
              onClick={() => setView("extension")}
            >
              Get the extension ↗
            </button>
          </nav>
        </header>
        <section className="pip-hero">
          <div>
            <span className="pip-kicker">
              A small companion. A stronger website.
            </span>
            <h1>
              Good pages grow.
              <br />
              Give yours <em>wings.</em>
            </h1>
            <p>
              {prefs.nickname
                ? `Hello, ${prefs.nickname}. `
                : "Meet Pip, your parrot guide. "}
              Let&apos;s find the next useful fix for{" "}
              {prefs.goal === "my site"
                ? "your website"
                : prefs.goal === "client work"
                  ? "your client work"
                  : "your next SEO lesson"}
              . Clear evidence, practical drafts, and room for your judgment.
              Completely free.
            </p>
          </div>
          <div className="pip-portrait">
            <img
              src={`/birds/${busy ? "scout" : prefs.bird}.svg`}
              alt="Pip, your parrot companion"
              width="240"
              height="200"
            />
            <span>Your SEO field companion</span>
          </div>
        </section>
        <form ref={formRef} className="pip-entry" onSubmit={runAudit}>
          <label htmlFor="pip-url">Which page are we helping today?</label>
          <div className="pip-url-row">
            <input
              id="pip-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder="https://your-website.com/a-page"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              maxLength={2048}
              aria-describedby="pip-url-help"
              aria-invalid={!!error}
              disabled={busy}
            />
            <button type="submit" disabled={busy}>
              {busy ? "Looking closely…" : "Audit this page ↗"}
            </button>
            {busy && (
              <button
                className="pip-secondary"
                type="button"
                onClick={cancelAudit}
              >
                Stop
              </button>
            )}
          </div>
          <small id="pip-url-help" className="pip-help">
            No account. No API key. No payment. This URL scan reads public HTML;
            the extension checks the page after it renders.
          </small>
        </form>
        {error && (
          <p className="pip-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="pip-notice" role="status">
            {notice}
          </p>
        )}
        <div className="pip-tabs" role="tablist" aria-label="Assistant views">
          {views.map((item, index) => (
            <button
              key={item.key}
              id={`pip-tab-${item.key}`}
              role="tab"
              aria-selected={view === item.key}
              aria-controls={`pip-view-${item.key}`}
              tabIndex={view === item.key ? 0 : -1}
              onClick={() => setView(item.key)}
              onKeyDown={(event) => {
                const target =
                  event.key === "ArrowRight"
                    ? (index + 1) % views.length
                    : event.key === "ArrowLeft"
                      ? (index + views.length - 1) % views.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? views.length - 1
                          : -1;
                if (target >= 0) {
                  event.preventDefault();
                  setView(views[target].key);
                  document
                    .getElementById(`pip-tab-${views[target].key}`)
                    ?.focus();
                }
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
        <main id="pip-main">
          <section
            id="pip-view-audit"
            role="tabpanel"
            aria-labelledby="pip-tab-audit"
            hidden={view !== "audit"}
          >
            {busy ? (
              <div className="pip-loading" role="status">
                <img src="/birds/scout.svg" width="100" height="85" alt="" />
                <h2>Pip is looking closely.</h2>
                <p className="pip-muted">
                  Reading the public page, checking the evidence, and sorting
                  the findings.
                </p>
                <div className="pip-skeleton" />
                <div className="pip-skeleton" />
                <div className="pip-skeleton" />
              </div>
            ) : !report ? (
              <div className="pip-layout">
                <section className="pip-empty">
                  <img
                    src="/birds/egg.svg"
                    alt="An egg, the beginning of your page's journey"
                    width="125"
                    height="105"
                  />
                  <h2>Every good page starts somewhere.</h2>
                  <p>
                    Bring a page. We&apos;ll check what can be measured, explain
                    what needs a human eye, and help you plan the next step.
                  </p>
                  {[
                    {
                      bird: "nest",
                      title: "01 / Build a sound nest",
                      text: "Check the page's title, indexing instructions, canonical, headings, and other foundations.",
                    },
                    {
                      bird: "hatching",
                      title: "02 / Make one useful change",
                      text: "Read the evidence. Draft a title, description, or WebPage schema in the workbench.",
                    },
                    {
                      bird: "flight",
                      title: "03 / Come back a little stronger",
                      text: "Rescan after publishing your changes. Save the lesson in your private field notes.",
                    },
                  ].map((step) => (
                    <div className="pip-route" key={step.bird}>
                      <img
                        src={`/birds/${step.bird}.svg`}
                        alt=""
                        width="45"
                        height="42"
                      />
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.text}</p>
                      </div>
                    </div>
                  ))}
                </section>
                <aside>
                  <div className="pip-card pip-story">
                    <img
                      src="/birds/branch.svg"
                      alt=""
                      width="110"
                      height="92"
                    />
                    <h3>Care beats guesswork.</h3>
                    <p>
                      A checklist can spot missing information. It cannot
                      promise rankings, indexing, or AI citations. Pip tells you
                      what was actually checked.
                    </p>
                  </div>
                  <div className="pip-card">
                    <h3>Keep your work close.</h3>
                    <p className="pip-muted">
                      Your optional name and latest 20 reports stay in this
                      browser. The extension runs its audits entirely on your
                      device.
                    </p>
                    <Link href="/assistant/privacy">
                      Read our privacy notes ↗
                    </Link>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="pip-layout">
                <div>
                  <div className="pip-section-title">
                    <div>
                      <span className="pip-kicker">Your page, observed</span>
                      <h2>{report.title}</h2>
                      <p
                        className="pip-help"
                        style={{ overflowWrap: "anywhere" }}
                      >
                        {report.url}
                        <br />
                        {report.mode === "source"
                          ? "Public HTML"
                          : "Rendered page"}{" "}
                        · {new Date(report.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="pip-score">
                    <div className="pip-score-number">
                      {report.score ?? "—"}
                      <small>/100</small>
                    </div>
                    <div>
                      <h3>Measured checklist</h3>
                      <p className="pip-help">
                        Pass/fail checks only. Reviews and untested checks are
                        excluded. This is not a ranking score.
                      </p>
                    </div>
                  </div>
                  <div className="pip-stats">
                    {(["pass", "fail", "review", "unknown"] as const).map(
                      (status) => (
                        <div className="pip-stat" key={status}>
                          <strong>{report.counts[status]}</strong>
                          <span>{statusLabels[status]}</span>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="pip-filters" aria-label="Filter findings">
                    {["All", "Needs a fix", "Review", ...categories].map(
                      (name) => (
                        <button
                          key={name}
                          aria-pressed={filter === name}
                          onClick={() => setFilter(name)}
                        >
                          {name}
                        </button>
                      ),
                    )}
                  </div>
                  {ordered.length ? (
                    ordered.map((check) => (
                      <Finding key={check.id} check={check} />
                    ))
                  ) : (
                    <p className="pip-notice">No findings in this view.</p>
                  )}
                  <div className="pip-actions">
                    <button
                      className="pip-secondary"
                      onClick={() => exportReport("md")}
                    >
                      Export field notes
                    </button>
                    <button
                      className="pip-secondary"
                      onClick={() => exportReport("json")}
                    >
                      Export JSON
                    </button>
                    <button
                      className="pip-secondary"
                      onClick={() => setView("tools")}
                    >
                      Work on a draft ↗
                    </button>
                  </div>
                </div>
                <aside>
                  {story && (
                    <div className="pip-card pip-story">
                      <img
                        src={`/birds/${story.bird}.svg`}
                        width="110"
                        height="92"
                        alt=""
                      />
                      <h2>{story.title}</h2>
                      <p>{story.text}</p>
                    </div>
                  )}
                  <div className="pip-card">
                    <h3>Your next useful steps</h3>
                    <ol className="pip-list">
                      {nextSteps(report)
                        .slice(0, 3)
                        .map((check) => (
                          <li key={check.id}>
                            {check.title}
                            <br />
                            <span>{statusLabels[check.status]}</span>
                          </li>
                        ))}
                    </ol>
                    <p className="pip-help">
                      Confirmed issues first, then manual reviews.
                    </p>
                  </div>
                  <div className="pip-card">
                    <h3>Ask Pip about this page</h3>
                    <p className="pip-help">
                      A free local guide, grounded in your report.
                    </p>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        setAnswer(askPip(report, question));
                      }}
                    >
                      <label htmlFor="pip-question">Your question</label>
                      <input
                        id="pip-question"
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        maxLength={300}
                        placeholder="What should I fix first?"
                      />
                      <button
                        className="pip-secondary"
                        style={{ marginTop: 10 }}
                      >
                        Ask Pip
                      </button>
                    </form>
                    <div aria-live="polite">
                      {answer && (
                        <>
                          <p className="pip-notice">{answer.message}</p>
                          {answer.checks.map((check) => (
                            <Finding key={check.id} check={check} />
                          ))}
                        </>
                      )}
                    </div>
                    <small className="pip-help">
                      Rule-based guidance. No external AI service.
                    </small>
                  </div>
                  <details className="pip-card">
                    <summary>What we did and didn&apos;t check</summary>
                    <ul className="pip-list" style={{ marginTop: 14 }}>
                      {report.limitations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </details>
                </aside>
              </div>
            )}
          </section>
          <section
            id="pip-view-tools"
            role="tabpanel"
            aria-labelledby="pip-tab-tools"
            hidden={view !== "tools"}
          >
            <div className="pip-layout">
              <div className="pip-fields">
                <div>
                  <span className="pip-kicker">Make a useful draft</span>
                  <h2>Your page workbench.</h2>
                  <p className="pip-muted">
                    Use your own words and verified facts. Pip never publishes
                    changes to a website.
                  </p>
                </div>
                <div>
                  <label htmlFor="pip-draft-title">Page title</label>
                  <input
                    id="pip-draft-title"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    maxLength={250}
                    placeholder="A useful, specific page title"
                  />
                  <small className="pip-help">
                    {draftTitle.length} characters · descriptive beats a rigid
                    character target.
                  </small>
                </div>
                <div>
                  <label htmlFor="pip-draft-description">
                    Search description
                  </label>
                  <textarea
                    id="pip-draft-description"
                    value={draftDescription}
                    onChange={(event) =>
                      setDraftDescription(event.target.value)
                    }
                    maxLength={600}
                    placeholder="What does this page help a visitor do?"
                  />
                  <small className="pip-help">
                    {draftDescription.length} characters · search engines can
                    choose a different snippet.
                  </small>
                </div>
                <div className="pip-actions">
                  <button
                    onClick={() => {
                      if (!draftTitle.trim() || !draftDescription.trim()) {
                        setError(
                          "Add a title and description before copying metadata.",
                        );
                        return;
                      }
                      void copy(metadataSnippet(draftTitle, draftDescription));
                    }}
                  >
                    Copy metadata
                  </button>
                  <button
                    className="pip-secondary"
                    onClick={() => {
                      if (!report) {
                        setError(
                          "Audit a page first so the draft uses its real URL.",
                        );
                        return;
                      }
                      void copy(
                        schemaSnippet(report, draftTitle, draftDescription),
                      );
                    }}
                  >
                    Copy WebPage JSON-LD
                  </button>
                </div>
                <p className="pip-help">
                  JSON-LD uses only your page URL and edited text. Validate it
                  before publishing. It does not establish rich-result
                  eligibility.
                </p>
              </div>
              <aside className="pip-card">
                <img src="/birds/feather.svg" alt="" width="90" height="75" />
                <h3>Illustrative search preview</h3>
                <div className="pip-preview">
                  <small>
                    {report ? new URL(report.url).hostname : "your-website.com"}
                  </small>
                  <strong>{draftTitle || "Your page title"}</strong>
                  <p>
                    {draftDescription ||
                      "A clear summary of what someone will find on this page."}
                  </p>
                </div>
                <small className="pip-help">
                  An editing aid; actual search appearance will vary.
                </small>
              </aside>
            </div>
          </section>
          <section
            id="pip-view-notebook"
            role="tabpanel"
            aria-labelledby="pip-tab-notebook"
            hidden={view !== "notebook"}
          >
            <div className="pip-layout">
              <div>
                <span className="pip-kicker">Your private little notebook</span>
                <h2>Field notes worth keeping.</h2>
                <p className="pip-muted">
                  The latest 20 audits, saved in this browser. No account or
                  cloud sync.
                </p>
                {!history.length ? (
                  <div className="pip-empty">
                    <img
                      src="/birds/homecoming.svg"
                      alt="A parrot returning to its nest"
                      width="125"
                      height="105"
                    />
                    <h3>Your first field note is waiting.</h3>
                    <p>
                      Audit a page to start. Export any report when you want a
                      copy to keep or share.
                    </p>
                  </div>
                ) : (
                  history.map((item) => (
                    <article className="pip-history-row" key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <small>
                          {new URL(item.url).hostname} ·{" "}
                          {new Date(item.timestamp).toLocaleString()} ·{" "}
                          {item.mode}
                        </small>
                      </div>
                      <button
                        className="pip-secondary"
                        onClick={() => openReport(item)}
                      >
                        Open report
                      </button>
                    </article>
                  ))
                )}
                <div className="pip-actions">
                  <button
                    className="pip-secondary"
                    onClick={() => deleteLocalData(false)}
                  >
                    Delete saved audits
                  </button>
                  <button
                    className="pip-secondary"
                    onClick={() => deleteLocalData(true)}
                  >
                    Reset all local data
                  </button>
                </div>
              </div>
              <aside className="pip-card">
                <h3>Make yourself at home.</h3>
                <div className="pip-fields">
                  <div>
                    <label htmlFor="pip-nickname">
                      What should Pip call you? (optional)
                    </label>
                    <input
                      id="pip-nickname"
                      autoComplete="off"
                      maxLength={40}
                      value={prefs.nickname}
                      onChange={(event) =>
                        changePreferences({
                          ...prefs,
                          nickname: event.target.value,
                        })
                      }
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="pip-goal">What are you working on?</label>
                    <select
                      id="pip-goal"
                      value={prefs.goal}
                      onChange={(event) =>
                        changePreferences(
                          normalizePreferences({
                            ...prefs,
                            goal: event.target.value,
                          }),
                        )
                      }
                    >
                      <option value="my site">My website</option>
                      <option value="client work">Client work</option>
                      <option value="learning SEO">Learning SEO</option>
                    </select>
                  </div>
                  <div>
                    <h3>Choose Pip&apos;s look.</h3>
                    <p className="pip-help">
                      15 original illustrations, from first egg to homecoming.
                    </p>
                    <div className="pip-birds">
                      {birds.map((bird) => (
                        <button
                          key={bird}
                          aria-label={`Choose ${bird}`}
                          title={bird}
                          aria-pressed={prefs.bird === bird}
                          onClick={() => changePreferences({ ...prefs, bird })}
                        >
                          <img
                            src={`/birds/${bird}.svg`}
                            alt=""
                            width="60"
                            height="50"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>
          <section
            id="pip-view-extension"
            role="tabpanel"
            aria-labelledby="pip-tab-extension"
            hidden={view !== "extension"}
          >
            <div className="pip-layout">
              <div>
                <span className="pip-kicker">A companion in your browser</span>
                <h2>Keep Pip beside the page.</h2>
                <p className="pip-muted">
                  The same free checklist, with access to the rendered page and
                  temporary element highlights. All analysis happens locally.
                </p>
                <div className="pip-actions">
                  <a
                    className="pip-button"
                    href="/downloads/auditai-pip.zip"
                    download
                  >
                    Download Chrome extension
                  </a>
                </div>
                <p className="pip-help">
                  Unpacked extension · Chrome 120+ · no account · no API keys
                </p>
                {[
                  {
                    bird: "egg",
                    title: "01 / Unzip your download",
                    text: "Extract auditai-pip.zip into a folder you can keep on your computer.",
                  },
                  {
                    bird: "nest",
                    title: "02 / Give Pip a home",
                    text: "Open chrome://extensions. Turn on Developer mode, choose Load unpacked, and select the extracted folder containing manifest.json.",
                  },
                  {
                    bird: "parrot",
                    title: "03 / Open a page and say hello",
                    text: "Pin AuditAI · Pip SEO assistant. Visit a webpage, click the parrot toolbar icon, then select Audit this page.",
                  },
                ].map((step) => (
                  <div className="pip-route" key={step.title}>
                    <img
                      src={`/birds/${step.bird}.svg`}
                      alt=""
                      width="45"
                      height="42"
                    />
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </div>
                ))}
                <p className="pip-notice">
                  This download is installed manually using Chrome&apos;s
                  Developer mode. It has not been published to the Chrome Web
                  Store.
                </p>
              </div>
              <aside className="pip-card pip-story">
                <img
                  src="/birds/flock.svg"
                  width="110"
                  height="92"
                  alt="Two parrots on a branch"
                />
                <h3>Your browser. Your field notes.</h3>
                <p>
                  No all-sites access, cookies, or browsing-history permission.
                  Pip reads a page after you ask, stores your latest 20 reports
                  locally, and makes no network requests.
                </p>
                <Link href="/assistant/privacy">
                  Read privacy & audit scope ↗
                </Link>
              </aside>
            </div>
          </section>
        </main>
        <footer className="pip-footer">
          <span>Made for careful work. Free for everyone.</span>
          <span>
            <Link href="/">Original AuditAI website</Link> ·{" "}
            <Link href="/assistant/privacy">Privacy & scope</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
