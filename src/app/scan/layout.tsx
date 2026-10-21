import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your page report | AuditAI · Pip",
  description: "Your individual page audit and suggested next steps.",
  robots: { index: false, follow: false },
};

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
