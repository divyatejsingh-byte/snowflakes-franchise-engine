import { prefixOf } from "./allowed";
import { fallbackCoords, haversineKm } from "./geo";
import { unitEconomics } from "./economics";
import type {
  AltPin, Application, Breakdown, Dataset, Floor, Issue, Onboarding, Ownership, Result, StatusKind, Territory,
} from "./types";

export const TIER_BENCHMARK: Record<number, number> = { 1: 30, 2: 20, 3: 15 };
/** Ice-cream parlour domain affinity of the applicant's current/past business. */
export const FB_HIGH = ["ice cream", "icecream", "ice-cream", "gelato", "cafe", "café", "bakery", "dessert", "qsr", "food", "restaurant", "dairy", "beverage", "tea", "coffee", "juice", "sweet", "kulfi", "confection", "catering", "hotel"];
export const FB_MEDIUM = ["fmcg", "grocery", "supermarket", "retail", "general store", "kirana", "provision", "mart"];
export const CERT_REQUIREMENT = "Must complete the mandatory 5-day Cold-Chain & Scoop Master certification before opening";
export const IDEAL_SQFT = "250–450 sq ft";

export function fbAffinity(business: string): { level: "high" | "medium" | "low"; hit?: string } {
  const b = (business || "").toLowerCase();
  const h = FB_HIGH.find((k) => b.includes(k));
  if (h) return { level: "high", hit: h };
  const m = FB_MEDIUM.find((k) => b.includes(k));
  return m ? { level: "medium", hit: m } : { level: "low" };
}
const PRIORITY_PTS = { High: 5, Medium: 3, Low: 1 } as const;

/* ---------- cleaning helpers ---------- */
export function padPin(v: unknown): string {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length < 6 ? digits.padStart(6, "0") : digits.slice(0, 6);
}
export const validPin = (p: string) => /^\d{6}$/.test(p);

export type SpaceKind = "owned" | "rented" | "identified" | "none" | "unknown";
/** none = the applicant says there is no space yet; unknown = blank or unreadable (incomplete data, never assumed). */
export function spaceKind(raw: string): SpaceKind {
  const s = (raw || "").trim().toLowerCase();
  if (!s) return "unknown";
  if (/not\s*(yet\s*)?(identified|found|available|decided)|^(none|no|nil|n\/?a|na)\b|no space/.test(s)) return "none";
  if (/\bown/.test(s)) return "owned";
  if (/rent|lease|hire/.test(s)) return "rented";
  if (/^identified|found|secured/.test(s)) return "identified";
  return "unknown";
}
export function ownershipOf(raw: string): Ownership {
  const k = spaceKind(raw);
  return k === "owned" ? "Owned" : k === "rented" ? "Rented" : k === "identified" ? "Identified" : "Unidentified";
}

/** Required values that are missing or unreadable. These block a decision: the engine holds the application instead of guessing. */
export function blockingGaps(app: Application): string[] {
  const g: string[] = [];
  if (app.investment == null) g.push("investment capacity is missing or not a plain number");
  if (app.experience == null) g.push("retail experience is missing or not a plain number");
  if (app.launch == null) g.push("target launch is missing or not a plain number");
  if (spaceKind(app.space) === "unknown") g.push("space available is missing or not one of Owned / Rented / Not yet identified");
  return g;
}
/** Non-blocking gaps: the decision still runs, but the affected points are not awarded and the gap is shown. */
export function softGaps(app: Application): string[] {
  const g: string[] = [];
  const k = spaceKind(app.space);
  if (k === "owned" || k === "rented" || k === "identified") {
    if (app.size == null || app.size <= 0) g.push("space size was not provided, so no size-fit points are awarded");
    if (floorOf(app.floor) === "Unknown" && !/not\s*known|unknown|n\/?a/i.test(app.floor)) g.push("the floor was blank or unrecognised, so no floor points are awarded");
  }
  if (!/kannada|english|hindi/i.test(app.language)) g.push("preferred language was not provided, so the training language is to be confirmed");
  return g;
}
export function floorOf(raw: string): Floor {
  const s = (raw || "").toLowerCase();
  if (/ground|\bgf\b|g\/f|street/.test(s)) return "Ground";
  if (/mall/.test(s)) return "Mall unit";
  if (/upper|first|second|third|\d(st|nd|rd|th)|floor|basement|terrace|mezz/.test(s) || /^[1-9]\d?$/.test(s.trim())) return "Upper";
  return "Unknown";
}

/* ---------- scoring: four equal pillars, 25 pts (25%) each ---------- */
export const PILLARS = ["Launch Speed", "Capital Depth", "Retail Experience", "Real Estate Quality"] as const;
const FLOOR_RANK: Record<Floor, number> = { Ground: 3, "Mall unit": 2, Upper: 1, Unknown: 0 };

export function scoreApplication(app: Application, tier: 1 | 2 | 3): Breakdown {
  // Pillar 1 — Launch Speed
  const lm = app.launch ?? 99;
  const launchPts = lm <= 2 ? 25 : lm <= 3 ? 18 : lm <= 6 ? 10 : 3;

  // Pillar 2 — Capital Depth (relative to city-tier benchmark)
  const bench = TIER_BENCHMARK[tier];
  const inv = app.investment ?? 0;
  const R = inv / bench;
  const cap = R >= 1.5 ? 25 : R >= 1.2 ? 18 : R >= 1.0 ? 12 : R >= 0.8 ? 6 : 0;

  // Pillar 3 — Retail Experience: years (15) + business relevance (10)
  const yrs = app.experience ?? 0;
  const yPts = yrs >= 5 ? 15 : yrs >= 3 ? 11 : yrs >= 1 ? 6 : 2;
  const aff = fbAffinity(app.business);
  const kwPts = aff.level === "high" ? 10 : aff.level === "medium" ? 6 : 4;

  // Pillar 4 — Real Estate Quality: floor/frontage (15) + size fit (10, ideal 250–450 sq ft for a scoop shop)
  const fl = floorOf(app.floor);
  const flPts = fl === "Ground" ? 15 : fl === "Mall unit" ? 11 : fl === "Upper" ? 3 : 0;
  const sz = app.size ?? 0;
  // ideal 250–450; 451–600 acceptable; >600 pays unnecessary rent; <250 too cramped for cabinets + queue
  const szPts = sz >= 250 && sz <= 450 ? 10 : sz > 450 && sz <= 600 ? 7 : sz > 600 ? 5 : 0;

  const experience = yPts + kwPts;
  const realEstate = flPts + szPts;
  return {
    launch: {
      pts: launchPts, max: 25,
      detail: app.launch == null ? "Launch target not given" : `${app.launch} month(s) to launch`,
    },
    capital: {
      pts: cap, max: 25,
      detail: `₹${inv}L vs Tier ${tier} benchmark ₹${bench}L (ratio ${R.toFixed(2)})`,
    },
    experience: {
      pts: experience, max: 25,
      detail: `${app.experience ?? 0} yrs (${yPts}/15) · ${aff.level === "high" ? `F&B / dairy background ("${aff.hit}")` : aff.level === "medium" ? `general retail ("${aff.hit}")` : "unrelated trade"} (${kwPts}/10)`,
      parts: { years: yPts, keyword: kwPts, affinity: aff.level },
    },
    realEstate: {
      pts: realEstate, max: 25,
      detail: `${fl} floor (${flPts}/15) · ${sz ? sz + " sq ft" : "size unknown"} (${szPts}/10)`,
      parts: { floor: flPts, area: szPts },
    },
    total: launchPts + cap + experience + realEstate,
  };
}

/** Plain-English one-liner covering all four pillars. */
export function pillarLine(bd: Breakdown): string {
  return `Launch Speed ${bd.launch.pts}/25 (${bd.launch.detail}), Capital Depth ${bd.capital.pts}/25 (${bd.capital.detail}), Retail Experience ${bd.experience.pts}/25 (${bd.experience.detail}), Real Estate Quality ${bd.realEstate.pts}/25 (${bd.realEstate.detail})`;
}

/* ---------- tie-breaking ---------- */
export interface Rankable { app: Application; score: number }
const idCmp = (a: Application, b: Application) => a.id.localeCompare(b.id, undefined, { numeric: true });

/** Ordered tie-break ladder: composite score, launch, capital, experience, floor, application ID. */
const fmtFloor = (x: Rankable) => floorOf(x.app.floor);
const LADDER: { name: string; label: string; show: (x: Rankable) => string; cmp: (a: Rankable, b: Rankable) => number; why: (w: Rankable, l: Rankable) => string }[] = [
  { name: "score", label: "Composite score", show: (x) => `${x.score}/100`, cmp: (a, b) => b.score - a.score, why: (w, l) => `higher composite score (${w.score} vs ${l.score})` },
  { name: "launch", label: "Faster launch", show: (x) => `${x.app.launch ?? "n/a"} months`, cmp: (a, b) => (a.app.launch ?? 99) - (b.app.launch ?? 99), why: (w, l) => `faster launch (${w.app.launch ?? "n/a"} vs ${l.app.launch ?? "n/a"} months)` },
  { name: "capital", label: "Higher capital", show: (x) => `₹${x.app.investment ?? 0}L`, cmp: (a, b) => (b.app.investment ?? 0) - (a.app.investment ?? 0), why: (w, l) => `higher capital (₹${w.app.investment ?? 0}L vs ₹${l.app.investment ?? 0}L)` },
  { name: "experience", label: "More retail experience", show: (x) => `${x.app.experience ?? 0} yrs`, cmp: (a, b) => (b.app.experience ?? 0) - (a.app.experience ?? 0), why: (w, l) => `more retail experience (${w.app.experience ?? 0} vs ${l.app.experience ?? 0} yrs)` },
  { name: "floor", label: "Better floor location", show: fmtFloor, cmp: (a, b) => FLOOR_RANK[floorOf(b.app.floor)] - FLOOR_RANK[floorOf(a.app.floor)], why: (w, l) => `better floor location (${floorOf(w.app.floor)} vs ${floorOf(l.app.floor)})` },
  { name: "id", label: "Lower application ID", show: (x) => x.app.id, cmp: (a, b) => idCmp(a.app, b.app), why: (w, l) => `lower application ID (${w.app.id} before ${l.app.id})` },
];

export interface TieStep { label: string; a: string; b: string; outcome: "A" | "B" | "tie" }

/** Walks the deterministic ranking ladder for two applicants and records each rung until one decides. */
export function tieBreakLog(a: Rankable, b: Rankable): { winner: "A" | "B"; steps: TieStep[]; summary: string } {
  const steps: TieStep[] = [];
  for (const st of LADDER) {
    const c = st.cmp(a, b);
    steps.push({ label: st.label, a: st.show(a), b: st.show(b), outcome: c < 0 ? "A" : c > 0 ? "B" : "tie" });
    if (c) {
      const winner = c < 0 ? "A" : "B";
      const [w, l] = winner === "A" ? [a, b] : [b, a];
      return { winner, steps, summary: `${w.app.name} (${w.app.id}) ranks ahead of ${l.app.name} (${l.app.id}) on ${st.why(w, l)}${st.name === "score" ? "" : " — composite scores were level, so the tie-breaker ladder decided"}.` };
    }
  }
  return { winner: "A", steps, summary: "Identical on every criterion." };
}

export const compareRank = (a: Rankable, b: Rankable) => cmpContenders(a, b);

const cmpContenders = (a: Rankable, b: Rankable) => {
  for (const step of LADDER) { const c = step.cmp(a, b); if (c) return c; }
  return 0;
};

/** For a winner/loser pair: which rung decided it. `tied` = composite scores were equal and a tie-breaker applied. */
export function decidingFactor(w: Rankable, l: Rankable): { tied: boolean; text: string } {
  for (const step of LADDER) {
    if (step.cmp(w, l) !== 0) return { tied: step.name !== "score", text: step.why(w, l) };
  }
  return { tied: true, text: "identical on every criterion" };
}

function pillarGaps(w: Breakdown, l: Breakdown): string {
  const rows: [string, number][] = [
    ["Launch Speed", w.launch.pts - l.launch.pts], ["Capital Depth", w.capital.pts - l.capital.pts],
    ["Retail Experience", w.experience.pts - l.experience.pts], ["Real Estate Quality", w.realEstate.pts - l.realEstate.pts],
  ];
  return rows.map(([n, d]) => (d === 0 ? `level on ${n}` : `${d > 0 ? "ahead" : "behind"} by ${Math.abs(d)} on ${n}`)).join(", ");
}

/* ---------- onboarding ---------- */
export function buildOnboarding(app: Application, city: string): Onboarding {
  const l = (app.language || "").toLowerCase();
  const language: Onboarding["language"] = l.includes("kann") ? "Kannada" : l.includes("hind") ? "Hindi" : "English";
  const yrs = app.experience ?? 0;
  const [track, rampWeeks] =
    yrs >= 5 ? ["Fast-track (experienced operator)", 4] : yrs >= 1 ? ["Standard ramp-up", 8] : ["Extended ramp-up with buddy store", 12];
  const m: { week: string; title: string }[] = [
    { week: "Week 1", title: `Brand, systems & POS orientation (${language})` },
    { week: "Week 2", title: yrs >= 5 ? "Store design sign-off & vendor onboarding" : "Retail fundamentals: merchandising, billing, inventory" },
  ];
  if (rampWeeks >= 8) m.push({ week: "Weeks 3–6", title: `Hands-on training at nearest company store near ${city}` });
  if (rampWeeks >= 12) m.push({ week: "Weeks 7–10", title: "Buddy-store shadowing with a mentor franchisee" });
  m.push({ week: `Week ${rampWeeks - 1}`, title: "Staff hiring, soft launch & compliance audit" });
  m.push({ week: `Week ${rampWeeks}`, title: "Grand opening & 30-day hyper-care" });
  const launchWeeks = app.launch == null ? null : app.launch * 4.3;
  const timelineNote =
    launchWeeks == null
      ? `Ramp-up needs ~${rampWeeks} weeks.`
      : launchWeeks >= rampWeeks
        ? `Ramp-up (${rampWeeks} wks) fits the ${app.launch}-month launch target.`
        : `Ramp-up (${rampWeeks} wks) exceeds the ${app.launch}-month target — launch will slip to ~${Math.ceil(rampWeeks / 4.3)} months.`;
  return {
    language,
    languageNote:
      language === "Kannada"
        ? "Kannada-language modules & Kannada-speaking trainer"
        : language === "Hindi"
          ? "Hindi-language modules & Hindi-speaking trainer"
          : "English-language modules",
    track, rampWeeks, milestones: m, timelineNote,
  };
}

/* ---------- main evaluation ---------- */
interface Cand extends Rankable { t: Territory }

/** Everything that keeps an otherwise valid application from competing for a slot. First item decides the headline reason. */
function blockersOf(app: Application, tier: 1 | 2 | 3): { reason: string; issue: string; fix: string }[] {
  const out: { reason: string; issue: string; fix: string }[] = [];
  if (spaceKind(app.space) === "none") out.push({ reason: "No Space Identified", issue: "no store space has been identified yet (not owned or rented)", fix: "secure a 250–450 sq ft ground-floor unit with high-street frontage (owned or rented) and update the application" });
  if (floorOf(app.floor) === "Upper") out.push({ reason: "Upper Floor Blocker", issue: "the space is on an upper floor (non-mall) — ice cream is an impulse purchase and rarely works as a destination there", fix: "look for a ground-floor high-street unit, or a mall food-court kiosk, and update the application" });
  const bench = TIER_BENCHMARK[tier];
  if ((app.investment ?? 0) / bench < 0.8) out.push({ reason: "Capital Below Threshold", issue: `investment of ₹${app.investment ?? 0}L is under 80% of the Tier ${tier} benchmark (₹${bench}L)`, fix: `raise investable capital to at least ₹${(bench * 0.8).toFixed(0)}L (₹${bench}L to score full capital points)` });
  return out;
}

export const INCOMPLETE = "Incomplete or Unidentifiable Data";

function mk(status: StatusKind, reason: string) {
  return { status, reason, label: `${status} (${reason})` };
}

export function evaluate(ds: Dataset): Result[] {
  const pinToTerritory = new Map<string, Territory>();
  for (const t of ds.territories) for (const p of t.pins) if (!pinToTerritory.has(p)) pinToTerritory.set(p, t);
  const storeByPin = new Map(ds.stores.map((s) => [s.pin, s]));

  const out = new Map<string, Result>();
  const eligible: Cand[] = [];

  for (const app of ds.applications) {
    const pf = prefixOf(app.pin); // Check A: prefix -> city + tier
    const t = pf ? pinToTerritory.get(app.pin) : undefined;
    const gaps = blockingGaps(app);
    const bd = pf && !gaps.length ? scoreApplication(app, pf.tier) : null; // never score invented values
    const base = {
      app, territory: t, prefix: pf, economics: pf && !gaps.length ? unitEconomics(app, pf.tier) : null, breakdown: bd, score: bd ? bd.total : null,
      bottlenecks: [] as Issue[], narrative: "",
      openPinsInTerritory: [] as string[], requirements: [] as string[], blockerCount: undefined as number | undefined, alternatives: [] as AltPin[], nextAction: "",
    };
    if (bd?.experience.parts.affinity === "low") base.requirements.push(CERT_REQUIREMENT);
    if (app.power === "No") base.requirements.push("Arrange a 3-phase commercial connection (10–15 kW) and 24/7 DG/UPS backup before fit-out starts");
    else if (app.power === "Unsure") base.requirements.push("Confirm 3-phase power (10–15 kW) and DG/UPS backup with the landlord/electrician — required for the cold chain");
    const store = pf ? storeByPin.get(app.pin) : undefined;
    let m = mk("ON_HOLD", INCOMPLETE);
    const incomplete = (list: string[]) => {
      m = mk("ON_HOLD", INCOMPLETE);
      for (const x of list) base.bottlenecks.push({ issue: x, fix: "Provide a valid value for this field; the decision is then re-run. Nothing has been guessed." });
      base.blockerCount = list.length;
    };
    if (!validPin(app.pin)) {
      incomplete([`pin code is missing or not a valid 6-digit number (as submitted: "${app.location || "blank"}")`, ...gaps]);
    } else if (!pf) {
      m = mk("ON_HOLD", "Out-of-Scope Pin Code");
      base.bottlenecks.push({ issue: `Pin ${app.pin} starts with ${app.pin.slice(0, 3)}, which is not one of the 7 allowed prefixes (560, 570, 572, 575, 577, 580, 590).`, fix: "Propose a store location whose pin code starts with an allowed prefix (Bengaluru, Mysuru, Tumakuru, Mangaluru, Davanagere, Hubballi-Dharwad or Belagavi)." });
    } else if (store) { // Check B: cannibalisation
      m = mk("REJECTED", "Cannibalisation");
      base.bottlenecks.push({ issue: `Pin ${app.pin} already hosts store ${store.id} (${store.city}, opened ${store.opened}). The brand never opens two stores in one pin code.`, fix: "Propose a different pin code that has no existing store." });
    } else if (!t) { // Check C: territory
      m = mk("ON_HOLD", "Unmapped Territory");
      base.bottlenecks.push({ issue: `Pin ${app.pin} (${pf.city}) is a valid prefix but is not listed under "Pin codes covered" in any territory.`, fix: "Choose a pin listed in a territory, or park until the territory list is extended to this pin." });
    } else if (gaps.length) {
      incomplete(gaps);
    } else if (blockersOf(app, pf.tier).length) {
      // Qualification gate: collect EVERY blocker so the explanation names all of them (e.g. upper floor AND capital shortfall).
      const bl = blockersOf(app, pf.tier);
      m = mk("ON_HOLD", bl[0].reason);
      for (const b of bl) base.bottlenecks.push({ issue: b.issue, fix: b.fix });
      base.blockerCount = bl.length;
    } else {
      m = mk("WAITLISTED", "Pending Allocation"); // provisional, always overwritten below
      eligible.push({ app, t, score: bd!.total });
    }
    out.set(app.id, { ...base, ...m });
  }

  // 1. Pin code exclusivity: only the top scorer per pin advances
  const byPin = new Map<string, Cand[]>();
  for (const c of eligible) byPin.set(c.app.pin, [...(byPin.get(c.app.pin) || []), c]);
  const pinWinners: Cand[] = [];
  for (const group of byPin.values()) {
    group.sort(cmpContenders);
    pinWinners.push(group[0]);
    for (const loser of group.slice(1)) {
      Object.assign(out.get(loser.app.id)!, mk("WAITLISTED", "Pin Code Contention"), { pinWinnerId: group[0].app.id });
    }
  }

  // 2. Territory slot allocation
  const byTerr = new Map<string, Cand[]>();
  for (const c of pinWinners) byTerr.set(c.t.id, [...(byTerr.get(c.t.id) || []), c]);
  for (const [tid, group] of byTerr) {
    group.sort(cmpContenders);
    const slots = ds.territories.find((t) => t.id === tid)!.slots;
    group.forEach((c, i) => {
      const r = out.get(c.app.id)!;
      r.territoryRank = i + 1;
      r.territoryContenders = group.length;
      if (i < slots) {
        Object.assign(r, mk("ACCEPTED", "Selected"));
        r.onboarding = buildOnboarding(c.app, c.t.city);
      } else Object.assign(r, mk("WAITLISTED", "Territory Capacity"));
    });
  }

  // 3. open pins, narratives, bottlenecks
  const taken = new Set([...ds.stores.map((s) => s.pin), ...pinWinners.map((c) => c.app.pin)]);
  const cutoff = new Map<string, Result>();
  for (const r of out.values()) {
    if (r.status === "ACCEPTED" && r.territory) {
      const cur = cutoff.get(r.territory.id);
      if (!cur || cmpContenders({ app: cur.app, score: cur.score! }, { app: r.app, score: r.score! }) < 0) cutoff.set(r.territory.id, r);
    }
  }
  for (const r of out.values()) {
    if (r.territory) r.openPinsInTerritory = r.territory.pins.filter((p) => !taken.has(p));
    finalize(r, out, cutoff);
  }
  // 4. recovery: nearest uncovered pins with open slots, and the "what happens next" line for every application
  const filled = new Map<string, number>();
  for (const r of out.values()) if (r.status === "ACCEPTED" && r.territory) filled.set(r.territory.id, (filled.get(r.territory.id) ?? 0) + 1);
  for (const r of out.values()) {
    if (r.status === "REJECTED" || r.status === "WAITLISTED") {
      const city = r.prefix?.city;
      const me = fallbackCoords(r.app.pin, city ?? "");
      const alts: AltPin[] = [];
      for (const t of ds.territories) {
        const remaining = t.slots - (filled.get(t.id) ?? 0);
        if (remaining <= 0 || !city || !t.city.toLowerCase().startsWith(city.toLowerCase().split("-")[0])) continue;
        for (const p of t.pins) if (!taken.has(p) && p !== r.app.pin) alts.push({ pin: p, territoryId: t.id, city: t.city, remainingSlots: remaining, distanceKm: Math.round(haversineKm(me, fallbackCoords(p, t.city)) * 10) / 10 });
      }
      r.alternatives = alts.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);
    }
    r.nextAction = nextActionFor(r);
  }
  return ds.applications.map((a) => out.get(a.id)!);
}

function nextActionFor(r: Result): string {
  const alt = r.alternatives.length ? ` Closest alternatives: ${r.alternatives.map((a) => `${a.pin} (${a.territoryId}, ${a.remainingSlots} slot${a.remainingSlots > 1 ? "s" : ""})`).join(", ")}.` : "";
  switch (r.label) {
    case "ACCEPTED (Selected)":
      return `Move forward: issue the Letter of Intent, then run the 45-day launch roadmap — site sign-off & cold-chain audit (days 1–10), parlour fit-out (11–25), ${r.onboarding?.language ?? "English"} training (26–35), stock-in & soft launch (36–45).${r.requirements.length ? ` Conditions: ${r.requirements.join("; ")}.` : ""}`;
    case "WAITLISTED (Pin Code Contention)":
      return `Keep on the waitlist: promote automatically if ${r.pinWinnerId} drops out, or offer a different pin in ${r.prefix?.city}.${alt}`;
    case "WAITLISTED (Territory Capacity)":
      return `Hold in the queue for ${r.territory?.city}: promote when a slot opens or an accepted partner drops out.${alt || " No other open pins with free slots in this city right now."}`;
    case "REJECTED (Cannibalisation)":
      return `Do not proceed on pin ${r.app.pin} (an existing store operates there). Offer to re-route the partner to a nearby uncovered pin.${alt || " No uncovered pin with open slots in this city right now — park the lead."}`;
    default:
      return `Hold and ask the partner to resolve: ${r.bottlenecks[0]?.fix ?? "provide the missing information"}. Re-run the decision once updated.`;
  }
}

function weakSpots(r: Result): Issue[] {
  const bd = r.breakdown, a = r.app;
  if (!bd) return [];
  const o: Issue[] = softGaps(a).map((g) => ({ issue: `Incomplete data: ${g}.`, fix: "Provide this detail so it can be scored." }));
  if (floorOf(a.floor) === "Upper" && r.reason !== "Upper Floor Blocker") o.push({ issue: "Upper-floor (non-mall) site: ice cream is an impulse purchase and rarely works as a destination on an upper floor — an operational blocker.", fix: "Look for a ground-floor high-street unit, or a mall food-court kiosk." });
  if (a.power === "No") o.push({ issue: "No 3-phase power / DG backup: deep freezers need 10–15 kW and 24/7 backup to avoid melt-loss.", fix: "Arrange a 3-phase commercial connection and DG/UPS backup before fit-out." });
  if (bd.launch.pts < 18) o.push({ issue: `Launch Speed: ${bd.launch.detail} → ${bd.launch.pts}/25.`, fix: "Commit to launching within 2 months for the full 25 pts (3 months = 18)." });
  if (bd.capital.pts < 12) o.push({ issue: `Capital Depth: ${bd.capital.detail} → ${bd.capital.pts}/25.`, fix: "Raise capital to ≥1.0× the tier benchmark (≥1.5× for the full 25 pts)." });
  if (bd.experience.parts.years < 12 || bd.experience.parts.affinity !== "high") o.push({ issue: `Retail Experience: ${bd.experience.detail} → ${bd.experience.pts}/25.`, fix: bd.experience.parts.affinity === "low" ? "Add an experienced F&B / dairy co-operator; otherwise complete the 5-day Cold-Chain & Scoop Master certification." : "Add an experienced co-operator (≥5 yrs) or highlight cafe, bakery, dessert, dairy or QSR background." });
  if (bd.realEstate.pts < 20 && floorOf(a.floor) !== "Upper") o.push({ issue: `Real Estate Quality: ${bd.realEstate.detail} → ${bd.realEstate.pts}/25.`, fix: "Move to a ground-floor (or mall food-court) unit of 250–450 sq ft for the full 25 pts." });
  return o;
}

function finalize(r: Result, all: Map<string, Result>, cutoff: Map<string, Result>) {
  const a = r.app;
  const who = `${a.name} (${a.id})`;
  const sc = r.score != null ? `${r.score}/100` : "not scored";
  const pillars = r.breakdown ? ` Four equal pillars (25 pts each): ${pillarLine(r.breakdown)}.` : "";
  const alt = r.openPinsInTerritory.length ? ` Open pins in ${r.territory?.city}: ${r.openPinsInTerritory.slice(0, 6).join(", ")}.` : "";
  switch (r.label) {
    case "REJECTED (Cannibalisation)":
      r.narrative = `${who} is REJECTED: pin ${a.pin} already has an existing store. The brand never opens two stores in the same pin code, so this is an automatic rejection regardless of score (${sc}).${pillars}${alt}`;
      if (alt) r.bottlenecks[0].fix += alt;
      break;
    case "ON_HOLD (Incomplete or Unidentifiable Data)": {
      const list = r.bottlenecks.slice(0, r.blockerCount ?? r.bottlenecks.length).map((b, i, arr) => `${arr.length > 1 ? `(${i + 1}) ` : ""}${b.issue}`).join("; ");
      r.narrative = `${who} is ON HOLD because required data is incomplete or unidentifiable: ${list}. Nothing has been guessed or filled in, and no score is given. To move forward, provide valid values for these fields and the decision will be re-run.`;
      break;
    }
    case "ON_HOLD (Unmapped Territory)":
    case "ON_HOLD (Out-of-Scope Pin Code)":
      r.narrative = `${who} is ON HOLD (${r.reason}). ${r.bottlenecks[0]?.issue ?? ""} Remediation: ${r.bottlenecks[0]?.fix ?? ""}${r.breakdown ? ` Once resolved, the current inputs would score ${sc}.${pillars}` : ""}`;
      r.bottlenecks.push(...weakSpots(r).slice(0, 3));
      break;
    case "ON_HOLD (No Space Identified)":
    case "ON_HOLD (Upper Floor Blocker)":
    case "ON_HOLD (Capital Below Threshold)": {
      const k = r.blockerCount ?? 1;
      const bl = r.bottlenecks.slice(0, k);
      const list = bl.map((b, i) => `${k > 1 ? `(${i + 1}) ` : ""}${b.issue}`).join("; ");
      const fixes = bl.map((b, i) => `${k > 1 ? `(${i + 1}) ` : ""}${b.fix}`).join("; ");
      r.narrative = `${who} is ON HOLD because ${list}. To move forward: ${fixes}. Once resolved, the current inputs would score ${sc}.${pillars}`;
      r.bottlenecks.push(...weakSpots(r).slice(0, 3));
      break;
    }
    case "WAITLISTED (Pin Code Contention)": {
      const w = all.get(r.pinWinnerId!)!;
      const f = decidingFactor({ app: w.app, score: w.score! }, { app: a, score: r.score! });
      r.narrative = `${who} is WAITLISTED: only one applicant per pin code can advance, and pin ${a.pin} is contested. ${w.app.name} (${w.app.id}) wins it with ${w.score} vs ${r.score}. ${f.tied ? `Composite scores were equal, so the tie-breaker order (launch speed → capital → retail experience → floor → application ID) decided it: ${w.app.id} has the ${f.text}.` : `Pillar by pillar, ${w.app.id} is ${pillarGaps(w.breakdown!, r.breakdown!)}.`}${pillars} ${a.name} moves up only if ${w.app.id} drops out, or by applying with a different open pin.${alt}`;
      r.bottlenecks.push({ issue: `Outranked in pin ${a.pin} by ${w.app.id}: ${f.text}.`, fix: f.tied ? "Improve a tie-breaker factor (launch speed first, then capital) or switch to a different open pin." + alt : `Close the ${w.score! - r.score!}-pt gap or switch to a different open pin.${alt}` }, ...weakSpots(r).slice(0, 3));
      break;
    }
    case "WAITLISTED (Territory Capacity)": {
      const last = cutoff.get(r.territory!.id);
      const f = last ? decidingFactor({ app: last.app, score: last.score! }, { app: a, score: r.score! }) : null;
      r.narrative = `${who} won pin ${a.pin} but ranks #${r.territoryRank} of ${r.territoryContenders} pin-winners in ${r.territory!.city}, which has only ${r.territory!.slots} open slot(s). Score ${r.score}${last ? ` vs the last accepted applicant ${last.app.id} at ${last.score}` : ""}.${f ? (f.tied ? ` Scores were level, so the tie-breaker order decided: ${last!.app.id} has the ${f.text}.` : ` ${last!.app.id} leads on composite score (${last!.score} vs ${r.score}).`) : ""}${pillars} Waitlisted until a slot opens or someone above drops out.`;
      r.bottlenecks.push({ issue: `${r.territory!.city} has ${r.territory!.slots} open slot(s); ${a.name} is ranked #${r.territoryRank}.`, fix: last ? (f?.tied ? `Improve a tie-breaker factor versus ${last.app.id} (launch speed first, then capital).` : `Gain ${Math.max(1, last.score! - (r.score ?? 0))}+ points to overtake ${last.app.id}.`) : "Wait for a slot to be released." }, ...weakSpots(r).slice(0, 3));
      break;
    }
    case "ACCEPTED (Selected)":
      r.narrative = `${who} is ACCEPTED: composite score ${sc}, #${r.territoryRank} of ${r.territoryContenders} pin-winners in ${r.territory!.city} (${r.territory!.slots} slot(s)), and pin ${a.pin} is free of existing stores and rival applicants.${pillars}`;
      r.bottlenecks.push(...weakSpots(r).slice(0, 3));
      break;
  }
}

/* ---------- mutation / what-if ---------- */
export function applyPatch(a: Application, patch: Partial<Application>): Application {
  const next = { ...a, ...patch };
  if (patch.pin !== undefined) next.pin = padPin(patch.pin);
  // a found space is recorded as identified; whether it is owned or rented is NOT guessed (it stays unspecified)
  const gaveSpaceInfo = patch.floor !== undefined || patch.size !== undefined;
  if (gaveSpaceInfo && patch.space === undefined && spaceKind(next.space) === "none") next.space = "Identified (ownership not specified)";
  return next;
}

export interface Delta {
  before: Result;
  after: Result;
  patch: Partial<Application>;
  scoreDelta: number | null;
  statusChanged: boolean;
  sideEffects: { id: string; from: string; to: string }[];
  cascade: Cascade[];
}

/** One slot changing hands in a territory after a mutation. */
export interface Cascade { promotedAppId: string; displacedAppId: string | null; territoryId: string; slotNumber: number }

/** Domino displacement: who gained an ACCEPTED slot and who lost one, paired per territory. */
export function cascadeBetween(before: Result[], after: Result[]): Cascade[] {
  const out: Cascade[] = [];
  const terr = new Set(after.map((r) => r.territory?.id).filter(Boolean) as string[]);
  for (const tid of terr) {
    const prev = new Map(before.map((r) => [r.app.id, r]));
    const promoted = after.filter((r) => r.territory?.id === tid && r.status === "ACCEPTED" && prev.get(r.app.id)?.status !== "ACCEPTED").sort((x, y) => (x.territoryRank ?? 99) - (y.territoryRank ?? 99));
    const displaced = after.filter((r) => prev.get(r.app.id)?.status === "ACCEPTED" && prev.get(r.app.id)?.territory?.id === tid && r.status !== "ACCEPTED").sort((x, y) => (prev.get(y.app.id)!.territoryRank ?? 0) - (prev.get(x.app.id)!.territoryRank ?? 0));
    const n = Math.max(promoted.length, displaced.length);
    for (let i = 0; i < n; i++) {
      if (!promoted[i] && !displaced[i]) continue;
      out.push({ promotedAppId: promoted[i]?.app.id ?? "", displacedAppId: displaced[i]?.app.id ?? null, territoryId: tid, slotNumber: promoted[i]?.territoryRank ?? prev.get(displaced[i].app.id)?.territoryRank ?? 0 });
    }
  }
  return out.filter((c) => c.promotedAppId);
}

export function simulate(ds: Dataset, id: string, patch: Partial<Application>): Delta | null {
  const idx = ds.applications.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const before = evaluate(ds);
  const apps = ds.applications.slice();
  apps[idx] = applyPatch(apps[idx], patch);
  const after = evaluate({ ...ds, applications: apps });
  const b = before[idx], a = after[idx];
  return {
    before: b, after: a, patch,
    scoreDelta: b.score != null && a.score != null ? a.score - b.score : null,
    statusChanged: b.label !== a.label,
    sideEffects: after.flatMap((r, i) => (i !== idx && r.label !== before[i].label ? [{ id: r.app.id, from: before[i].label, to: r.label }] : [])),
    cascade: cascadeBetween(before, after),
  };
}

export function summarize(results: Result[]) {
  const c = { ACCEPTED: 0, ON_HOLD: 0, WAITLISTED: 0, REJECTED: 0 } as Record<StatusKind, number>;
  for (const r of results) c[r.status]++;
  return c;
}
