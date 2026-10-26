"use client";
import { useMemo, useState } from "react";
import { ArrowRight, RotateCcw, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { floorOf, simulate } from "@/lib/engine";
import { useResults, useStore } from "@/lib/store";
import type { Application, Result } from "@/lib/types";
import { Delta, StatusBadge } from "./ui";
import CascadeAlert from "./CascadeAlert";

const FLOORS = [{ v: "Ground", label: "Ground" }, { v: "Mall unit", label: "Mall unit" }, { v: "First floor", label: "Upper" }] as const;

/** Reviewer sandbox: drag sliders and watch score, status and ripple effects on rival applicants update live. */
export default function WhatIfPanel({ r }: { r: Result }) {
  const { dataset } = useResults();
  const patchApplication = useStore((s) => s.patchApplication);
  const a = r.app;
  const base = { investment: a.investment ?? 0, size: a.size ?? 0, launch: a.launch ?? 6, floor: floorOf(a.floor) === "Upper" ? "First floor" : floorOf(a.floor) === "Unknown" ? "" : floorOf(a.floor) };
  const [v, setV] = useState(base);

  const patch = useMemo(() => {
    const p: Partial<Application> = {};
    if (v.investment !== base.investment) p.investment = v.investment;
    if (v.size !== base.size) p.size = v.size;
    if (v.launch !== base.launch) p.launch = v.launch;
    if (v.floor !== base.floor && v.floor) p.floor = v.floor;
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, a.id, a.investment, a.size, a.launch, a.floor]);

  const d = useMemo(() => (Object.keys(patch).length ? simulate(dataset, a.id, patch) : null), [dataset, a.id, patch]);
  const bumped = d?.sideEffects.filter((s) => s.from.startsWith("ACCEPTED") && !s.to.startsWith("ACCEPTED")) ?? [];
  const promoted = d?.sideEffects.filter((s) => !s.from.startsWith("ACCEPTED") && s.to.startsWith("ACCEPTED")) ?? [];

  const story = d
    ? `${d.scoreDelta == null ? "Score n/a" : `Score ${d.scoreDelta >= 0 ? "+" : ""}${d.scoreDelta} pts`}: ${d.statusChanged ? `moves from ${d.before.label}${d.before.territoryRank ? ` #${d.before.territoryRank}` : ""} to ${d.after.label}${d.after.territoryRank ? ` #${d.after.territoryRank}` : ""}` : `stays ${d.after.label}${d.after.territoryRank ? ` (rank #${d.after.territoryRank})` : ""}`}${bumped.length ? `, bumping ${bumped.map((b) => b.id).join(", ")} out of the final slot${d.after.territory ? ` in ${d.after.territory.city} (${d.after.territory.id})` : ""}` : ""}${promoted.length ? `, promoting ${promoted.map((b) => b.id).join(", ")}` : ""}.`
    : "Move a slider or pick a floor to see the ripple effect.";

  const commit = () => { patchApplication(a.id, patch); };

  return (
    <section className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-bold"><SlidersHorizontal size={16} className="text-brand-600" /> What-if sandbox</h4>
        <button className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline" onClick={() => setV(base)}><RotateCcw size={12} /> Reset</button>
      </div>

      <div className="space-y-3">
        <Slider label="Investment" unit="₹ lakh" min={5} max={90} step={1} value={v.investment} base={base.investment} onChange={(x) => setV({ ...v, investment: x })} />
        <Slider label="Space size" unit="sq ft" min={100} max={900} step={10} value={v.size} base={base.size} onChange={(x) => setV({ ...v, size: x })} />
        <Slider label="Launch timeline" unit="months" min={1} max={12} step={1} value={v.launch} base={base.launch} onChange={(x) => setV({ ...v, launch: x })} />
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-600">Floor</p>
          <div className="flex gap-1.5">
            {FLOORS.map((f) => (
              <button key={f.v} onClick={() => setV({ ...v, floor: f.v })} className={clsx("flex-1 rounded-full border px-2 py-1 text-xs font-bold transition", v.floor === f.v ? "border-brand-600 bg-brand-600 text-white" : "border-brand-100 bg-white text-brand-700 hover:bg-brand-50")}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={clsx("mt-3 rounded-lg border p-2.5 transition", d ? "border-brand-500 bg-white" : "border-dashed border-slate-300 bg-white/60")}>
        {d && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-lg font-extrabold tabular-nums">{d.before.score ?? "—"} <ArrowRight className="inline" size={14} /> {d.after.score ?? "—"}</span>
            <Delta value={d.scoreDelta} />
            <StatusBadge status={d.before.status} label={d.before.label} /> <ArrowRight size={14} /> <StatusBadge status={d.after.status} label={d.after.label} />
          </div>
        )}
        <p className="text-slate-700">{story}</p>
        {d && <div className="mt-2"><CascadeAlert cascade={d.cascade} /></div>}
        {d && d.sideEffects.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600">{d.sideEffects.map((s) => <li key={s.id}><b>{s.id}</b>: {s.from} → {s.to}</li>)}</ul>
        )}
        {d?.after.economics && <p className="mt-1.5 text-xs text-slate-500">Projected payback: {d.before.economics?.paybackMonths ?? "—"} → <b className={d.after.economics.risk ? "text-red-600" : ""}>{d.after.economics.paybackMonths ?? "—"} months</b></p>}
      </div>

      {d && <button className="btn mt-3 w-full" onClick={commit}>Commit this change to {a.id}</button>}
    </section>
  );
}

function Slider({ label, unit, min, max, step, value, base, onChange }: { label: string; unit: string; min: number; max: number; step: number; value: number; base: number; onChange: (v: number) => void }) {
  const changed = value !== base;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="tabular-nums"><b className={changed ? "text-brand-700" : ""}>{value || "—"}</b> {unit}{changed && <span className="text-slate-400"> (was {base || "—"})</span>}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={(e) => onChange(+e.target.value)} className="w-full accent-brand-600" aria-label={label} />
    </div>
  );
}
