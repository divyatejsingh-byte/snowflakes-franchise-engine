import * as XLSX from "xlsx";
import { APP_HEADERS, SAMPLE_APPS, SAMPLE_STORES, SAMPLE_TERRITORIES, STORE_HEADERS, TERR_HEADERS } from "./fixtures";
import { parseWorkbook } from "../lib/parser";
import { evaluate } from "../lib/engine";

const fail: string[] = [];
const toBuf = (wb: XLSX.WorkBook, type: "xlsx" | "csv" = "xlsx") => {
  const out = XLSX.write(wb, { type: "array", bookType: type }) as ArrayBuffer;
  return out;
};
const sheet = (rows: unknown[][]) => XLSX.utils.aoa_to_sheet(rows);
const wbOf = (sheets: [string, unknown[][]][]) => { const wb = XLSX.utils.book_new(); for (const [n, r] of sheets) XLSX.utils.book_append_sheet(wb, sheet(r), n); return wb; };

// baseline result from the canonical layout
const base = parseWorkbook(toBuf(wbOf([["Applications", [APP_HEADERS, ...SAMPLE_APPS]], ["Territories", [TERR_HEADERS, ...SAMPLE_TERRITORIES]], ["Existing stores", [STORE_HEADERS, ...SAMPLE_STORES]]])));
const baseLabels = new Map(evaluate(base.data).map((r) => [r.app.id, r.label]));
const same = (name: string, buf: ArrayBuffer, opts: { expectApps?: number } = {}) => {
  try {
    const { data, warnings } = parseWorkbook(buf);
    const res = evaluate(data);
    const n = opts.expectApps ?? base.data.applications.length;
    if (data.applications.length !== n) fail.push(`${name}: expected ${n} applications, got ${data.applications.length}`);
    if (data.territories.length !== base.data.territories.length) fail.push(`${name}: expected ${base.data.territories.length} territories, got ${data.territories.length}`);
    if (data.stores.length !== base.data.stores.length) fail.push(`${name}: expected ${base.data.stores.length} stores, got ${data.stores.length}`);
    const diffs = res.filter((r) => baseLabels.get(r.app.id) && baseLabels.get(r.app.id) !== r.label).map((r) => `${r.app.id}: ${baseLabels.get(r.app.id)} -> ${r.label}`);
    if (diffs.length) fail.push(`${name}: decisions differ from the canonical layout: ${diffs.slice(0, 4).join("; ")}`);
    console.log(`ok  ${name} (${data.applications.length} apps, ${data.territories.length} terr, ${data.stores.length} stores)${warnings.length ? " warnings: " + warnings.length : ""}`);
  } catch (e) { fail.push(`${name}: threw ${(e as Error).message}`); }
};

// 1. different sheet names and a shuffled order
same("custom sheet names, shuffled order", toBuf(wbOf([["Zones", [TERR_HEADERS, ...SAMPLE_TERRITORIES]], ["Outlets", [STORE_HEADERS, ...SAMPLE_STORES]], ["Candidates", [APP_HEADERS, ...SAMPLE_APPS]]])));

// 2. applications split across two sheets
const half = Math.ceil(SAMPLE_APPS.length / 2);
same("applications split over two sheets", toBuf(wbOf([["North", [APP_HEADERS, ...SAMPLE_APPS.slice(0, half)]], ["South", [APP_HEADERS, ...SAMPLE_APPS.slice(half)]], ["Territories", [TERR_HEADERS, ...SAMPLE_TERRITORIES]]])));

// 3. everything stacked on one sheet with titles and blank lines
same("all tables on one sheet with titles", toBuf(wbOf([["Data", [["Franchise screening pack — Q4"], [], ["APPLICATIONS"], APP_HEADERS, ...SAMPLE_APPS, [], [], ["TERRITORIES (Sheet 2)"], TERR_HEADERS, ...SAMPLE_TERRITORIES, [], ["EXISTING STORES"], STORE_HEADERS, ...SAMPLE_STORES, [], ["Total applications", SAMPLE_APPS.length]]]])));

// 4. title rows above headers + repeated header row mid-table
same("title rows and repeated header", toBuf(wbOf([["Applications", [["Ops Hackathon"], ["Prepared by HR"], [], APP_HEADERS, ...SAMPLE_APPS.slice(0, 8), APP_HEADERS, ...SAMPLE_APPS.slice(8)]], ["Territories", [TERR_HEADERS, ...SAMPLE_TERRITORIES]]])));

// 5. renamed columns, separate City / State / Pin columns, numbers stored as numbers
{
  const hdr = ["Applicant ID", "Full Name", "City", "State", "Pin", "Budget (₹ lakh)", "Years of retail experience", "Occupation", "Premises", "Area (sq ft)", "Level", "Timeline (months)", "Language", "Remarks"];
  const rows = SAMPLE_APPS.map((r) => {
    const loc = String(r[2]).split("·").map((s) => s.trim());
    const num = (v: unknown) => (/^\d+(\.\d+)?$/.test(String(v)) ? Number(v) : v);
    const only = loc.length === 1; // a row that only has a pin
    return [r[0], r[1], only ? "" : loc[0], only ? "" : loc[1] ?? "Karnataka", num(only ? loc[0] : loc[2] ?? ""), num(r[3]), num(r[4]), r[5], r[6], num(r[7]), r[8], num(r[9]), r[10], r[11]];
  });
  same("renamed columns + split location + numeric cells", toBuf(wbOf([["Sheet1", [hdr, ...rows]], ["Sheet2", [TERR_HEADERS, ...SAMPLE_TERRITORIES]]])));
}

// 6. territories with different header words
same("territory header synonyms", toBuf(wbOf([["Applications", [APP_HEADERS, ...SAMPLE_APPS]], ["Areas", [["Territory", "City · State", "Pin codes", "Tier", "Slots", "Priority"], ...SAMPLE_TERRITORIES]]])));

// 7. CSV (applications only: territories absent -> everything on hold, but it must parse, not crash)
{
  const csv = XLSX.utils.sheet_to_csv(sheet([APP_HEADERS, ...SAMPLE_APPS]));
  const b = new TextEncoder().encode(csv);
  const { data } = parseWorkbook(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  if (data.applications.length !== SAMPLE_APPS.length) fail.push(`csv: expected ${SAMPLE_APPS.length} apps, got ${data.applications.length}`);
  else console.log("ok  csv applications");
}

// 8. duplicate and blank IDs are flagged, never merged or dropped
{
  const rows = [...SAMPLE_APPS.slice(0, 3), SAMPLE_APPS[0], [...SAMPLE_APPS[3]].map((v, i) => (i === 0 ? "" : v))];
  const { data, report } = parseWorkbook(toBuf(wbOf([["Applications", [APP_HEADERS, ...rows]], ["Territories", [TERR_HEADERS, ...SAMPLE_TERRITORIES]]])));
  const ids = data.applications.map((a) => a.id);
  if (new Set(ids).size !== ids.length) fail.push("duplicate ids: ids must be unique after parsing: " + ids.join(","));
  if (ids.length !== 5) fail.push(`duplicate ids: expected 5 records kept, got ${ids.length}`);
  if (!report.notices.some((n) => /more than once/.test(n.message))) fail.push("duplicate ids: no notice raised");
  if (!report.notices.some((n) => /ID is blank/.test(n.message))) fail.push("blank id: no notice raised");
  console.log("ok  duplicate / blank ids:", ids.join(", "));
}

// 9. Excel formats that would break naive parsing: pin stored as number with currency format on investment
{
  const ws = sheet([APP_HEADERS, ...SAMPLE_APPS.slice(0, 2).map((r) => [...r])]);
  ws["D2"] = { t: "n", v: 25, z: '"₹"#,##0.00' };
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Applications"); XLSX.utils.book_append_sheet(wb, sheet([TERR_HEADERS, ...SAMPLE_TERRITORIES]), "Territories");
  const { data } = parseWorkbook(toBuf(wb));
  if (data.applications[0].investment !== 25) fail.push(`currency-formatted cell: expected investment 25, got ${data.applications[0].investment}`);
  else console.log("ok  currency-formatted number cell read as 25");
}

// 10. garbage in -> a clear error, no crash
for (const [name, bytes] of [["empty", new Uint8Array(0)], ["pdf-ish", new TextEncoder().encode("%PDF-1.4 \u0000\u0001 binary")]] as const) {
  try {
    const { data, warnings } = parseWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    console.log(`ok  ${name}: handled without crash (${data.applications.length} apps, ${warnings.length} warnings)`);
  } catch (e) { console.log(`ok  ${name}: clear error -> ${(e as Error).message}`); }
}

if (fail.length) { console.error("\nFAIL:\n" + fail.join("\n")); process.exit(1); }
console.log("\nALL PARSER CHECKS PASSED");
