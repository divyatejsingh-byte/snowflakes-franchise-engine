import * as XLSX from "xlsx";
import { mkdirSync } from "node:fs";
import { APP_HEADERS, SAMPLE_APPS, SAMPLE_STORES, SAMPLE_TERRITORIES, STORE_HEADERS, TERR_HEADERS } from "./fixtures";

mkdirSync("scripts/fixtures", { recursive: true });

// 1. test fixture with mock applicants (used by npm run test:engine; never shipped to the site)
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([APP_HEADERS, ...SAMPLE_APPS]), "Applications");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([TERR_HEADERS, ...SAMPLE_TERRITORIES]), "Territories");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([STORE_HEADERS, ...SAMPLE_STORES]), "Existing stores");
XLSX.writeFile(wb, "scripts/fixtures/test-workbook.xlsx");

// 2. blank template for the site: headings only, no data
const blank = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(blank, XLSX.utils.aoa_to_sheet([APP_HEADERS]), "Applications");
XLSX.utils.book_append_sheet(blank, XLSX.utils.aoa_to_sheet([TERR_HEADERS]), "Territories");
XLSX.writeFile(blank, "public/Franchise_Upload_Template.xlsx");
console.log("wrote scripts/fixtures/test-workbook.xlsx and public/Franchise_Upload_Template.xlsx");
