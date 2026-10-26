"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

/** Top navigation. Inside the admin dashboard the applicant-only links (Apply, Enquiry) are hidden: they belong to the public side. */
export default function NavLinks({ admin, required }: { admin: boolean; required: boolean }) {
  const inAdmin = usePathname().startsWith("/dashboard");
  const link = "rounded-full px-3 py-2 text-brand-900 hover:bg-brand-50";
  return (
    <nav className="flex flex-wrap items-center justify-end gap-1 text-xs font-bold sm:text-sm">
      <Link href="/" className={`hidden md:block ${link}`}>{inAdmin ? "Public site" : "Home"}</Link>
      {!inAdmin && (
        <>
          <Link href="/apply" className="whitespace-nowrap rounded-full bg-brand-600 px-3 py-2 text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 sm:px-4">Apply<span className="hidden sm:inline"> for our franchise</span></Link>
          <Link href="/enquiry" className={link}>Enquiry</Link>
        </>
      )}
      {required && !inAdmin ? (
        // on the public site the entry point is always the login page (prefilled), even if a session is still open
        <Link href="/admin-login" className={link}>Admin login</Link>
      ) : (
        <>
          <Link href="/dashboard" className={inAdmin ? "rounded-full bg-brand-600 px-4 py-2 text-white shadow-md shadow-brand-600/20" : link}>Dashboard</Link>
          {required && admin && <LogoutButton />}
        </>
      )}
    </nav>
  );
}
