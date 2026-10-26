import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { evaluate, simulate } from "../lib/engine";
import { parseWorkbook } from "../lib/parser";
import { answerQuery } from "../lib/explain";

import { checkPin } from "../lib/allowed";
const buf = readFileSync("scripts/fixtures/test-workbook.xlsx");
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
const { data, warnings } = parseWorkbook(ab);
console.log("parsed", data.applications.length, "apps,", data.territories.length, "territories,", data.stores.length, "stores; warnings:", warnings);
const res = evaluate(data);
for (const r of res) console.log(r.app.id.padEnd(8), String(r.score ?? "-").padStart(4), r.label);

const fail: string[] = [];
const L = (id: string) => res.find((r) => r.app.id === id)!.label;
const expect = (id: string, label: string) => { if (L(id) !== label) fail.push(`${id}: expected ${label}, got ${L(id)}`); };
expect("APP-003", "REJECTED (Cannibalisation)");
expect("APP-015", "REJECTED (Cannibalisation)");
expect("APP-019", "ON_HOLD (Out-of-Scope Pin Code)");
expect("APP-021", "ON_HOLD (Incomplete or Unidentifiable Data)");
expect("APP-007", "ON_HOLD (No Space Identified)");
expect("APP-009", "ON_HOLD (Upper Floor Blocker)");
expect("APP-005", "ON_HOLD (Upper Floor Blocker)");
expect("APP-002", "WAITLISTED (Pin Code Contention)");
expect("APP-001", "ACCEPTED (Selected)");
// hard constraint: never two accepted in same pin or on a store pin
const acc = res.filter((r) => r.status === "ACCEPTED");
if (new Set(acc.map((r) => r.app.pin)).size !== acc.length) fail.push("two accepted share a pin");
if (acc.some((r) => data.stores.some((s) => s.pin === r.app.pin))) fail.push("accepted on existing-store pin");

console.log("\n" + answerQuery("Why is APP-007 on hold?", res).text);
const d = simulate(data, "APP-012", { floor: "Ground", size: 450 })!;
console.log("\nAPP-012 mutation:", d.before.label, d.before.score, "->", d.after.label, d.after.score, "delta", d.scoreDelta, "side effects", d.sideEffects);

// tie-break ladder: same pin, identical profile, 4 vs 6 months launch (both 12 pts) -> faster launch wins
const base = data.applications.find((a) => a.id === "APP-008")!;
const tieDs = { ...data, applications: [
  { ...base, id: "APP-901", pin: "570008", launch: 6 },
  { ...base, id: "APP-902", pin: "570008", launch: 4 },
  { ...base, id: "APP-903", pin: "570008", launch: 4 },
] };
const tr = evaluate(tieDs);
console.log("\nTie test:", tr.map((r) => `${r.app.id}:${r.score}:${r.label}`).join(" | "));
if (tr[1].score !== tr[0].score) fail.push("tie test setup: scores differ");
if (tr[1].status !== "ACCEPTED") fail.push("tie: faster launch (then lower ID) should win");
if (tr[0].label !== "WAITLISTED (Pin Code Contention)" || tr[2].label !== "WAITLISTED (Pin Code Contention)") fail.push("tie: losers should be waitlisted");
console.log(tr[0].narrative.slice(0, 420)); console.log(tr[2].narrative.slice(0, 420));
if (!/tie-breaker/.test(tr[2].narrative) || !/lower application ID/.test(tr[2].narrative)) fail.push("narrative must cite ID fallback");

import { tieBreakLog } from "../lib/engine";
import { findContests } from "../lib/contention";
const r1 = res.find((r) => r.app.id === "APP-001")!, r9 = res.find((r) => r.app.id === "APP-009")!;
console.log("\nEconomics APP-001:", r1.economics, "\nEconomics APP-009 (upper floor):", r9.economics);
const r11 = res.find((r) => r.app.id === "APP-011")!;
if (r11.economics!.paybackMonths == null || r11.economics!.paybackMonths < 6 || r11.economics!.paybackMonths > 18) fail.push(`APP-011 (mall unit, Tier 2, ₹21L) should pay back within 6–18 months, got ${r11.economics!.paybackMonths}`);
if (!r9.economics!.risk) fail.push("APP-009 (upper floor, 320 sq ft) should be flagged as payback risk (>18 mo)");
const rk = (r: typeof r1) => ({ app: r.app, score: r.score! });
const lg = tieBreakLog(rk(r1), rk(res.find((r) => r.app.id === "APP-002")!));
console.log("Tie log:", lg.summary);
console.log("Contests:", findContests(res).map((c) => `${c.title} [${c.contenders.map((x) => x.app.id)}]`));
if (!findContests(res).length) fail.push("expected contests in sample data");

import { fbAffinity } from "../lib/engine";
for (const [b, lvl] of [["Ice cream distributor", "high"], ["Cafe & bakery owner", "high"], ["Grocery kirana", "medium"], ["IT consultant", "low"], ["Farming", "low"]] as const) if (fbAffinity(b).level !== lvl) fail.push(`affinity ${b}: expected ${lvl}`);
const r5 = res.find((r) => r.app.id === "APP-005")!, r17 = res.find((r) => r.app.id === "APP-017")!;
if (!r5.requirements.some((q) => q.includes("Scoop Master"))) fail.push("APP-005 (IT consultant) must need Scoop Master certification");
if (res.find((r) => r.app.id === "APP-001")!.requirements.length) fail.push("APP-001 (cafe & bakery) should have no certification requirement");
console.log("Economics APP-001:", r1.economics!.diagnostic, "\nEconomics APP-017:", r17.economics!.diagnostic);
console.log("APP-009 bottleneck[0]:", r9.bottlenecks[0]?.issue);
if (!/upper floor/i.test(r9.bottlenecks[0]?.issue ?? "")) fail.push("APP-009 upper-floor blocker should be listed first");
// the brief's example: one hold, several reasons named together (upper floor AND insufficient Tier 2 capital)
const multi = evaluate({ ...data, applications: [{ ...data.applications.find((a) => a.id === "APP-008")!, id: "APP-950", pin: "570008", floor: "First floor", investment: 10 }] })[0];
console.log("Multi-reason:", multi.narrative.slice(0, 330));
if (!/upper floor/i.test(multi.narrative) || !/Tier 2/.test(multi.narrative) || multi.blockerCount !== 2) fail.push("hold narrative must name both the upper floor and the capital shortfall");

const a22 = data.applications.find((a) => a.id === "APP-022")!;
if (a22.pin !== "590010" || a22.floor !== "Not known" || a22.size !== 0) fail.push(`sanitizer: APP-022 expected pin 590010 / floor Not known / size 0, got ${a22.pin} / ${a22.floor} / ${a22.size}`);
const rep2 = parseWorkbook(ab).report;
if (rep2.contradictionsFlagged < 1 || rep2.pinsReformatted < 1) fail.push("sanitizer report should log the contradiction and the reformatted pin");
const dm = simulate(data, "APP-012", { floor: "Ground", size: 450 })!;
console.log("Cascade:", JSON.stringify(dm.cascade));
if (!dm.cascade.some((c) => c.promotedAppId === "APP-012" && c.displacedAppId === "APP-013" && c.territoryId === "TER-04")) fail.push("cascade should show APP-012 promoted / APP-013 displaced in TER-04");

const r3 = res.find((r) => r.app.id === "APP-015")!;
console.log("APP-015 alternatives:", JSON.stringify(r3.alternatives), "\nnext:", r3.nextAction.slice(0, 160));
if (!r3.alternatives.length || r3.alternatives.some((a) => a.pin === "590001" || data.stores.some((s) => s.pin === a.pin))) fail.push("APP-015 should get uncovered, store-free alternative pins");
if (res.some((r) => !r.nextAction)) fail.push("every application needs a nextAction");

import { assess } from "../lib/rubric";
const A = (id: string) => assess(res.find((r) => r.app.id === id)!);
const lights = Object.fromEntries(res.map((r) => [r.app.id, assess(r).light]));
console.log("Lights:", JSON.stringify(lights));
for (const id of ["APP-003", "APP-015", "APP-019", "APP-007", "APP-005", "APP-009"]) if (A(id).light !== (id === "APP-019" ? "red" : "red")) fail.push(`${id} should be red`);
if (A("APP-021").light !== "orange") fail.push("APP-021 (incomplete data) should be orange, not rated");
if (A("APP-001").light === "red") fail.push("APP-001 should not be red");
for (const r of res) { const x = assess(r); if (!x.reasons.length) fail.push(`${r.app.id} has no rubric reason`); if (x.light === "green" && (r.score ?? 0) < 75) fail.push(`${r.app.id} green below 75`); }
if (!res.some((r) => assess(r).light === "green")) fail.push("expected at least one green in the sample");

if (fail.length) { console.error("\nFAIL:\n" + fail.join("\n")); process.exit(1); }
console.log("\nALL ENGINE CHECKS PASSED");
