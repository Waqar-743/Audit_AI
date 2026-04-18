"use client";

import { useEffect, useRef } from "react";

function animateValue(
  el: HTMLElement,
  from: number,
  to: number,
  duration: number
) {
  const start = performance.now();
  function step(now: number) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(from + (to - from) * ease));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const pillars = [
  { name: "Schema markup", val: 72, color: "#a8ff57" },
  { name: "Content quality", val: 58, color: "#57b8ff" },
  { name: "Technical SEO", val: 81, color: "#ffb347" },
  { name: "Trust signals", val: 44, color: "#ff7eb3" },
];

export default function ScorePreview() {
  const scoreRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scoreRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) return;
    animated.current = true;

    const timeout = setTimeout(() => {
      if (scoreRef.current) animateValue(scoreRef.current, 0, 67, 1800);

      pillars.forEach((p, i) => {
        setTimeout(() => {
          if (fillRefs.current[i]) {
            fillRefs.current[i]!.style.width = p.val + "%";
          }
          if (scoreRefs.current[i]) {
            animateValue(scoreRefs.current[i]!, 0, p.val, 1000);
          }
        }, 200 * i);
      });
    }, 900);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="bg-bg2 border border-border p-6 relative">
      {/* Label */}
      <span
        className="absolute -top-px left-6 font-mono text-[9px] tracking-[0.12em] text-accent bg-bg2 px-2"
        style={{ transform: "translateY(-50%)" }}
      >
        LIVE PREVIEW
      </span>

      {/* URL */}
      <div className="font-mono text-[11px] text-muted mb-5 flex items-center gap-[6px]">
        <span className="w-[6px] h-[6px] rounded-full bg-accent shrink-0" />
        example-site.com
      </div>

      {/* Score */}
      <div className="flex items-end gap-3 mb-6">
        <div ref={scoreRef} className="font-serif text-[72px] leading-none text-accent">
          0
        </div>
        <div className="text-xs text-muted mb-2">
          AI readiness
          <br />
          score
        </div>
      </div>

      {/* Pillars */}
      <div className="flex flex-col gap-[10px]">
        {pillars.map((p, i) => (
          <div key={p.name} className="flex items-center gap-[10px] font-mono text-[11px]">
            <span className="text-muted w-[110px] shrink-0">{p.name}</span>
            <div className="flex-1 h-[3px] bg-white/[0.06] relative overflow-hidden">
              <div
                ref={(el) => { fillRefs.current[i] = el; }}
                className="h-full absolute left-0 top-0 transition-[width] duration-[1500ms]"
                style={{
                  width: 0,
                  background: p.color,
                  transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
                }}
              />
            </div>
            <span
              ref={(el) => { scoreRefs.current[i] = el; }}
              className="text-text min-w-[30px] text-right"
            >
              0
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
