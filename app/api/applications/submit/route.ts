import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Submission gate. Applications are held client-side in this MVP, so this endpoint enforces the statutory rule server-side
 * (no DPDP consent ⇒ 400) and returns the authoritative consent record that the client appends to the applicant's profile.
 */
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as { dpdpConsentGranted?: unknown; dpdpConsentTimestamp?: unknown; email?: unknown };
    if (b.dpdpConsentGranted !== true) {
      return NextResponse.json({ error: "DPDP consent is required to submit an application." }, { status: 400 });
    }
    const ts = typeof b.dpdpConsentTimestamp === "string" ? new Date(b.dpdpConsentTimestamp) : null;
    if (!ts || isNaN(ts.getTime())) return NextResponse.json({ error: "A valid consent timestamp is required." }, { status: 400 });
    return NextResponse.json({
      ok: true,
      consent: { granted: true, timestamp: ts.toISOString(), recordedAt: new Date().toISOString(), version: "DPDP-2023-v1" },
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
