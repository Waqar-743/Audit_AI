"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import HomeJourney from "./HomeJourney";
import PipInvitation from "@/components/assistant/PipInvitation";
import { RELEASE_URL } from "@/lib/site";
import styles from "./home.module.css";

const features = [
  {
    bird: "scout",
    title: "Help search engines find the right page",
    text: "Review titles, descriptions, canonical declarations, and indexing instructions. Understand what each finding means before you change it.",
    detail: "Titles · descriptions · canonicals · robots meta",
  },
  {
    bird: "feather",
    title: "Make the page easier to read",
    text: "Look at headings, readable text, language, and mobile viewport declarations. Useful content matters more than a rigid word-count target.",
    detail: "Heading structure · language · mobile viewport",
  },
  {
    bird: "map",
    title: "Care for the small connections",
    text: "Check image text alternatives and link names. Keep decorative images decorative, and make meaningful destinations easier to understand.",
    detail: "Image alternatives · descriptive links · context",
  },
  {
    bird: "compass",
    title: "Give structured data a careful look",
    text: "Find JSON-LD syntax errors and see the types declared on the page. Pip points you to dedicated validators for the checks it cannot establish.",
    detail: "JSON syntax · observed types · validation guidance",
  },
];
const questions = [
  {
    q: "Is Pip really free, without an account?",
    a: "Yes. Page audits, every finding, the metadata workbench, exports, personalization, and the Chrome extension are free. There is no signup, payment, credit system, or API key requirement.",
  },
  {
    q: "What is the difference between the website and the extension?",
    a: "The website checks the initial HTML returned by a public webpage and observes its response status and indexing headers. The Chrome extension checks the current rendered page locally and can highlight matching elements. It makes no network requests. Each report labels what was checked and what remains untested.",
  },
  {
    q: "Can Pip check a page built with JavaScript?",
    a: "Use the Chrome extension to inspect content that has already loaded in your browser. The website's URL audit does not execute the target page's JavaScript. The original readiness scanner remains available separately below.",
  },
  {
    q: "Does the score guarantee rankings or AI citations?",
    a: "No. The checklist score is passed pass/fail checks divided by all pass/fail checks. Manual reviews and unknown checks are excluded. It does not measure actual indexing, rankings, traffic, or AI citations. Pip helps you make informed changes from observed evidence.",
  },
  {
    q: "Where do my name and reports go?",
    a: "Your optional name, chosen illustration, work goal, and latest 20 reports stay in this browser. The website and extension have separate local stores. You can export reports, delete saved audits, or reset local preferences. No account is created.",
  },
  {
    q: "Will Pip change my website for me?",
    a: "No. The workbench creates metadata and WebPage JSON-LD drafts for you to review and copy. The extension can temporarily highlight matching elements, but never publishes or saves edits to your website.",
  },
];

export default function HomePageContent({
  onClassicScan,
  scanActive,
  children,
}: {
  onClassicScan: (url: string) => Promise<void>;
  scanActive: boolean;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [classicUrl, setClassicUrl] = useState("");
  const [classicError, setClassicError] = useState("");
  return (
    <div className={styles.page}>
      <div inert={scanActive}>
        <a className={styles.skip} href="#main-content">
          Skip to page content
        </a>
        <nav
          className={styles.nav}
          aria-label="Main navigation"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMenuOpen(false);
              document.getElementById("home-menu-toggle")?.focus();
            }
          }}
        >
          <Link
            href="/"
            className={styles.brand}
            aria-label="AuditAI with Pip, home"
          >
            <Image src="/birds/parrot.svg" alt="" width={41} height={35} />
            <span>
              AuditAI<small>WITH PIP</small>
            </span>
          </Link>
          <ul
            id="home-navigation"
            className={`${styles.links} ${menuOpen ? styles.menuOpen : ""}`}
          >
            {[
              { href: "#features", text: "What Pip checks" },
              { href: "#how", text: "Your next steps" },
              { href: "#faq", text: "Questions" },
              { href: "/assistant#extension", text: "Chrome extension" },
            ].map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setMenuOpen(false)}>
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
          <div className={styles.navActions}>
            <Link href="/assistant" className={styles.navButton}>
              Open Pip ↗
            </Link>
            <button
              id="home-menu-toggle"
              type="button"
              className={styles.menuButton}
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="home-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path d="m6 6 12 12M18 6 6 18" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>
        <main id="main-content">
          <HomeJourney />
          <div className={styles.trust} aria-label="Pip's commitments">
            <span>
              <strong>Free</strong> for every page audit
            </span>
            <span>
              <strong>No signup</strong> or API keys
            </span>
            <span>
              <strong>Evidence</strong> before advice
            </span>
            <span>
              <strong>Your notes</strong> stay local
            </span>
          </div>
          <section
            id="features"
            className={styles.contentSection}
            aria-labelledby="features-title"
          >
            <span className={styles.kicker}>
              Look closely. Change thoughtfully.
            </span>
            <h2 id="features-title" className={styles.heading}>
              SEO checks you can
              <br />
              <em>actually understand.</em>
            </h2>
            <p className={styles.sectionIntro}>
              A useful SEO audit should show what was found, why it matters, and
              what to do next. Pip separates confirmed findings, manual reviews,
              and areas that were not tested.
            </p>
            <div className={styles.featureGrid}>
              {features.map((feature) => (
                <article className={styles.feature} key={feature.bird}>
                  <div className={styles.featureTop}>
                    <Image
                      src={`/birds/${feature.bird}.svg`}
                      alt=""
                      width={56}
                      height={47}
                    />
                    <h3>{feature.title}</h3>
                  </div>
                  <p>{feature.text}</p>
                  <small>{feature.detail}</small>
                </article>
              ))}
            </div>
          </section>
          <div className={styles.storyBand}>
            <section
              id="how"
              className={styles.contentSection}
              aria-labelledby="how-title"
            >
              <span className={styles.kicker}>
                Every good page starts somewhere
              </span>
              <h2 id="how-title" className={styles.heading}>
                A nest. A little care.
                <br />
                <em>Stronger wings.</em>
              </h2>
              <p className={styles.sectionIntro}>
                You do not have to fix everything in one sitting. Bring one page
                and leave with one useful next step.
              </p>
              <ol className={styles.storySteps}>
                {[
                  {
                    bird: "egg",
                    count: "01 / THE FIRST PAGE",
                    title: "Bring something worth caring for.",
                    text: "Start with a public homepage, a service, or an article. Use the website for its HTML, or the extension for the page already open in Chrome.",
                  },
                  {
                    bird: "hatching",
                    count: "02 / THE USEFUL CHANGE",
                    title: "Follow the evidence, not a guess.",
                    text: "Open a finding, see exactly what Pip observed, and draft a title, description, or WebPage schema. Review the facts before publishing.",
                  },
                  {
                    bird: "flight",
                    count: "03 / THE NEXT VISIT",
                    title: "Keep the lesson. Come back stronger.",
                    text: "Publish your chosen change, rescan the page, and compare your own field notes. Good work grows through small, considered improvements.",
                  },
                ].map((step) => (
                  <li className={styles.storyStep} key={step.bird}>
                    <Image
                      src={`/birds/${step.bird}.svg`}
                      alt=""
                      width={78}
                      height={66}
                    />
                    <div>
                      <span>{step.count}</span>
                      <h3>{step.title}</h3>
                    </div>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <section
            className={styles.contentSection}
            aria-labelledby="yours-title"
          >
            <span className={styles.kicker}>
              A companion, not another account
            </span>
            <h2 id="yours-title" className={styles.heading}>
              A little more <em>yours.</em>
            </h2>
            <p className={styles.sectionIntro}>
              Give Pip a name to greet, a goal to understand, and a place to
              keep your notes. Every choice is optional. There are no locked
              findings or paid upgrades.
            </p>
            <div className={styles.facts}>
              {[
                {
                  count: "0",
                  label: "accounts to create",
                  text: "Open the assistant and start with a page.",
                },
                {
                  count: "15",
                  label: "original bird illustrations",
                  text: "Choose a look that feels like your companion.",
                },
                {
                  count: "20",
                  label: "recent field notes",
                  text: "Stored in this browser, with export and delete controls.",
                },
                {
                  count: "2",
                  label: "ways to look closely",
                  text: "Public HTML on the web, rendered content in Chrome.",
                },
              ].map((fact) => (
                <div key={fact.label}>
                  <strong>{fact.count}</strong>
                  <span>{fact.label}</span>
                  <p>{fact.text}</p>
                </div>
              ))}
            </div>
          </section>
          <div className={styles.invitation}>
            <PipInvitation />
          </div>
          <section
            id="faq"
            className={styles.contentSection}
            aria-labelledby="faq-title"
          >
            <span className={styles.kicker}>Before we take a look</span>
            <h2 id="faq-title" className={styles.heading}>
              A few useful <em>answers.</em>
            </h2>
            <div className={styles.faq}>
              {questions.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
          <details id="original-scanner" className={styles.classic}>
            <summary>Looking for the original AI-readiness scanner?</summary>
            <div className={styles.classicBody}>
              <p>
                The original schema, content, technical, and trust-signal scan
                is still here. Its weighted score is an estimate, with optional
                deeper provider analysis. For Pip&apos;s free evidence-based
                checklist, use the main page audit above.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!classicUrl.trim()) {
                    setClassicError(
                      "Enter a public page address to use the original scanner.",
                    );
                    return;
                  }
                  setClassicError("");
                  void onClassicScan(classicUrl);
                }}
              >
                <label htmlFor="cta-url-input">
                  Page for the original scanner
                </label>
                <div className={styles.urlRow}>
                  <input
                    id="cta-url-input"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://your-website.com"
                    value={classicUrl}
                    maxLength={2048}
                    onChange={(event) => setClassicUrl(event.target.value)}
                    aria-invalid={!!classicError}
                    aria-describedby={
                      classicError ? "classic-error" : undefined
                    }
                  />
                  <button type="submit">Run original scan</button>
                </div>
                {classicError && (
                  <p id="classic-error" className={styles.error} role="alert">
                    {classicError}
                  </p>
                )}
              </form>
            </div>
          </details>
        </main>
        <footer className={styles.footer}>
          <div>
            <Link href="/" className={styles.brand}>
              <Image src="/birds/parrot.svg" alt="" width={35} height={30} />
              AuditAI · Pip
            </Link>
            <p>
              One page. One useful fix. Come back a little stronger.
              <br />
              Free tools, clear evidence, and room for your judgment.
            </p>
          </div>
          <ul className={styles.footerLinks}>
            <li>
              <Link href="/assistant">Free SEO assistant</Link>
            </li>
            <li>
              <a href={RELEASE_URL} target="_blank" rel="noreferrer">
                Download the extension
              </a>
            </li>
            <li>
              <Link href="/assistant#notebook">Your field notes</Link>
            </li>
            <li>
              <Link href="/assistant/privacy">Privacy & audit scope</Link>
            </li>
            <li>
              <a href="#faq">Common questions</a>
            </li>
          </ul>
        </footer>
      </div>
      {children}
    </div>
  );
}
