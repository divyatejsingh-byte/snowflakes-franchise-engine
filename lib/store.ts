"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useMemo } from "react";
import { applyPatch, cascadeBetween, evaluate } from "./engine";
import { assess } from "./rubric";
import { FIXED_STORES } from "./sample";
import type { Application, Dataset } from "./types";

/** The app ships with no applicants and no territories: those arrive only from an uploaded workbook or from /apply.
 *  Only Sheet 3 (the brand's 10 existing stores) is built in, because the brief fixes it. */
export function emptyDataset(): Dataset {
  return {
    applications: [],
    territories: [],
    stores: FIXED_STORES.map((r) => ({ id: String(r[0]), city: String(r[1]), pin: String(r[2]), opened: String(r[3]) })),
  };
}

export interface LedgerEntry { id: number; at: string; kind: "ingest" | "rule" | "mutation" | "cascade" | "dispatch" | "submit" | "decision"; text: string }

const stamp = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
let ledgerSeq = 0;
const entry = (kind: LedgerEntry["kind"], text: string): LedgerEntry => ({ id: ++ledgerSeq, at: stamp(), kind, text });

/** One ledger line per hard rule the engine enforced on the freshly loaded data. */
function ruleEntries(ds: Dataset): LedgerEntry[] {
  const res = evaluate(ds);
  const out: LedgerEntry[] = [];
  for (const r of res) {
    if (r.reason === "Cannibalisation") out.push(entry("rule", `Rule enforced: ${r.app.id} rejected (Cannibalisation on ${ds.stores.find((x) => x.pin === r.app.pin)?.id ?? "existing store"}, pin ${r.app.pin}).`));
    else if (r.reason === "Out-of-Scope Pin Code" || r.reason === "Unmapped Territory") out.push(entry("rule", `Rule enforced: ${r.app.id} on hold (${r.reason}, pin ${r.app.pin || "—"}).`));
    else if (r.reason === "Incomplete or Unidentifiable Data") out.push(entry("rule", `Data gap: ${r.app.id} on hold, incomplete or unidentifiable data — ${r.bottlenecks.slice(0, r.blockerCount ?? 1).map((b) => b.issue).join("; ")}. Not scored, nothing guessed.`));
    else if (r.status === "ON_HOLD") out.push(entry("rule", `Rule enforced: ${r.app.id} on hold (${r.reason}).`));
  }
  const acc = res.filter((r) => r.status === "ACCEPTED").length;
  out.push(entry("rule", `Allocation complete: ${acc} accepted, ${res.filter((r) => r.status === "WAITLISTED").length} waitlisted, ${res.filter((r) => r.status === "ON_HOLD").length} on hold, ${res.filter((r) => r.status === "REJECTED").length} rejected.`));
  return out;
}

export interface Change { at: string; by: string; field: string; from: string; to: string }
const FIELD_LABEL: Record<string, string> = { name: "Applicant name", email: "Email", city: "City", pin: "Pin code", investment: "Investment (₹ lakh)", experience: "Experience (years)", business: "Business", space: "Space available", size: "Space size (sq ft)", floor: "Floor", launch: "Target launch (months)", language: "Language", notes: "Notes" };
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "(blank)" : String(v));

export type Outcome = "ACCEPTED" | "ON_HOLD" | "WAITLISTED" | "REJECTED";
export interface Decision { outcome: Outcome; note: string; by: string; at: string; aiSuggested: string; aiLight: string; aiScore: number | null }

interface State extends Dataset {
  /** Every edit to an application, by whom (Admin / Copilot), old and new value. Shown in the dossier. */
  history: Record<string, Change[]>;
  decisions: Record<string, Decision>;
  /** Human confirms an existing decision still stands after the facts changed: re-baseline what the AI showed. */
  keepDecision: (id: string, snap: { aiSuggested: string; aiLight: string; aiScore: number | null }) => void;
  decide: (id: string, d: Omit<Decision, "at">) => void;
  clearDecision: (id: string) => void;
  ledger: LedgerEntry[];
  log: (kind: LedgerEntry["kind"], text: string) => void;
  source: string;
  warnings: string[];
  loadDataset: (d: Dataset, source: string, warnings?: string[]) => void;
  clearData: () => void;
  addApplication: (a: Omit<Application, "id">) => string;
  patchApplication: (id: string, patch: Partial<Application>, by?: string) => void;
}

const nextId = (apps: Application[]) => {
  const max = apps.reduce((m, a) => Math.max(m, parseInt(a.id.replace(/\D/g, ""), 10) || 0), 0);
  return `APP-${String(max + 1).padStart(3, "0")}`;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...emptyDataset(),
      source: "No data loaded yet",
      warnings: [],
      ledger: [],
      decisions: {},
      history: {},
      decide: (id, d) => {
        const at = new Date().toISOString();
        const agrees = d.outcome === d.aiSuggested;
        set({
          decisions: { ...get().decisions, [id]: { ...d, at } },
          ledger: [...get().ledger, entry("decision", `Human decision: ${id} marked ${d.outcome.replace("_", " ")} by ${d.by}. AI suggested ${d.aiSuggested.replace("_", " ")} (${d.aiLight}); ${agrees ? "decision matches the suggestion" : "decision overrides the suggestion"}${d.note ? `. Note: ${d.note}` : ""}.`)].slice(-300),
        });
      },
      keepDecision: (id, snap) => {
        const d = get().decisions[id];
        if (!d) return;
        set({ decisions: { ...get().decisions, [id]: { ...d, ...snap } }, ledger: [...get().ledger, entry("decision", `Human reviewed the change for ${id} and kept the decision (${d.outcome.replace("_", " ")}).`)].slice(-300) });
      },
      clearDecision: (id) => {
        const next = { ...get().decisions }; delete next[id];
        set({ decisions: next, ledger: [...get().ledger, entry("decision", `Human decision for ${id} withdrawn; back to awaiting review.`)].slice(-300) });
      },
      log: (kind, text) => set({ ledger: [...get().ledger, entry(kind, text)].slice(-300) }),
      loadDataset: (d, source, warnings = []) => {
        set({ ...d, source, warnings, decisions: {}, history: {}, ledger: [...get().ledger, entry("ingest", `File ingested: ${d.applications.length} applications, ${d.territories.length} territories, ${d.stores.length} existing stores loaded from ${source}.`), ...ruleEntries(d)].slice(-300) });
      },
      clearData: () => {
        const d = emptyDataset();
        set({ ...d, source: "No data loaded yet", warnings: [], decisions: {}, history: {}, ledger: [...get().ledger, entry("ingest", "All applications, decisions and edits were cleared.")].slice(-300) });
      },
      addApplication: (a) => {
        const id = nextId(get().applications);
        const before = { applications: get().applications, territories: get().territories, stores: get().stores };
        const apps = [...get().applications, { ...a, id }];
        const after = evaluate({ ...before, applications: apps });
        const mine = after.find((r) => r.app.id === id)!;
        const lines = [entry("submit", `New application ${id} (${a.name}) submitted via /apply${a.consent?.granted ? " with DPDP consent" : ""} → ${mine.label}, score ${mine.score ?? "—"}.`)];
        for (const c of cascadeBetween(evaluate(before), after)) lines.push(entry("cascade", `Slot cascade: ${c.promotedAppId} promoted${c.displacedAppId ? `; ${c.displacedAppId} moved off the slot` : ""} in ${c.territoryId} (slot #${c.slotNumber}).`));
        set({ applications: apps, ledger: [...get().ledger, ...lines].slice(-300) });
        return id;
      },
      patchApplication: (id, patch, by = "Admin") => {
        const before = { applications: get().applications, territories: get().territories, stores: get().stores };
        const apps = get().applications.map((a) => (a.id === id ? applyPatch(a, patch) : a));
        const b = evaluate(before), n = evaluate({ ...before, applications: apps });
        const rb = b.find((r) => r.app.id === id), rn = n.find((r) => r.app.id === id);
        const what = Object.entries(patch).map(([k, v]) => `${k} = ${v}`).join(", ");
        const lines = [entry("mutation", `Mutation applied by ${by}: ${id} ${what}.`)];
        const oldApp = get().applications.find((a) => a.id === id), newApp = apps.find((a) => a.id === id);
        const changes: Change[] = [];
        if (oldApp && newApp) for (const k of Object.keys(FIELD_LABEL) as (keyof Application)[]) if (show(oldApp[k]) !== show(newApp[k])) changes.push({ at: new Date().toISOString(), by, field: FIELD_LABEL[k], from: show(oldApp[k]), to: show(newApp[k]) });
        if (rb && rn) lines.push(entry("mutation", `${id}: score ${rb.score ?? "—"} → ${rn.score ?? "—"}; ${rb.label} → ${rn.label}.`));
        for (const c of cascadeBetween(b, n)) lines.push(entry("cascade", `Slot cascade: ${c.promotedAppId} promoted to ACCEPTED${c.displacedAppId ? `; ${c.displacedAppId} moved to WAITLISTED` : ""} in ${c.territoryId} (slot #${c.slotNumber}).`));
        for (const r of n) {
          const d = get().decisions[r.app.id];
          if (!d) continue;
          const x = assess(r);
          if (x.suggested !== d.aiSuggested || x.light !== d.aiLight || r.score !== d.aiScore) lines.push(entry("decision", `Review needed: ${r.app.id} has a recorded decision (${d.outcome.replace("_", " ")}) but its score is now ${r.score ?? "—"} (was ${d.aiScore ?? "—"}) and the AI now suggests ${x.suggested.replace("_", " ")} (${x.light}). Human to confirm or change.`));
        }
        set({ applications: apps, history: changes.length ? { ...get().history, [id]: [...(get().history[id] ?? []), ...changes] } : get().history, ledger: [...get().ledger, ...lines].slice(-300) });
      },
    }),
    {
      name: "franchise-engine-v4",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ applications: s.applications, territories: s.territories, stores: s.stores, source: s.source, warnings: s.warnings, decisions: s.decisions, history: s.history }),
    },
  ),
);

export function useResults() {
  const applications = useStore((s) => s.applications);
  const territories = useStore((s) => s.territories);
  const stores = useStore((s) => s.stores);
  const dataset = useMemo<Dataset>(() => ({ applications, territories, stores }), [applications, territories, stores]);
  const results = useMemo(() => evaluate(dataset), [dataset]);
  return { dataset, results };
}
