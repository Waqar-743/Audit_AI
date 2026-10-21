"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PipInvitation from "@/components/assistant/PipInvitation";

const HERO_PILLARS = [
  { name: "Schema markup", target: 72, color: "#a8ff57" },
  { name: "Content quality", target: 58, color: "#57b8ff" },
  { name: "Technical SEO", target: 81, color: "#ffb347" },
  { name: "Trust signals", target: 44, color: "#ff7eb3" },
] as const;

const SCAN_STEPS = [
  "Initializing crawler...",
  "Extracting JSON-LD schema...",
  "Analyzing content structure...",
  "Running technical checks...",
  "Evaluating trust signals...",
  "Computing AI readiness score...",
] as const;

const SCAN_PCTS = [10, 28, 47, 65, 82, 98] as const;

const FAQ_ITEMS = [
  { q: "Is the SEO assistant completely free?", a: "Yes. Pip's page audits, all findings, metadata workbench, exports, and Chrome extension are free. There is no signup, paid tier, credit system, or API key requirement." },
  { q: "What does the assistant actually check?", a: "Pip inspects titles, descriptions, canonical declarations, indexing instructions, heading structure, image alternatives, link names, and JSON-LD syntax. Each finding includes observed evidence and practical next steps. Areas outside the audit are marked as not checked." },
  { q: "Can it check JavaScript-rendered pages?", a: "The new website assistant checks the public HTML response. The Chrome extension checks the current rendered page locally, including content already loaded by JavaScript. Neither view guarantees that every search crawler sees the same content." },
  { q: "Does a high score guarantee search rankings or AI citations?", a: "No. Pip's score is the percentage of passed pass/fail checks, with reviews and untested items excluded. The original scanner's AI-readiness score is also an estimate. Neither score measures actual rankings, indexing, traffic, or AI citations." },
  { q: "Where do my reports and preferences go?", a: "Pip saves your optional name, illustration preference, and latest 20 reports in this browser. The website and extension have separate local storage. You can export a report, delete saved audits, or reset your preferences at any time." },
  { q: "Will Pip change my website?", a: "No. The workbench creates drafts for you to review and copy. The extension can temporarily highlight matching elements, but never publishes or saves edits to the audited website." },
] as const;

function animateValue(
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void
) {
  const start = performance.now();
  let frameId = 0;

  const step = (now: number) => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    onUpdate(Math.round(from + (to - from) * ease));
    if (t < 1) {
      frameId = requestAnimationFrame(step);
    }
  };

  frameId = requestAnimationFrame(step);

  return () => cancelAnimationFrame(frameId);
}

export default function ExactLanding() {
  const router = useRouter();
  const [heroUrl, setHeroUrl] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [heroScore, setHeroScore] = useState(0);
  const [pillarScores, setPillarScores] = useState([0, 0, 0, 0]);
  const [pillarWidths, setPillarWidths] = useState([0, 0, 0, 0]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const [scanActive, setScanActive] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanUrlDisplay, setScanUrlDisplay] = useState("https://yoursite.com");
  const [scanStepText, setScanStepText] = useState("Initializing crawler...");
  const [scanBarWidth, setScanBarWidth] = useState(0);
  const [scanStepIndex, setScanStepIndex] = useState(-1);
  const [scanError, setScanError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanDoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timeouts: Array<ReturnType<typeof setTimeout>> = [];
    const cancels: Array<() => void> = [];

    const initTimeout = setTimeout(() => {
      cancels.push(animateValue(0, 67, 1800, setHeroScore));

      HERO_PILLARS.forEach((pillar, index) => {
        const timeout = setTimeout(() => {
          setPillarWidths((prev) =>
            prev.map((value, i) => (i === index ? pillar.target : value))
          );

          cancels.push(
            animateValue(0, pillar.target, 1000, (value) => {
              setPillarScores((prev) =>
                prev.map((score, i) => (i === index ? value : score))
              );
            })
          );
        }, 1000 + index * 200);

        timeouts.push(timeout);
      });
    }, 900);

    timeouts.push(initTimeout);

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      cancels.forEach((cancel) => cancel());
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = Array.from(document.querySelectorAll(".reveal"));
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (scanDoneTimeoutRef.current) clearTimeout(scanDoneTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!scanId || !scanActive) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/scan/${scanId}/status`);
        const data = await response.json();

        if (!response.ok) {
          setScanError(data.error || "Scan not found");
          setScanStepText(`✗ Error: ${data.error || "Scan not found"}`);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          return;
        }

        if (typeof data.step === "number") {
          setScanStepIndex(data.step);
          setScanBarWidth(
            typeof data.progress === "number"
              ? data.progress
              : SCAN_PCTS[data.step] || 0
          );
        }

        if (typeof data.stepText === "string" && data.stepText.length > 0) {
          setScanStepText(data.stepText);
        }

        if (data.status === "complete") {
          setScanBarWidth(100);
          setScanStepText("✓ Analysis complete!");
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          scanDoneTimeoutRef.current = setTimeout(() => {
            setScanActive(false);
            router.push(`/scan/${scanId}`);
          }, 1200);
        }

        if (data.status === "error") {
          const message = data.error || "Unknown error";
          setScanError(message);
          setScanStepText(`✗ Error: ${message}`);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch {
        setScanError("Failed to fetch scan status");
        setScanStepText("✗ Error: Failed to fetch scan status");
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      }
    };

    pollStatus();
    pollTimerRef.current = setInterval(pollStatus, 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [scanId, scanActive, router]);

  const resetScan = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (scanDoneTimeoutRef.current) clearTimeout(scanDoneTimeoutRef.current);
    setScanBarWidth(0);
    setScanStepText("Initializing...");
    setScanStepIndex(-1);
    setScanError(null);
    setScanId(null);
  };

  const advanceStep = (index: number) => {
    setScanStepText(SCAN_STEPS[index]);
    setScanBarWidth(SCAN_PCTS[index]);
    setScanStepIndex(index);
  };

  const runScan = async (rawUrl: string) => {
    const cleanUrl = rawUrl.trim().replace(/^https?:\/\//, "");

    setScanUrlDisplay(`https://${cleanUrl}`);
    setScanActive(true);

    resetScan();

    if (!cleanUrl) {
      setScanError("URL is required");
      setScanStepText("✗ Error: URL is required");
      return;
    }

    setScanStepText("Starting scan...");

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await response.json();

      if (!response.ok || !data.scanId) {
        throw new Error(data.error || "Failed to start scan");
      }

      setScanId(data.scanId);
      advanceStep(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start scan";
      setScanError(message);
      setScanStepText(`✗ Error: ${message}`);
    }
  };

  const closeScan = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (scanDoneTimeoutRef.current) clearTimeout(scanDoneTimeoutRef.current);
    setScanActive(false);
    setScanId(null);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <>
      <nav>
        <a href="#" className="nav-logo">
          <span className="dot" />
          AuditAI
        </a>
        <ul className="nav-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#how">How it works</a>
          </li>
          <li>
            <a href="#pricing">Free assistant</a>
          </li>
          <li>
            <a href="#faq">FAQ</a>
          </li>
        </ul>
        <a href="#" className="nav-cta">
          Free scan →
        </a>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative" }}>
        <section
          className="hero"
          style={{ maxWidth: "none", paddingRight: "380px" }}
        >
          <div className="hero-badge">AI Search Readiness Scanner</div>
          <h1 className="hero-headline">
            Is ChatGPT ignoring
            <br />
            <em>your website?</em>
          </h1>
          <p className="hero-sub">
            Run a 60-second AI audit. Find out exactly why AI search engines skip your
            content — and get the precise fixes to start getting cited.
          </p>
          <div className="hero-input-wrap">
            <span className="url-prefix">https://</span>
            <input
              type="text"
              id="url-input"
              placeholder="yourwebsite.com"
              autoComplete="off"
              spellCheck={false}
              value={heroUrl}
              onChange={(e) => setHeroUrl(e.target.value)}
            />
            <button className="scan-btn" onClick={() => runScan(heroUrl)}>
              Scan now
            </button>
          </div>
          <p className="hero-note">
            Free scan available → <span>No account required</span>
          </p>
        </section>

        <div className="hero-visual">
          <div className="score-card">
            <div className="score-url">example-site.com</div>
            <div className="score-main">
              <div className="score-num" id="hero-score">
                {heroScore}
              </div>
              <div>
                <div className="score-label">
                  AI readiness
                  <br />
                  score
                </div>
              </div>
            </div>
            <div className="pillars">
              {HERO_PILLARS.map((pillar, index) => (
                <div className="pillar-row" key={pillar.name}>
                  <span className="pillar-name">{pillar.name}</span>
                  <div className="pillar-bar">
                    <div
                      className="pillar-fill"
                      style={{
                        width: `${pillarWidths[index]}%`,
                        background: pillar.color,
                      }}
                    />
                  </div>
                  <span className="pillar-score">{pillarScores[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="trust-bar">
        <div className="trust-item">
          <strong>2,847</strong> sites scanned today
        </div>
        <div className="trust-sep" />
        <div className="trust-item">
          <strong>30+</strong> AI-specific checks
        </div>
        <div className="trust-sep" />
        <div className="trust-item">
          Works with <strong>ChatGPT · Perplexity · Gemini · Claude</strong>
        </div>
        <div className="trust-sep" />
        <div className="trust-item">
          Results in <strong>&lt; 60 seconds</strong>
        </div>
      </div>

      <section id="features">
        <div className="section-label reveal">What we analyze</div>
        <h2 className="section-title reveal">
          Four pillars that
          <br />
          determine <em>AI visibility</em>
        </h2>
        <p className="section-sub reveal">
          Most SEO tools were built for Google crawlers. We&apos;re built for how language
          models actually read, understand, and cite content.
        </p>

        <div className="pillars-grid">
          <div className="pillar-card reveal">
            <div className="pillar-index">01 / Schema Markup</div>
            <div className="pillar-icon">⬡</div>
            <h3>Structured Data</h3>
            <p>
              AI engines rely on structured data to understand what your content is
              about before reading a single word.
            </p>
            <ul className="pillar-checks">
              <li>JSON-LD validation &amp; completeness</li>
              <li>Article schema with author credentials</li>
              <li>FAQ schema for direct AI extraction</li>
              <li>Organization &amp; BreadcrumbList schema</li>
              <li>Open Graph optimization</li>
            </ul>
          </div>
          <div className="pillar-card reveal">
            <div className="pillar-index">02 / Content Quality</div>
            <div className="pillar-icon">◈</div>
            <h3>AI Digestibility</h3>
            <p>
              LLMs cite content that&apos;s structured for comprehension — clear hierarchy,
              direct answers, factual density.
            </p>
            <ul className="pillar-checks">
              <li>Heading hierarchy analysis</li>
              <li>FAQ &amp; Q&amp;A format detection</li>
              <li>Answer-focused content scoring</li>
              <li>Factual density measurement</li>
              <li>Author attribution &amp; expertise</li>
            </ul>
          </div>
          <div className="pillar-card reveal">
            <div className="pillar-index">03 / Technical SEO</div>
            <div className="pillar-icon">◻</div>
            <h3>AI Crawlability</h3>
            <p>
              If AI crawlers can&apos;t access or parse your site efficiently, your content
              might as well not exist.
            </p>
            <ul className="pillar-checks">
              <li>Page speed for crawler efficiency</li>
              <li>Mobile-first optimization</li>
              <li>Semantic HTML structure</li>
              <li>Robots.txt &amp; sitemap audit</li>
              <li>Clean URL &amp; internal linking</li>
            </ul>
          </div>
          <div className="pillar-card reveal">
            <div className="pillar-index">04 / Trust Signals</div>
            <div className="pillar-icon">◇</div>
            <h3>E-A-T Factors</h3>
            <p>
              AI models are trained to evaluate expertise, authority, and
              trustworthiness before citing a source.
            </p>
            <ul className="pillar-checks">
              <li>About page completeness</li>
              <li>Contact info &amp; business legitimacy</li>
              <li>Legal pages &amp; compliance</li>
              <li>Author profiles &amp; credentials</li>
              <li>Social proof &amp; citations</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="how-full" style={{ background: "var(--bg2)" }}>
        <div className="how-inner" id="how">
          <div className="section-label reveal">Process</div>
          <h2 className="section-title reveal">
            Three steps to
            <br />
            <em>AI-ready</em> content
          </h2>

          <div className="steps">
            <div className="step reveal">
              <div className="step-num">01</div>
              <h3>Enter your URL</h3>
              <p>
                Paste any publicly accessible URL. We&apos;ll fetch and render your page
                exactly as AI crawlers see it — including JavaScript-rendered content.
              </p>
            </div>
            <div className="step reveal">
              <div className="step-num">02</div>
              <h3>We run 30+ checks</h3>
              <p>
                Our engine analyzes schema markup, content structure, technical signals,
                and trust factors across all four pillars in under 60 seconds.
              </p>
            </div>
            <div className="step reveal">
              <div className="step-num">03</div>
              <h3>Get your fix plan</h3>
              <p>
                Receive a prioritized list of issues with exact fix instructions —
                copy-paste schema code, content templates, and implementation guides.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="section-label reveal">By the numbers</div>
        <h2 className="section-title reveal">
          The AI search
          <br />
          revolution is <em>now</em>
        </h2>

        <div className="stats-grid">
          <div className="stat-box reveal">
            <span className="stat-big">89%</span>
            <span className="stat-desc">
              Of searches now involve AI-powered engines or assistants
            </span>
          </div>
          <div className="stat-box reveal">
            <span className="stat-big">5×</span>
            <span className="stat-desc">
              More organic traffic for sites optimized for AI citation
            </span>
          </div>
          <div className="stat-box reveal">
            <span className="stat-big">73%</span>
            <span className="stat-desc">
              Of websites currently fail basic AI readiness checks
            </span>
          </div>
          <div className="stat-box reveal">
            <span className="stat-big">30+</span>
            <span className="stat-desc">
              AI-specific checks run across all four optimization pillars
            </span>
          </div>
        </div>
      </section>

      <PipInvitation />

      <section id="faq" style={{ paddingTop: 0 }}>
        <div className="section-label reveal">FAQ</div>
        <h2 className="section-title reveal">
          Common <em>questions</em>
        </h2>

        <div className="faq-list reveal">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaqIndex === index;

            return (
              <div
                key={item.q}
                className={`faq-item${isOpen ? " open" : ""}`}
              >
                <div className="faq-q" onClick={() => toggleFaq(index)}>
                  {item.q}
                  <span className="faq-icon">+</span>
                </div>
                <div className="faq-a">{item.a}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="cta-full" style={{ background: "var(--bg2)" }}>
        <div className="cta-inner">
          <h2 className="cta-title reveal">
            Start getting cited by
            <br />
            <em>ChatGPT</em> today
          </h2>
          <p className="cta-sub reveal">
            Free scan takes 60 seconds. No account needed. Find out where you stand
            right now.
          </p>
          <div className="cta-input-wrap reveal">
            <input
              type="text"
              className="cta-input"
              id="cta-url-input"
              placeholder="yourwebsite.com"
              autoComplete="off"
              spellCheck={false}
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
            />
            <button className="cta-scan-btn" onClick={() => runScan(ctaUrl)}>
              Scan now →
            </button>
          </div>
        </div>
      </div>

      <footer>
        <div className="footer-logo">AuditAI // AI Search Optimization</div>
        <ul className="footer-links">
          <li>
            <a href="#">Features</a>
          </li>
          <li>
            <a href="/assistant">Free SEO assistant</a>
          </li>
          <li>
            <a href="#">Blog</a>
          </li>
          <li>
            <a href="#">Affiliate program</a>
          </li>
          <li>
            <a href="/assistant/privacy">Privacy policy</a>
          </li>
          <li>
            <a href="#">Terms</a>
          </li>
        </ul>
        <div className="footer-copy">© 2026 AuditAI. All rights reserved.</div>
      </footer>

      <div
        className={`scan-overlay${scanActive ? " active" : ""}`}
        id="scan-overlay"
        onClick={closeScan}
      >
        <div className="scan-modal" onClick={(e) => e.stopPropagation()}>
          <div className="scan-modal-label">{"// SCANNING IN PROGRESS"}</div>
          <h2>Analyzing your site</h2>
          <div className="scan-modal-url" id="scan-url-display">
            {scanUrlDisplay}
          </div>

          <div className="scan-progress-wrap">
            <div className="scan-step-current" id="scan-step-text">
              {scanStepText}
            </div>
            <div className="scan-bar-bg">
              <div
                className="scan-bar-fill"
                id="scan-bar"
                style={{ width: `${scanBarWidth}%` }}
              />
            </div>
          </div>

          <ul className="scan-steps-list" id="scan-steps">
            {SCAN_STEPS.map((step, index) => {
              const isDone = index < scanStepIndex;
              const isActive = index === scanStepIndex;

              return (
                <li
                  key={step}
                  className={`scan-step-item${isDone ? " done" : ""}${
                    isActive ? " active" : ""
                  }`}
                  data-step={index}
                >
                  <span className="scan-step-icon">
                    {isDone ? "✓" : isActive ? "›" : "○"}
                  </span>
                  {step}
                </li>
              );
            })}
          </ul>
          {scanError && (
            <div className="scan-step-current" style={{ marginTop: "12px", marginBottom: "0" }}>
              {scanError}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
