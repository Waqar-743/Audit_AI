"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    
    // Antigravity initial animation
    gsap.fromTo(
      "nav",
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power3.out" }
    );

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] h-[80px] border-b border-white/5 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(8,8,8,0.6)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        boxShadow: scrolled ? "0 10px 30px rgba(0,0,0,0.5)" : "none",
      }}
    >
      <div className="site-container h-full flex items-center justify-between gap-6">
        <Link href="/" className="font-mono text-[16px] font-medium tracking-tight text-text no-underline flex items-center gap-3 hover:text-accent transition-colors duration-300">
          <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot" style={{ boxShadow: "0 0 10px rgba(168,255,87,0.5)" }} />
          AuditAI
        </Link>

        <ul className="hidden md:flex gap-10 list-none">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how" },
            { label: "Pricing", href: "#pricing" },
            { label: "FAQ", href: "#faq" },
          ].map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[14px] font-medium text-muted no-underline transition-all duration-300 hover:text-white hover:-translate-y-0.5 inline-block"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#hero-input"
          className="antigravity-btn font-mono text-[14px] font-medium px-7 py-3 rounded-md no-underline tracking-[0.03em] active:translate-y-px"
        >
          Free scan
        </a>
      </div>
    </nav>
  );
}
