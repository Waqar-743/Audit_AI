"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function TrustBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return;
    
    gsap.fromTo(
      barRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1, delay: 1, ease: "power2.out" }
    );
  }, []);

  return (
    <div ref={barRef} className="relative z-10 mt-10 border-t border-b border-white/5">
      <div className="site-container flex items-center justify-center gap-6 sm:gap-12 overflow-x-auto py-6">
        <div className="flex items-center gap-[12px] font-mono text-[13px] text-muted whitespace-nowrap">
          <strong className="text-white font-medium">2,847</strong> sites scanned today
        </div>
        <div className="w-px h-[20px] bg-white/10 shrink-0" />
        <div className="flex items-center gap-[12px] font-mono text-[13px] text-muted whitespace-nowrap">
          <strong className="text-white font-medium">30+</strong> AI-specific checks
        </div>
        <div className="w-px h-[20px] bg-white/10 shrink-0 hidden sm:block" />
        <div className="hidden sm:flex items-center gap-[12px] font-mono text-[13px] text-muted whitespace-nowrap">
          Works with{" "}
          <strong className="text-white font-medium drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            ChatGPT · Perplexity · Gemini · Claude
          </strong>
        </div>
        <div className="w-px h-[20px] bg-white/10 shrink-0 hidden md:block" />
        <div className="hidden md:flex items-center gap-[12px] font-mono text-[13px] text-muted whitespace-nowrap">
          Results in{" "}
          <strong className="text-accent font-medium">&lt; 60 seconds</strong>
        </div>
      </div>
    </div>
  );
}
