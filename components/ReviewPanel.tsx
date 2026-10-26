"use client";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { CheckCircle2, Gavel, ThumbsDown, ThumbsUp, Undo2 } from "lucide-react";
import { assess, type Light } from "@/lib/rubric";
import { useStore, type Outcome } from "@/lib/store";
import type { Result } from "@/lib/types";

export const LIGHT_STYLE: Record<Light, { dot: string; box: string; text: string }> = {
  green: { dot: "bg-emerald-500", box: "border-emerald-300 bg-emerald-50", text: "text-emerald-900" },
  orange: { dot: "bg-orange-500", box: "border-orange-300 bg-orange-50", text: "text-orange-900" },
  red: { dot: "bg-red-500", box: "border-red-300 bg-red-50", text: "text-red-900" },
};

export const OUTCOME_LABEL: Record<Outcome, string> = { ACCEPTED: "Accepted", ON_HOLD: "On hold", WAITLISTED: "Waitlisted", REJECTED: "Rejected" };
const OUTCOMES: Outcome[] = ["ACCEPTED", "ON_HOLD", "WAITLISTED", "REJECTED"];

export function LightDot({ light, className }: { light: Light; className?: string }) {
  return <span title={light} className={clsx("inline-block h-3 w-3 shrink-0 rounded-full ring-2 ring-white", LIGHT_STYLE[light].dot, className)} />;
}

/** AI recommendation (rubric-based, colour coded) + the human admin's own decision. The AI never decides. */
export default function ReviewPanel({ r, results }: { r: Result; results: Result[] }) {
  const a = useMemo(() => assess(r), [r]);
  const decision = useStore((s) => s.decisions[r.app.id]);
  const decisions = useStore((s) => s.decisions);
  const stores = useStore((s) => s.stores);
  const decide = useStore((s) => s.decide);
  const clear = useStore((s) => s.clearDecision);
  const [by, setBy] = useState("Admin");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const keep = useStore((s) => s.keepDecision);
  const st = LIGHT_STYLE[a.light];
  const changed = !!decision && (a.suggested !== decision.aiSuggested || a.light !== decision.aiLight || r.score !== decision.aiScore);
  const snap = { aiSuggested: a.suggested, aiLight: a.light, aiScore: r.score };

  const choose = (o: Outcome) => {
    setErr("");
    const agrees = o === a.suggested;
    if (o === "ACCEPTED") {
      if (stores.some((s) => s.pin === r.app.pin)) return setErr(`Blocked: pin ${r.app.pin} already has an existing store (one store per pin code).`);
      const clash = results.find((x) => x.app.id !== r.app.id && x.app.pin === r.app.pin && decisions[x.app.id]?.outcome === "ACCEPTED");
      if (clash) return setErr(`Blocked: ${clash.app.id} is already accepted on pin ${r.app.pin} (one store per pin code). Change that decision first.`);
    }
    if (!agrees && note.trim().length < 5) return setErr("This differs from the AI suggestion: add a short reason for the record.");
    decide(r.app.id, { outcome: o, note: note.trim(), by: by.trim() || "Admin", aiSuggested: a.suggested, aiLight: a.light, aiScore: r.score });
    setNote("");
  };

  return (
    <section className="space-y-3">
      {changed && decision && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-sm" role="alert">
          <p className="font-bold text-amber-900">This candidate's strength has changed since you decided</p>
          <p className="mt-1 text-slate-800">
            Score {decision.aiScore ?? "—"} → <b>{r.score ?? "—"}</b> · rating {decision.aiLight} → <b>{a.light}</b> · AI suggestion {OUTCOME_LABEL[decision.aiSuggested as Outcome] ?? decision.aiSuggested} → <b>{a.suggestedLabel}</b>.
            Your current decision is <b>{OUTCOME_LABEL[decision.outcome]}</b>. Current candidate strength is shown below.
          </p>
          <p className="mt-1 font-medium text-amber-900">Do you want to change your decision?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn !px-3 !py-1.5 text-xs" onClick={() => clear(r.app.id)}>Yes, review and change it</button>
            <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => keep(r.app.id, snap)}>No, keep {OUTCOME_LABEL[decision.outcome]}</button>
          </div>
        </div>
      )}
      <div className={clsx("rounded-xl border p-3 text-sm", st.box)}>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">AI suggestion · for the reviewer, not a decision</p>
        <p className={clsx("flex items-center gap-2 font-bold", st.text)}><LightDot light={a.light} className="!h-4 !w-4" /> {a.label}</p>
        <p className="mt-1 text-slate-700">{a.headline}</p>
        <p className="mt-1 text-xs text-slate-600">Suggested outcome: <b>{a.suggestedLabel}</b></p>

        <h5 className="mt-3 text-xs font-bold uppercase text-slate-500">Rubric reasons</h5>
        <ul className="list-disc space-y-0.5 pl-5 text-slate-800">{a.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>

        {a.pillars.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500"><th className="py-1 pr-2">Pillar</th><th className="pr-2">Pts</th><th>Rubric rule vs this applicant</th></tr></thead>
              <tbody>
                {a.pillars.map((p) => (
                  <tr key={p.name} className="border-t border-black/5 align-top">
                    <td className="py-1 pr-2 font-semibold">{p.name}</td>
                    <td className={clsx("pr-2 font-bold tabular-nums", p.level === "strong" ? "text-emerald-700" : p.level === "weak" ? "text-red-700" : "text-orange-700")}>{p.pts}/{p.max}</td>
                    <td className="py-1"><span className="text-slate-500">{p.rule}</span><br />{p.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-white/70 p-2">
            <h5 className="mb-1 flex items-center gap-1 text-xs font-bold text-emerald-700"><ThumbsUp size={12} /> Strong points</h5>
            {a.strengths.length ? <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-700">{a.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="text-xs text-slate-500">None identified against the rubric.</p>}
          </div>
          <div className="rounded-lg bg-white/70 p-2">
            <h5 className="mb-1 flex items-center gap-1 text-xs font-bold text-red-700"><ThumbsDown size={12} /> Weaker points</h5>
            {a.weaknesses.length ? <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-700">{a.weaknesses.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="text-xs text-slate-500">None identified against the rubric.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-brand-200 bg-white p-3 text-sm">
        <h4 className="mb-2 flex items-center gap-2 font-bold text-brand-900"><Gavel size={16} /> Your decision (human reviewer)</h4>
        {decision ? (
          <div className="space-y-2">
            <p className="flex flex-wrap items-center gap-2"><CheckCircle2 size={16} className="text-brand-600" /> <b>{OUTCOME_LABEL[decision.outcome]}</b> by {decision.by} · {new Date(decision.at).toLocaleString("en-GB")}</p>
            <p className="text-xs text-slate-600">{decision.outcome === decision.aiSuggested ? "Matches the AI suggestion." : `Overrides the AI suggestion (${OUTCOME_LABEL[decision.aiSuggested as Outcome] ?? decision.aiSuggested}, ${decision.aiLight}).`}{decision.note && <> Reason: {decision.note}</>}</p>
            <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => clear(r.app.id)}><Undo2 size={14} /> Withdraw decision</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-amber-700">Awaiting your decision. Nothing is final until you choose.</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              <input className="input" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Reviewer name" aria-label="Reviewer name" />
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / note (required if you differ from the AI)" aria-label="Decision note" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OUTCOMES.map((o) => (
                <button key={o} onClick={() => choose(o)} className={clsx("rounded-lg border px-2 py-2 text-xs font-bold transition hover:shadow", o === a.suggested ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-300 text-slate-700 hover:bg-slate-50")}>
                  {OUTCOME_LABEL[o]}{o === a.suggested &&<span className="block text-[10px] font-medium">AI suggests</span>}
                </button>
              ))}
            </div>
            {err && <p className="rounded bg-red-50 p-2 text-xs font-medium text-red-700">{err}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
