import { NextRequest, NextResponse } from "next/server";
import { createScan, updateScan, completeScan, failScan } from "@/lib/scan-store";
import { runFullScan } from "@/lib/scanner/scorer";
import { z } from "zod";

const STEP_PROGRESS = [10, 28, 47, 65, 82, 98];
const scanRequestSchema = z.object({
  url: z.string().trim().min(1, "URL is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = scanRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const cleanUrl = normalizeUrl(parsed.data.url);
    if (!isValidTarget(cleanUrl)) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const reachable = await checkReachability(cleanUrl);
    if (!reachable) {
      return NextResponse.json(
        { error: "Website is not reachable. Please check the URL and try again." },
        { status: 400 }
      );
    }

    const scanId = crypto.randomUUID();
    await createScan(scanId, cleanUrl);

    // Run scan asynchronously (fire and forget)
    runScanAsync(scanId, cleanUrl);

    return NextResponse.json({ scanId, url: cleanUrl });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to start scan" },
      { status: 500 }
    );
  }
}

async function runScanAsync(scanId: string, url: string) {
  try {
    await updateScan(scanId, { status: "crawling" });

    const result = await runFullScan(url, (step, text) => {
      void updateScan(scanId, {
        step,
        stepText: text,
        progress: STEP_PROGRESS[step] || 0,
        status: step < 5 ? "analyzing" : "complete",
      });
    });

    // Override the ID in result with our scanId
    result.id = scanId;
    await completeScan(scanId, result);
  } catch (error) {
    await failScan(scanId, error instanceof Error ? error.message : "Scan failed");
  }
}

function normalizeUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function isValidTarget(target: string): boolean {
  try {
    const parsed = new URL(`https://${target}`);
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

async function checkReachability(target: string): Promise<boolean> {
  const candidates = [`https://${target}`, `http://${target}`];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AuditAI/1.0)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (response.status >= 200 && response.status < 500) {
        return true;
      }
    } catch {
      // Try next candidate.
    }
  }

  return false;
}
