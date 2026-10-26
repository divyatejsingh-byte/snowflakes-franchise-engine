import { NextResponse } from "next/server";
import { dbEnabled, pingDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public liveness check. Reveals only whether the database answers, never any connection detail. */
export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ ok: true, database: "not configured" });
  try { return NextResponse.json({ ok: true, database: (await pingDb()) ? "connected" : "no response" }); }
  catch { return NextResponse.json({ ok: true, database: "error" }); }
}
