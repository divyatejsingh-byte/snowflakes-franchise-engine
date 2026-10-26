import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCreds, sessionToken } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const { username, password } = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const c = adminCreds();
  if (username !== c.user || password !== c.password) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await sessionToken(), {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", // session cookie: signing in is needed again after the browser is closed
  });
  return res;
}
