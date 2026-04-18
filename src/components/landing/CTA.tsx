"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import URLInput from "../scan/URLInput";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function CTA() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current!.children,
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          stagger: 0.2,
          ease: "expo.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative border-t border-white/5 overflow-hidden" style={{ background: "transparent" }}>
      {/* Immersive background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-accent/5 blur-[150px] -z-10 pointer-events-none" />
      
      <div ref={contentRef} className="site-container site-section max-w-[1000px] flex flex-col items-center text-center relative z-10">
        
        <div className="font-mono text-[13px] tracking-[0.15em] text-accent uppercase mb-6 inline-block bg-accent/10 px-4 py-1.5 rounded-full border border-accent/20">
          Ready?
        </div>
        
        <h2
          className="font-serif leading-[1.05] mb-8 max-w-[700px] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70"
          style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}
        >
          Start getting cited by
          <br />
          <em className="italic text-accent" style={{ textShadow: "0 0 40px rgba(168,255,87,0.4)" }}>ChatGPT</em> today
        </h2>
        
        <p className="text-[17px] text-muted mb-12 max-w-[500px] font-light leading-[1.8]">
          Free scan takes 60 seconds. No account needed. Find out where you
          stand right now.
        </p>
        
        <div className="w-full max-w-[640px]">
          <URLInput variant="cta" />
        </div>
      </div>
    </div>
  );
}
