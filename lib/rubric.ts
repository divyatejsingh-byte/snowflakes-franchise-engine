import { TIER_BENCHMARK, floorOf } from "./engine";
import type { Result } from "./types";

/**
 * The AI only RECOMMENDS. It rates each applicant against the written rubric and shows exactly why;
 * a human admin records the actual decision (see ReviewPanel).
 *   green  = most qualified: passes every gate and scores 75+ out of 100
 *   orange = borderline: passes the gates with 50–74, or cannot be rated until data is provided / the area is confirmed
 *   red    = not qualified: fails a hard rule or gate, or scores under 50
 */
export type Light = "green" | "orange" | "red";

export interface PillarLine { name: string; pts: number; max: number; detail: string; rule: string; level: "strong" | "ok" | "weak" }
export interface Assessment {
  light: Light;
  label: string;
  headline: string;
  reasons: string[]; // the exact rubric reasons behind the colour
  strengths: string[];
  weaknesses: string[];
  pillars: PillarLine[];
  suggested: Suggested; // what the AI recommends the reviewer records
  suggestedLabel: string;
}
export type Suggested = "ACCEPTED" | "ON_HOLD" | "WAITLISTED" | "REJECTED";

export const LIGHT_LABEL: Record<Light, string> = { green: "Green · most qualified", orange: "Orange · borderline", red: "Red · not qualified" };

const level = (pts: number, max: number): PillarLine["level"] => (pts / max >= 0.8 ? "strong" : pts / max >= 0.6 ? "ok" : "weak");

export function assess(r: Result): Assessment {
  const a = r.app;
  const bd = r.breakdown;
  const pillars: PillarLine[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (bd) {
    const tier = r.prefix?.tier ?? 2;
    const bench = TIER_BENCHMARK[tier];
    const ratio = (a.investment ?? 0) / bench;
    const fl = floorOf(a.floor);
    pillars.push(
      { name: "Launch Speed", pts: bd.launch.pts, max: 25, detail: bd.launch.detail, level: level(bd.launch.pts, 25), rule: "Rubric: ≤2 months = 25, 3 = 18, 4–6 = 10, over 6 = 3." },
      { name: "Capital Depth", pts: bd.capital.pts, max: 25, detail: `₹${a.investment}L is ${ratio.toFixed(2)}× the Tier ${tier} benchmark of ₹${bench}L`, level: level(bd.capital.pts, 25), rule: "Rubric: ≥1.5× = 25, ≥1.2× = 18, ≥1.0× = 12, ≥0.8× = 6, below 0.8× = 0 and on hold." },
      { name: "Retail Experience", pts: bd.experience.pts, max: 25, detail: bd.experience.detail, level: level(bd.experience.pts, 25), rule: "Rubric: years ≥5 = 15, 3–4 = 11, 1–2 = 6, 0 = 2; plus business: food/dairy = 10, general retail = 6, other = 4." },
      { name: "Real Estate Quality", pts: bd.realEstate.pts, max: 25, detail: bd.realEstate.detail, level: level(bd.realEstate.pts, 25), rule: "Rubric: floor Ground 15, Mall unit 11, Upper 3 (on hold), unknown 0; size 250–450 sq ft = 10, 451–600 = 7, over 600 = 5, under 250 = 0." },
    );
    for (const p of pillars) {
      if (p.level === "strong") strengths.push(`${p.name} ${p.pts}/${p.max}: ${p.detail}.`);
      else if (p.level === "weak") weaknesses.push(`${p.name} only ${p.pts}/${p.max}: ${p.detail}. ${p.rule}`);
    }
    if (bd.experience.parts.affinity === "high") strengths.push(`Food-and-beverage / dairy background (${a.business}), the most relevant for a scoop parlour.`);
    if (bd.experience.parts.affinity === "low") weaknesses.push("Business background is not food-related: the 5-day Cold-Chain & Scoop Master certification becomes mandatory before opening.");
    if (fl === "Ground") strengths.push("Ground-floor space: the rubric's top floor score.");
    if (ratio >= 1.2) strengths.push(`Capital cushion of ${ratio.toFixed(2)}× the tier benchmark.`);
    if (ratio >= 0.8 && ratio < 1.0) weaknesses.push(`Capital is below the benchmark (${ratio.toFixed(2)}×): borderline capital.`);
    if (a.size != null && a.size > 600) weaknesses.push(`${a.size} sq ft is above 600: extra rent without extra sales (rubric: 5/10).`);
  }
  if (r.economics?.risk) weaknesses.push(`Projected payback of ${r.economics.paybackMonths ?? "never"} months is above the 18-month limit: high operational cash-flow risk.`);

  // exact reasons for the colour
  const gate = r.status === "REJECTED" || r.status === "ON_HOLD";
  const gateReasons = gate ? r.bottlenecks.slice(0, r.blockerCount ?? 1).map((b) => b.issue) : [];
  const score = r.score;
  let light: Light;
  const reasons: string[] = [];
  let headline: string;

  if (r.reason === "Incomplete or Unidentifiable Data") {
    light = "orange"; reasons.push(...gateReasons.map((g) => `Cannot be rated: ${g}.`));
    headline = "Cannot be rated yet: required data is incomplete or unidentifiable. Nothing has been guessed.";
  } else if (r.reason === "Unmapped Territory") {
    light = "orange"; reasons.push(...gateReasons);
    headline = "Borderline: the pin is valid but its territory isn't defined yet, so it can't be placed.";
  } else if (gate) {
    light = "red"; reasons.push(...gateReasons.map((g) => `Fails a rubric gate: ${g}.`));
    headline = r.status === "REJECTED" ? "Not qualified: breaks the one-store-per-pin rule." : `Not qualified: ${r.reason.toLowerCase()}.`;
  } else if (score != null && score >= 75) {
    light = "green"; reasons.push(`Passes every gate and scores ${score}/100 (green needs 75 or more).`);
    headline = `Most qualified: ${score}/100 with no failed gates.`;
  } else if (score != null && score >= 50) {
    light = "orange"; reasons.push(`Passes every gate but scores ${score}/100 (orange is 50–74; 75 needed for green).`);
    headline = `Borderline: ${score}/100, passes the gates but is not strong.`;
  } else {
    light = "red"; reasons.push(`Scores ${score ?? 0}/100, below the 50 needed to be considered.`);
    headline = `Not qualified: score ${score ?? 0}/100.`;
  }
  if (!gate && (r.status === "WAITLISTED" || r.status === "ACCEPTED")) {
    if (r.status === "WAITLISTED") reasons.push(r.label.includes("Pin") ? `Qualified, but another applicant ranks ahead for pin ${a.pin} (one store per pin).` : `Qualified, but territory slots are full: ranked #${r.territoryRank} of ${r.territoryContenders}.`);
    else reasons.push(`Ranks #${r.territoryRank} of ${r.territoryContenders} pin-winners for ${r.territory?.slots} slot(s) in ${r.territory?.city}.`);
  }
  // a qualified-slot applicant whose score is under the rubric floor is suggested for rejection, never silently accepted
  const belowFloor = light === "red" && !gate;
  const suggested: Suggested = belowFloor ? "REJECTED" : r.status;
  const suggestedLabel = belowFloor ? "REJECTED (Below Minimum Score)" : r.label;
  if (belowFloor) reasons.push("A slot is available, but the rubric score is under 50, so rejection is suggested; a human may still override.");
  return { light, label: LIGHT_LABEL[light], headline, reasons, strengths, weaknesses, pillars, suggested, suggestedLabel };
}
