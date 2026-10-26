"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronUp, ScrollText, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useStore, type LedgerEntry } from "@/lib/store";

const TONE: Record<LedgerEntry["kind"], string> = {
  ingest: "text-sky-300", rule: "text-amber-300", mutation: "text-emerald-300", cascade: "text-pink-300", dispatch: "text-violet-300", submit: "text-cyan-300", decision: "text-lime-300",
};

/** Collapsible live event stream: every upload, rule enforcement, mutation, cascade and dispatch, timestamped. */
export default function EventLedger() {
  const ledger = useStore((s) => s.ledger);
  const [open, setOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: "end" }); }, [ledger.length, open]);
  const last = ledger[ledger.length - 1];

  // best-effort copy of every new event into the Neon audit table (admin-only API; silently skipped if no database)
  const sent = useRef(0);
  const [saved, setSaved] = useState<number | null>(null);
  useEffect(() => {
    const fresh = ledger.filter((e) => e.id > sent.current);
    if (!fresh.length) return;
    sent.current = Math.max(...fresh.map((e) => e.id));
    fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: fresh.map((e) => ({ kind: e.kind, text: e.text })) }) })
      .then((r) => r.json()).then((j) => { if (j?.enabled && typeof j.saved === "number") setSaved((n) => (n ?? 0) + j.saved); }).catch(() => {});
  }, [ledger]);

  return (
    <div className="fixed bottom-0 left-0 z-30 w-full max-w-xl px-2 sm:left-3" aria-label="Live event stream">
      <div className="overflow-hidden rounded-t-2xl border border-brand-900/40 bg-brand-900 text-brand-50 shadow-2xl">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs" aria-expanded={open}>
          <ScrollText size={14} className="shrink-0 text-brand-100" />
          <span className="font-bold">Live event stream</span>
          <span className="rounded-full bg-white/15 px-1.5 tabular-nums">{ledger.length}</span>
          {saved != null && <span className="rounded-full bg-emerald-400/20 px-1.5 text-[10px] text-emerald-200" title="Events saved to the Neon database">saved {saved}</span>}
          {!open && last && <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-brand-100"><span className="opacity-60">[{last.at}]</span> {last.text}</span>}
          <ChevronUp size={14} className={clsx("ml-auto shrink-0 transition", open && "rotate-180")} />
        </button>
        {open && (
          <div className="max-h-64 overflow-y-auto border-t border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] leading-relaxed">
            {ledger.length === 0 && <p className="text-brand-100/70">No events yet. Upload a workbook or run a what-if.</p>}
            {ledger.map((e) => (
              <p key={e.id}><span className="opacity-50">[{e.at}]</span> <span className={TONE[e.kind]}>{e.text}</span></p>
            ))}
            <div ref={end} />
            {ledger.length > 0 && <button className="mt-1 flex items-center gap-1 text-[10px] text-brand-100/60 hover:text-white" onClick={() => useStore.setState({ ledger: [] })}><Trash2 size={10} /> Clear</button>}
          </div>
        )}
      </div>
    </div>
  );
}
