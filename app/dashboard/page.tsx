"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, AlertCircle, ArrowRight, Download, FileUp, MessageSquareText, RotateCcw, Send, Search, Sheet, Sparkles, Swords, X } from "lucide-react";
import clsx from "clsx";
import Dossier from "@/components/Dossier";
import ExcelViewModal from "@/components/ExcelViewModal";
import ContentionArena from "@/components/ContentionArena";
import IngestionModal from "@/components/IngestionModal";
import CascadeAlert from "@/components/CascadeAlert";
import Analytics from "@/components/Analytics";
import EventLedger from "@/components/EventLedger";
import ApprovalsModal from "@/components/ApprovalsModal";
import ChatbotWidget from "@/components/ChatbotWidget";
import type { IngestionReport } from "@/lib/sanitizer";
import type { Dataset } from "@/lib/types";
import { findContests } from "@/lib/contention";
import FranchiseMap from "@/components/FranchiseMap";
import { Delta, StatusBadge } from "@/components/ui";
import { simulate, summarize, type Delta as DeltaT } from "@/lib/engine";
import { answerQuery, parseMutation, patchProblem, type Answer } from "@/lib/explain";
import { isInjection } from "@/lib/guardrails";
import { parseWorkbook } from "@/lib/parser";
import { useResults, useStore } from "@/lib/store";
import { assess, type Light } from "@/lib/rubric";
import { LightDot, OUTCOME_LABEL } from "@/components/ReviewPanel";
import type { Application, Result, StatusKind } from "@/lib/types";

type Tab = "upload" | "pipeline";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("upload");
  const [selected, setSelected] = useState<string | null>(null);
  const [excelOpen, setExcelOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [arena, setArena] = useState<{ a: string; b: string } | null | undefined>(undefined); // undefined = closed
  const { results, dataset } = useResults();
  const patchApplication = useStore((s) => s.patchApplication);
  const decisions = useStore((s) => s.decisions);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab");
    if (p.get("app")) { setSelected(p.get("app")); setTab("pipeline"); }
  }, []);

  const sel = results.find((r) => r.app.id === selected) || null;
  const tabs: [Tab, string][] = [["upload", "1 · Upload workbook"], ["pipeline", "2 · Pipeline"]];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">SnowFlakes · Expansion dashboard</h1>
          <p className="text-sm text-slate-500">{dataset.applications.length} applications · {dataset.territories.length} territories · {dataset.stores.length} existing stores</p>
        </div>
        <button className="btn-ghost" onClick={() => setArena(null)}><Swords size={16} /> Contention Arena ({findContests(results).length})</button>
        <button className="btn-ghost" onClick={() => setDispatchOpen(true)}><BadgeCheck size={16} /> Decisions &amp; emails ({results.filter((r) => decisions[r.app.id]).length})</button>
        <button className="btn" onClick={() => setExcelOpen(true)}><Sheet size={16} /> View Excel view</button>
        <div className="flex rounded-xl bg-slate-200 p-1 text-sm font-semibold">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={clsx("rounded-lg px-3 py-1.5 transition", tab === k ? "bg-white shadow text-brand-700" : "text-slate-600 hover:text-slate-900")}>{l}</button>
          ))}
        </div>
      </div>

      {tab === "upload" && <UploadTab onDone={() => setTab("pipeline")} />}
      {tab === "pipeline" && <PipelineTab results={results} onSelect={setSelected} />}

      {arena !== undefined && <ContentionArena results={results} initial={arena} onClose={() => setArena(undefined)} />}
      <ChatbotWidget
        copilot={{
          title: "SnowFlakes Expansion Copilot", subtitle: "Ask about any applicant or describe a change", triggerLabel: "Expansion Copilot", triggerSub: "Why is APP-007 on hold?",
          greeting: "Hi! I'm your Expansion Copilot. Ask \"Why is APP-007 on hold?\", \"which applications are waitlisted?\", or tell me new facts like \"APP-012 has now found a ground-floor space\" and I'll refresh the AI suggestion on the spot (final decisions stay with you).",
          pills: ["Why is APP-007 on hold?", "Why is APP-002 waitlisted?", "Which applications are on hold?", "APP-012 has now found a ground-floor space"],
          answer: (q) => {
            if (isInjection(q)) return { reply: "I can only help with the applications loaded here: explaining decisions, listing statuses, or recalculating a change you give me. I can't change how I work. 🍦" };
            const mut = parseMutation(q);
            if (mut) {
              const problem = patchProblem(mut.patch);
              if (problem) return { reply: `${problem}, so I haven't changed anything. Please check the value and try again.` };
              const d = simulate(dataset, mut.id, mut.patch);
              if (d) {
                // new facts are applied on the spot (the brief: update the score immediately, re-rank, show if they now win a slot); Undo restores the old values
                const undo: Record<string, unknown> = {};
                for (const k of Object.keys(d.after.app) as (keyof typeof d.after.app)[]) if (d.after.app[k] !== d.before.app[k]) undo[k] = d.before.app[k];
                patchApplication(mut.id, mut.patch, "Copilot");
                setTab("pipeline"); setSelected(mut.id); // open the candidate's dossier + decision box right away
                const casc = d.cascade.map((c) => `${c.promotedAppId} promoted${c.displacedAppId ? `, ${c.displacedAppId} displaced` : ""} (${c.territoryId}, slot #${c.slotNumber})`).join("; ");
                const rank = d.after.territoryRank ? ` Rank #${d.after.territoryRank} of ${d.after.territoryContenders} in ${d.after.territory?.city}.` : "";
                return {
                  reply: `Updated ${d.after.app.id}: ${Object.entries(mut.patch).map(([k, v]) => `${k} = ${v}`).join(", ")}${d.after.app.space !== d.before.app.space ? " (space recorded as identified; ownership not specified)" : ""}. Score ${d.before.score ?? "—"} → ${d.after.score ?? "—"} (${d.scoreDelta == null ? "n/a" : (d.scoreDelta >= 0 ? "+" : "") + d.scoreDelta}); ${d.before.label} → ${d.after.label}.${rank}${casc ? ` Cascade: ${casc}.` : ""} ${d.after.status === "ACCEPTED" ? "They now win a slot." : d.after.status === "WAITLISTED" ? "They are waitlisted." : "They don't win a slot yet."}`,
                  actions: [{ label: `Undo change to ${d.after.app.id}`, patch: { __commit: JSON.stringify({ id: mut.id, patch: undo }) } }],
                };
              }
            }
            const a = answerQuery(q, results);
            return { reply: `${a.text}${a.result?.bottlenecks.length ? " Fixes: " + a.result.bottlenecks.slice(0, 2).map((b) => b.fix).join(" • ") : ""}` };
          },
        }}
        onApplyPreset={(patch) => { if (patch.__commit) { const c = JSON.parse(patch.__commit); patchApplication(c.id, c.patch, "Copilot (undo)"); setTab("pipeline"); setSelected(c.id); } }}
      />
      {dispatchOpen && <ApprovalsModal results={results} onClose={() => setDispatchOpen(false)} />}
      <EventLedger />
      {excelOpen && <ExcelViewModal onClose={() => setExcelOpen(false)} />}

      {sel && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40" onClick={() => setSelected(null)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900" onClick={() => setSelected(null)}><X size={16} /> Close</button>
            <Dossier r={sel} onCompare={(a, b) => { setSelected(null); setArena({ a, b }); }} />
            <h4 className="mb-2 mt-6 text-sm font-bold">Catchment map</h4>
            <FranchiseMap
              height={300}
              stores={dataset.stores}
              applicant={sel.app.pin ? { pin: sel.app.pin, city: sel.territory?.city || sel.app.city, label: sel.label } : undefined}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Upload ------------------------------ */
function UploadTab({ onDone }: { onDone: () => void }) {
  const { loadDataset, resetSample, source, warnings } = useStore();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ingest, setIngest] = useState<{ report: IngestionReport; data: Dataset; source: string; warnings: string[] } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const { data, warnings, report } = parseWorkbook(await file.arrayBuffer());
      if (!data.applications.length) throw new Error("No applications could be found in that file. Please check it has an applications table with column headings (name, pin code, investment, …). Your existing data was not changed.");
      loadDataset(data, file.name, warnings);
      setIngest({ report, data, source: file.name, warnings });
    } catch (e) {
      setError((e as Error).message || "Could not read that file. Please upload a .xlsx workbook.");
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {ingest && <IngestionModal {...ingest} onClose={() => { setIngest(null); onDone(); }} />}
      <div className="md:col-span-2">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
          onClick={() => input.current?.click()}
          className={clsx("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-12 text-center transition", drag ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-500")}
        >
          <FileUp size={36} className="text-brand-600" />
          <p className="font-semibold">{busy ? "Processing…" : "Drag & drop the Excel file here, or click to browse"}</p>
          <p className="text-sm text-slate-500">Any layout works: sheets are recognised by their column headings, so names, order and extra sheets don’t matter</p>
          <input ref={input} type="file" accept=".xlsx,.xlsm,.xls,.csv" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
        </div>
        {error && <p className="mt-3 flex items-center gap-2 text-sm font-medium text-rose-600"><AlertCircle size={16} /> {error}</p>}
      </div>
      <div className="card space-y-3 p-5 text-sm">
        <p className="font-semibold">Current data</p>
        <p className="text-slate-600">{source}</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn-ghost" href="/Case1_Franchise_Test_Data_Format.xlsx" download><Download size={14} /> Sample .xlsx</a>
          <button className="btn-ghost" onClick={() => { resetSample(); onDone(); }}><RotateCcw size={14} /> Reset to sample</button>
        </div>
        {warnings.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-3 text-amber-800">
            <p className="mb-1 font-semibold">Parsing notes ({warnings.length})</p>
            <ul className="max-h-40 list-disc space-y-0.5 overflow-auto pl-4">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Pipeline ------------------------------ */
const KPI: { k: StatusKind; label: string; cls: string }[] = [
  { k: "ACCEPTED", label: "Accepted", cls: "border-emerald-300 text-emerald-700" },
  { k: "ON_HOLD", label: "On hold", cls: "border-amber-300 text-amber-700" },
  { k: "WAITLISTED", label: "Waitlisted", cls: "border-sky-300 text-sky-700" },
  { k: "REJECTED", label: "Cannibalised / rejected", cls: "border-rose-300 text-rose-700" },
];

function PipelineTab({ results, onSelect }: { results: Result[]; onSelect: (id: string) => void }) {
  const { dataset } = useResults();
  const [filter, setFilter] = useState<StatusKind | "ALL">("ALL");
  const [city, setCity] = useState("ALL");
  const [q, setQ] = useState("");
  const decisions = useStore((s) => s.decisions);
  const [light, setLight] = useState<Light | "ALL" | "PENDING">("ALL");
  const assessments = useMemo(() => new Map(results.map((r) => [r.app.id, assess(r)] as const)), [results]);
  const lights = useMemo(() => new Map(results.map((r) => [r.app.id, assessments.get(r.app.id)!.light] as const)), [results, assessments]);
  const lightCount = (l: Light) => results.filter((r) => lights.get(r.app.id) === l).length;
  const pending = results.filter((r) => !decisions[r.app.id]).length;
  const counts = useMemo(() => {
    const c = summarize(results);
    // count the AI's suggested outcome (a below-minimum score turns a placed applicant into a suggested rejection)
    for (const r of results) { const s = assessments.get(r.app.id)!.suggested; if (s !== r.status) { c[r.status]--; c[s]++; } }
    return c;
  }, [results, assessments]);
  const cities = useMemo(() => Array.from(new Set(results.map((r) => r.territory?.city || r.app.city || "Unmapped"))).sort(), [results]);
  const rows = results.filter(
    (r) =>
      (filter === "ALL" || assessments.get(r.app.id)!.suggested === filter) &&
      (light === "ALL" || (light === "PENDING" ? !decisions[r.app.id] : lights.get(r.app.id) === light)) &&
      (city === "ALL" || (r.territory?.city || r.app.city || "Unmapped") === city) &&
      (!q || `${r.app.id} ${r.app.name} ${r.app.pin} ${r.territory?.id ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );
  const total = results.length || 1;

  return (
    <div className="space-y-5">
      <p className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-xs text-slate-700">The AI only <b>suggests</b> (green / orange / red against the rubric, with reasons). Every application needs a <b>human decision</b>: open a row and choose Accepted, On hold, Waitlisted or Rejected. Onboarding kits unlock only for human-accepted partners.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["green", "Green · most qualified", "border-emerald-400 text-emerald-700"], ["orange", "Orange · borderline", "border-orange-400 text-orange-700"], ["red", "Red · not qualified", "border-red-400 text-red-700"]] as const).map(([l, label, cls]) => (
          <button key={l} onClick={() => setLight(light === l ? "ALL" : l)} className={clsx("card border-l-4 p-4 text-left transition hover:shadow-md", cls, light === l && "ring-2 ring-brand-500")}>
            <p className="text-3xl font-extrabold tabular-nums">{lightCount(l)}</p>
            <p className="text-sm font-medium text-slate-600">AI: {label}</p>
          </button>
        ))}
        <button onClick={() => setLight(light === "PENDING" ? "ALL" : "PENDING")} className={clsx("card border-l-4 border-slate-400 p-4 text-left transition hover:shadow-md", light === "PENDING" && "ring-2 ring-brand-500")}>
          <p className="text-3xl font-extrabold tabular-nums text-slate-700">{pending}</p>
          <p className="text-sm font-medium text-slate-600">Awaiting human decision</p>
        </button>
      </div>
      <p className="-mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">AI-suggested outcomes</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {KPI.map((c) => (
          <button key={c.k} onClick={() => setFilter(filter === c.k ? "ALL" : c.k)} className={clsx("card border-l-4 p-4 text-left transition hover:shadow-md", c.cls, filter === c.k && "ring-2 ring-brand-500")}>
            <p className="text-3xl font-extrabold tabular-nums">{counts[c.k]}</p>
            <p className="text-sm font-medium text-slate-600">{c.label}</p>
            <p className="text-[11px] text-slate-500">human-decided: {results.filter((r) => decisions[r.app.id]?.outcome === c.k).length}</p>
          </button>
        ))}
      </div>

      <Analytics results={results} dataset={dataset} />

      <div className="card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
          {[["ACCEPTED", "bg-emerald-500"], ["WAITLISTED", "bg-sky-500"], ["ON_HOLD", "bg-amber-500"], ["REJECTED", "bg-rose-500"]].map(([k, c]) => (
            <div key={k} className={c} style={{ width: `${(counts[k as StatusKind] / total) * 100}%` }} title={`${k}: ${counts[k as StatusKind]}`} />
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input className="input pl-8" placeholder="Search ID, name, pin" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as StatusKind | "ALL")}>
            <option value="ALL">All statuses</option><option value="ACCEPTED">Accepted</option><option value="ON_HOLD">On hold</option><option value="WAITLISTED">Waitlisted</option><option value="REJECTED">Rejected</option>
          </select>
          <select className="input w-auto" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="ALL">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <span className="text-sm text-slate-500">{rows.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-3">ID</th><th className="p-3">Applicant</th><th className="p-3">City</th><th className="p-3">Territory</th><th className="p-3">Pin</th><th className="p-3 text-right">Score</th><th className="p-3 text-right">Payback</th><th className="p-3">AI suggests</th><th className="p-3">Human decision</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.app.id} onClick={() => onSelect(r.app.id)} className="cursor-pointer hover:bg-brand-50">
                  <td className="p-3 font-semibold">{r.app.id}</td>
                  <td className="p-3">{r.app.name}</td>
                  <td className="p-3">{r.territory?.city || r.app.city || "—"}</td>
                  <td className="p-3 tabular-nums text-slate-600">{r.territory?.id ?? "Unmapped"}</td>
                  <td className="p-3 tabular-nums">{r.app.pin || "—"}</td>
                  <td className="p-3 text-right font-bold tabular-nums">{r.score ?? "—"}</td>
                  <td className={clsx("p-3 text-right tabular-nums", r.economics?.risk && "font-semibold text-red-600")}>{r.economics?.paybackMonths != null ? `${r.economics.paybackMonths} mo${r.economics.risk ? " ⚠" : ""}` : "—"}</td>
                  <td className="p-3"><span className="flex items-center gap-2"><LightDot light={lights.get(r.app.id)!} /><StatusBadge status={assessments.get(r.app.id)!.suggested} label={assessments.get(r.app.id)!.suggestedLabel} /></span></td>
                  <td className="p-3">{decisions[r.app.id] ? <><b className="text-brand-800">{OUTCOME_LABEL[decisions[r.app.id].outcome]}</b>{(assessments.get(r.app.id)!.suggested !== decisions[r.app.id].aiSuggested || r.score !== decisions[r.app.id].aiScore) && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">re-review</span>}</> : <span className="text-xs text-amber-700">Awaiting review</span>}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={9} className="p-8 text-center text-slate-400">No applications match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
