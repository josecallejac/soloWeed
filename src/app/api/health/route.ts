import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getHealthStatus();
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
