import { compareRank } from "./engine";
import type { Result } from "./types";

export interface Contest {
  id: string;
  kind: "pin" | "territory";
  title: string;
  detail: string;
  contenders: Result[]; // best-ranked first
}

const rankable = (r: Result) => ({ app: r.app, score: r.score ?? 0 });
const byRank = (a: Result, b: Result) => compareRank(rankable(a), rankable(b));

/** Pin-code contests (2+ applicants on one pin) and territory slot contests (2+ pin-winners in one territory). */
export function findContests(results: Result[]): Contest[] {
  const live = results.filter((r) => r.breakdown && (r.status === "ACCEPTED" || r.status === "WAITLISTED"));
  const out: Contest[] = [];

  const byPin = new Map<string, Result[]>();
  for (const r of live) byPin.set(r.app.pin, [...(byPin.get(r.app.pin) || []), r]);
  for (const [pin, list] of byPin) {
    if (list.length < 2) continue;
    list.sort(byRank);
    out.push({ id: `pin-${pin}`, kind: "pin", title: `Pin ${pin} · ${list[0].prefix?.city ?? ""}`, detail: `${list.length} applicants, 1 store allowed per pin`, contenders: list });
  }

  const byTerr = new Map<string, Result[]>();
  for (const r of live) if (r.territoryRank != null && r.territory) byTerr.set(r.territory.id, [...(byTerr.get(r.territory.id) || []), r]);
  for (const [, list] of byTerr) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.territoryRank! - b.territoryRank!);
    const t = list[0].territory!;
    out.push({ id: `terr-${t.id}`, kind: "territory", title: `${t.city} slots (${t.id})`, detail: `${list.length} pin-winners for ${t.slots} open slot(s)`, contenders: list });
  }
  return out;
}

/** The applicant a waitlisted candidate lost to: the pin winner, or the last accepted applicant in the territory. */
export function opponentOf(r: Result, results: Result[]): Result | null {
  if (r.label === "WAITLISTED (Pin Code Contention)" && r.pinWinnerId) return results.find((x) => x.app.id === r.pinWinnerId) ?? null;
  if (r.label === "WAITLISTED (Territory Capacity)" && r.territory) {
    const acc = results.filter((x) => x.status === "ACCEPTED" && x.territory?.id === r.territory!.id).sort((a, b) => (b.territoryRank ?? 0) - (a.territoryRank ?? 0));
    return acc[0] ?? null;
  }
  return null;
}
