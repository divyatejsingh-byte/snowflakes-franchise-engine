/** Column headings of the Case 1 workbook, and Sheet 3 (the brand's 10 existing stores), which the brief fixes. */
export const APP_HEADERS = [
  "Application ID", "Applicant name", "City · State · Pin code", "Investment capacity (₹ lakh)", "Retail experience (years)",
  "Current / past business", "Space available", "Space size (sq ft)", "Floor", "Target launch (months)",
  "Preferred language", "Notes from applicant",
];
export const TERR_HEADERS = ["Territory ID", "City · State", "Pin codes covered", "City tier", "Open slots", "Priority"];
export const STORE_HEADERS = ["Store ID", "City", "Pin code", "Opened (year)"];

/** Sheet 3 is fixed by the brief: these are all of the brand's stores open today. */
export const FIXED_STORES: (string | number)[][] = [
  ["ST-01", "Bengaluru", "560001", 2019],
  ["ST-02", "Bengaluru", "560034", 2020],
  ["ST-03", "Bengaluru", "560038", 2021],
  ["ST-04", "Bengaluru", "560066", 2022],
  ["ST-05", "Bengaluru", "560076", 2023],
  ["ST-06", "Mysuru", "570009", 2021],
  ["ST-07", "Mysuru", "570017", 2024],
  ["ST-08", "Mangaluru", "575001", 2022],
  ["ST-09", "Hubballi-Dharwad", "580020", 2023],
  ["ST-10", "Belagavi", "590001", 2024],
];
