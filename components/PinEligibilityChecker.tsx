"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Search } from "lucide-react";
import clsx from "clsx";
import { checkPin, PIN_PREFIXES } from "@/lib/allowed";
import { padPin } from "@/lib/engine";
import { useStore } from "@/lib/store";

const ALLOWED = Object.keys(PIN_PREFIXES).sort().join(", ");

export default function PinEligibilityChecker() {
  const stores = useStore((s) => s.stores);
  const territories = useStore((s) => s.territories);
  const [input, setInput] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("pin");
    if (p) setInput(p.replace(/\D/g, "").slice(0, 6));
  }, []);
  const digits = input.replace(/\D/g, "");
  const pin = digits.length === 6 ? padPin(digits) : "";
  const v = useMemo(() => (pin ? checkPin(pin, stores, territories) : null), [pin, stores, territories]);

  // Per-check progress: A prefix -> B cannibalisation -> C territory & slots
  const steps = v && [
    { k: "A", label: "Area", ok: v.kind !== "out_of_scope", detail: v.kind === "out_of_scope" ? `${pin.slice(0, 3)} outside launch areas` : `${pin.slice(0, 3)} → ${v.info.city} (Tier ${v.info.tier})` },
    v.kind === "out_of_scope"
      ? { k: "B", label: "Existing store", ok: null as boolean | null, detail: "skipped" }
      : { k: "B", label: "Existing store", ok: v.kind !== "cannibalised", detail: v.kind === "cannibalised" ? "already served" : "pin is free" },
    v.kind === "out_of_scope" || v.kind === "cannibalised"
      ? { k: "C", label: "Availability", ok: null as boolean | null, detail: "skipped" }
      : { k: "C", label: "Availability", ok: v.kind === "eligible", detail: v.kind === "unmapped" ? "area being confirmed" : v.kind === "full" ? "currently full" : `${v.territory.slots} opening(s)` },
  ];

  const tone = v?.kind === "eligible" ? "green" : "amber";

  return (
    <div className="mt-6 max-w-xl rounded-xl bg-white p-4 text-slate-900 shadow-lg">
      <label htmlFor="pin-check" className="mb-2 block text-sm font-semibold">Is your pin code available?</label>
      <form onSubmit={(e) => { e.preventDefault(); setTouched(true); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-600" />
          <input
            id="pin-check" className="input !rounded-full !py-3 pl-11 text-base" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit pin code, e.g. 560038" aria-describedby="pin-hint"
            value={input} onChange={(e) => { setInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setTouched(false); }}
          />
        </div>
        <button type="submit" className="btn shrink-0 !px-5">Check</button>
      </form>
      <p id="pin-hint" className={clsx("mt-2 text-xs", touched && !pin ? "font-semibold text-amber-700" : "text-slate-500")}>
        {pin ? "Showing availability for this pin code." : touched ? "Please enter all 6 digits of your pin code." : input ? `${6 - digits.length} more digit(s)…` : "Type your pin code and we'll tell you instantly if it's open."}
      </p>

      {v && steps && (
        <div
          className={clsx("mt-3 rounded-lg border p-3 text-sm", tone === "green" && "border-emerald-300 bg-emerald-50 text-emerald-900",
            tone === "amber" && "border-amber-300 bg-amber-50 text-amber-900")}
          role="status"
        >
          <ol className="mb-3 grid gap-1 text-xs sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.k} className="rounded bg-white/70 p-1.5">
                <b>{s.k}. {s.label}</b> {s.ok === true ? "✓" : s.ok === false ? "✗" : "–"}<br /><span className="opacity-80">{s.detail}</span>
              </li>
            ))}
          </ol>

          {v.kind === "eligible" && (
            <>
              <p className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> Good news — pin {pin} is open!</p>
              <p className="mt-1">{v.info.city} · <b>{v.territory.slots}</b> opening(s) available</p>
              <Link className="btn mt-3" href={`/apply?pincode=${pin}&city=${encodeURIComponent(v.info.city)}`}>
                Proceed with Application <ArrowRight size={16} />
              </Link>
            </>
          )}
          {v.kind === "out_of_scope" && (
            <>
              <p className="flex items-center gap-2 font-bold"><Clock size={18} /> We&apos;re not in this area yet</p>
              <p className="mt-1">We&apos;re currently opening stores in selected Karnataka cities. Pin codes starting {ALLOWED} are the ones we&apos;re recruiting for (Bengaluru, Mysuru, Tumakuru, Mangaluru, Davanagere, Hubballi-Dharwad, Belagavi). Have another location in mind? Try its pin code.</p>
            </>
          )}
          {v.kind === "cannibalised" && (
            <>
              <p className="flex items-center gap-2 font-bold"><Clock size={18} /> We already have a store here</p>
              <p className="mt-1">We have a store serving pin {pin} and keep one store per pin code so every partner has a strong customer base. We&apos;d love to help you find a nearby pin code instead, so try another one above.</p>
            </>
          )}
          {(v.kind === "unmapped" || v.kind === "full") && (
            <>
              <p className="flex items-center gap-2 font-bold"><Clock size={18} /> {v.kind === "unmapped" ? "We're still confirming this area" : "This area is very popular right now"}</p>
              <p className="mt-1">
                {v.kind === "unmapped"
                  ? `Pin ${pin} is in ${v.info.city}, but we're still finalising which areas to open there. You're welcome to apply and we'll keep your application under review.`
                  : `${v.territory.city} has no openings at the moment. You're welcome to apply and we'll add you to our waitlist in case a spot frees up.`}
              </p>
              <Link className="btn-ghost mt-3" href={`/apply?pincode=${pin}&city=${encodeURIComponent(v.info.city)}`}>Apply anyway <ArrowRight size={14} /></Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
