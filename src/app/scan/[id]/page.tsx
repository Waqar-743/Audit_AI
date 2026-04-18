"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ScanResult } from "@/lib/scanner/types";
import ScoreRing from "@/components/results/ScoreRing";
import PillarBreakdown from "@/components/results/PillarBreakdown";
import IssueList from "@/components/results/IssueList";

export default function ScanResultPage() {
  const params = useParams();
  const scanId = params.id as string;
  const [result, setResult] = useState<ScanResult | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [step, setStep] = useState(0);
  const [stepText, setStepText] = useState("Loading...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function poll() {
      try {
        // First check status
        const statusRes = await fetch(`/api/scan/${scanId}/status`);
        const statusData = await statusRes.json();

        if (statusData.status === "complete") {
          // Fetch full result
          const resultRes = await fetch(`/api/scan/${scanId}/result`);
          const resultData = await resultRes.json();
          setResult(resultData);
          setStatus("complete");
          clearInterval(interval);
          return;
        }

        if (statusData.status === "error") {
          setStatus("error");
          setStepText(statusData.error || "Scan failed");
          clearInterval(interval);
          return;
        }

        setStep(statusData.step || 0);
        setStepText(statusData.stepText || "Analyzing...");
        setProgress(statusData.progress || 0);
        setStatus(statusData.status || "analyzing");
      } catch {
        // keep polling
      }
    }

    const interval = setInterval(poll, 1500);
    poll();
    return () => clearInterval(interval);
  }, [scanId]);

  return (
    <>
      <nav>
        <Link href="/" className="nav-logo">
          <span className="dot" />
          AuditAI
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/#features">Features</Link>
          </li>
          <li>
            <Link href="/#how">How it works</Link>
          </li>
          <li>
            <Link href="/#pricing">Pricing</Link>
          </li>
          <li>
            <Link href="/#faq">FAQ</Link>
          </li>
        </ul>
        <Link href="/#hero-input" className="nav-cta">
          Free scan →
        </Link>
      </nav>

      <main className="report-page-main relative z-[1]">
        {status !== "complete" ? (
          <ScanningView step={step} stepText={stepText} progress={progress} status={status} />
        ) : result ? (
          <ResultsView result={result} />
        ) : null}
      </main>

      <footer>
        <div className="footer-logo">AuditAI // AI Search Optimization</div>
        <ul className="footer-links">
          <li>
            <Link href="/#features">Features</Link>
          </li>
          <li>
            <Link href="/#pricing">Pricing</Link>
          </li>
          <li>
            <Link href="/#faq">FAQ</Link>
          </li>
          <li>
            <Link href="/#hero-input">Scan</Link>
          </li>
        </ul>
        <div className="footer-copy">© 2026 AuditAI. All rights reserved.</div>
      </footer>
    </>
  );
}

function ScanningView({ step, stepText, progress, status }: { step: number; stepText: string; progress: number; status: string }) {
  const STEPS = [
    "Fetching & rendering page",
    "Extracting JSON-LD schema",
    "Analyzing content structure",
    "Running technical checks",
    "Evaluating trust signals",
    "Computing AI readiness score",
  ];

  if (status === "error") {
    return (
      <div className="report-center-stage">
        <div className="report-scan-card">
          <div className="scan-modal-label" style={{ color: "var(--red)" }}>{"// ERROR"}</div>
          <h1 className="report-title">Scan failed</h1>
          <p className="scan-step-current mb-8">{stepText}</p>
          <Link
            href="/"
            className="price-btn primary"
            style={{ maxWidth: "220px", marginInline: "auto" }}
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="report-center-stage">
      <div className="report-scan-card">
        <div className="scan-modal-label">{"// SCANNING IN PROGRESS"}</div>
        <h1 className="report-title">Analyzing your site</h1>
        <div className="scan-step-current mb-7">{stepText}</div>
        <div className="scan-bar-bg mb-7">
          <div className="scan-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <ul className="scan-steps-list">
          {STEPS.map((s, i) => (
            <li key={i} className={`scan-step-item ${i < step ? "done" : i === step ? "active" : ""}`}>
              <span className="scan-step-icon">{i < step ? "✓" : i === step ? "›" : "○"}</span>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ResultsView({ result }: { result: ScanResult }) {
  const criticalCount = result.issues.filter(i => i.severity === "critical").length;
  const warningCount = result.issues.filter(i => i.severity === "warning").length;

  return (
    <div className="report-results-shell">
      <div className="report-header-card mb-10">
        <div className="report-header-grid">
          <div>
            <div className="section-label mb-4">scan results</div>
            <h1 className="section-title mb-3 report-heading-text">AI readiness report</h1>
            <div className="score-url mb-2 report-url-inline">{result.url}</div>
            <div className="font-mono text-[10px] text-muted/70 tracking-[0.08em]">
              SCANNED {new Date(result.timestamp).toLocaleString()}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              {criticalCount > 0 && (
                <div className="font-mono text-[11px] px-3 py-[7px] border" style={{ borderColor: "rgba(255,87,87,0.3)", color: "var(--red)", background: "rgba(255,87,87,0.08)" }}>
                  {criticalCount} critical {criticalCount === 1 ? "issue" : "issues"}
                </div>
              )}
              {warningCount > 0 && (
                <div className="font-mono text-[11px] px-3 py-[7px] border" style={{ borderColor: "rgba(255,179,71,0.3)", color: "var(--amber)", background: "rgba(255,179,71,0.08)" }}>
                  {warningCount} warnings
                </div>
              )}
              <div className="font-mono text-[11px] px-3 py-[7px] border border-border text-muted">
                {result.issues.length} total checks
              </div>
            </div>
          </div>
          <ScoreRing score={result.overallScore} />
        </div>
      </div>

      <div className="report-results-stack">
        <PillarBreakdown pillars={result.pillars} />
        <IssueList issues={result.issues} />

        <div className="report-upsell-card">
          <h2 className="section-title mb-4" style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}>
            Click to see Full Report
          </h2>
          <p className="section-sub report-upsell-subline mb-7 mx-auto">
            Get detailed fix instructions, copy-paste schema code, priority roadmap, and a downloadable PDF report.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4 max-w-[660px] mx-auto">
            <Link href="/#pricing" className="price-btn primary flex-1" style={{ maxWidth: "320px", marginInline: "auto", paddingBlock: "12px" }}>
              <span className="block font-mono text-[10px] tracking-[0.08em] leading-none mb-2">0 for now</span>
              <span className="inline-flex items-center justify-center gap-2">
                <span>Get full audit</span>
                <span style={{ color: "var(--red)", fontSize: "12px", textDecoration: "line-through" }}>$29</span>
              </span>
            </Link>

            <Link href="/#pricing" className="price-btn flex-1" style={{ maxWidth: "320px", marginInline: "auto" }}>
              Download PDF report
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
