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

  if (scan.status !== "complete" || !scan.result) {
    return NextResponse.json(
      { error: "Scan not complete yet", status: scan.status },
      { status: 202 }
    );
  }

  return NextResponse.json(scan.result);
}
