import * as XLSX from "xlsx";
import { prefixOf } from "./allowed";
import { assess, type Light } from "./rubric";
import type { Decision } from "./store";
import type { Dataset, Result } from "./types";

export const EXPORT_FILENAME = "Franchise_Applications_Evaluated_Export.xlsx";

/** The 14 columns of Sheet 1 (City · State · Pin code split into three), then the engine's outputs. */
export const SHEET1_COLUMNS = [
  "Application ID", "Applicant name", "City", "State", "Pin code", "Investment capacity (₹ lakh)", "Retail experience (years)",
  "Current / past business", "Space available", "Space size (sq ft)", "Floor", "Target launch (months)", "Preferred language", "Notes from applicant",
] as const;
/** "Status" is the AI's suggestion; the last three columns hold the human reviewer's own call. */
export const OUTPUT_COLUMNS = ["Score", "Status", "Territory ID", "Payback Period (months)", "Bottlenecks", "AI Rating", "Human Decision", "Decision Note"] as const;
export const COLUMNS = [...SHEET1_COLUMNS, ...OUTPUT_COLUMNS] as const;
export type ColumnName = (typeof COLUMNS)[number];
export type GridRow = Record<ColumnName, string | number> & { _status: Result["status"]; _risk: boolean; _light: Light };

export function buildRows(results: Result[], decisions: Record<string, Decision> = {}): GridRow[] {
  return results.map((r) => {
    const as = assess(r);
    const light = as.light;
    const d = decisions[r.app.id];
    const a = r.app;
    const bottlenecks = r.bottlenecks.length ? r.bottlenecks.map((b) => b.issue).join(" | ") : "None";
    return {
      "Application ID": a.id,
      "Applicant name": a.name,
      "City": r.prefix?.city || a.city,
      "State": "Karnataka",
      "Pin code": a.pin,
      "Investment capacity (₹ lakh)": a.investment ?? "",
      "Retail experience (years)": a.experience ?? "",
      "Current / past business": a.business,
      "Space available": a.space,
      "Space size (sq ft)": a.size ?? "",
      "Floor": a.floor,
      "Target launch (months)": a.launch ?? "",
      "Preferred language": a.language,
      "Notes from applicant": a.notes,
      "Score": r.score ?? "",
      "Status": as.suggestedLabel,
      "Territory ID": r.territory?.id ?? "Unmapped",
      "Payback Period (months)": r.economics?.paybackMonths ?? "",
      "Bottlenecks": bottlenecks,
      "AI Rating": light === "green" ? "Green (most qualified)" : light === "orange" ? "Orange (borderline)" : "Red (not qualified)",
      "Human Decision": d ? `${d.outcome.replace("_", " ")} (${d.by})` : "Awaiting review",
      "Decision Note": d?.note ?? "",
      _status: as.suggested,
      _risk: !!r.economics?.risk,
      _light: light,
    };
  });
}

export function territorySummary(ds: Dataset, results: Result[]) {
  return ds.territories.map((t) => {
    const filled = results.filter((r) => r.status === "ACCEPTED" && r.territory?.id === t.id).length;
    return {
      "Territory ID": t.id,
      "City": t.city,
      "City Tier": `Tier ${prefixOf(t.pins[0] ?? "")?.tier ?? t.tier}`,
      "Priority": t.priority,
      "Open Slots": t.slots,
      "Slots Filled": filled,
      "Remaining Capacity": Math.max(0, t.slots - filled),
    };
  });
}

/** Builds the workbook from the live (possibly mutated) dataset and triggers a browser download. */
export function exportToExcel(ds: Dataset, results: Result[], decisions: Record<string, Decision> = {}) {
  const rows = buildRows(results, decisions).map((r) => {
    const o: Record<string, string | number> = {};
    COLUMNS.forEach((c) => (o[c] = r[c]));
    return o;
  });
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(rows, { header: [...COLUMNS] });
  ws1["!cols"] = COLUMNS.map((c) => ({ wch: c === "Bottlenecks" ? 70 : c === "Status" || c === "Decision Note" ? 36 : c.startsWith("Notes") || c.startsWith("Current") ? 30 : 16 }));
  ws1["!freeze"] = { xSplit: 0, ySplit: 1 } as never;
  XLSX.utils.book_append_sheet(wb, ws1, "Evaluated Applications");
  const ws2 = XLSX.utils.json_to_sheet(territorySummary(ds, results));
  ws2["!cols"] = Array(7).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, ws2, "Territory Summary");
  XLSX.writeFile(wb, EXPORT_FILENAME);
}
