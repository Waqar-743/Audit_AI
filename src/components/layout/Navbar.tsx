"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);

    gsap.fromTo(
      "nav",
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power3.out" }
    );

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[100] h-[72px] border-b border-white/5 transition-all duration-300"
        style={{
          background: scrolled || menuOpen ? "rgba(8,8,8,0.95)" : "transparent",
          backdropFilter: scrolled || menuOpen ? "blur(20px)" : "none",
          boxShadow: scrolled ? "0 10px 30px rgba(0,0,0,0.5)" : "none",
        }}
      >
        <div className="site-container h-full flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="font-mono text-[15px] font-medium tracking-tight text-text no-underline flex items-center gap-3 hover:text-accent transition-colors duration-300 shrink-0"
            onClick={() => setMenuOpen(false)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot"
              style={{ boxShadow: "0 0 10px rgba(168,255,87,0.5)" }}
            />
            AuditAI
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex gap-8 lg:gap-10 list-none">
            {NAV_LINKS.map((link) => (
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

          {/* Desktop CTA */}
          <a
            href="#hero-input"
            className="hidden md:block antigravity-btn font-mono text-[13px] font-medium px-6 py-2.5 rounded-md no-underline tracking-[0.03em] active:translate-y-px shrink-0"
          >
            Free scan
          </a>

          {/* Hamburger button (mobile only) */}
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px] rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors shrink-0"
          >
            <span
              className="block w-5 h-[1.5px] bg-text transition-all duration-300 origin-center"
              style={menuOpen ? { transform: "rotate(45deg) translate(2px, 4.5px)" } : {}}
            />
            <span
              className="block w-5 h-[1.5px] bg-text transition-all duration-300"
              style={menuOpen ? { opacity: 0, transform: "scaleX(0)" } : {}}
            />
            <span
              className="block w-5 h-[1.5px] bg-text transition-all duration-300 origin-center"
              style={menuOpen ? { transform: "rotate(-45deg) translate(2px, -4.5px)" } : {}}
            />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className="fixed inset-0 z-[99] md:hidden transition-all duration-300"
        style={{
          pointerEvents: menuOpen ? "all" : "none",
          opacity: menuOpen ? 1 : 0,
          background: "rgba(8,8,8,0.97)",
          backdropFilter: "blur(20px)",
          paddingTop: "72px",
        }}
      >
        <div className="flex flex-col h-full p-6 gap-4 overflow-y-auto">
          <ul className="list-none flex flex-col gap-1 mt-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-[18px] font-medium text-muted no-underline py-4 border-b border-white/5 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#hero-input"
            onClick={() => setMenuOpen(false)}
            className="antigravity-btn font-mono text-[15px] font-semibold px-6 py-4 rounded-md no-underline tracking-[0.03em] text-center mt-4"
          >
            Free scan →
          </a>
        </div>
      </div>
    </>
  );
}
