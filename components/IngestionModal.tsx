"use client";
import { useEffect, useMemo } from "react";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import { evaluate } from "@/lib/engine";
import type { IngestionReport } from "@/lib/sanitizer";
import type { Dataset } from "@/lib/types";

/** Shown after every workbook upload: what the sanitiser cleaned, corrected and isolated. */
export default function IngestionModal({ report, data, source, warnings, onClose }: { report: IngestionReport; data: Dataset; source: string; warnings: string[]; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const isolates = useMemo(() => evaluate(data).filter((r) => r.reason === "Unmapped Territory" || r.reason === "Out-of-Scope Pin Code" || r.reason === "Incomplete or Unidentifiable Data"), [data]);
  const stats = [
    { label: "Complete records", value: report.cleanRecords, of: report.totalRows, tone: "text-emerald-700" },
    { label: "Pins tidied (no digits changed)", value: report.pinsReformatted, tone: "text-sky-700" },
    { label: "Contradictions flagged", value: report.contradictionsFlagged, tone: "text-amber-700" },
    { label: "Incomplete / unidentifiable", value: report.incompleteRecords, tone: "text-rose-700" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Ingestion sanitization report">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
          <ShieldCheck className="text-brand-600" />
          <div className="flex-1"><h2 className="font-bold text-brand-900">Ingestion sanitization report</h2><p className="text-xs text-slate-500">{source} · {data.territories.length} territories · {data.stores.length} existing stores</p></div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 p-3 text-center">
                <p className={`text-3xl font-extrabold tabular-nums ${s.tone}`}>{s.value}{s.of != null && <span className="text-sm font-medium text-slate-400">/{s.of}</span>}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {report.notices.length > 0 ? (
            <section>
              <h3 className="mb-1 text-sm font-bold">Audit trail ({report.notices.length})</h3>
              <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                {report.notices.map((n, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 p-2"><b className="text-brand-700">{n.id}</b> <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500 ring-1 ring-slate-200">{n.kind}</span> {n.message}</li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} /> No corrections were needed — the data was already clean.</p>
          )}

          {isolates.length > 0 && (
            <section>
              <h3 className="mb-1 text-sm font-bold">Not allocated ({isolates.length})</h3>
              <ul className="space-y-1 text-xs">{isolates.map((r) => <li key={r.app.id} className="rounded-lg bg-rose-50 p-2"><b>{r.app.id}</b> {r.app.name} · pin {r.app.pin || "—"} · {r.reason}</li>)}</ul>
            </section>
          )}

          {warnings.length > 0 && (
            <section><h3 className="mb-1 text-sm font-bold">Parsing notes</h3><ul className="list-disc pl-5 text-xs text-amber-800">{warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}</ul></section>
          )}
        </div>
        <div className="border-t border-slate-200 p-3 text-right"><button className="btn" onClick={onClose}>Continue to pipeline</button></div>
      </div>
    </div>
  );
}
