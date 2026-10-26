"use client";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, CalendarCheck, FileDown, Languages, Mail, ShieldAlert, Swords, UserCheck, Wallet } from "lucide-react";
import { PAYBACK_RISK_MONTHS } from "@/lib/economics";
import type { Result } from "@/lib/types";
import { opponentOf } from "@/lib/contention";
import { useResults } from "@/lib/store";
import { candidateNarrative, candidateStatus, candidateTips, showCandidateScore } from "@/lib/candidate";
import { Bar, StatusBadge } from "./ui";
import { Snowflake } from "./IceCream";
import BreakEvenChart from "./BreakEvenChart";
import { useStore } from "@/lib/store";
import WhatIfPanel from "./WhatIfPanel";
import { consentBadgeText } from "@/lib/consent";
import ReviewPanel from "./ReviewPanel";
import EditCandidate from "./EditCandidate";
import OnboardingGantt from "./OnboardingGantt";
import OnboardingKit from "./OnboardingKit";
import ApprovalsModal from "./ApprovalsModal";
import { assess } from "@/lib/rubric";

export default function Dossier({ r, candidate = false, onCompare }: { r: Result; candidate?: boolean; onCompare?: (aId: string, bId: string) => void }) {
  const { results: allResults } = useResults();
  const opp = onCompare && !candidate ? opponentOf(r, allResults) : null;
  const eco = r.economics;
  const [showAlts, setShowAlts] = useState(false);
  const [offered, setOffered] = useState<string | null>(null);
  const log = useStore((s) => s.log);
  const humanOutcome = useStore((s) => s.decisions[r.app.id]?.outcome);
  const humanAccepted = !candidate && humanOutcome === "ACCEPTED";
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const cs = candidateStatus(r);
  const showScore = !candidate || showCandidateScore(r);
  const bd = showScore ? r.breakdown : null;
  const bottlenecks = candidate ? candidateTips(r).map((fix) => ({ issue: "", fix })) : r.bottlenecks;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{r.app.id}</p>
          <h3 className="text-xl font-bold">{r.app.name}</h3>
          <p className="text-sm text-slate-500">{r.app.location || "—"}{!candidate && <> · <b className="text-brand-700">{r.territory?.id ?? "Unmapped territory"}</b></>}</p>
        </div>
        <div className="text-right">
          {showScore && <div className="text-4xl font-extrabold tabular-nums text-brand-700">{r.score ?? "—"}<span className="text-base font-medium text-slate-400">/100</span></div>}
          <StatusBadge status={candidate ? r.status : assess(r).suggested} label={candidate ? cs.label : `AI suggests: ${assess(r).suggestedLabel}`} />
        </div>
      </div>

      <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{candidate ? candidateNarrative(r) : <><b>Rules-engine placement (before human review): </b>{r.narrative}</>}</p>

      {!candidate && <ReviewPanel r={r} results={allResults} />}
      {!candidate && <EditCandidate key={r.app.id + JSON.stringify(r.app)} app={r.app} />}

      {bd && (
        <section className="space-y-3">
          <h4 className="text-sm font-bold">Score breakdown — four equal pillars (25% each)</h4>
          <Bar label="Launch Speed" pts={bd.launch.pts} max={bd.launch.max} detail={bd.launch.detail} />
          <Bar label="Capital Depth" pts={bd.capital.pts} max={bd.capital.max} detail={bd.capital.detail} />
          <Bar label="Retail Experience" pts={bd.experience.pts} max={bd.experience.max} detail={bd.experience.detail} />
          <Bar label="Real Estate Quality" pts={bd.realEstate.pts} max={bd.realEstate.max} detail={bd.realEstate.detail} />
        </section>
      )}

      {!candidate && (
        r.app.consent?.granted
          ? <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm font-semibold text-emerald-800">{consentBadgeText(r.app)}</p>
          : <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">No DPDP consent on file (imported record).</p>
      )}

      {!candidate && eco && (
        <section className={clsx("rounded-lg border p-3 text-sm", eco.risk ? "border-red-200 bg-red-50" : eco.band === "watch" ? "border-amber-200 bg-amber-50" : "border-slate-200")}>
          <h4 className="mb-2 flex items-center gap-2 font-bold"><Wallet size={16} className="text-brand-600" /> Parlour unit economics &amp; payback</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-lg font-bold tabular-nums">₹{eco.monthlyRevenueLakh}L</p><p className="text-[11px] text-slate-500">est. monthly revenue</p></div>
            <div><p className="text-lg font-bold tabular-nums">₹{eco.netCashFlowLakh}L</p><p className="text-[11px] text-slate-500">net cash flow / month</p></div>
            <div><p className={clsx("text-lg font-bold tabular-nums", eco.risk && "text-red-600")}>{eco.paybackMonths ?? "—"}<span className="text-xs font-medium"> mo</span></p><p className="text-[11px] text-slate-500">payback</p></div>
          </div>
          {eco.risk && <p className="mt-2 flex items-center gap-1 font-semibold text-red-700"><ShieldAlert size={14} /> High Operational Cash Flow Risk: payback exceeds {PAYBACK_RISK_MONTHS} months</p>}
          <BreakEvenChart eco={eco} />
          <p className="mt-2 text-xs text-slate-700">{eco.diagnostic}</p>
          <p className="mt-1 text-[11px] text-slate-500">{eco.assumption}. Payback = investment capacity ÷ net cash flow.</p>
        </section>
      )}

      {opp && onCompare && (
        <button className="btn-ghost w-full" onClick={() => onCompare(opp.app.id, r.app.id)}><Swords size={16} /> Compare with {opp.app.id} ({opp.app.name}) in the Contention Arena</button>
      )}

      {!candidate && (
        <section className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-sm">
          <h4 className="mb-1 font-bold text-brand-900">What should happen next</h4>
          <p className="text-slate-700">{r.nextAction}</p>
          {(r.status === "REJECTED" || r.status === "WAITLISTED") && (
            <div className="mt-2">
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setShowAlts((s) => !s)}>{showAlts ? "Hide" : "Suggest"} alternative catchment</button>
              {showAlts && (
                r.alternatives.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {r.alternatives.map((a) => (
                      <li key={a.pin} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2 ring-1 ring-ice-200">
                        <span><b className="tabular-nums">{a.pin}</b> · {a.city} ({a.territoryId}) · ~{a.distanceKm} km away · {a.remainingSlots} slot{a.remainingSlots > 1 ? "s" : ""} open · no existing store</span>
                        <button disabled={offered === a.pin} className="btn !px-3 !py-1 text-xs" onClick={() => { setOffered(a.pin); log("dispatch", `Re-routing offer sent: ${r.app.id} ${r.app.name} offered pin ${a.pin} (${a.territoryId}) instead of ${r.app.pin}.`); }}>{offered === a.pin ? "Offer sent ✓" : "Send re-routing offer"}</button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-xs text-slate-500">No uncovered pin with open slots in this city right now.</p>
              )}
            </div>
          )}
        </section>
      )}

      {r.requirements.length > 0 && (
        <section className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
          <h4 className="mb-1 flex items-center gap-2 font-bold text-sky-900"><Snowflake className="h-4 w-4" /> {candidate ? "Before you open" : "Onboarding requirements"}</h4>
          <ul className="list-disc space-y-1 pl-5 text-sky-900">{r.requirements.map((q) => <li key={q}>{q}</li>)}</ul>
        </section>
      )}

      {bottlenecks.length > 0 && (
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><AlertTriangle size={16} className="text-amber-500" /> {candidate ? "Ways to strengthen your application" : "Bottlenecks & remediation"}</h4>
          <ul className="space-y-2">
            {bottlenecks.map((b, i) => (
              <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                {b.issue && <p className="font-medium text-amber-900">{b.issue}</p>}
                <p className="mt-0.5 text-amber-800">{b.issue ? "→ " : ""}{b.fix}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!candidate && r.breakdown && <WhatIfPanel key={r.app.id} r={r} />}

      {!candidate && humanOutcome && (
        <section className="rounded-lg border border-brand-200 bg-brand-50/60 p-3 text-sm">
          <h4 className="mb-1 flex items-center gap-2 font-bold text-brand-900"><BadgeCheck size={16} /> {humanOutcome === "ACCEPTED" ? "Approved: details, next steps & congratulations email" : "Decision recorded: email the candidate"}</h4>
          <p className="text-slate-700">{humanOutcome === "ACCEPTED" ? "Review the approval details and next steps, preview the congratulations email and send it." : "Preview the update email, which explains the decision kindly and invites changes (we may rethink), then send it."}</p>
          <button className="btn mt-2 w-full" onClick={() => setApprovalsOpen(true)}><Mail size={16} /> Open decision &amp; email</button>
        </section>
      )}
      {approvalsOpen && <ApprovalsModal results={allResults} focusId={r.app.id} onClose={() => setApprovalsOpen(false)} />}

      {humanAccepted && r.onboarding && (
        <section className="space-y-3 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/40 p-3">
          <div>
            <p className="inline-block rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Candidate's copy</p>
            <p className="mt-1 text-xs text-slate-600">For your reference only. This is the material the partner receives to prepare for opening; you do not need to act on it.</p>
          </div>
          <button className="btn-ghost w-full" onClick={() => setKitOpen(true)}><FileDown size={16} /> View the partner's Onboarding Kit (LOI, fit-out, training)</button>
          <OnboardingGantt r={r} />
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><CalendarCheck size={16} className="text-emerald-600" /> Partner's onboarding roadmap: {r.onboarding.track}</h4>
            <p className="mb-2 flex items-center gap-1 text-xs text-slate-600"><Languages size={14} /> {r.onboarding.languageNote}</p>
            <ol className="space-y-2 border-l-2 border-emerald-200 pl-4">
              {r.onboarding.milestones.map((m, i) => (
                <li key={i} className="relative text-sm"><span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" /><b>{m.week}:</b> {m.title}</li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-slate-500">{r.onboarding.timelineNote}</p>
          </div>
        </section>
      )}
      {kitOpen && <OnboardingKit r={r} onClose={() => setKitOpen(false)} />}
    </div>
  );
}
