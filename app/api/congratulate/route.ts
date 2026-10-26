import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, authRequired, isAdminCookie } from "@/lib/adminAuth";
import type { Approval } from "@/lib/congratsEmail";
import { buildDecisionEmail } from "@/lib/decisionEmail";
import { sendEmail } from "@/lib/mailer";
import type { Outcome } from "@/lib/store";
import type { Result } from "@/lib/types";

export const runtime = "nodejs";

const OUTCOMES: Outcome[] = ["ACCEPTED", "ON_HOLD", "WAITLISTED", "REJECTED"];

/** Sends the email for a human decision (congratulations, or an update that invites changes). Admin only when login is on. */
export async function POST(req: Request) {
  try {
    if (authRequired() && !(await isAdminCookie(cookies().get(ADMIN_COOKIE)?.value))) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
    const { result, to, approval, outcome } = (await req.json()) as { result: Result; to: string; approval: Approval; outcome: Outcome };
    if (!result?.app?.id) return NextResponse.json({ error: "Missing result" }, { status: 400 });
    if (!OUTCOMES.includes(outcome)) return NextResponse.json({ error: "Unknown decision" }, { status: 400 });
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) return NextResponse.json({ error: "A valid recipient email is needed." }, { status: 400 });
    const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.MAIL_REPLY_TO || "";
    const mail = buildDecisionEmail(result, outcome, to, approval, new URL(req.url).origin, contact);
    const out = await sendEmail(mail);
    return NextResponse.json({ ...out, to });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
