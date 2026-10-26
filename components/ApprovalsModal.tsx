"use client";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, Gavel, Loader2, Mail, Send, X } from "lucide-react";
import { nextStepsFor } from "@/lib/congratsEmail";
import { buildDecisionEmail } from "@/lib/decisionEmail";
import { candidateTips } from "@/lib/candidate";
import { useStore, type Outcome } from "@/lib/store";
import type { Result } from "@/lib/types";

const LABEL: Record<Outcome, string> = { ACCEPTED: "Accepted", ON_HOLD: "On hold", WAITLISTED: "Waitlisted", REJECTED: "Rejected" };
const TONE: Record<Outcome, string> = { ACCEPTED: "bg-emerald-100 text-emerald-800", ON_HOLD: "bg-amber-100 text-amber-800", WAITLISTED: "bg-sky-100 text-sky-800", REJECTED: "bg-rose-100 text-rose-800" };
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

/** Every candidate a human has decided on: decision details, what the candidate is told, and the email that goes to them. */
export default function ApprovalsModal({ results, onClose, focusId }: { results: Result[]; onClose: () => void; focusId?: string }) {
  const decisions = useStore((s) => s.decisions);
  const log = useStore((s) => s.log);
  const decided = results.filter((r) => decisions[r.app.id]);
  const [open, setOpen] = useState<string | null>(focusId && decided.some((r) => r.app.id === focusId) ? focusId : decided[0]?.app.id ?? null);
  const [to, setTo] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [state, setState] = useState<Record<string, { st: "sending" | "sent" | "error"; note?: string }>>({});

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const recipient = (r: Result) => (to[r.app.id] ?? r.app.email ?? "").trim();
  // the reviewer's internal note is never sent; only the optional message written for the candidate
  const metaOf = (r: Result) => ({ by: decisions[r.app.id].by, at: decisions[r.app.id].at, note: (msg[r.app.id] ?? "").trim() || undefined });
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const send = async (r: Result) => {
    const email = recipient(r);
    const out = decisions[r.app.id].outcome;
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState((s) => ({ ...s, [r.app.id]: { st: "error", note: "Add a valid email address first." } }));
    setState((s) => ({ ...s, [r.app.id]: { st: "sending" } }));
    try {
      const res = await fetch("/api/congratulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result: r, to: email, approval: metaOf(r), outcome: out }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not send.");
      setState((s) => ({ ...s, [r.app.id]: { st: "sent", note: j.mode === "resend" ? `Sent to ${email}.` : "Email delivery isn't switched on, so this was simulated." } }));
      log("dispatch", `${out === "ACCEPTED" ? "Congratulations" : LABEL[out] + " update"} email ${j.mode === "resend" ? "sent" : "simulated"}: ${r.app.id} ${r.app.name} → ${email}.`);
    } catch (e) {
      setState((s) => ({ ...s, [r.app.id]: { st: "error", note: (e as Error).message } }));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Decisions and emails">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
          <Gavel className="text-brand-600" />
          <div className="flex-1"><h2 className="font-bold text-brand-900">Decisions &amp; emails</h2><p className="text-xs text-slate-500">{decided.length} candidate(s) decided by a human reviewer · details, what the candidate is told, and their email</p></div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="space-y-3 overflow-y-auto p-5">
          {decided.length === 0 && <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">No decisions yet. Open a candidate and record Accepted, On hold, Waitlisted or Rejected in the decision box, then come back here to email them.</p>}
          {decided.map((r) => {
            const d = decisions[r.app.id];
            const isOpen = open === r.app.id;
            const mail = buildDecisionEmail(r, d.outcome, recipient(r) || "candidate", metaOf(r), origin, CONTACT);
            const s = state[r.app.id];
            const tips = candidateTips(r);
            return (
              <div key={r.app.id} className="rounded-xl border border-slate-200">
                <button className="flex w-full flex-wrap items-center gap-3 p-3 text-left" onClick={() => setOpen(isOpen ? null : r.app.id)}>
                  <CheckCircle2 size={18} className="text-brand-600" />
                  <span className="font-bold">{r.app.id} · {r.app.name}</span>
                  <span className={clsx("rounded-full px-2 py-0.5 text-xs font-bold", TONE[d.outcome])}>{LABEL[d.outcome]}</span>
                  <span className="text-xs text-slate-500">pin {r.app.pin} · {r.territory?.id ?? "Unmapped"} · score {r.score ?? "—"}</span>
                  {s?.st === "sent" && <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Email sent ✓</span>}
                </button>
                {isOpen && (
                  <div className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-2">
                    <div className="space-y-3 text-sm">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <h4 className="mb-1 font-bold">Decision details</h4>
                        <p><b>{LABEL[d.outcome]}</b> by <b>{d.by}</b> on {new Date(d.at).toLocaleString("en-GB")}.</p>
                        <p className="text-xs text-slate-600">{d.outcome === d.aiSuggested ? "Matches the AI suggestion." : `Differs from the AI suggestion (${d.aiSuggested.replace("_", " ").toLowerCase()}, ${d.aiLight}).`}{d.note && <> Internal note (not emailed): {d.note}</>}</p>
                      </div>
                      {d.outcome === "ACCEPTED" ? (
                        <div>
                          <h4 className="mb-1 font-bold">Next steps for the partner</h4>
                          <ol className="list-decimal space-y-1 pl-5 text-slate-700">{nextStepsFor(r).map((x, i) => <li key={i}><b>{x.title}.</b> {x.detail}</li>)}</ol>
                        </div>
                      ) : (
                        <div>
                          <h4 className="mb-1 font-bold">What the candidate is told</h4>
                          <p className="text-slate-700">A considerate update with the reason, {tips.length ? "what could help, " : ""}and an invitation: <b>if they make changes, let us know and we may rethink the decision</b>.</p>
                          {tips.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600">{tips.slice(0, 4).map((t, i) => <li key={i}>{t}</li>)}</ul>}
                        </div>
                      )}
                      <label className="block text-xs font-semibold uppercase text-slate-500">Personal message to the candidate (optional)
                        <textarea className="input mt-1 normal-case" rows={2} placeholder="Shown in the email as “A note from our team”" value={msg[r.app.id] ?? ""} onChange={(e) => setMsg({ ...msg, [r.app.id]: e.target.value })} />
                      </label>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase text-slate-500">Send to
                          <input className="input mt-1 normal-case" type="email" placeholder="candidate@email.com" value={to[r.app.id] ?? r.app.email ?? ""} onChange={(e) => setTo({ ...to, [r.app.id]: e.target.value })} />
                        </label>
                        {!r.app.email && <p className="text-xs text-amber-700">No email on file for this applicant. Enter one to send.</p>}
                        <button className="btn w-full" disabled={s?.st === "sending"} onClick={() => send(r)}>
                          {s?.st === "sending" ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={16} /> {s?.st === "sent" ? "Send again" : d.outcome === "ACCEPTED" ? "Send congratulations email" : `Send ${LABEL[d.outcome].toLowerCase()} update email`}</>}
                        </button>
                        {s?.note && <p className={`text-xs ${s.st === "error" ? "text-red-700" : "text-emerald-700"}`}>{s.note}</p>}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-1 flex items-center gap-1 text-sm font-bold"><Eye size={14} /> <Mail size={14} /> Email preview</h4>
                      <iframe title={`Email for ${r.app.id}`} srcDoc={mail.html} className="h-[600px] w-full rounded-lg border border-slate-200" sandbox="" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
