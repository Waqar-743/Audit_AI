"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScorePreview from "./ScorePreview";
import URLInput from "../scan/URLInput";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance animation
      gsap.fromTo(
        elementsRef.current,
        { y: 50, opacity: 0, rotateX: -10 },
        { 
          y: 0, 
          opacity: 1, 
          rotateX: 0,
          duration: 1.2, 
          stagger: 0.15, 
          ease: "expo.out",
          delay: 0.2
        }
      );

      // Floating animation for the score preview
      gsap.to(".floating-card", {
        y: "-=20",
        rotationZ: 1,
        rotationX: 2,
        duration: 4,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });

      // Mouse parallax effect
      const handleMouseMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const x = (clientX / window.innerWidth - 0.5) * 20;
        const y = (clientY / window.innerHeight - 0.5) * 20;

        gsap.to(".parallax-bg", {
          x: x,
          y: y,
          duration: 1,
          ease: "power2.out"
        });
      };

      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="site-container w-full relative overflow-hidden" style={{ perspective: "1500px" }}>
      
      {/* Background Glows */}
      <div className="parallax-bg absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="parallax-bg absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[150px] -z-10 pointer-events-none" />

      <section className="relative min-h-[100dvh] flex flex-col justify-center pt-[140px] pb-28 z-10">
        
        {/* Badge */}
        <div
          ref={(el) => { elementsRef.current[0] = el; }}
          className="inline-flex items-center gap-2 font-mono text-[12px] font-medium tracking-[0.08em] text-accent px-5 py-[8px] mb-12 rounded-full glass-panel"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
          AI Search Readiness Scanner
        </div>

        {/* Headline */}
        <h1
          ref={(el) => { elementsRef.current[1] = el; }}
          className="font-serif leading-[1.05] tracking-[-0.02em] mb-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70"
          style={{
            fontSize: "clamp(3rem, 6.5vw, 6rem)",
            maxWidth: "760px",
            textShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}
        >
          Is ChatGPT ignoring
          <br />
          <em className="italic text-accent" style={{ textShadow: "0 0 40px rgba(168,255,87,0.4)" }}>your website?</em>
        </h1>

        {/* Sub */}
        <p
          ref={(el) => { elementsRef.current[2] = el; }}
          className="text-[18px] text-muted leading-[1.9] mb-14 font-light"
          style={{ maxWidth: "560px" }}
        >
          Run a 60-second AI audit. Find out exactly why AI search engines skip
          your content — and get the precise fixes to start getting cited.
        </p>

        {/* URL Input */}
        <div ref={(el) => { elementsRef.current[3] = el; }} style={{ maxWidth: "640px" }}>
          <URLInput />
        </div>

        {/* Note */}
        <p
          ref={(el) => { elementsRef.current[4] = el; }}
          className="mt-6 font-mono text-[13px] text-muted/70 flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Free scan available. <span className="text-white/90">No account required.</span>
        </p>
      </section>

      {/* Floating Score Preview */}
      <div
        className="floating-card absolute top-1/2 hidden min-[1000px]:block z-20"
        style={{
          right: "0",
          transform: "translateY(-50%) rotateY(-5deg)",
          transformStyle: "preserve-3d"
        }}
      >
        {/* Adds an under-shadow for more depth */}
        <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl -z-10" />
        <ScorePreview />
      </div>
    </div>
  );
}
