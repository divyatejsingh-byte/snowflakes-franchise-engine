import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminCookie } from "@/lib/adminAuth";

export async function middleware(req: NextRequest) {
  if (await isAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin-login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*"] };
