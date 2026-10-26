import { floorOf, spaceKind } from "./engine";
import type { Application } from "./types";

/**
 * Policy: never guess. Only lossless clean-ups are applied (trimming, a trailing ".0" on a pin). Anything else that
 * can't be read exactly is left blank and marked incomplete / unidentifiable, so the engine holds the application
 * and asks for the value instead of deciding on an invented one.
 */
export interface AuditNotice {
  id: string;
  kind: "reformatted" | "unidentifiable" | "missing" | "contradiction";
  message: string;
}

export interface IngestionReport {
  totalRows: number;
  cleanRecords: number; // rows with no missing, unidentifiable or contradictory data
  pinsReformatted: number;
  contradictionsFlagged: number;
  incompleteRecords: number; // rows with at least one missing or unidentifiable required value
  notices: AuditNotice[];
}

/** A pin is accepted only as exactly 6 digits (surrounding spaces or a trailing ".0" tolerated). Nothing is padded or cut. */
export function cleanPin(raw: string): { pin: string; reformatted: boolean } {
  const t = (raw ?? "").trim();
  const m = t.match(/^(\d{6})(\.0+)?$/);
  if (!m) return { pin: "", reformatted: false };
  return { pin: m[1], reformatted: raw !== m[1] };
}

export interface RawRow {
  app: Application;
  rawPin: string;
  rawInvestment: string;
  rawExperience: string;
  rawLaunch: string;
  rawSize: string;
}

const plain = (s: string) => /^\s*-?\d+(\.\d+)?\s*$/.test(s.replace(/,/g, ""));

export function sanitizeApplications(rows: RawRow[]): { apps: Application[]; report: IngestionReport } {
  const notices: AuditNotice[] = [];
  let pinsReformatted = 0, contradictionsFlagged = 0, incompleteRecords = 0, clean = 0;

  const apps = rows.map(({ app, rawPin, rawInvestment, rawExperience, rawLaunch, rawSize }) => {
    const a = { ...app };
    const before = notices.length;
    let incomplete = false, contradictory = false;
    const flag = (kind: AuditNotice["kind"], message: string) => { notices.push({ id: a.id, kind, message }); if (kind === "missing" || kind === "unidentifiable") incomplete = true; };

    // pin code
    const { pin, reformatted } = cleanPin(rawPin);
    a.pin = pin;
    if (!rawPin.trim()) flag("missing", "Pin code is blank — incomplete data.");
    else if (!pin) flag("unidentifiable", `Pin code "${rawPin.trim()}" is not a 6-digit number — unidentifiable (not padded or guessed).`);
    else if (reformatted) { pinsReformatted++; notices.push({ id: a.id, kind: "reformatted", message: `Pin "${rawPin}" tidied to ${pin} (whitespace / ".0" removed, no digits changed).` }); }

    // required numbers: blank = missing, anything that isn't a plain number = unidentifiable
    for (const [label, raw, val] of [["Investment capacity", rawInvestment, a.investment], ["Retail experience", rawExperience, a.experience], ["Target launch", rawLaunch, a.launch]] as const) {
      if (!raw.trim()) flag("missing", `${label} is blank — incomplete data.`);
      else if (val == null || !plain(raw)) flag("unidentifiable", `${label} "${raw.trim()}" is not a plain number — unidentifiable (left blank, not interpreted).`);
    }

    // space block
    const kind = spaceKind(a.space);
    if (kind === "unknown") flag(a.space.trim() ? "unidentifiable" : "missing", a.space.trim() ? `Space available "${a.space.trim()}" is not Owned / Rented / Not yet identified — unidentifiable.` : "Space available is blank — incomplete data.");
    if (kind === "owned" || kind === "rented" || kind === "identified") {
      if (!rawSize.trim()) flag("missing", "Space size is blank although a space is available — incomplete data (no size-fit points awarded).");
      else if (a.size == null || !plain(rawSize)) flag("unidentifiable", `Space size "${rawSize.trim()}" is not a plain number — unidentifiable (no size-fit points awarded).`);
      if (!a.floor.trim()) flag("missing", "Floor is blank although a space is available — incomplete data (no floor points awarded).");
      else if (floorOf(a.floor) === "Unknown" && !/not\s*known|unknown|n\/?a/i.test(a.floor)) flag("unidentifiable", `Floor "${a.floor.trim()}" is not Ground / Mall unit / Upper / Not known — unidentifiable.`);
    }
    if (kind === "none") {
      const hasFloor = !!a.floor.trim() && !/^(unknown|not known|n\/?a|-)$/i.test(a.floor.trim());
      if (hasFloor || (a.size ?? 0) > 0) {
        contradictory = true; contradictionsFlagged++;
        flag("contradiction", `Contradictory data: space is "${a.space.trim()}" but floor "${a.floor.trim() || "—"}" / ${a.size ?? 0} sq ft were given. Floor and size are disregarded (recorded as Not known / 0) and the record is flagged — please confirm with the applicant.`);
        a.floor = "Not known";
        a.size = 0;
      }
    }
    if (!/kannada|english|hindi/i.test(a.language)) flag(a.language.trim() ? "unidentifiable" : "missing", a.language.trim() ? `Preferred language "${a.language.trim()}" is not Kannada / English / Hindi — unidentifiable.` : "Preferred language is blank — incomplete data.");

    if (incomplete) incompleteRecords++;
    if (notices.length === before || (!incomplete && !contradictory)) clean++;
    return a;
  });

  return { apps, report: { totalRows: rows.length, cleanRecords: clean, pinsReformatted, contradictionsFlagged, incompleteRecords, notices } };
}
