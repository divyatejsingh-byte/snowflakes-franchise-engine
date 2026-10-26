"use client";
import { useEffect } from "react";
import { FileDown, Printer, X } from "lucide-react";
import Logo from "./Logo";
import { fitOut, trainingSchedule } from "@/lib/onboardingKit";
import type { Result } from "@/lib/types";

/** One-click onboarding kit: LOI + fit-out checklist + 14-day localized training plan. Print → "Save as PDF". */
export default function OnboardingKit({ r, onClose }: { r: Result; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const a = r.app;
  const fit = fitOut(r);
  const tr = trainingSchedule(r);
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/60 print:static print:bg-white" role="dialog" aria-modal="true" aria-label="Onboarding kit">
      <div className="flex items-center gap-3 bg-white px-4 py-2 shadow print:hidden">
        <FileDown size={18} className="text-brand-600" />
        <h2 className="font-bold">Onboarding kit · {a.name} ({a.id})</h2>
        <div className="ml-auto flex gap-2">
          <button className="btn" onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</button>
          <button className="btn-ghost" onClick={onClose}><X size={16} /> Close</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0">
        <article id="onboarding-kit" className="mx-auto max-w-3xl space-y-8 rounded-xl bg-white p-8 text-sm leading-relaxed text-slate-800 shadow-xl print:rounded-none print:shadow-none">
          {/* LOI */}
          <section>
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3"><Logo size={44} /><p className="text-right text-xs text-slate-500">Date: {date}<br />Ref: SF/LOI/{a.id}</p></div>
            <h1 className="text-2xl font-bold text-brand-900">Letter of Intent — SnowFlakes Franchise</h1>
            <p className="mt-3">Dear <b>{a.name}</b>,</p>
            <p className="mt-2">Congratulations! SnowFlakes is pleased to confirm its intent to award you a franchise for a SnowFlakes ice-cream parlour on the following basis:</p>
            <table className="mt-3 w-full border-collapse text-left">
              <tbody>
                {[
                  ["Applicant", `${a.name} (${a.id})`],
                  ["Territory", r.territory ? `${r.territory.id} · ${r.territory.city}, Karnataka` : r.prefix?.city ?? "—"],
                  ["Store pin code", a.pin],
                  ["Proposed premises", `${a.size ?? "—"} sq ft · ${a.floor || "floor to be confirmed"} · ${a.space || "space to be confirmed"}`],
                  ["Declared investment capacity", `₹${a.investment ?? "—"} lakh`],
                  ["Target launch", a.launch != null ? `${a.launch} month(s) from signing` : "To be agreed"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-100"><th className="w-52 py-1.5 pr-3 align-top text-xs font-bold uppercase tracking-wide text-slate-500">{k}</th><td className="py-1.5">{v}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-600">This letter records our mutual intent only. It is non-binding and is subject to (i) verification of the premises and submitted documents, (ii) confirmation that no other SnowFlakes store operates in pin code {a.pin}, and (iii) execution of the definitive franchise agreement. Commercial terms will be set out in that agreement.</p>
            <div className="mt-8 grid grid-cols-2 gap-8 text-xs"><div className="border-t border-slate-400 pt-1">For SnowFlakes — Authorised signatory</div><div className="border-t border-slate-400 pt-1">Accepted by — {a.name}</div></div>
          </section>

          {/* Fit-out */}
          <section className="break-before-page">
            <h2 className="text-xl font-bold text-brand-900">Store fit-out checklist · {a.size ?? "—"} sq ft</h2>
            <p className="mt-1 text-slate-600">{fit.layoutNote}</p>
            <table className="mt-3 w-full border-collapse text-left text-xs">
              <thead><tr className="bg-brand-50"><th className="p-2">Zone</th><th className="p-2 text-right">Share</th><th className="p-2 text-right">Approx. area</th></tr></thead>
              <tbody>{fit.zones.map((z) => <tr key={z.name} className="border-b border-slate-100"><td className="p-2">{z.name}</td><td className="p-2 text-right">{z.pct}%</td><td className="p-2 text-right">{Math.round(((a.size ?? 450) * z.pct) / 100)} sq ft</td></tr>)}</tbody>
            </table>
            <ul className="mt-3 space-y-1.5">{fit.items.map((it) => <li key={it} className="flex gap-2"><span className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded border border-slate-400" />{it}</li>)}</ul>
          </section>

          {/* Training */}
          <section className="break-before-page">
            <h2 className="text-xl font-bold text-brand-900">{tr.heading} <span className="text-sm font-medium text-slate-500">({tr.lang})</span></h2>
            <p className="mt-1 text-slate-600">{r.onboarding?.track} — {tr.note}</p>
            <ol className="mt-3 space-y-1.5">
              {tr.days.map((d) => (
                <li key={d.n} className="flex items-start gap-3 rounded-lg border border-slate-100 p-2">
                  <span className="w-16 shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-center text-xs font-bold text-brand-700">{tr.lang === "Kannada" ? "ದಿನ" : tr.lang === "Hindi" ? "दिन" : "Day"} {d.n}</span>
                  <span className="flex-1">{d.title}</span>
                  {d.tag && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{d.tag}</span>}
                </li>
              ))}
            </ol>
            <p className="mt-6 text-center text-xs text-slate-400">SnowFlakes · Scoops of Joy!</p>
          </section>
        </article>
      </div>
    </div>
  );
}
