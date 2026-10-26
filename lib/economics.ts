import type { Application } from "./types";
import { floorOf } from "./engine";

/**
 * Ice-cream parlour unit economics (assumptions explicit and adjustable):
 *   orders/day      = Ground 130 · Mall 110 · Upper 35 (× cramped-space factor under 250 sq ft)
 *   monthly revenue = orders/day × ₹180 AOV × 30
 *   gross profit    = revenue × 68%
 *   fixed costs     = ₹32,000 cold-chain utility + rent (sq ft × tier ₹/sq ft) + staff (tier)
 *   variable costs  = 25% of revenue (royalty, wastage, marketing)
 *   net cash flow   = gross profit − fixed − variable ;  payback = investment capacity ÷ net cash flow
 *   target payback 10–14 months; above 18 months = High Operational Cash Flow Risk
 */
export const AOV = 180;
export const GROSS_MARGIN = 0.68;
export const UTILITY_BURN = 32000; // ₹/month: deep freezers, dipping cabinets, display freezers
export const OTHER_OPEX = 0.25; // royalty, wastage & marketing as share of revenue
export const SCOOPS_BY_FLOOR: Record<string, number> = { Ground: 130, "Mall unit": 110, Upper: 35, Unknown: 35 };
export const RENT_PER_SQFT: Record<1 | 2 | 3, number> = { 1: 110, 2: 60, 3: 40 }; // ₹ per sq ft per month
export const STAFF_COST: Record<1 | 2 | 3, number> = { 1: 62000, 2: 56000, 3: 48000 }; // ₹/month
export const FOOTFALL: Record<string, number> = { Ground: 1.0, "Mall unit": 110 / 130, Upper: 35 / 130, Unknown: 35 / 130 };
export const PAYBACK_TARGET = "10–14";
export const PAYBACK_RISK_MONTHS = 18;
export const RISK_LABEL = "High Operational Cash Flow Risk";

export interface Economics {
  monthlyRevenueLakh: number;
  netCashFlowLakh: number;
  paybackMonths: number | null; // null when it can't be computed
  band: "on-target" | "watch" | "risk" | "n/a";
  risk: boolean; // payback beyond 18 months (or never)
  footfall: number;
  scoopsPerDay: number;
  breakEvenScoops: number | null;
  fixedCosts: number; // ₹/month
  contributionPerDailyScoop: number; // ₹/month of net contribution per (order/day)
  utilityBurn: number;
  assumption: string;
  diagnostic: string;
}

export function unitEconomics(app: Application, tier: 1 | 2 | 3): Economics {
  const floor = floorOf(app.floor);
  const footfall = FOOTFALL[floor];
  const size = app.size ?? 0;
  const spaceFactor = size > 0 && size < 250 ? Math.max(0.6, size / 250) : 1; // too cramped for cabinets + queue
  const scoops = SCOOPS_BY_FLOOR[floor] * spaceFactor;
  const revenue = scoops * AOV * 30;
  const rent = size * RENT_PER_SQFT[tier];
  const fixed = UTILITY_BURN + rent + STAFF_COST[tier];
  const contribution = AOV * 30 * (GROSS_MARGIN - OTHER_OPEX); // ₹/month per (order/day)
  const net = scoops * contribution - fixed;
  const inv = (app.investment ?? 0) * 100000;
  const payback = net > 0 && inv > 0 ? inv / net : null;
  const breakEven = size > 0 ? fixed / contribution : null;
  const hasData = size > 0 && inv > 0;
  const risk = hasData ? payback == null || payback > PAYBACK_RISK_MONTHS : false;
  const band: Economics["band"] = !hasData ? "n/a" : payback == null || payback > PAYBACK_RISK_MONTHS ? "risk" : payback > 14 ? "watch" : "on-target";
  const pb = payback == null ? null : Math.round(payback * 10) / 10;
  const why = floor === "Upper" ? " due to the upper-floor footfall penalty (35 vs 130 orders/day)" : floor === "Mall unit" ? " with steady mall food-court volume (110 orders/day)" : "";
  return {
    monthlyRevenueLakh: Math.round((revenue / 100000) * 100) / 100,
    netCashFlowLakh: Math.round((net / 100000) * 100) / 100,
    paybackMonths: pb, band, risk, footfall,
    scoopsPerDay: Math.round(scoops),
    breakEvenScoops: breakEven == null ? null : Math.round(breakEven),
    fixedCosts: Math.round(fixed), contributionPerDailyScoop: Math.round(contribution), utilityBurn: UTILITY_BURN,
    assumption: `${Math.round(scoops)} orders/day (${floor.toLowerCase()}) × ₹${AOV} AOV × 30, ${GROSS_MARGIN * 100}% gross margin, less ₹${UTILITY_BURN.toLocaleString("en-IN")} cold-chain electricity, ₹${Math.round(rent).toLocaleString("en-IN")} rent, ₹${STAFF_COST[tier].toLocaleString("en-IN")} staff and ${OTHER_OPEX * 100}% royalty/wastage/marketing`,
    diagnostic: hasData
      ? `Projected payback: ${pb ?? "never"} months (target ${PAYBACK_TARGET})${why}. Break-even at ${breakEven == null ? "—" : Math.round(breakEven)} orders/day vs ${Math.round(scoops)} modelled; ${GROSS_MARGIN * 100}% gross margin absorbs the ₹${UTILITY_BURN.toLocaleString("en-IN")}/mo cold-chain utility burn.${risk ? ` ${RISK_LABEL}.` : ""}`
      : "Add investment and shop size to see projected payback.",
  };
}

/** Monthly net cash flow at a given daily order volume (for the break-even curve). */
export function netAtVolume(e: Economics, ordersPerDay: number) {
  return ordersPerDay * e.contributionPerDailyScoop - e.fixedCosts;
}
