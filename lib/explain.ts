import type { Application, Result, StatusKind } from "./types";

export interface Answer {
  kind: "app" | "list" | "help";
  title: string;
  text: string;
  result?: Result;
  list?: Result[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Plain-language auditor: resolves "Why is APP-007 on hold?" style questions against live engine results. */
export function answerQuery(q: string, results: Result[]): Answer {
  const text = q.trim();
  if (!results.length) return { kind: "help", title: "No data loaded", text: "No applications are loaded yet, so there is nothing to explain. Upload a workbook on the Upload tab (or wait for candidate submissions) and ask again." };
  if (!text) return { kind: "help", title: "Ask a question", text: 'Try "Why is [application ID] on hold?"' };

  const idMatch = text.match(/app[\s_-]*0*(\d+)/i) || text.match(/\b0*(\d{1,4})\b/);
  if (idMatch) {
    const n = parseInt(idMatch[1], 10);
    const r =
      results.find((x) => norm(x.app.id) === norm(`app${String(n).padStart(3, "0")}`)) ||
      results.find((x) => parseInt(x.app.id.replace(/\D/g, ""), 10) === n && /app/i.test(text));
    const byName = !r ? results.find((x) => x.app.name && text.toLowerCase().includes(x.app.name.toLowerCase())) : undefined;
    const hit = r || byName;
    if (hit) return { kind: "app", title: `${hit.app.id} · ${hit.app.name}`, text: hit.narrative, result: hit };
    return { kind: "help", title: "Not found", text: `No application matching "${idMatch[0]}" exists in the loaded data.` };
  }
  const byName = results.find((x) => x.app.name.length > 3 && text.toLowerCase().includes(x.app.name.toLowerCase()));
  if (byName) return { kind: "app", title: `${byName.app.id} · ${byName.app.name}`, text: byName.narrative, result: byName };

  const t = text.toLowerCase();
  const want: StatusKind | null = /hold/.test(t) ? "ON_HOLD" : /wait/.test(t) ? "WAITLISTED" : /reject|cannibal/.test(t) ? "REJECTED" : /accept|approved|select/.test(t) ? "ACCEPTED" : null;
  if (want) {
    const list = results.filter((r) => r.status === want);
    return {
      kind: "list",
      title: `${list.length} application(s) — ${want.replace("_", " ")}`,
      text: list.map((r) => `${r.app.id} (${r.reason})`).join(", ") || "None.",
      list,
    };
  }
  const onTopic = /app-?\d|applic|status|on hold|waitlist|reject|accept|score|territor|slot|\bpin\b|\bstores?\b|payback|floor|launch|cannibal|bottleneck/i.test(t);
  if (!onTopic) return { kind: "help", title: "Sorry, I can't help with that one", text: "Aw, I wish I could help with that one! 🍦 It's outside what I can answer. I can explain any application's decision (try “Why is [application ID] on hold?”), list applications by status, or recalculate a change like “[application ID] has now found a ground-floor space of 450 sq ft”." };
  return { kind: "help", title: "I didn't catch an application", text: 'Mention an application ID, e.g. "Why is [application ID] on hold?", or ask "which applications are waitlisted?".' };
}

/** Detects "APP-012 has now found a ground-floor space of 450 sq ft" style state changes. */
export function parseMutation(q: string): { id: string; patch: Partial<Application> } | null {
  const t = q.trim();
  if (/^(why|what|how|which|who|show|list|explain)\b/i.test(t) || t.endsWith("?")) return null;
  if (!/\b(found|now|has|have|updated?|set|change[sd]?|moved?|got|secured|raised|increase[sd]?|=|to)\b/i.test(t)) return null;
  const id = t.match(/app[\s_-]*0*(\d+)/i);
  if (!id) return null;
  const patch: Partial<Application> = {};
  const low = t.toLowerCase();
  if (/ground/.test(low)) patch.floor = "Ground";
  else if (/\bmall\b/.test(low)) patch.floor = "Mall unit";
  else if (/(first|second|third|upper|\d(st|nd|rd|th))[\s-]*floor/.test(low)) patch.floor = "Upper";
  const sz = low.match(/(\d{2,5})\s*(sq\.?\s*ft|sqft|square)/);
  if (sz) patch.size = parseInt(sz[1], 10);
  if (/\bowned\b|\bown (the )?(space|shop|property)/.test(low)) patch.space = "Owned";
  else if (/\brent(ed)?\b|\bleas(e|ed)\b/.test(low)) patch.space = "Rented";
  const inv = low.match(/(?:invest\w*|capital)[^\d]{0,20}(\d+(?:\.\d+)?)/) || low.match(/₹\s*(\d+(?:\.\d+)?)\s*(?:l|lakh)/);
  if (inv) patch.investment = parseFloat(inv[1]);
  const lm = low.match(/(?:launch\w*[^\d]{0,15})(\d+)\s*month/) || low.match(/(\d+)\s*months?\s*(?:to launch|launch)/);
  if (lm) patch.launch = parseInt(lm[1], 10);
  const ex = low.match(/(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:years?|yrs?)/);
  if (ex) patch.experience = parseFloat(ex[1]);
  const pin = low.match(/\bpin(?:\s*code)?[^\d]{0,10}(\d{6})\b/);
  if (pin) patch.pin = pin[1];
  if (!Object.keys(patch).length) return null;
  return { id: `APP-${id[1].padStart(3, "0")}`, patch };
}

/** Sanity ranges for chat-driven edits. Anything outside is refused (nothing is changed) rather than clamped or guessed. */
export function patchProblem(patch: Partial<Application>): string | null {
  const bad = (label: string, lo: number, hi: number, unit: string) => `${label} must be between ${lo} and ${hi} ${unit}`;
  if (patch.size != null && (patch.size < 50 || patch.size > 5000)) return bad("Space size", 50, 5000, "sq ft");
  if (patch.investment != null && (patch.investment < 1 || patch.investment > 5000)) return bad("Investment", 1, 5000, "lakh");
  if (patch.launch != null && (patch.launch < 0 || patch.launch > 60)) return bad("Launch time", 0, 60, "months");
  if (patch.experience != null && (patch.experience < 0 || patch.experience > 60)) return bad("Experience", 0, 60, "years");
  if (patch.pin != null && !/^\d{6}$/.test(patch.pin)) return "Pin code must be exactly 6 digits";
  return null;
}
