"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const plans = [
  {
    tag: "FREE",
    name: "Quick scan",
    price: "0",
    per: "always free",
    desc: "Get your overall AI readiness score and top-level pillar breakdown — instantly.",
    features: [
      { text: "Overall AI readiness score", included: true },
      { text: "Pillar breakdown (4 scores)", included: true },
      { text: "Top 3 critical issues", included: true },
      { text: "Detailed fix instructions", included: false },
      { text: "Schema code snippets", included: false },
      { text: "PDF report download", included: false },
    ],
    btnText: "Run free scan",
    btnPrimary: false,
    featured: false,
  },
  {
    tag: "MOST POPULAR",
    name: "Full audit",
    price: "29",
    per: "one-time · never expires",
    desc: "Everything you need to fix your AI visibility — with exact code, templates, and a priority action plan.",
    features: [
      { text: "Full AI readiness score", included: true },
      { text: "All 30+ issue details", included: true },
      { text: "Priority fix roadmap", included: true },
      { text: "Copy-paste schema code", included: true },
      { text: "PDF report download", included: true },
      { text: "30-day re-scan access", included: true },
    ],
    btnText: "Get full audit — $29",
    btnPrimary: true,
    featured: true,
  },
  {
    tag: "AGENCY",
    name: "Bulk credits",
    price: "199",
    per: "10 scans · save 31%",
    desc: "Perfect for agencies and consultants managing multiple client websites.",
    features: [
      { text: "10 full audit credits", included: true },
      { text: "Credits never expire", included: true },
      { text: "All full audit features", included: true },
      { text: "Shareable report links", included: true },
      { text: "White-label PDF option", included: true },
      { text: "Priority support", included: true },
    ],
    btnText: "View all packages",
    btnPrimary: false,
    featured: false,
  },
];

export default function Pricing() {
  const containerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !headerRef.current || !cardsRef.current) return;

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

      // Pricing Cards Staggered Animation
      const cards = gsap.utils.toArray(".pricing-card");
      gsap.fromTo(
        cards,
        { y: 80, opacity: 0, rotateY: -10 },
        {
          y: 0,
          opacity: 1,
          rotateY: 0,
          duration: 1.2,
          stagger: 0.15,
          ease: "expo.out",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 75%",
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="pricing" ref={containerRef} className="site-container site-section-bottom relative z-[1]">
      
      <div ref={headerRef} className="mb-20">
        <div className="font-mono text-[13px] tracking-[0.15em] text-accent uppercase mb-6 inline-block bg-accent/10 px-4 py-1.5 rounded-full border border-accent/20">
          Pricing
        </div>
        <h2
          className="font-serif leading-[1.1] tracking-[-0.02em] mb-8"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          Simple, transparent
          <br />
          <em className="italic text-accent">pricing</em>
        </h2>
        <p className="text-[17px] text-muted font-light max-w-[600px] leading-[1.9]">
          Start free. Go deep when you&apos;re ready. No subscriptions, no lock-in.
        </p>
      </div>

      <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 perspective-[2000px]">
        {plans.map((plan, i) => (
          <div
            key={plan.name}
            className={`pricing-card glass-panel rounded-2xl p-10 relative flex flex-col isometric-card ${
              plan.featured
                ? "border-accent/40 shadow-[0_20px_60px_rgba(168,255,87,0.15)] z-10 md:-translate-y-4 md:scale-105"
                : ""
            }`}
          >
            {plan.featured && (
              <div className="absolute -inset-1 bg-gradient-to-b from-accent/30 to-transparent opacity-50 blur-xl -z-10 rounded-3xl pointer-events-none" />
            )}

            <div className="font-mono text-[11px] tracking-[0.15em] text-accent px-4 py-[6px] mb-8 inline-block rounded-full border border-accent/20 w-fit" style={{ background: "var(--accent-dim)" }}>
              {plan.tag}
            </div>
            
            <div className="font-serif text-[32px] mb-4">{plan.name}</div>
            
            <div className="flex items-end gap-1 mb-3">
              <span className="font-mono text-[16px] text-muted mb-[14px]">$</span>
              <span className="font-serif text-[64px] leading-none text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{plan.price}</span>
            </div>
            
            <div className="text-[14px] text-muted mb-4 font-mono">{plan.per}</div>
            <div className="text-[15px] text-muted/80 mb-10 leading-[1.8] min-h-[54px]">{plan.desc}</div>

            <ul className="list-none flex flex-col gap-4 mb-12 flex-1">
              {plan.features.map((f) => (
                <li key={f.text} className="text-[14px] text-white/90 flex gap-4 items-start">
                  <span
                    className={`font-mono text-[14px] shrink-0 mt-[1px] ${
                      f.included ? "text-accent drop-shadow-[0_0_5px_rgba(168,255,87,0.5)]" : "text-white/10"
                    }`}
                  >
                    {f.included ? "✓" : "–"}
                  </span>
                  <span className={f.included ? "" : "text-muted"}>{f.text}</span>
                </li>
              ))}
            </ul>

            <a
              href="#hero-input"
              className={`block w-full py-5 rounded-lg font-mono text-[15px] font-semibold tracking-[0.04em] text-center cursor-pointer no-underline transition-all duration-300 mt-auto ${
                plan.btnPrimary
                  ? "antigravity-btn"
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/30"
              }`}
            >
              {plan.btnText}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
