"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HomePageContent from "./HomePageContent";
import styles from "./home.module.css";

const SCAN_STEPS = [
  "Initializing crawler...",
  "Extracting JSON-LD schema...",
  "Analyzing content structure...",
  "Running technical checks...",
  "Evaluating trust signals...",
  "Computing AI readiness score...",
] as const;
const SCAN_PCTS = [10, 28, 47, 65, 82, 98] as const;

export default function ExactLanding() {
  const router = useRouter();
  const [scanActive, setScanActive] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanUrlDisplay, setScanUrlDisplay] = useState("");
  const [scanStepText, setScanStepText] = useState("Initializing crawler...");
  const [scanBarWidth, setScanBarWidth] = useState(0);
  const [scanStepIndex, setScanStepIndex] = useState(-1);
  const [scanError, setScanError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanDoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
              : SCAN_PCTS[data.step] || 0,
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
      const message =
        error instanceof Error ? error.message : "Failed to start scan";
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

  useEffect(() => {
    if (!scanActive) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.getElementById("legacy-scan-dialog");
    dialog?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (scanDoneTimeoutRef.current)
          clearTimeout(scanDoneTimeoutRef.current);
        setScanActive(false);
        setScanId(null);
      }
      if (event.key === "Tab") {
        const items = Array.from(
          dialog?.querySelectorAll<HTMLElement>(
            'button, a[href], input, [tabindex="0"]',
          ) || [],
        );
        const first = items[0];
        const last = items.at(-1);
        if (!first) {
          event.preventDefault();
          dialog?.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === dialog)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [scanActive]);

  return (
    <HomePageContent onClassicScan={runScan} scanActive={scanActive}>
      {scanActive && (
        <div
          className="scan-overlay active"
          id="scan-overlay"
          onClick={closeScan}
          aria-hidden={!scanActive}
        >
          <div
            id="legacy-scan-dialog"
            className="scan-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legacy-scan-title"
            aria-describedby="scan-url-display"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-label">Original readiness scanner</div>
            <h2 id="legacy-scan-title">Taking a closer look.</h2>
            <p id="scan-url-display" className="scan-modal-url">
              {scanUrlDisplay}
            </p>
            <p className="scan-step-current" aria-live="polite">
              {scanStepText}
            </p>
            <div
              className="scan-bar-bg"
              role="progressbar"
              aria-label="Scan progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={scanBarWidth}
            >
              <div
                className="scan-bar-fill"
                style={{ width: `${scanBarWidth}%` }}
              />
            </div>
            <ul className="scan-steps-list">
              {SCAN_STEPS.map((step, index) => (
                <li
                  key={step}
                  className={`scan-step-item ${index < scanStepIndex ? "done" : index === scanStepIndex ? "active" : ""}`}
                >
                  <span aria-hidden="true">
                    {index < scanStepIndex
                      ? "✓"
                      : index === scanStepIndex
                        ? "›"
                        : "○"}
                  </span>{" "}
                  {step}
                </li>
              ))}
            </ul>
            {scanError && <p role="alert">{scanError}</p>}
            <button
              type="button"
              className={styles.modalClose}
              onClick={closeScan}
            >
              Close scanner
            </button>
          </div>
        </div>
      )}
    </HomePageContent>
  );
}
