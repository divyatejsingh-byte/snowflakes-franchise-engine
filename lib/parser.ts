import * as XLSX from "xlsx";
import { FIXED_STORES } from "./sample";
import { cleanPin, sanitizeApplications, type IngestionReport } from "./sanitizer";
import type { Application, Dataset, Store, Territory } from "./types";

type Row = Record<string, string>;
type Kind = "apps" | "terr" | "stores";
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const str = (v: unknown) => String(v ?? "").trim();

/** A plain number only ("25", "1,200", "3.5"). Text such as "₹ 25 lakh" or "3 yrs" is NOT interpreted: it returns null (unidentifiable). */
export function num(v: unknown): number | null {
  const s = String(v ?? "").trim().replace(/,/g, "");
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
}

/* ---------------------------------------------------------------------------------------------------------------
   Layout-agnostic reading. Sheets are recognised by their COLUMN HEADERS, not by sheet name or position, so the
   Applications can be on any sheet(s) (even split across several), the Territories / Existing stores tables can be
   on any other sheet or stacked on the same one, and there may be title rows or blank lines in between.
   --------------------------------------------------------------------------------------------------------------- */
const SIGNATURES: Record<Kind, RegExp[]> = {
  apps: [
    /^(application|applicant|app)?(id|no|number|ref|reference)$|^applicationid|^appid|^applicantid/, /applicantname|^name$|^candidate|^fullname|^applicant$/,
    /investment|capital|budget/, /experience/, /business|occupation|background/, /^space|premises|^property/, /floor|level|storey/, /launch|timeline/, /language/, /^pin|postal|^zip|citystate/, /notes|remarks/,
  ],
  terr: [/^territory|^terr(id)?$/, /pincodescovered|pinscovered|^pins$|^pincodes$|^pinsincluded/, /slot|vacanc/, /tier/, /priority/, /^citystate$|^city$/],
  stores: [/^store(id|no|code)?$|^storeid/, /^pincode$|^pin$|^postal/, /opened|^year|^since|launched/, /^city$/],
};

function kindOfHeader(cells: string[]): Kind | null {
  const keys = cells.map(norm).filter((k) => k && k.length < 70);
  if (keys.length < 2) return null;
  const score = (k: Kind) => SIGNATURES[k].filter((re) => keys.some((c) => re.test(c))).length;
  const sa = score("apps"), st = score("terr"), ss = score("stores");
  const hasTerrKey = keys.some((c) => /^territory|^terr(id)?$|pincodescovered|pinscovered|slot|vacanc/.test(c));
  const hasStoreKey = keys.some((c) => /^store/.test(c));
  if (hasTerrKey && st >= 2 && st >= sa - 1) return "terr";
  if (hasStoreKey && ss >= 2 && sa < 4) return "stores";
  if (sa >= 3) return "apps";
  return null;
}

interface Table { kind: Kind; sheet: string; rows: Row[] }

function extractTables(wb: XLSX.WorkBook): Table[] {
  const tables: Table[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    // raw values (numbers stay numbers) so currency/number formats in Excel can't turn "25" into "₹25.00"
    const m = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "", blankrows: false });
    let cur: { kind: Kind; headers: string[]; rows: Row[] } | null = null;
    const flush = () => { if (cur) tables.push({ kind: cur.kind, sheet: name, rows: cur.rows }); cur = null; };
    for (const r of m) {
      const cells = (r as unknown[]).map((c) => str(c));
      const filled = cells.filter(Boolean).length;
      if (!filled) continue;
      const kind = kindOfHeader(cells);
      if (kind) { flush(); cur = { kind, headers: cells.map(norm), rows: [] }; continue; }
      if (!cur) continue;
      if (filled < 2) continue; // title / section / total lines between tables
      const o: Row = {};
      cur.headers.forEach((h, i) => { if (h && (!(h in o) || !o[h])) o[h] = cells[i] ?? ""; });
      cur.rows.push(o);
    }
    flush();
  }
  return tables;
}

/** Last-resort when no header could be recognised: treat the first non-empty row of the first sheet as the header. */
function fallbackApps(wb: XLSX.WorkBook): Row[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const m = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "", blankrows: false });
  if (m.length < 2) return [];
  const headers = (m[0] as unknown[]).map(norm);
  return m.slice(1).map((r) => { const o: Row = {}; headers.forEach((h, i) => { if (h && !o[h]) o[h] = str((r as unknown[])[i]); }); return o; });
}

/** Find a value by the first header matching any pattern (and none of the excludes). */
function pick(row: Row, pats: RegExp[], not?: RegExp): string {
  for (const p of pats) for (const k of Object.keys(row)) if ((!not || !not.test(k)) && p.test(k) && row[k] !== "") return row[k];
  return "";
}

function normPower(v: string): string | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (/^(y|yes|true|available|ok)/.test(s)) return "Yes";
  if (/^(n|no|false|not)/.test(s)) return "No";
  return "Unsure";
}

/** Splits "City · State · Pin code". The pin part is returned exactly as written (the sanitiser decides if it is usable). */
export function parseLocation(raw: string): { city: string; pinRaw: string } {
  const parts = raw.split(/[·•|,;]/).map((p) => p.trim()).filter(Boolean);
  const city = parts.find((p) => !/\d/.test(p) && !/^karnataka$/i.test(p)) || "";
  const pinPart = [...parts].reverse().find((p) => /\d/.test(p)) ?? "";
  return { city, pinRaw: pinPart };
}

/** Territory pins: exact 6-digit tokens (or 6-digit ranges). Anything else is skipped and reported, never repaired. */
function expandPins(raw: string, skipped: string[]): string[] {
  const out: string[] = [];
  for (const tok of raw.split(/[,;\s/]+/).filter(Boolean)) {
    const range = tok.match(/^(\d{6})[-–](\d{6})$/);
    if (range) {
      const a = +range[1], b = +range[2];
      if (b >= a && b - a <= 500) for (let p = a; p <= b; p++) out.push(String(p));
      else skipped.push(tok);
    } else if (/^\d{6}(\.0+)?$/.test(tok)) out.push(tok.slice(0, 6));
    else skipped.push(tok);
  }
  return Array.from(new Set(out));
}

export function parseWorkbook(buf: ArrayBuffer): { data: Dataset; warnings: string[]; report: IngestionReport } {
  const warnings: string[] = [];
  let wb: XLSX.WorkBook;
  try { wb = XLSX.read(buf, { type: "array" }); } catch { throw new Error("That file couldn't be opened as an Excel workbook (.xlsx / .xls / .csv)."); }
  if (!wb.SheetNames.length) throw new Error("The workbook has no sheets.");

  const tables = extractTables(wb);
  const of = (k: Kind) => tables.filter((t) => t.kind === k);
  let appRows = of("apps").flatMap((t) => t.rows);
  if (!appRows.length) {
    appRows = fallbackApps(wb);
    if (appRows.length) warnings.push("No recognisable Applications header was found; the first row of the first sheet was used as the header.");
  }
  const appSheets = Array.from(new Set(of("apps").map((t) => t.sheet)));
  if (appSheets.length > 1) warnings.push(`Applications were read from ${appSheets.length} sheets (${appSheets.join(", ")}) and combined.`);
  const terrRows = of("terr").flatMap((t) => t.rows);
  const storeRows = of("stores").flatMap((t) => t.rows);

  const parsedRows = appRows
    .map((r, i) => {
      const location = pick(r, [/citystatepin/, /location/, /^pincode$/, /^pin/]);
      const loc = parseLocation(location);
      const explicitPin = pick(r, [/^pincode$/, /^pin$/, /^pin/, /postal/, /^zip/]);
      const rawPin = explicitPin || loc.pinRaw;
      const app: Application = {
        id: pick(r, [/^applicationid/, /^appid/, /^applicantid/, /^(application|app)(no|number|ref)/, /^(ref|reference)/, /^id$/]) || `ROW-${i + 1}`,
        name: pick(r, [/applicantname/, /^name$/, /^candidate/, /^fullname/, /^applicant$/, /name/]) || "(unnamed applicant)",
        email: pick(r, [/email/, /^mail/]) || undefined,
        location,
        city: pick(r, [/^city$/, /^town$/]) || loc.city,
        pin: "", // set by the sanitiser from the raw text
        investment: num(pick(r, [/investment/, /capital/, /budget/])),
        experience: num(pick(r, [/experience/])),
        business: pick(r, [/business/, /occupation/, /background/, /profession/]),
        space: pick(r, [/spaceavailable/, /^space$/, /ownership/, /^premises/, /^property/], /size|sqft|area/),
        size: num(pick(r, [/spacesize/, /sqft/, /^size/, /carpet/, /area/])),
        floor: pick(r, [/floor/, /level/, /storey/]),
        launch: num(pick(r, [/targetlaunch/, /launch/, /timeline/, /months/])),
        language: pick(r, [/language/]),
        notes: pick(r, [/notes/, /remarks/, /comments/]),
        power: normPower(pick(r, [/3phase|threephase|power|dg|backup/])),
      };
      return { app, rawPin, rawInvestment: pick(r, [/investment/, /capital/, /budget/]), rawExperience: pick(r, [/experience/]), rawLaunch: pick(r, [/targetlaunch/, /launch/, /timeline/, /months/]), rawSize: pick(r, [/spacesize/, /sqft/, /^size/, /carpet/, /area/]) };
    })
    .filter(({ app: a, rawPin }) => a.name !== "(unnamed applicant)" || rawPin || !a.id.startsWith("ROW-"));
  const { apps: applications, report } = sanitizeApplications(parsedRows);

  // identity hygiene: a blank ID gets a row reference (for tracking only); a repeated ID is kept but renamed and flagged, never merged
  const seen = new Map<string, number>();
  for (const a of applications) {
    if (a.id.startsWith("ROW-")) { report.notices.push({ id: a.id, kind: "missing", message: "Application ID is blank — a row reference was assigned for tracking only." }); continue; }
    const n = (seen.get(a.id) ?? 0) + 1;
    seen.set(a.id, n);
    if (n > 1) {
      const was = a.id;
      a.id = `${was}-dup${n}`;
      report.notices.push({ id: a.id, kind: "contradiction", message: `Application ID ${was} appears more than once. This copy is kept as ${a.id} and flagged — please confirm which record is correct.` });
      report.contradictionsFlagged++;
      warnings.push(`Duplicate application ID ${was}.`);
    }
  }

  const skippedPins: string[] = [];
  const territories: Territory[] = terrRows
    .map((r, i): Territory => {
      const cs = pick(r, [/citystate/, /^city/, /^location/]);
      const tier = Number((pick(r, [/tier/]).match(/[123]/) ?? [])[0]) || null; // "Tier 2" -> 2
      const pr = pick(r, [/priority/]).toLowerCase();
      return {
        id: pick(r, [/^territoryid/, /^territory(no|code)?$/, /^terrid/, /^id$/]) || `T-${i + 1}`,
        city: cs.split(/[·•|,]/)[0].trim(),
        state: cs.split(/[·•|,]/)[1]?.trim() || "Karnataka",
        pins: expandPins(pick(r, [/pincodescovered/, /pinscovered/, /^pincodes$/, /^pins$/, /pincodes/, /pin/]), skippedPins),
        tier: (tier === 1 || tier === 2 ? tier : 3) as 1 | 2 | 3,
        slots: Math.max(0, Math.floor(num(pick(r, [/openslots/, /slots/, /vacanc/])) ?? 0)),
        priority: pr.startsWith("h") ? "High" : pr.startsWith("l") ? "Low" : "Medium",
      };
    })
    .filter((t) => t.pins.length > 0);

  const stores: Store[] = storeRows
    .map((r): Store => ({
      id: pick(r, [/^storeid/, /^store/, /^id$/]),
      city: pick(r, [/^city/]),
      pin: cleanPin(pick(r, [/^pincode$/, /^pin/, /postal/])).pin,
      opened: pick(r, [/opened/, /year/, /since/]),
    }))
    .filter((s) => s.pin);

  const tIds = new Set<string>();
  for (const t of territories) { if (tIds.has(t.id)) warnings.push(`Duplicate territory ID ${t.id}.`); tIds.add(t.id); }
  if (skippedPins.length) warnings.push(`Territories sheet: ${skippedPins.length} pin value(s) were not 6-digit numbers and were skipped, not repaired: ${skippedPins.slice(0, 6).join(", ")}.`);
  if (!applications.length) warnings.push("No applications were found in the workbook.");
  if (!territories.length) warnings.push("No territories table was found in the workbook — every application will be ON_HOLD (Unmapped Territory).");
  if (!stores.length) {
    // The brief fixes Sheet 3 (all 10 current stores) and judges only upload Sheets 1 and 2, so fall back to the built-in list.
    for (const r of FIXED_STORES) stores.push({ id: String(r[0]), city: String(r[1]), pin: String(r[2]), opened: String(r[3]) });
    warnings.push("Existing stores table not found in the upload — using the brand's fixed list of 10 stores (ST-01 to ST-10).");
  }
  return { data: { applications, territories, stores }, warnings, report };
}
