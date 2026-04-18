"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const steps = [
  {
    num: "01",
    title: "Enter your URL",
    desc: "Paste any publicly accessible URL. We'll fetch and render your page exactly as AI crawlers see it — including JavaScript-rendered content.",
  },
  {
    num: "02",
    title: "We run 30+ checks",
    desc: "Our engine analyzes schema markup, content structure, technical signals, and trust factors across all four pillars in under 60 seconds.",
  },
  {
    num: "03",
    title: "Get your fix plan",
    desc: "Receive a prioritized list of issues with exact fix instructions — copy-paste schema code, content templates, and implementation guides.",
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !headerRef.current || !stepsRef.current) return;

    const ctx = gsap.context(() => {
      // Header Animation
      gsap.fromTo(
        headerRef.current!.children,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 80%",
          }
        }
      );

      // Steps Staggered Animation
      const cards = gsap.utils.toArray(".step-card");
      gsap.fromTo(
        cards,
        { x: -50, opacity: 0, rotateY: 15 },
        {
          x: 0,
          opacity: 1,
          rotateY: 0,
          duration: 1.2,
          stagger: 0.2,
          ease: "expo.out",
          scrollTrigger: {
            trigger: stepsRef.current,
            start: "top 75%",
          }
        }
      );
      
      // Floating line animation
      gsap.to(".connector-line", {
        backgroundPosition: "200% 0",
        duration: 3,
        repeat: -1,
        ease: "linear"
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div id="how" ref={containerRef} className="relative z-[1] overflow-hidden" style={{ background: "transparent" }}>
      
      {/* Background Decor */}
      <div className="absolute top-1/2 left-0 w-full h-[500px] bg-gradient-to-b from-bg to-bg2 -z-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[300px] bg-accent/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="site-container site-section">
        
        <div ref={headerRef} className="mb-24 text-center">
          <div className="font-mono text-[13px] tracking-[0.15em] text-accent uppercase mb-6 inline-block bg-accent/10 px-4 py-1.5 rounded-full border border-accent/20">
            Process
          </div>
          <h2
            className="font-serif leading-[1.1] tracking-[-0.02em] mx-auto"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", maxWidth: "800px" }}
          >
            Three steps to
            <br />
            <em className="italic text-accent">AI-ready</em> content
          </h2>
        </div>

        <div ref={stepsRef} className="relative grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 perspective-[1500px]">
          
          {/* Connector Line (visible on desktop) */}
          <div className="hidden md:block absolute top-[60px] left-[10%] right-[10%] h-[2px] bg-white/5 -z-10" />
          <div className="connector-line hidden md:block absolute top-[60px] left-[10%] right-[10%] h-[2px] -z-10 opacity-30" 
               style={{ 
                 background: "linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)",
                 backgroundSize: "200% 100%" 
               }} 
          />

          {steps.map((s) => (
            <div key={s.num} className="step-card glass-panel rounded-2xl p-10 lg:p-12 relative group isometric-card flex flex-col items-center text-center">
              
              <div className="w-20 h-20 rounded-full bg-black/40 border border-white/10 flex items-center justify-center font-serif text-[32px] text-accent mb-8 shadow-[0_0_30px_rgba(168,255,87,0.1)] group-hover:scale-110 group-hover:shadow-[0_0_40px_rgba(168,255,87,0.2)] transition-all duration-500">
                {s.num}
              </div>
              
              <h3 className="font-serif text-[26px] mb-4">{s.title}</h3>
              <p className="text-[15px] text-muted leading-[1.8]">{s.desc}</p>
              
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
