"use client";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Database, Mail, ScanSearch, UserCog, X } from "lucide-react";
import clsx from "clsx";

export const DPO_EMAIL = process.env.NEXT_PUBLIC_DPO_EMAIL || "privacy@snowflakes.in";

const CLAUSES = [
  { icon: Database, title: "Data storage & processing", body: "I authorise SnowFlakes to ingest, store and process my identity, contact, commercial and property details to evaluate my franchise application." },
  { icon: ScanSearch, title: "Third-party verification & catchment audits", body: "I permit automated geocoding, trade-area catchment queries, and background and financial verification of the information I have provided." },
  { icon: Mail, title: "Operational communication", body: "I consent to receive application updates, status alerts and outreach from the SnowFlakes expansion team by email and SMS / messaging." },
  { icon: UserCog, title: "My rights as a Data Principal", body: `I may access, correct or erase my data, and withdraw this consent at any time, by writing to SnowFlakes' Data Protection Officer at ${DPO_EMAIL}.` },
];

/** Statutory consent gate (DPDP Act, 2023) shown before the application is submitted. */
export default function DPDPConsentModal({ onCancel, onAgree }: { onCancel: () => void; onAgree: (timestamp: string) => void }) {
  const [checked, setChecked] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const root = ref.current!;
    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"])'));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; (opener.current as HTMLElement | null)?.focus?.(); };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-900/60 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dpdp-title" aria-describedby="dpdp-desc"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-brand-100 bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-ice-200 bg-ice-50 px-6 py-4">
          <div className="flex-1">
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800"><BadgeCheck size={13} /> DPDP Act, 2023 Compliant</span>
            <h2 id="dpdp-title" className="text-2xl font-bold text-brand-900">Data Processing &amp; Verification Consent</h2>
            <p id="dpdp-desc" className="text-sm text-slate-600">Before we submit your application, please review how SnowFlakes will use your data.</p>
          </div>
          <button onClick={onCancel} aria-label="Close consent dialog" className="rounded-full p-1.5 text-slate-500 hover:bg-white"><X size={18} /></button>
        </div>

        <ol className="space-y-3 overflow-y-auto px-6 py-4">
          {CLAUSES.map((c, i) => (
            <li key={c.title} className="flex gap-3 rounded-2xl border border-ice-200 bg-white p-3" tabIndex={0}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"><c.icon size={16} /></span>
              <div><p className="font-bold text-brand-900">{i + 1}. {c.title}</p><p className="text-sm text-slate-600">{c.body}</p></div>
            </li>
          ))}
        </ol>

        <div className="space-y-3 border-t border-ice-200 bg-ice-50 px-6 py-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-brand-900">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-emerald-600" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>I hereby declare that the information provided is accurate and grant explicit consent to SnowFlakes to store, process, and verify my data in accordance with the Digital Personal Data Protection (DPDP) Act.</span>
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost" onClick={onCancel}>Cancel / Review Application</button>
            <button type="button" disabled={!checked} onClick={() => onAgree(new Date().toISOString())}
              className={clsx("inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md transition", checked ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-300")}>
              Yes, Agree &amp; Submit Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
