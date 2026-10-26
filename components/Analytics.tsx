"use client";
import { useMemo } from "react";
import type { Dataset, Result } from "@/lib/types";

/** Funnel (Intake → Clean → Pin winner → Slot allocated) and territory demand vs open slots. */
export default function Analytics({ results, dataset }: { results: Result[]; dataset: Dataset }) {
  const funnel = useMemo(() => {
    const clean = results.filter((r) => r.prefix && r.status !== "REJECTED" && !!r.territory);
    const winners = results.filter((r) => r.territoryRank != null);
    const accepted = results.filter((r) => r.status === "ACCEPTED");
    return [
      { label: "Intake", n: results.length, color: "bg-brand-500" },
      { label: "Clean (valid pin, mapped, no store)", n: clean.length, color: "bg-sky-500" },
      { label: "Pin-code winner", n: winners.length, color: "bg-teal-500" },
      { label: "Slot allocated", n: accepted.length, color: "bg-emerald-500" },
    ];
  }, [results]);

  const demand = useMemo(
    () => dataset.territories.map((t) => {
      const applicants = results.filter((r) => r.territory?.id === t.id && r.status !== "REJECTED").length;
      const index = t.slots ? applicants / t.slots : applicants;
      const badge = index > 2 ? "Oversubscribed" : applicants < t.slots ? "Unfilled slots" : "Balanced";
      return { id: t.id, city: t.city, slots: t.slots, applicants, index, badge, filled: results.filter((r) => r.territory?.id === t.id && r.status === "ACCEPTED").length };
    }),
    [dataset.territories, results],
  );
  const max = Math.max(1, ...funnel.map((f) => f.n));
  const dmax = Math.max(1, ...demand.map((d) => Math.max(d.applicants, d.slots)));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-4">
        <h3 className="mb-3 font-bold text-brand-900">Pipeline funnel</h3>
        <div className="space-y-2">
          {funnel.map((f, i) => (
            <div key={f.label}>
              <div className="flex justify-between text-xs"><span className="font-semibold text-slate-600">{f.label}</span><span className="tabular-nums font-bold">{f.n}{i > 0 && funnel[i - 1].n > 0 && <span className="font-normal text-slate-400"> · {Math.round((f.n / funnel[i - 1].n) * 100)}% of previous</span>}</span></div>
              <div className="mt-0.5 h-6 rounded-lg bg-slate-100"><div className={`h-6 rounded-lg ${f.color} transition-all duration-500`} style={{ width: `${(f.n / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-1 font-bold text-brand-900">Territory demand pressure (applicants ÷ open slots)</h3>
        <p className="mb-3 flex gap-4 text-[11px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-3 rounded bg-sky-400" />Applicants</span><span><i className="mr-1 inline-block h-2 w-3 rounded bg-amber-400" />Open slots</span><span><i className="mr-1 inline-block h-2 w-3 rounded bg-emerald-500" />Filled</span></p>
        <div className="space-y-2">
          {demand.map((d) => (
            <div key={d.id} className="grid grid-cols-[100px_1fr_auto] items-center gap-2 text-xs">
              <span className="truncate font-semibold text-slate-600" title={d.city}>{d.city}</span>
              <div className="space-y-0.5">
                <div className="h-2.5 rounded bg-slate-100"><div className="h-2.5 rounded bg-sky-400" style={{ width: `${(d.applicants / dmax) * 100}%` }} /></div>
                <div className="h-2.5 rounded bg-slate-100"><div className="relative h-2.5 rounded bg-amber-400" style={{ width: `${(d.slots / dmax) * 100}%` }}><div className="absolute inset-y-0 left-0 rounded bg-emerald-500" style={{ width: `${d.slots ? (d.filled / d.slots) * 100 : 0}%` }} /></div></div>
              </div>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="tabular-nums font-bold text-slate-600">{d.applicants}/{d.slots}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${d.badge === "Oversubscribed" ? "bg-rose-100 text-rose-700" : d.badge === "Unfilled slots" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`} title={`Demand index ${d.index.toFixed(1)}×`}>{d.badge} · {d.index.toFixed(1)}×</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
