"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  "Fetching & rendering page",
  "Extracting JSON-LD schema",
  "Analyzing content structure",
  "Running technical checks",
  "Evaluating trust signals",
  "Computing AI readiness score",
];

const PCTS = [10, 28, 47, 65, 82, 98];

interface ScanModalProps {
  url: string;
  scanId: string | null;
  onComplete: () => void;
  onClose: () => void;
}

export default function ScanModal({ url, scanId, onComplete, onClose }: ScanModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepText, setStepText] = useState(STEPS[0] + "...");
  const [progress, setProgress] = useState(PCTS[0]);
  const [complete, setComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // If we have a real scanId, poll for status
    if (scanId && scanId !== "demo") {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/scan/${scanId}/status`);
          const data = await res.json();
          if (data.step !== undefined) {
            setCurrentStep(data.step);
            setProgress(data.progress || PCTS[data.step] || 0);
            setStepText(data.stepText || STEPS[data.step] + "...");
          }
          if (data.status === "complete") {
            setComplete(true);
            setProgress(100);
            setStepText("✓ Analysis complete!");
            if (pollRef.current) clearInterval(pollRef.current);
            setTimeout(onComplete, 1200);
          }
          if (data.status === "error") {
            setStepText("✗ Error: " + (data.error || "Unknown error"));
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {
          // keep polling
        }
      }, 1000);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }

    // Demo mode: animate through steps
    let step = 0;

    timerRef.current = setInterval(() => {
      step++;
      if (step < STEPS.length) {
        setCurrentStep(step);
        setStepText(STEPS[step] + "...");
        setProgress(PCTS[step]);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        setComplete(true);
        setProgress(100);
        setTimeout(() => {
          setStepText("✓ Analysis complete!");
        }, 400);
        setTimeout(onComplete, 2000);
      }
    }, 900);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scanId, onComplete]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center transition-opacity duration-300"
      style={{
        background: "rgba(8,8,8,0.92)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        className="bg-bg2 border border-border-hover p-12 w-[480px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-5">{"// SCANNING IN PROGRESS"}</div>
        <h2 className="font-serif text-[28px] mb-2">Analyzing your site</h2>
        <div className="font-mono text-xs text-muted mb-8">https://{url}</div>

        {/* Progress */}
        <div className="mb-7">
          <div className="font-mono text-xs text-muted mb-3 min-h-[18px]">
            {stepText}
          </div>
          <div className="h-[2px] bg-border overflow-hidden">
            <div
              className="h-full bg-accent transition-[width] duration-400 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps list */}
        <ul className="list-none flex flex-col gap-2">
          {STEPS.map((stepName, idx) => {
            const isDone = idx < currentStep || complete;
            const isActive = idx === currentStep && !complete;
            return (
              <li
                key={idx}
                className={`flex items-center gap-[10px] font-mono text-[11px] transition-colors duration-300 ${
                  isDone
                    ? "text-accent"
                    : isActive
                      ? "text-text"
                      : "text-white/25"
                }`}
              >
                <span className="w-[14px] shrink-0">
                  {isDone ? "✓" : isActive ? "›" : "○"}
                </span>
                {stepName}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
