"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const stats = [
  { big: "89%", desc: "Of searches now involve AI-powered engines or assistants" },
  { big: "5×", desc: "More organic traffic for sites optimized for AI citation" },
  { big: "73%", desc: "Of websites currently fail basic AI readiness checks" },
  { big: "30+", desc: "AI-specific checks run across all four optimization pillars" },
];

export default function Stats() {
  const containerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !headerRef.current || !statsRef.current) return;

    const ctx = gsap.context(() => {
      // Header Animation
      gsap.fromTo(
        headerRef.current!.children,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 80%",
          }
        }
      );

      // Stats Staggered Animation with scale up
      const cards = gsap.utils.toArray(".stat-card");
      gsap.fromTo(
        cards,
        { scale: 0.8, opacity: 0, y: 30 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.15,
          ease: "back.out(1.2)",
          scrollTrigger: {
            trigger: statsRef.current,
            start: "top 85%",
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="site-container site-section relative z-[1] overflow-hidden">
      
      <div ref={headerRef} className="mb-20" style={{ perspective: "1000px" }}>
        <div className="font-mono text-[13px] tracking-[0.15em] text-accent uppercase mb-6 inline-block bg-accent/10 px-4 py-1.5 rounded-full border border-accent/20">
          By the numbers
        </div>
        <h2
          className="font-serif leading-[1.1] tracking-[-0.02em]"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          The AI search
          <br />
          revolution is <em className="italic text-accent">now</em>
        </h2>
      </div>

      <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="stat-card glass-panel rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[240px] group">
            <span className="font-serif text-[64px] lg:text-[72px] leading-none text-accent block mb-5 drop-shadow-[0_0_20px_rgba(168,255,87,0.3)] group-hover:scale-110 transition-transform duration-500">
              {s.big}
            </span>
            <span className="text-[14px] text-muted leading-[1.7]">{s.desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
