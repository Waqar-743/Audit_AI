import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuditAI — Is Your Website Ready for AI Search?",
  description:
    "Run a 60-second AI audit. Find out exactly why AI search engines skip your content — and get the precise fixes to start getting cited by ChatGPT, Perplexity, Gemini, and Claude.",
  keywords: [
    "AI SEO",
    "AI search optimization",
    "ChatGPT SEO",
    "structured data audit",
    "schema markup checker",
    "AI readiness score",
  ],
  openGraph: {
    title: "AuditAI — Is Your Website Ready for AI Search?",
    description:
      "Run a 60-second AI audit. Find out why AI search engines skip your content and get precise fixes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&family=Figtree:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>{children}</body>
    </html>
  );
}
