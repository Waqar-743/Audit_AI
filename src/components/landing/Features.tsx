"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const pillars = [
  {
    index: "01 / Schema",
    icon: "⬡",
    title: "Structured Data",
    desc: "AI engines rely on structured data to understand what your content is about before reading a single word.",
    checks: [
      "JSON-LD validation & completeness",
      "Article schema with author credentials",
      "FAQ schema for direct AI extraction",
    ],
  },
  {
    index: "02 / Content",
    icon: "◈",
    title: "AI Digestibility",
    desc: "LLMs cite content that's structured for comprehension — clear hierarchy, direct answers, factual density.",
    checks: [
      "Heading hierarchy analysis",
      "FAQ & Q&A format detection",
      "Answer-focused content scoring",
    ],
  },
  {
    index: "03 / Tech",
    icon: "◻",
    title: "AI Crawlability",
    desc: "If AI crawlers can't access or parse your site efficiently, your content might as well not exist.",
    checks: [
      "Page speed for crawler efficiency",
      "Mobile-first optimization",
      "Semantic HTML structure",
    ],
  },
  {
    index: "04 / Trust",
    icon: "◇",
    title: "E-A-T Factors",
    desc: "AI models are trained to evaluate expertise, authority, and trustworthiness before citing a source.",
    checks: [
      "About page completeness",
      "Contact info & business legitimacy",
      "Legal pages & compliance",
    ],
  },
];

export default function Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !headerRef.current || !gridRef.current) return;
    
    const ctx = gsap.context(() => {
      // Header Animation
      gsap.fromTo(
        headerRef.current!.children,
        { y: 60, opacity: 0, rotateX: -15 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
          }
        }
      );

      // Grid Cards Staggered Animation
      const cards = gsap.utils.toArray(".feature-card");
      gsap.fromTo(
        cards,
        { y: 100, opacity: 0, rotateX: 10, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          scale: 1,
          duration: 1.2,
          stagger: 0.1,
          ease: "expo.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 80%",
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={containerRef} className="site-container site-section relative z-[1] overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[150px] -z-10 pointer-events-none" />

      <div ref={headerRef} className="mb-20" style={{ perspective: "1000px" }}>
        <div className="font-mono text-[13px] tracking-[0.15em] text-accent uppercase mb-6 inline-block bg-accent/10 px-4 py-1.5 rounded-full border border-accent/20">
          What we analyze
        </div>
        <h2
          className="font-serif leading-[1.1] tracking-[-0.02em] mb-8"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", textShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
        >
          Four pillars that
          <br />
          determine <em className="italic text-accent">AI visibility</em>
        </h2>
        <p className="text-[17px] text-muted font-light max-w-[600px] leading-[1.9]">
          Most SEO tools were built for Google crawlers. We&apos;re built for how language
          models actually read, understand, and cite content.
        </p>
      </div>

      {/* Grid */}
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 isometric-grid">
        {pillars.map((p, i) => (
          <div 
            key={p.index} 
            className="feature-card glass-panel rounded-2xl p-10 lg:p-12 relative overflow-hidden group isometric-card"
          >
            {/* Hover Glow */}
            <div className="absolute -inset-full bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl pointer-events-none" style={{ transform: "translateZ(-1px)" }} />
            
            <div className="font-mono text-[12px] text-accent/80 mb-8 tracking-[0.1em] font-medium border border-white/10 px-3 py-1 w-fit rounded bg-white/5">
              {p.index}
            </div>
            
            <div className="w-14 h-14 rounded-xl glass-panel flex items-center justify-center mb-8 text-2xl text-white group-hover:text-accent transition-colors duration-300">
              {p.icon}
            </div>
            
            <h3 className="font-serif text-[28px] mb-5 leading-[1.2]">{p.title}</h3>
            <p className="text-[15px] text-muted leading-[1.9] mb-8">{p.desc}</p>
            
            <ul className="list-none flex flex-col gap-4">
              {p.checks.map((check) => (
                <li
                  key={check}
                  className="font-mono text-[12px] text-white/80 flex items-center gap-4"
                >
                  <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </span>
                  {check}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
