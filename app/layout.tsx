import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import Hydrator from "@/components/Hydrator";
import SnowFall from "@/components/SnowFall";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import { ADMIN_COOKIE, authRequired, isAdminCookie } from "@/lib/adminAuth";

const display = Fredoka({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Nunito({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "SnowFlakes — Scoops of Joy! Franchise Partner Portal",
  description: "Open your own SnowFlakes ice-cream parlour. Check your pin code, apply in minutes and get a personal onboarding roadmap.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdminCookie(cookies().get(ADMIN_COOKIE)?.value);
  const required = authRequired();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">
        <Hydrator />
        <SnowFall />
        <header className="sticky top-0 z-30 border-b border-ice-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2.5">
            <Link href="/" aria-label="SnowFlakes home"><Logo size={40} /></Link>
            <nav className="flex flex-wrap items-center justify-end gap-1 text-xs font-bold sm:text-sm">
              <Link href="/" className="hidden rounded-full px-3 py-2 text-brand-900 hover:bg-brand-50 md:block">Home</Link>
              <Link href="/apply" className="whitespace-nowrap rounded-full bg-brand-600 px-3 py-2 text-white sm:px-4 shadow-md shadow-brand-600/20 hover:bg-brand-700">Apply<span className="hidden sm:inline"> for our franchise</span></Link>
              <Link href="/enquiry" className="rounded-full px-3 py-2 text-brand-900 hover:bg-brand-50">Enquiry</Link>
              {required && !admin ? (
                <Link href="/admin-login" className="rounded-full px-3 py-2 text-brand-900 hover:bg-brand-50">Admin login</Link>
              ) : (
                <>
                  <Link href="/dashboard" className="rounded-full px-3 py-2 text-brand-900 hover:bg-brand-50">Dashboard</Link>
                  {required && <LogoutButton />}
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mt-12 bg-brand-900 text-brand-100">
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="block h-6 w-full -translate-y-[1px] text-ice-50" aria-hidden="true"><path d="M0 0h1200v14c-100 24-200 24-300 8s-200-24-300-8-200 24-300 8S100 6 0 22z" fill="currentColor" /></svg>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8">
            <div><span className="inline-block rounded-2xl bg-white px-3 py-2"><Logo size={34} /></span><p className="mt-2 text-sm text-brand-100/80">Franchise partner portal · Karnataka</p></div>
            <p className="text-sm text-brand-100/80">© {new Date().getFullYear()} SnowFlakes. Spreading joy, one scoop at a time.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
