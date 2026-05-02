import { NextRequest, NextResponse } from "next/server";
import { createScan, updateScan, failScan } from "@/lib/scan-store";
import { z } from "zod";

const scanRequestSchema = z.object({
  url: z.string().trim().min(1, "URL is required"),
});

const qstashPayloadSchema = z.object({
  scanId: z.string().trim().min(1),
  url: z.string().trim().min(1),
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

    const scanId = crypto.randomUUID();
    await createScan(scanId, cleanUrl);
    await updateScan(scanId, {
      status: "pending",
      step: 0,
      progress: 0,
      stepText: "Queued for processing...",
    });

    try {
      await enqueueScanJob(req, { scanId, url: cleanUrl });
    } catch (queueError) {
      const queueErrorMessage =
        queueError instanceof Error ? queueError.message : "Failed to queue scan job";
      await failScan(scanId, queueErrorMessage);
      return NextResponse.json({ error: "Failed to queue scan job" }, { status: 500 });
    }

    return NextResponse.json({ scanId, url: cleanUrl });
  } catch {
    return NextResponse.json(
      { error: "Failed to start scan" },
      { status: 500 }
    );
  }
}

async function enqueueScanJob(
  req: NextRequest,
  payload: z.infer<typeof qstashPayloadSchema>
): Promise<void> {
  const validated = qstashPayloadSchema.parse(payload);
  const qstashToken = process.env.QSTASH_TOKEN?.trim();
  const workerWebhookUrl = resolveWorkerWebhookUrl(req);
  const workerSecret = process.env.SCAN_WORKER_SECRET?.trim();

  if (!qstashToken) {
    // No QStash configured — invoke the worker webhook directly in the background.
    // This path is used in local development and self-hosted deployments without a queue.
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (workerSecret) {
      headers["x-scan-worker-secret"] = workerSecret;
    }
    fetch(workerWebhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(validated),
    }).catch(() => {
      // Worker errors surface via the scan status API; no action needed here.
    });
    return;
  }

  const qstashBaseUrl = process.env.QSTASH_URL?.trim() || "https://qstash.upstash.io";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${qstashToken}`,
    "Content-Type": "application/json",
    "Upstash-Retries": "3",
    "Upstash-Content-Based-Deduplication": "true",
  };

  if (workerSecret) {
    headers["Upstash-Forward-x-scan-worker-secret"] = workerSecret;
  }

  const response = await fetch(
    `${qstashBaseUrl}/v2/publish/${workerWebhookUrl}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(validated),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `QStash publish failed (${response.status}): ${responseText.slice(0, 220)}`
    );
  }

  await updateScan(validated.scanId, {
    status: "pending",
    step: 0,
    progress: 5,
    stepText: "Scan queued. Waiting for worker...",
  });
}

function resolveWorkerWebhookUrl(req: NextRequest): string {
  const configuredWebhookUrl = process.env.SCAN_WORKER_WEBHOOK_URL?.trim();
  if (configuredWebhookUrl) {
    return configuredWebhookUrl;
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) {
    throw new Error("Unable to resolve worker webhook URL");
  }

  const protocol =
    req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}/api/webhooks/scan`;
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
