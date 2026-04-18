import Link from "next/link";

export default function Footer() {
  const links = [
    { label: "Features", href: "/#features" },
    { label: "How it works", href: "/#how" },
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQ", href: "/#faq" },
  ];

  return (
    <footer className="relative z-10 border-t border-white/5 bg-bg/80 backdrop-blur-md">
      <div className="site-container flex items-center justify-between flex-wrap gap-6 py-10">
        <div className="font-mono text-[14px] text-white/40">
          AuditAI // AI Search Optimization
        </div>

        <ul className="flex gap-6 sm:gap-10 list-none flex-wrap items-center">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-[14px] font-medium text-muted no-underline transition-colors duration-300 hover:text-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <span className="text-[14px] font-medium text-white/35">Privacy policy</span>
          </li>
          <li>
            <span className="text-[14px] font-medium text-white/35">Terms</span>
          </li>
        </ul>

        <div className="font-mono text-[12px] text-white/20">
          © 2026 AuditAI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
