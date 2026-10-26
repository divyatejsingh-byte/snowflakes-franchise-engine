import { NextResponse } from "next/server";
import { dispatchApplicationNotifications } from "@/lib/mailer";
import type { Result } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { result, email } = (await req.json()) as { result: Result; email: string };
    if (!result?.app?.id) return NextResponse.json({ error: "Missing result" }, { status: 400 });
    const out = await dispatchApplicationNotifications(result, email || "candidate@example.com");
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
