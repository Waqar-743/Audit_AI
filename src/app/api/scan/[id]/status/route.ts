import { NextRequest, NextResponse } from "next/server";
import { getScan } from "@/lib/scan-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scan = await getScan(id);

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: scan.id,
    status: scan.status,
    step: scan.step,
    stepText: scan.stepText,
    progress: scan.progress,
    error: scan.error,
  });
}
