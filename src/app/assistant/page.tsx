import type { Metadata } from "next";
import AssistantClient from "@/components/assistant/AssistantClient";

export const metadata: Metadata = {
  title: "Pip · Your free SEO assistant | AuditAI",
  description:
    "Audit a public webpage, review real evidence, and work on useful SEO fixes with Pip. Free, no account, no API keys. Includes a private Chrome extension.",
  icons: { icon: "/birds/parrot.svg" },
};

export default function AssistantPage() {
  return <AssistantClient />;
}
