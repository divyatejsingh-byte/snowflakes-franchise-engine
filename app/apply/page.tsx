"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Loader2, Mail, MailCheck, MapPin, User, UserCheck } from "lucide-react";
import clsx from "clsx";
import FranchiseMap from "@/components/FranchiseMap";
import ChatbotWidget from "@/components/ChatbotWidget";
import DPDPConsentModal from "@/components/DPDPConsentModal";
import ApplicationStrengthChecker from "@/components/ApplicationStrengthChecker";
import { evaluate, padPin } from "@/lib/engine";
import { checkPin, PIN_PREFIXES } from "@/lib/allowed";
import { fallbackCoords, haversineKm } from "@/lib/geo";
import { useResults, useStore } from "@/lib/store";
import type { DispatchOutcome } from "@/lib/mailer";
import type { Result } from "@/lib/types";

const STEPS = [
  { n: 1, title: "Applicant & business", icon: User },
  { n: 2, title: "Property & timeline", icon: MapPin },
  { n: 3, title: "Submitted for review", icon: CheckCircle2 },
];

/** Allowed values from the brief: city → 3-digit pin prefix. */
const CITIES = Object.values(PIN_PREFIXES).map((v) => v.city);
const PREFIX_OF: Record<string, string> = Object.fromEntries(Object.entries(PIN_PREFIXES).map(([p, v]) => [v.city, p]));
const NOT_IDENTIFIED = "Not yet identified";

// Sheet 1 fields (State is fixed to Karnataka). Email is the only extra: where the confirmation goes.
const empty = {
  name: "", email: "", city: "", pin: "", language: "",
  investment: "", experience: "", business: "",
  ownership: "", size: "", floor: "", launch: "", notes: "",
};

const digits = (v: string) => v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 7);
const isNum = (v: string) => v.trim() !== "" && Number.isFinite(+v);

export default function ApplyPage() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(empty);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [mail, setMail] = useState<DispatchOutcome | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const { dataset } = useResults();
  const addApplication = useStore((s) => s.addApplication);

  // pre-populate from the landing-page eligibility checker: /apply?pincode=XXXXXX&city=Name
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const pc = (p.get("pincode") || "").replace(/\D/g, "").slice(0, 6);
    if (pc.length === 6) {
      const city = CITIES.find((c) => c === p.get("city")) ?? PIN_PREFIXES[pc.slice(0, 3)]?.city ?? "";
      setF((prev) => ({ ...prev, pin: pc, city }));
      setPrefilled(true);
    }
  }, []);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const setNumber = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: digits(e.target.value) }));

  // no space yet ⇒ size 0 and floor "Not known" are filled in automatically
  const onOwnership = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setF((p) => v === NOT_IDENTIFIED
      ? { ...p, ownership: v, size: "0", floor: "Not known" }
      : { ...p, ownership: v, ...(p.ownership === NOT_IDENTIFIED ? { size: "", floor: "" } : {}) });
  };
  const noSpace = f.ownership === NOT_IDENTIFIED;

  // helper buttons (strength sidebar, concierge) patch the form; keep the floor vocabulary to Ground / Mall unit / Upper
  const applyPatch = (patch: Record<string, string>) =>
    setF((p) => {
      const next = { ...p, ...patch };
      if (next.floor === "First floor") next.floor = "Upper";
      return next;
    });

  const pin = padPin(f.pin);
  const live = useMemo(() => {
    if (f.pin.replace(/\D/g, "").length !== 6) return null;
    const check = checkPin(pin, dataset.stores, dataset.territories);
    const info = check.kind === "out_of_scope" ? null : check.info;
    const city = info?.city || f.city;
    const me = fallbackCoords(pin, city);
    const near = dataset.stores.filter((s) => haversineKm(me, fallbackCoords(s.pin, s.city)) <= 5);
    return { check, city, near };
  }, [f.pin, f.city, pin, dataset]);

  const validateStep1 = (): string => {
    if (!f.name.trim()) return "Please enter the applicant's name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return "Please enter a valid email address (we send your confirmation there).";
    if (!CITIES.includes(f.city)) return "Please select a city.";
    if (!/^\d{6}$/.test(f.pin)) return "Pin code must be exactly 6 digits.";
    const info = PIN_PREFIXES[f.pin.slice(0, 3)];
    if (!info) return `Pin ${f.pin} isn't in our launch areas. Pin codes must start with ${Object.keys(PIN_PREFIXES).sort().join(", ")}.`;
    if (info.city !== f.city) return `Pin ${f.pin} belongs to ${info.city}, but you selected ${f.city}. Pin codes for ${f.city} start with ${PREFIX_OF[f.city]}.`;
    if (!["Kannada", "English", "Hindi"].includes(f.language)) return "Please choose your preferred language.";
    if (!isNum(f.investment) || +f.investment <= 0) return "Please enter your investment capacity as a number.";
    if (!isNum(f.experience) || +f.experience < 0) return "Please enter your retail experience in years (0 if none).";
    return "";
  };
  const validateStep2 = (): string => {
    if (!f.ownership) return "Please tell us whether the space is rented, owned or not yet identified.";
    if (!noSpace) {
      if (!isNum(f.size) || +f.size <= 0) return "Please enter the space size in sq ft.";
      if (!["Ground", "Mall unit", "Upper"].includes(f.floor)) return "Please select the floor.";
    }
    if (!isNum(f.launch) || +f.launch < 0) return "Please enter your target launch in months.";
    return "";
  };

  const goStep2 = () => { const e = validateStep1(); setErr(e); if (!e) setStep(2); };
  const requestSubmit = () => {
    const e = validateStep1() || validateStep2();
    setErr(e);
    if (!e) setConsentOpen(true); // gate: nothing is posted until DPDP consent is granted
  };

  const submit = async (dpdpConsentTimestamp: string) => {
    setConsentOpen(false); setBusy(true);
    let consent: { granted: boolean; timestamp: string; recordedAt?: string; version: string };
    try {
      const res = await fetch("/api/applications/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dpdpConsentGranted: true, dpdpConsentTimestamp, email: f.email }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Consent could not be recorded.");
      consent = j.consent;
    } catch (e) {
      setBusy(false);
      return setErr((e as Error).message || "Consent could not be recorded. Please try again.");
    }
    const id = addApplication({
      consent,
      name: f.name.trim(), email: f.email.trim(), location: `${f.city} · Karnataka · ${pin}`, city: f.city, pin,
      investment: +f.investment, experience: +f.experience, business: f.business.trim(),
      space: f.ownership, size: noSpace ? 0 : +f.size, floor: noSpace ? "Not known" : f.floor,
      launch: +f.launch, language: f.language, notes: f.notes.trim(),
    });
    const ds = useStore.getState();
    const r = evaluate({ applications: ds.applications, territories: ds.territories, stores: ds.stores }).find((x) => x.app.id === id)!;
    setResult(r); setStep(3);
    try {
      const res = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result: r, email: f.email }) });
      setMail(await res.json());
    } catch { /* email preview is best-effort */ }
    setBusy(false);
  };

  return (
    <div className={clsx("mx-auto space-y-6", step < 3 ? "max-w-6xl" : "max-w-4xl")}>
      {step < 3 && (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-900">Become a SnowFlakes partner 🍦</h1>
          <p className="mx-auto mt-1 max-w-xl text-slate-600">Two quick steps, then a short consent. It takes about five minutes.</p>
        </div>
      )}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", step >= s.n ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500")}>
              {step > s.n ? <CheckCircle2 size={18} /> : <s.icon size={16} />}
            </span>
            <span className={clsx("hidden text-sm font-semibold sm:block", step >= s.n ? "text-slate-900" : "text-slate-400")}>{s.title}</span>
            {i < 2 && <span className={clsx("h-0.5 flex-1", step > s.n ? "bg-brand-600" : "bg-slate-200")} />}
          </li>
        ))}
      </ol>

      {step < 3 && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
          <div className="order-2 lg:order-1">
            {step === 1 && (
              <div className="card space-y-4 p-6">
                <h2 className="text-xl font-bold text-brand-900">Tell us about yourself</h2>
                {prefilled && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">✓ Pin code <b>{pin}</b>{f.city && <> in <b>{f.city}</b></>} carried over from the eligibility check.</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="label" htmlFor="f-name">Applicant name</label><input id="f-name" className="input" value={f.name} onChange={set("name")} /></div>
                  <div><label className="label" htmlFor="f-email">Email (for your confirmation)</label><input id="f-email" className="input" type="email" value={f.email} onChange={set("email")} /></div>
                  <div><label className="label" htmlFor="f-city">City</label>
                    <select id="f-city" className="input" value={f.city} onChange={set("city")}><option value="" disabled>Select city…</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                  <div><label className="label" htmlFor="f-state">State</label><input id="f-state" className="input bg-slate-50 text-slate-600" value="Karnataka" readOnly /></div>
                  <div><label className="label" htmlFor="f-pin">Pin code</label>
                    <input id="f-pin" className="input" maxLength={6} inputMode="numeric" placeholder={f.city ? `starts with ${PREFIX_OF[f.city]}` : "6 digits"} value={f.pin} onChange={(e) => setF((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))} /></div>
                  <div><label className="label" htmlFor="f-lang">Preferred language</label>
                    <select id="f-lang" className="input" value={f.language} onChange={set("language")}><option value="" disabled>Select language…</option><option>Kannada</option><option>English</option><option>Hindi</option></select></div>
                  <div><label className="label" htmlFor="f-inv">Investment capacity (₹ lakh)</label>
                    <input id="f-inv" className="input" inputMode="decimal" placeholder="e.g. 25" value={f.investment} onChange={setNumber("investment")} /></div>
                  <div><label className="label" htmlFor="f-exp">Retail experience (years)</label>
                    <input id="f-exp" className="input" inputMode="decimal" placeholder="0 if none" value={f.experience} onChange={setNumber("experience")} /></div>
                  <div className="sm:col-span-2"><label className="label" htmlFor="f-biz">Current / past business <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                    <input id="f-biz" className="input" placeholder="e.g. Cafe, bakery, dairy, restaurant…" value={f.business} onChange={set("business")} /></div>
                </div>
                {err && <p className="text-sm font-medium text-rose-600" role="alert">{err}</p>}
                <div className="flex justify-end"><button className="btn" onClick={goStep2}>Next <ChevronRight size={16} /></button></div>
              </div>
            )}

            {step === 2 && (
              <div className="card space-y-4 p-6">
                <h2 className="text-xl font-bold text-brand-900">Your space &amp; timeline</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="label" htmlFor="f-own">Space available</label>
                    <select id="f-own" className="input" value={f.ownership} onChange={onOwnership}><option value="" disabled>Select…</option><option>Rented</option><option>Owned</option><option value={NOT_IDENTIFIED}>Not yet identified</option></select></div>
                  <div><label className="label" htmlFor="f-size">Space size (sq ft)</label>
                    <input id="f-size" className="input disabled:bg-slate-50" inputMode="numeric" placeholder="Ideal: 250–450" disabled={noSpace} value={f.size} onChange={setNumber("size")} />
                    {noSpace && <p className="mt-1 text-xs text-slate-500">Set to 0 while no space is identified.</p>}</div>
                  <div><label className="label" htmlFor="f-floor">Floor</label>
                    <select id="f-floor" className="input disabled:bg-slate-50" disabled={noSpace} value={f.floor} onChange={set("floor")}>
                      <option value="" disabled>Select floor…</option><option value="Ground">Ground</option><option value="Mall unit">Mall unit</option><option value="Upper">Upper</option>
                      {noSpace && <option value="Not known">Not known</option>}
                    </select>
                    {noSpace && <p className="mt-1 text-xs text-slate-500">Set to “Not known” while no space is identified.</p>}</div>
                  <div><label className="label" htmlFor="f-launch">Target launch (months)</label>
                    <input id="f-launch" className="input" inputMode="numeric" placeholder="e.g. 3" value={f.launch} onChange={setNumber("launch")} /></div>
                  <div className="sm:col-span-2"><label className="label" htmlFor="f-notes">Notes <span className="font-normal normal-case text-slate-400">(optional)</span></label><textarea id="f-notes" className="input" rows={2} value={f.notes} onChange={set("notes")} /></div>
                </div>

                {live && (
                  <div className={clsx("rounded-lg border p-3 text-sm", live.check.kind === "eligible" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
                    {live.check.kind === "out_of_scope" && `Pin ${pin} isn't in one of our current launch areas (pin codes starting 560, 570, 572, 575, 577, 580 or 590). You can still submit and we'll keep you posted.`}
                    {live.check.kind === "cannibalised" && `We already have a store serving pin ${pin}, so we can't open another one here. Try a nearby pin code, or continue and we'll suggest alternatives.`}
                    {live.check.kind === "unmapped" && `Pin ${pin} is in ${live.check.info.city}, but we're still confirming this area. Your application will stay under review.`}
                    {live.check.kind === "full" && `${live.check.territory.city} is very popular right now, so you'd join our waitlist.`}
                    {live.check.kind === "eligible" && `Good news! Pin ${pin} in ${live.check.info.city} is open for applications.`}
                    {" "}{live.near.length > 0 && `${live.near.length} of our stores ${live.near.length === 1 ? "is" : "are"} within 5 km (approx.).`}
                  </div>
                )}
                {live && <FranchiseMap stores={dataset.stores} applicant={{ pin, city: live.city, label: live.check.kind === "eligible" ? "Eligible pin" : live.check.kind === "cannibalised" ? "Store already nearby" : live.check.kind === "out_of_scope" ? "Outside launch areas" : "Under review" }} />}

                {err && <p className="text-sm font-medium text-rose-600" role="alert">{err}</p>}
                <div className="flex justify-between">
                  <button className="btn-ghost" onClick={() => { setErr(""); setStep(1); }}><ChevronLeft size={16} /> Back</button>
                  <button className="btn" disabled={busy} onClick={requestSubmit}>{busy && <Loader2 size={16} className="animate-spin" />} Submit for review</button>
                </div>
              </div>
            )}
          </div>
          <div className="order-1 lg:order-2">
            <ApplicationStrengthChecker values={f} dataset={dataset} onApply={(patch) => applyPatch(patch as Record<string, string>)} />
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-6">
          <div className="card space-y-5 p-6 text-center sm:p-8">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><ClipboardCheck size={32} /></span>
            <div>
              <h2 className="text-2xl font-bold text-brand-900">Thank you, {result.app.name.split(" ")[0] || "there"}! Your application is submitted for review.</h2>
              <p className="mt-1 text-slate-600">Reference number <b className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-brand-700">{result.app.id}</b> · pin code {result.app.pin}</p>
            </div>
            <ol className="mx-auto max-w-xl space-y-3 text-left text-sm">
              {[
                ["Our expansion team reviews", "We check your location, space and details against our requirements."],
                ["You'll hear from us by email", `We'll write to ${result.app.email || "you"} with the outcome and your next steps.`],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3 rounded-xl border border-ice-200 bg-ice-50 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                  <span><b className="text-brand-900">{t}</b><br /><span className="text-slate-600">{d}</span></span>
                </li>
              ))}
            </ol>
          </div>
          <div className="card p-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><MailCheck size={18} className="text-brand-600" /> Confirmation email</h2>
            {!mail ? <p className="text-sm text-slate-500">Sending…</p> : "candidate" in mail ? (
              <div className="space-y-3 text-sm">
                <p className="text-slate-600">{mail.mode === "resend" ? "A confirmation email has been sent to you." : "Email delivery isn't switched on yet, so this is a preview of the confirmation we'll send you."}</p>
                <details className="rounded-lg border border-slate-200 p-3" open>
                  <summary className="cursor-pointer font-semibold">To {mail.candidate.to}</summary>
                  <p className="mt-2 font-medium">{mail.candidate.subject}</p>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-slate-600">{mail.candidate.text}</pre>
                </details>
              </div>
            ) : <p className="text-sm text-rose-600">Could not send the confirmation email.</p>}
          </div>
          <div className="flex gap-3">
            <button className="btn-ghost" onClick={() => { setF(empty); setResult(null); setMail(null); setErr(""); setStep(1); }}>New application</button>
          </div>
        </div>
      )}
      {consentOpen && <DPDPConsentModal onCancel={() => setConsentOpen(false)} onAgree={submit} />}
      <ChatbotWidget
        context={{
          form: { name: f.name, investment: f.investment, experience: f.experience, business: f.business, language: f.language, launch: f.launch, pin: pin || f.pin, floor: f.floor, size: f.size, ownership: f.ownership },
          pin: live ? { kind: live.check.kind, city: live.city, tier: live.check.kind === "out_of_scope" ? undefined : live.check.info.tier } : null,
        }}
        onApplyPreset={applyPatch}
      />
    </div>
  );
}
