"use client";
import { useMemo, useState } from "react";
import { CalendarCheck, Flag } from "lucide-react";
import clsx from "clsx";
import type { Result } from "@/lib/types";

interface Task { id: string; title: string; start: number; end: number; detail: string }
interface Track { name: string; color: string; tasks: Task[] }

const DAYS = 45;

export function buildTracks(r: Result): Track[] {
  const lang = r.onboarding?.language ?? "English";
  const city = r.territory?.city || r.prefix?.city || "your city";
  return [
    { name: "Legal / Site NOC", color: "bg-indigo-500", tasks: [
      { id: "l1", title: "Franchise agreement & KYC", start: 1, end: 7, detail: "Sign the franchise agreement and complete identity / bank KYC with the regional approver." },
      { id: "l2", title: "Site NOC & landlord consent", start: 3, end: 14, detail: `Obtain landlord consent and a No-Objection Certificate for the premises at pin ${r.app.pin}.` },
      { id: "l3", title: "Shop Act & trade licence", start: 10, end: 24, detail: `Register under the Shops & Establishments Act and obtain the municipal trade licence in ${city}.` },
    ] },
    { name: "Store Fit-Out", color: "bg-amber-500", tasks: [
      { id: "f1", title: "Layout & design sign-off", start: 5, end: 10, detail: `Approve the store layout for your ${r.app.size ?? "—"} sq ft ${r.app.floor || ""} space.` },
      { id: "f2", title: "Fit-out works", start: 12, end: 34, detail: "Flooring, fixtures, lighting and branding installed by the approved contractor." },
      { id: "f3", title: "Signage, POS & CCTV install", start: 30, end: 38, detail: "Install external signage, POS hardware, network and CCTV; run a systems check." },
    ] },
    { name: `Staff Training (${lang})`, color: "bg-emerald-500", tasks: [
      { id: "t1", title: "Hire store team", start: 14, end: 26, detail: `Recruit store staff, preferring ${lang}-speaking candidates for the local customer base.` },
      { id: "t2", title: `Training modules in ${lang}`, start: 22, end: 38, detail: `${r.onboarding?.languageNote ?? "Language-matched modules"} — POS, billing, merchandising and customer service.` },
      { id: "t3", title: "Mock store day & certification", start: 38, end: 42, detail: "Run a full simulated trading day and certify the team." },
    ] },
    { name: "Inventory Stocking", color: "bg-rose-500", tasks: [
      { id: "i1", title: "Opening order placed", start: 18, end: 24, detail: "Confirm the opening assortment and place the first purchase order." },
      { id: "i2", title: "Stock dispatch & receipt", start: 30, end: 38, detail: "Goods dispatched from the regional warehouse and received into the store." },
      { id: "i3", title: "Merchandising & planogram", start: 38, end: 43, detail: "Tag, price and arrange stock according to the planogram." },
    ] },
  ];
}

export default function OnboardingGantt({ r }: { r: Result }) {
  const tracks = useMemo(() => buildTracks(r), [r]);
  const [day, setDay] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Task | null>(null);
  const all = tracks.flatMap((t) => t.tasks);
  const pct = (d: number) => ((d - 1) / DAYS) * 100;
  const doneCount = all.filter((t) => done.has(t.id)).length;
  const state = (t: Task) => (done.has(t.id) ? "done" : day >= t.end ? "overdue" : day >= t.start ? "active" : "upcoming");
  const toggle = (id: string) => setDone((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <section>
      <h4 className="mb-1 flex items-center gap-2 text-sm font-bold"><CalendarCheck size={16} className="text-emerald-600" /> 45-day launch roadmap</h4>
      <p className="mb-3 text-xs text-slate-500">Click a bar for details, tick tasks off, or drag the day slider to see what&apos;s due.</p>

      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="relative ml-28 h-5 text-[10px] text-slate-400">
            {Array.from({ length: 10 }).map((_, i) => <span key={i} className="absolute -translate-x-1/2" style={{ left: `${pct(i * 5 + 1)}%` }}>D{i * 5 || 1}</span>)}
          </div>
          {tracks.map((tr) => (
            <div key={tr.name} className="mb-2 flex items-stretch">
              <div className="w-28 shrink-0 pr-2 text-xs font-semibold leading-tight text-slate-700">{tr.name}</div>
              <div className="relative flex-1 rounded bg-slate-50" style={{ height: tr.tasks.length * 24 + 4 }}>
                {tr.tasks.map((t, i) => {
                  const st = state(t);
                  return (
                    <button
                      key={t.id} title={`${t.title} · Day ${t.start}–${t.end}`} onClick={() => setSel(t)}
                      className={clsx("absolute flex h-5 items-center overflow-hidden rounded px-1.5 text-left text-[10px] font-medium text-white transition hover:brightness-110",
                        tr.color, st === "done" && "opacity-40 line-through", st === "upcoming" && "opacity-70", st === "active" && "ring-2 ring-offset-1 ring-slate-900", st === "overdue" && "ring-2 ring-red-500", sel?.id === t.id && "outline outline-2 outline-slate-900")}
                      style={{ left: `${pct(t.start)}%`, width: `${((t.end - t.start + 1) / DAYS) * 100}%`, top: i * 24 + 2 }}
                    >
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
                {day > 0 && <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-slate-900" style={{ left: `${pct(day)}%` }} />}
              </div>
            </div>
          ))}
          <div className="relative ml-28 h-6">
            <span className="absolute right-0 flex items-center gap-1 text-xs font-bold text-emerald-700"><Flag size={12} /> Day 45 · Grand opening</span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs">
        <label htmlFor="day" className="font-semibold">Day {day || "–"}</label>
        <input id="day" type="range" min={0} max={DAYS} value={day} onChange={(e) => setDay(+e.target.value)} className="flex-1" />
        <span className="text-slate-500">{doneCount}/{all.length} done</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${(doneCount / all.length) * 100}%` }} /></div>

      {day > 0 && (
        <p className="mt-2 text-xs text-slate-600">
          Due by day {day}: {all.filter((t) => t.end <= day && !done.has(t.id)).map((t) => t.title).join(", ") || "nothing outstanding"}.
        </p>
      )}

      {sel && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div><p className="font-semibold">{sel.title}</p><p className="text-xs text-slate-500">Day {sel.start} → Day {sel.end} ({sel.end - sel.start + 1} days)</p></div>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold"><input type="checkbox" checked={done.has(sel.id)} onChange={() => toggle(sel.id)} /> Done</label>
          </div>
          <p className="mt-1 text-slate-600">{sel.detail}</p>
        </div>
      )}
    </section>
  );
}
