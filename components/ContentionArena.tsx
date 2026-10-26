"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Swords, Trophy, X } from "lucide-react";
import clsx from "clsx";
import { compareRank, tieBreakLog } from "@/lib/engine";
import { findContests } from "@/lib/contention";
import type { Result } from "@/lib/types";
import { StatusBadge } from "./ui";

const rk = (r: Result) => ({ app: r.app, score: r.score ?? 0 });

export default function ContentionArena({
  results, initial, onClose,
}: { results: Result[]; initial?: { a: string; b: string } | null; onClose: () => void }) {
  const contests = useMemo(() => findContests(results), [results]);
  const startContest = initial ? contests.find((c) => c.contenders.some((r) => r.app.id === initial.a) && c.contenders.some((r) => r.app.id === initial.b)) : undefined;
  const [cid, setCid] = useState<string | null>(startContest?.id ?? contests[0]?.id ?? null);
  const contest = contests.find((c) => c.id === cid) ?? null;
  const [pick, setPick] = useState<[string, string] | null>(initial ? [initial.a, initial.b] : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // default pair: top two of the selected contest; keep the initial pair if it belongs to the contest
  const ids = contest?.contenders.map((r) => r.app.id) ?? [];
  const pair: [string, string] | null =
    pick && ids.includes(pick[0]) && ids.includes(pick[1]) && pick[0] !== pick[1] ? pick : ids.length >= 2 ? [ids[0], ids[1]] : null;
  const pickedRows = pair ? pair.map((id) => results.find((r) => r.app.id === id)!).sort((x, y) => compareRank(rk(x), rk(y))) : null;
  const [A, B] = pickedRows ?? [null, null];
  const log = A && B ? tieBreakLog(rk(A), rk(B)) : null;

  const pillars: { label: string; a: number; b: number }[] = A?.breakdown && B?.breakdown
    ? [
        { label: "Launch Speed", a: A.breakdown.launch.pts, b: B.breakdown.launch.pts },
        { label: "Capital Depth", a: A.breakdown.capital.pts, b: B.breakdown.capital.pts },
        { label: "Retail Experience", a: A.breakdown.experience.pts, b: B.breakdown.experience.pts },
        { label: "Real Estate Quality", a: A.breakdown.realEstate.pts, b: B.breakdown.realEstate.pts },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Contention Arena">
      <div className="flex items-center gap-3 border-b border-slate-300 bg-slate-100 px-4 py-2">
        <Swords size={20} className="text-brand-600" />
        <h2 className="font-bold">Contention Arena</h2>
        <span className="text-sm text-slate-500">{contests.length} contested pin code(s) / territories</span>
        <button className="btn-ghost ml-auto" onClick={onClose}><X size={16} /> Esc</button>
      </div>

      {!contests.length ? (
        <p className="p-10 text-center text-slate-500">No contention right now — every pin code and territory has a single contender.</p>
      ) : (
        <div className="grid flex-1 overflow-hidden lg:grid-cols-[280px_1fr]">
          <ul className="overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
            {contests.map((c) => (
              <li key={c.id}>
                <button onClick={() => { setCid(c.id); setPick(null); }} className={clsx("mb-2 w-full rounded-lg border p-3 text-left text-sm transition", c.id === cid ? "border-brand-500 bg-white shadow" : "border-slate-200 bg-white hover:border-brand-500")}>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-slate-500">{c.kind === "pin" ? "Pin contention" : "Slot contention"} · {c.detail}</p>
                  <p className="mt-1 text-xs text-slate-600">{c.contenders.map((r) => r.app.id).join(" · ")}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="overflow-y-auto p-5">
            {contest && A && B && log && (
              <div className="mx-auto max-w-4xl space-y-5">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">Compare:</span>
                  {[0, 1].map((i) => (
                    <select key={i} className="input w-auto" value={pair![i]} onChange={(e) => { const n: [string, string] = [...pair!] as [string, string]; n[i] = e.target.value; setPick(n); }}>
                      {contest.contenders.map((r) => <option key={r.app.id} value={r.app.id}>{r.app.id} · {r.app.name}</option>)}
                    </select>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[[A, "Winner", true], [B, "Challenger", false]].map(([r, tag, win]) => {
                    const x = r as Result;
                    return (
                      <div key={x.app.id} className={clsx("rounded-xl border-2 p-4", win ? "border-emerald-400 bg-emerald-50" : "border-slate-200")}>
                        <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">{win && <Trophy size={14} className="text-amber-500" />}{tag as string}</p>
                        <p className="text-lg font-bold">{x.app.name} <span className="text-sm font-medium text-slate-500">{x.app.id}</span></p>
                        <div className="mt-1 flex items-center justify-between">
                          <StatusBadge status={x.status} label={x.label} />
                          <span className="text-3xl font-extrabold tabular-nums">{x.score}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <section className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-bold">Pillar-by-pillar diff</h3>
                  <div className="space-y-3">
                    {pillars.map((p) => {
                      const d = p.a - p.b;
                      return (
                        <div key={p.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <span className="tabular-nums font-semibold">{p.a}</span>
                            <div className="h-3 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100"><div className="ml-auto h-full rounded-full bg-emerald-500" style={{ width: `${(p.a / 25) * 100}%` }} /></div>
                          </div>
                          <div className="w-40 text-center">
                            <p className="font-medium">{p.label}</p>
                            <p className={clsx("text-xs font-bold", d > 0 ? "text-emerald-600" : d < 0 ? "text-rose-600" : "text-slate-400")}>{d === 0 ? "level" : `${d > 0 ? "A" : "B"} +${Math.abs(d)}`}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${(p.b / 25) * 100}%` }} /></div>
                            <span className="tabular-nums font-semibold">{p.b}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Left = winner (A), right = challenger (B). Each pillar is out of 25.</p>
                </section>

                <section className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-bold">Deterministic tie-breaker log</h3>
                  <ol className="space-y-2">
                    {log.steps.map((s, i) => (
                      <li key={i} className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 rounded-lg bg-slate-50 p-2 text-sm">
                        <span className={clsx("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white", s.outcome === "tie" ? "bg-slate-400" : "bg-emerald-500")}>{s.outcome === "tie" ? <Minus size={14} /> : <Check size={14} />}</span>
                        <span><b>{i + 1}. {s.label}</b></span>
                        <span className="text-slate-600">A: {s.a} · B: {s.b}</span>
                        <span className="w-24 text-right text-xs font-bold">{s.outcome === "tie" ? "tie → next rung" : `${s.outcome} wins`}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><b>Verdict:</b> {log.summary}</p>
                </section>
              </div>
            )}
            {contest && !A && <p className="p-8 text-center text-slate-500">Pick two applicants to compare.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
