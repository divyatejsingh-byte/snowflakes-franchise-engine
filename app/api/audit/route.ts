import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, authRequired, isAdminCookie } from "@/lib/adminAuth";
import { addAuditEvents, dbEnabled, listAuditEvents } from "@/lib/db";

export const runtime = "nodejs";

const KINDS = ["ingest", "rule", "mutation", "cascade", "dispatch", "submit", "decision"];
const denied = async () => authRequired() && !(await isAdminCookie(cookies().get(ADMIN_COOKIE)?.value));

/** Admin-only audit trail kept in Neon Postgres. Best effort: the on-screen event stream works with or without it. */
export async function GET() {
  if (await denied()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  if (!dbEnabled()) return NextResponse.json({ enabled: false, events: [] });
  try { return NextResponse.json({ enabled: true, events: await listAuditEvents(200) }); }
  catch (e) { return NextResponse.json({ enabled: true, error: (e as Error).message, events: [] }, { status: 500 }); }
}

export async function POST(req: Request) {
  if (await denied()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  if (!dbEnabled()) return NextResponse.json({ enabled: false, saved: 0 });
  try {
    const { events } = (await req.json()) as { events?: { kind?: unknown; text?: unknown }[] };
    const clean = (Array.isArray(events) ? events : [])
      .filter((e) => typeof e?.kind === "string" && KINDS.includes(e.kind as string) && typeof e?.text === "string")
      .map((e) => ({ kind: e.kind as string, text: (e.text as string).slice(0, 600) }));
    return NextResponse.json({ enabled: true, saved: await addAuditEvents(clean) });
  } catch (e) {
    return NextResponse.json({ enabled: true, error: (e as Error).message }, { status: 500 });
  }
}
