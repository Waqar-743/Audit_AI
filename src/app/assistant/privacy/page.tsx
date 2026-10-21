import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pip privacy & audit scope | AuditAI",
};

export default function PrivacyPage() {
  return (
    <div className="pip">
      <main className="pip-shell">
        <header className="pip-nav">
          <Link href="/assistant" className="pip-brand">
            AuditAI / Pip
          </Link>
          <Link href="/assistant">Back to your assistant ↗</Link>
        </header>
        <section
          className="pip-section"
          style={{ maxWidth: 760, paddingTop: 50 }}
        >
          <span className="pip-kicker">A small footprint</span>
          <h1 style={{ fontSize: 38, marginBottom: 24 }}>
            Your work stays yours.
          </h1>
          <p>
            Pip is free and requires no account, email address, payment, or
            provider key. The assistant does not add analytics, tracking
            cookies, or an external AI service.
          </p>
          <h2>Website URL audits</h2>
          <p>
            When you submit a public URL, our server requests that page and
            checks its initial HTML. The submitted URL and normal request
            metadata may appear in infrastructure logs maintained by the hosting
            provider. Page HTML and reports are processed in memory for the
            response; this assistant does not save them to a server database. Do
            not submit private URLs or addresses containing access tokens.
          </p>
          <p>
            The website does not execute the target page&apos;s JavaScript. If a
            site blocks our request or loads content dynamically, use the
            extension to inspect the page already open in your browser.
          </p>
          <h2>Chrome extension</h2>
          <p>
            The extension reads the current page only after you invoke the
            toolbar icon and click to audit it. It runs the audit locally and
            makes no network requests. It requests activeTab, scripting,
            storage, and sidePanel permissions, with no all-sites access,
            cookies, or browsing-history permissions. External links open only
            when you choose them.
          </p>
          <h2>Local field notes</h2>
          <p>
            Your optional name, chosen illustration, work goal, and latest 20
            reports stay in this browser. The website uses localStorage; the
            extension uses chrome.storage.local. These stores are separate and
            do not synchronize. Reports contain the page URL, title, short
            evidence excerpts, findings, and capture time. A signed-in page can
            contain private information, so review reports before exporting or
            sharing them.
          </p>
          <p>
            Use Field notes to delete saved audits or reset reports and
            preferences. This also clears the displayed report and drafts.
            Removing the extension removes its local storage. Clearing this
            website&apos;s browser storage removes its field notes.
          </p>
          <h2>Honest audit boundaries</h2>
          <p>
            Pip checks on-page declarations and observable structure. The
            checklist score is passed pass/fail checks divided by all pass/fail
            checks. Reviews and unknowns are excluded. It is not a Google score
            or a prediction of rankings, actual indexing, traffic, or AI
            citations.
          </p>
          <p>
            Neither mode measures backlinks, site-wide duplication, robots.txt
            rules, broken-link destinations, or real Core Web Vitals. The
            website observes response status and X-Robots-Tag; the extension
            does not. Structured-data checks parse JSON and list observed types;
            use a dedicated validator to establish vocabulary validity and
            rich-result requirements.
          </p>
          <h2>Drafts stay drafts</h2>
          <p>
            Workbench titles, descriptions, and generic WebPage JSON-LD are
            generated from your inputs and the audited URL. Validate factual
            accuracy and markup before publishing. Pip does not modify your
            website or promise search appearance.
          </p>
          <p>
            <Link href="/assistant">Back to Pip ↗</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
