"use client";
import { useMemo, useState } from "react";
import { ChevronDown, Lightbulb, Sparkles, Wand2 } from "lucide-react";
import clsx from "clsx";
import { prefixOf } from "@/lib/allowed";
import { candidateStatus } from "@/lib/candidate";
import { evaluate, ownershipOf, padPin, scoreApplication, TIER_BENCHMARK } from "@/lib/engine";
import type { Application, Breakdown, Dataset } from "@/lib/types";
import { Bar } from "./ui";

export interface FormValues {
  name: string; email: string; investment: string; experience: string; business: string; language: string; launch: string;
  pin: string; floor: string; size: string; ownership: string; notes: string;
}

const num = (s: string) => (s.trim() === "" || isNaN(+s) ? null : +s);

function draftApp(f: FormValues): Application {
  return {
    id: "DRAFT-PREVIEW", name: f.name.trim() || "You", location: "", city: "", pin: padPin(f.pin),
    investment: num(f.investment), experience: num(f.experience) ?? 0, business: f.business, space: f.ownership,
    size: num(f.size), floor: f.floor, launch: num(f.launch), language: f.language, notes: "",
  };
}

interface Prov { launch: boolean; investment: boolean; experience: boolean; business: boolean; floor: boolean; size: boolean }

/** Scores only what the candidate has actually entered, so an untouched form starts at 0 and grows field by field. */
function adjusted(app: Application, tier: 1 | 2 | 3, prov: Prov): Breakdown {
  const bd = scoreApplication(app, tier);
  const launch = prov.launch ? bd.launch.pts : 0;
  const capital = prov.investment ? bd.capital.pts : 0;
  const experience = (prov.experience ? bd.experience.parts.years : 0) + (prov.business ? bd.experience.parts.keyword : 0);
  const realEstate = (prov.floor ? bd.realEstate.parts.floor : 0) + (prov.size ? bd.realEstate.parts.area : 0);
  const nd = "Not entered yet";
  return {
    ...bd,
    launch: { ...bd.launch, pts: launch, detail: prov.launch ? bd.launch.detail : nd },
    capital: { ...bd.capital, pts: capital, detail: prov.investment ? bd.capital.detail : nd },
    experience: { ...bd.experience, pts: experience, detail: prov.experience || prov.business ? bd.experience.detail : nd },
    realEstate: { ...bd.realEstate, pts: realEstate, detail: prov.floor || prov.size ? bd.realEstate.detail : nd },
    total: launch + capital + experience + realEstate,
  };
}

interface Lever { key: string; title: string; why: string; patch: Partial<FormValues>; gain: number; projected: string }

export default function ApplicationStrengthChecker({
  values, dataset, onApply,
}: { values: FormValues; dataset: Dataset; onApply: (patch: Partial<FormValues>) => void }) {
  const [openMobile, setOpenMobile] = useState(false);

  const model = useMemo(() => {
    const app = draftApp(values);
    const info = prefixOf(app.pin);
    const tier = info?.tier ?? 2; // assume Tier 2 until a valid pin code is entered
    const prov: Prov = {
      launch: values.launch.trim() !== "", investment: values.investment.trim() !== "", experience: values.experience.trim() !== "",
      business: values.business.trim() !== "", floor: values.floor !== "", size: values.size.trim() !== "",
    };
    const bd = adjusted(app, tier, prov);
    const bench = TIER_BENCHMARK[tier];

    const project = (a: Application) => {
      if (!info) return null;
      const r = evaluate({ ...dataset, applications: [...dataset.applications, a] }).find((x) => x.app.id === a.id);
      return r ? candidateStatus(r).label : null;
    };
    const status = prov.investment ? project(app) : null;

    const levers: Lever[] = [];
    const add = (key: string, title: string, why: string, patch: Partial<FormValues>, appPatch: Partial<Application>) => {
      const next = { ...app, ...appPatch };
      const nextProv: Prov = { ...prov, ...(patch.floor !== undefined && { floor: true }), ...(patch.size !== undefined && { size: true }), ...(patch.investment !== undefined && { investment: true }), ...(patch.launch !== undefined && { launch: true }) };
      const gain = adjusted(next, tier, nextProv).total - bd.total;
      if (gain > 0) levers.push({ key, title, why, patch, gain, projected: project(next) ?? "" });
    };

    const noSpace = values.ownership === "Not yet identified"; // size and floor are fixed (0 / Not known) until a space exists
    const fl = values.floor;
    if (!noSpace && fl !== "Ground" && fl !== "Mall unit") {
      add("floor", "Choose a ground-floor unit", fl === "" ? "The floor isn't known yet — street-facing ground-floor shops score highest." : "Ice cream is an impulse buy, and upper floors see far less walk-in footfall.", { floor: "Ground" }, { floor: "Ground" });
    } else if (!noSpace && fl === "Mall unit") {
      add("floor", "Consider a ground-floor unit", "A street-level shop scores a little higher than a mall unit.", { floor: "Ground" }, { floor: "Ground" });
    }
    const sz = num(values.size);
    if (!noSpace && (sz == null || sz < 250 || sz > 450)) {
      add("size", "Aim for about 350 sq ft", sz == null ? "Tell us your shop size — 250–450 sq ft is the sweet spot for a scoop parlour." : sz < 250 ? "Your space is tight for freezers, a counter and a queue." : "Your space is bigger than a scoop parlour needs and adds rent.", { size: "350" }, { size: 350 });
    }
    const inv = num(values.investment);
    if (inv == null || inv < bench * 1.2) {
      const target = Math.ceil(bench * 1.2);
      add("capital", `Build a buffer of about ₹${target} lakh`, `Stores in this city usually start from ~₹${bench} lakh. Adding working capital or a co-investor gives you headroom.`, { investment: String(target) }, { investment: target });
    }
    const lm = num(values.launch);
    if (lm == null || lm > 3) {
      add("launch", "Target a launch within 60 days", "Partners who can open sooner get priority for the available openings.", { launch: "2" }, { launch: 2 });
    }
    levers.sort((a, b) => b.gain - a.gain);

    return { bd, tier, assumedTier: !info, status, levers, needsSpace: values.ownership === "Not yet identified" };
  }, [values, dataset]);

  const { bd } = model;
  const tone = bd.total >= 80 ? "text-emerald-600" : bd.total >= 55 ? "text-amber-600" : "text-rose-600";

  return (
    <aside className="lg:sticky lg:top-20">
      <button className="card flex w-full items-center justify-between p-3 text-left font-semibold lg:hidden" onClick={() => setOpenMobile((o) => !o)} aria-expanded={openMobile}>
        <span className="flex items-center gap-2"><Sparkles size={16} className="text-brand-600" /> Application strength: <b className={tone}>{bd.total}/100</b></span>
        <ChevronDown size={16} className={clsx("transition", openMobile && "rotate-180")} />
      </button>

      <div className={clsx("card mt-2 space-y-4 p-4 lg:mt-0 lg:block", openMobile ? "block" : "hidden")}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-bold"><Sparkles size={16} className="text-brand-600" /> Application strength</h2>
            <p className="text-xs text-slate-500">Live preview{model.assumedTier ? " · enter your pin code for city-specific scoring" : ` · Tier ${model.tier} city`}</p>
          </div>
          <div className={clsx("text-3xl font-extrabold tabular-nums", tone)}>{bd.total}<span className="text-sm font-medium text-slate-400">/100</span></div>
        </div>

        <div className="space-y-3">
          <Bar label="Launch Velocity" pts={bd.launch.pts} max={25} detail={bd.launch.detail} />
          <Bar label="Capital Buffer" pts={bd.capital.pts} max={25} detail={bd.capital.detail} />
          <Bar label="Retail Experience" pts={bd.experience.pts} max={25} detail={bd.experience.detail} />
          <Bar label="Real Estate Quality" pts={bd.realEstate.pts} max={25} detail={bd.realEstate.detail} />
        </div>

        {model.needsSpace && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
            Tip: once you&apos;ve lined up a shop (owned or rented), select it in step 2 — we can only move forward after a space is identified.
          </p>
        )}

        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Lightbulb size={15} className="text-amber-500" /> Ways to boost your score</h3>
          {model.levers.length === 0 ? (
            <p className="text-sm text-emerald-700">Nice — nothing obvious left to improve on these inputs.</p>
          ) : (
            <ul className="space-y-2">
              {model.levers.map((l) => (
                <li key={l.key} className="rounded-lg border border-slate-200 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{l.title}</p>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">+{l.gain} pts</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{l.why}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span />
                    <button className="btn-ghost !px-2.5 !py-1 text-xs" onClick={() => onApply(l.patch)}><Wand2 size={12} /> Apply</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-[11px] text-slate-400">Only change a value if it reflects your real plans — we&apos;ll verify details with you.</p>
      </div>
    </aside>
  );
}
