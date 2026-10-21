import { auditPage } from "@/shared/seo/audit";
import { extractSource } from "@/lib/assistant/extract-source";
import { AuditFetchError, fetchPublicHtml } from "@/lib/assistant/safe-fetch";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  // Stream a small bounded JSON request rather than allocating arbitrary payloads.
  const reader = request.body?.getReader();
  if (!reader)
    return Response.json(
      { error: "Enter a website address." },
      { status: 400, headers },
    );
  let body = "";
  const decoder = new TextDecoder();
  try {
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4_096) {
        await reader.cancel();
        return Response.json(
          { error: "The request is too large." },
          { status: 413, headers },
        );
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return Response.json(
        { error: "Enter a valid website address." },
        { status: 400, headers },
      );
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("url" in parsed) ||
      typeof parsed.url !== "string" ||
      !parsed.url.trim() ||
      parsed.url.length > 2_048
    )
      return Response.json(
        { error: "Enter a valid website address." },
        { status: 400, headers },
      );
    const page = await fetchPublicHtml(parsed.url.trim(), request.signal);
    return Response.json(
      auditPage(
        extractSource(page.html, page.url, page.statusCode, page.robots),
      ),
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof AuditFetchError
            ? error.message
            : "The site could not be reached within the scan limit. Try again or inspect the loaded page with the extension.",
      },
      { status: error instanceof AuditFetchError ? 422 : 502, headers },
    );
  } finally {
    reader.releaseLock();
  }
}
