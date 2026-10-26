import * as XLSX from "xlsx";
import { APP_HEADERS, SAMPLE_APPS, SAMPLE_STORES, SAMPLE_TERRITORIES, STORE_HEADERS, TERR_HEADERS } from "./fixtures";
import { parseWorkbook } from "../lib/parser";

export function sampleDatasetForTest() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([APP_HEADERS, ...SAMPLE_APPS]), "Applications");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([TERR_HEADERS, ...SAMPLE_TERRITORIES]), "Territories");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([STORE_HEADERS, ...SAMPLE_STORES]), "Existing stores");
  return parseWorkbook(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer).data;
}
