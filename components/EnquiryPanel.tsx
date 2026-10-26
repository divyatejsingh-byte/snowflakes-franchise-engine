"use client";
import { useState } from "react";
import { Check, Copy, Mail, MessageSquareQuote } from "lucide-react";

const EMAILS = ["Divyatej_singh@pg27.mesaschool.co", "Shaik_Roshan@pg27.mesaschool.co"];

/** Official enquiry contacts + a prompt that opens the AI concierge. Lives on the /enquiry page only. */
export default function EnquiryPanel() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (email: string) => {
    try { await navigator.clipboard.writeText(email); }
    catch {
      const t = document.createElement("textarea"); // fallback for non-secure contexts
      t.value = email; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(email);
    setTimeout(() => setCopied((c) => (c === email ? null : c)), 1800);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-brand-900">Enquiry &amp; Support</h1>
        <p className="mx-auto mt-1 max-w-xl text-slate-600">Questions before you apply? Reach our team directly or ask the concierge.</p>
      </div>

      <section className="card p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-brand-900"><Mail size={18} className="text-brand-600" /> Franchise Expansion Desk / Inquiries</h2>
        <p className="mb-4 text-sm text-slate-600">Write to either contact and we&apos;ll get back to you.</p>
        <ul className="space-y-2">
          {EMAILS.map((e) => (
            <li key={e} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ice-200 bg-ice-50 px-4 py-3">
              <a href={`mailto:${e}`} className="break-all font-semibold text-brand-700 hover:underline">{e}</a>
              <button type="button" onClick={() => copy(e)} aria-label={`Copy ${e}`} className="btn-ghost !px-3 !py-1.5 text-xs">
                {copied === e ? <><Check size={13} className="text-emerald-600" /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-brand-900"><MessageSquareQuote size={18} className="text-brand-600" /> Ask our AI Concierge</h2>
        <p className="text-sm text-slate-700">Have questions about the application or store criteria? Ask our 24/7 AI Concierge Bot in the bottom right corner 💬</p>
        <button type="button" className="btn mt-4" onClick={() => window.dispatchEvent(new Event("open-concierge"))}>Open the concierge</button>
      </section>
    </div>
  );
}
