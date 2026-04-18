"use client";

import { useEffect, useRef } from "react";

export default function ScoreRing({ score }: { score: number }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return "#a8ff57";
    if (s >= 50) return "#ffb347";
    return "#ff5757";
  };

  useEffect(() => {
    const circle = circleRef.current;
    const text = textRef.current;
    if (!circle || !text) return;

    // Animate stroke
    circle.style.strokeDashoffset = String(circumference);
    requestAnimationFrame(() => {
      circle.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.25, 1, 0.5, 1)";
      circle.style.strokeDashoffset = String(offset);
    });

    // Animate number
    const duration = 1500;
    const start = performance.now();
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      text!.textContent = String(Math.round(score * ease));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [score, circumference, offset]);

  return (
    <div className="relative w-[160px] h-[160px] shrink-0 border border-border bg-bg p-2">
      <svg width="140" height="140" viewBox="0 0 100 100" className="-rotate-90">
        {/* Background circle */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="4"
        />
        {/* Score circle */}
        <circle
          ref={circleRef}
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth="4"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span ref={textRef} className="font-serif text-[56px] leading-none" style={{ color: getColor(score) }}>
          0
        </span>
        <span className="font-mono text-[10px] text-muted mt-1 tracking-[0.12em]">/ 100</span>
      </div>
    </div>
  );
}
