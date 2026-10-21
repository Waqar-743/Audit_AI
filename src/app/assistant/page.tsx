import type { Metadata } from "next";
import AssistantClient from "@/components/assistant/AssistantClient";
import { pageMetadata } from "@/lib/site";

type PageProps = {
  searchParams: Promise<{ url?: string | string[]; start?: string | string[] }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  return {
    ...pageMetadata(
      "Pip · Your free SEO assistant | AuditAI",
      "Audit a public webpage, review real evidence, and work on useful SEO fixes with Pip. Free, no account, no API keys. Includes a private Chrome extension.",
      "/assistant",
    ),
    ...(params.url ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function AssistantPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialUrl =
    typeof params.url === "string" ? params.url.slice(0, 4096) : "";
  return (
    <AssistantClient initialUrl={initialUrl} autoStart={params.start === "1"} />
  );
}
