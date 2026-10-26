"use client";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Download, Search, Sheet, X } from "lucide-react";
import clsx from "clsx";
import { useResults, useStore } from "@/lib/store";
import ApprovalsModal from "./ApprovalsModal";
import { buildRows, COLUMNS, exportToExcel, type ColumnName } from "@/lib/exportToExcel";

const BADGE: Record<string, string> = {
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-amber-100 text-amber-800",
  WAITLISTED: "bg-slate-200 text-slate-700",
  REJECTED: "bg-red-100 text-red-800",
};

export default function ExcelViewModal({ onClose }: { onClose: () => void }) {
  const { results, dataset } = useResults(); // live store: mutations and /apply submissions re-render this grid
  const [q, setQ] = useState("");
  const [city, setCity] = useState("ALL");
  const [hidden, setHidden] = useState<Set<ColumnName>>(new Set());
  const [showCols, setShowCols] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const decisions = useStore((s) => s.decisions);
  const all = useMemo(() => buildRows(results, decisions), [results, decisions]);
  const cities = useMemo(() => Array.from(new Set(all.map((r) => r.City as string).filter(Boolean))).sort(), [all]);
  const rows = useMemo(
    () =>
      all
        .map((r, i) => ({ r, n: i + 1 }))
        .filter(({ r }) => (city === "ALL" || r.City === city) &&
          (!q || `${r["Applicant name"]} ${r["Pin code"]} ${r["Status"]} ${r["Application ID"]}`.toLowerCase().includes(q.toLowerCase()))),
    [all, q, city],
  );
  const cols = COLUMNS.filter((c) => !hidden.has(c));
  const toggle = (c: ColumnName) => setHidden((h) => { const n = new Set(h); n.has(c) ? n.delete(c) : n.add(c); return n; });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Excel view">
      {dispatchOpen && <ApprovalsModal results={results} onClose={() => setDispatchOpen(false)} />}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-300 bg-slate-100 px-4 py-2">
        <Sheet size={20} className="text-emerald-700" />
        <h2 className="font-bold">Excel view</h2>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input autoFocus className="input w-64 pl-8" placeholder="Filter by name, pin or status" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="ALL">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="relative">
          <button className="btn-ghost" onClick={() => setShowCols((s) => !s)}>Columns ({cols.length}/{COLUMNS.length})</button>
          {showCols && (
            <div className="absolute left-0 top-full z-10 mt-1 max-h-80 w-72 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
              {COLUMNS.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={!hidden.has(c)} onChange={() => toggle(c)} /> {c}
                </label>
              ))}
            </div>
          )}
        </div>
        <span className="text-sm text-slate-500">{rows.length} of {all.length} rows</span>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost" onClick={() => setDispatchOpen(true)}><BadgeCheck size={16} /> Decisions &amp; emails ({results.filter((r) => decisions[r.app.id]).length})</button>
          <button className="btn" onClick={() => exportToExcel(dataset, results, decisions)}><Download size={16} /> Download Excel (.xlsx)</button>
          <button className="btn-ghost" onClick={onClose} aria-label="Close"><X size={16} /> Esc</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 w-12 border-b border-r border-slate-300 bg-slate-200 px-2 py-1.5 text-center font-bold">#</th>
              {cols.map((c) => (
                <th key={c} className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-slate-300 bg-slate-200 px-2 py-1.5 text-left font-bold text-slate-700">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, n }, i) => (
              <tr key={r["Application ID"]} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                <td className="sticky left-0 border-b border-r border-slate-200 bg-slate-100 px-2 py-1 text-center font-medium text-slate-500">{n}</td>
                {cols.map((c) => (
                  <td key={c} className={clsx("border-b border-r border-slate-200 px-2 py-1", c === "Bottlenecks" ? "min-w-[420px]" : "whitespace-nowrap", typeof r[c] === "number" && "text-right tabular-nums")}>
                    {c === "Status" ? (
                      <span className={clsx("rounded-full px-2 py-0.5 font-semibold", BADGE[r._status])}>{r[c]}</span>
                    ) : c === "AI Rating" ? (
                      <span className={clsx("rounded-full px-2 py-0.5 font-semibold", r._light === "green" ? "bg-emerald-100 text-emerald-800" : r._light === "orange" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800")}>{r[c]}</span>
                    ) : c === "Payback Period (months)" && r._risk ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700" title="Payback beyond 18 months: high operational cash-flow risk">⚠ {r[c] === "" ? "never" : r[c]}</span>
                    ) : String(r[c])}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length + 1} className="p-8 text-center text-slate-400">No rows match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
