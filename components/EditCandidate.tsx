"use client";
import { useState } from "react";
import { History, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Application } from "@/lib/types";

const FIELDS: { key: keyof Application; label: string; kind: "text" | "num" | "floor" | "space" }[] = [
  { key: "name", label: "Applicant name", kind: "text" },
  { key: "pin", label: "Pin code", kind: "text" },
  { key: "investment", label: "Investment capacity (₹ lakh)", kind: "num" },
  { key: "experience", label: "Retail experience (years)", kind: "num" },
  { key: "business", label: "Current / past business", kind: "text" },
  { key: "space", label: "Space available", kind: "space" },
  { key: "size", label: "Space size (sq ft)", kind: "num" },
  { key: "floor", label: "Floor", kind: "floor" },
  { key: "launch", label: "Target launch (months)", kind: "num" },
  { key: "language", label: "Preferred language", kind: "text" },
  { key: "notes", label: "Notes", kind: "text" },
];

/** Admin edit form + change history. Every save re-runs the engine; the AI suggestion and any recorded decision are re-checked. */
export default function EditCandidate({ app }: { app: Application }) {
  const patch = useStore((s) => s.patchApplication);
  const history = useStore((s) => s.history[app.id] ?? []);
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");

  const start = () => { setVals(Object.fromEntries(FIELDS.map((f) => [f.key, app[f.key] == null ? "" : String(app[f.key])]))); setErr(""); setOpen(true); };
  const save = () => {
    const p: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const raw = (vals[f.key] ?? "").trim();
      const cur = app[f.key] == null ? "" : String(app[f.key]);
      if (raw === cur) continue;
      if (f.kind === "num") {
        if (raw === "") p[f.key] = null;
        else if (!/^\d+(\.\d+)?$/.test(raw)) return setErr(`${f.label} must be a plain number.`);
        else p[f.key] = Number(raw);
      } else if (f.key === "pin") {
        if (!/^\d{6}$/.test(raw)) return setErr("Pin code must be exactly 6 digits.");
        p.pin = raw;
      } else p[f.key] = raw;
    }
    if (!Object.keys(p).length) return setErr("Nothing changed.");
    patch(app.id, p as Partial<Application>, "Admin");
    setOpen(false);
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-bold"><Pencil size={16} className="text-brand-600" /> Candidate details</h4>
        {!open && <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={start}>Edit details</button>}
      </div>
      {open && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Edits re-score the candidate immediately. Leave a field blank to mark it as not provided.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className={f.key === "notes" ? "sm:col-span-2" : ""}>
                <span className="text-[11px] font-semibold uppercase text-slate-500">{f.label}</span>
                {f.kind === "floor" ? (
                  <select className="input" value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}>
                    {["", "Ground", "Mall unit", "Upper", "Not known"].map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                    {vals[f.key] && !["Ground", "Mall unit", "Upper", "Not known"].includes(vals[f.key]) && <option value={vals[f.key]}>{vals[f.key]}</option>}
                  </select>
                ) : f.kind === "space" ? (
                  <select className="input" value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}>
                    {["", "Rented", "Owned", "Not yet identified"].map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                    {vals[f.key] && !["Rented", "Owned", "Not yet identified"].includes(vals[f.key]) && <option value={vals[f.key]}>{vals[f.key]}</option>}
                  </select>
                ) : (
                  <input className="input" value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
                )}
              </label>
            ))}
          </div>
          {err && <p className="rounded bg-red-50 p-2 text-xs font-medium text-red-700">{err}</p>}
          <div className="flex gap-2"><button className="btn !px-4 !py-2 text-xs" onClick={save}>Save changes</button><button className="btn-ghost !px-4 !py-2 text-xs" onClick={() => setOpen(false)}>Cancel</button></div>
        </div>
      )}
      <div>
        <h5 className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500"><History size={12} /> Change history</h5>
        {history.length ? (
          <ul className="space-y-1 text-xs">
            {[...history].reverse().map((c, i) => (
              <li key={i} className="rounded bg-slate-50 p-1.5"><b>{c.field}</b>: {c.from} → <b>{c.to}</b> <span className="text-slate-500">· {c.by} · {new Date(c.at).toLocaleString("en-GB")}</span></li>
            ))}
          </ul>
        ) : <p className="text-xs text-slate-500">No edits yet. Original values are as submitted or uploaded.</p>}
      </div>
    </section>
  );
}
