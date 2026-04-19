import { NextRequest, NextResponse } from "next/server";
import {
  createScan,
  getScan,
  updateScan,
  completeScan,
  failScan,
} from "@/lib/scan-store";
import { runFullScan } from "@/lib/scanner/scorer";
import { z } from "zod";

const STEP_PROGRESS = [10, 28, 47, 65, 82, 98];
const WORKER_SECRET_HEADER = "x-scan-worker-secret";

const workerPayloadSchema = z.object({
  scanId: z.string().trim().min(1),
  url: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  if (!isAuthorizedWorkerRequest(req)) {
    return NextResponse.json({ error: "Unauthorized worker request" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid worker payload" }, { status: 400 });
  }

  const parsed = workerPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid worker payload" }, { status: 400 });
  }

  const { scanId, url } = parsed.data;

  try {
    const existing = await getScan(scanId);

    if (existing?.status === "complete") {
      return NextResponse.json({ ok: true, scanId, skipped: "already-complete" });
    }

    if (!existing) {
      await createScan(scanId, url);
    }

    await updateScan(scanId, {
      status: "crawling",
      step: 0,
      progress: STEP_PROGRESS[0],
      stepText: "Worker started. Fetching website...",
      error: undefined,
    });

    const result = await runFullScan(url, (step, text) => {
      void updateScan(scanId, {
        step,
        stepText: text,
        progress: STEP_PROGRESS[step] || 0,
        status: step < 5 ? "analyzing" : "complete",
      });
    });

    result.id = scanId;
    await completeScan(scanId, result);

    return NextResponse.json({ ok: true, scanId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Scan failed";
    await failScan(scanId, errorMessage);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

function isAuthorizedWorkerRequest(req: NextRequest): boolean {
  const configuredSecret = process.env.SCAN_WORKER_SECRET?.trim();

  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const incomingSecret = req.headers.get(WORKER_SECRET_HEADER)?.trim();
  return incomingSecret === configuredSecret;
}