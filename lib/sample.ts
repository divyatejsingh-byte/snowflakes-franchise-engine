/** Sample workbook rows using the exact headers of Case1_Franchise_Test_Data_Format.xlsx. */
export const APP_HEADERS = [
  "Application ID", "Applicant name", "City · State · Pin code", "Investment capacity (₹ lakh)", "Retail experience (years)",
  "Current / past business", "Space available", "Space size (sq ft)", "Floor", "Target launch (months)",
  "Preferred language", "Notes from applicant",
];
export const TERR_HEADERS = ["Territory ID", "City · State", "Pin codes covered", "City tier", "Open slots", "Priority"];
export const STORE_HEADERS = ["Store ID", "City", "Pin code", "Opened (year)"];

type A = [string, string, string, number | string, number | string, string, string, number | string, string, number | string, string, string];

export const SAMPLE_APPS: A[] = [
  ["APP-001", "Ramesh Gowda", "Bengaluru · Karnataka · 560002", 45, 6, "Cafe & bakery owner", "Owned", 500, "Ground", 2, "Kannada", "Own shop on a main road"],
  ["APP-002", "Sneha Rao", "Bengaluru · Karnataka · 560002", 36, 4, "Dessert parlour", "Rented", 450, "Ground", 3, "English", ""],
  ["APP-003", "Imran Sheikh", "Bengaluru · Karnataka · 560001", 50, 8, "Ice cream distributor", "Owned", 500, "Ground", 1, "English", "Prime MG Road location"],
  ["APP-004", "Lakshmi Narayan", "Bengaluru · Karnataka · 560078", 32, 2, "Grocery kirana", "Rented", 350, "Mall unit", 4, "Kannada", ""],
  ["APP-005", "Arjun Mehta", "Bengaluru · Karnataka · 560095", 28, 0, "IT consultant", "Rented", 280, "First floor", 8, "Hindi", "First business venture"],
  ["APP-006", "Divya Shetty", "Bengaluru · Karnataka · 560085", 40, 5, "Restaurant manager", "Owned", 420, "Ground", 2, "Kannada", ""],
  ["APP-007", "Karthik Bhat", "Mysuru · Karnataka · 570008", 25, 3, "Textile retail", "Not yet identified", "", "", 3, "Kannada", "Still searching for a shop"],
  ["APP-008", "Meera Iyer", "Mysuru · Karnataka · 570002", 24, 4, "Juice bar & snacks", "Rented", 550, "Ground", 2, "English", ""],
  ["APP-009", "Farhan Ali", "Mysuru · Karnataka · 570001", 22, 1, "Mobile accessories retail", "Rented", 320, "1st floor", 5, "Hindi", ""],
  ["APP-010", "Suresh Pai", "Mangaluru · Karnataka · 575002", 30, 7, "Dairy & sweets shop", "Owned", 480, "Ground", 1, "Kannada", ""],
  ["APP-011", "Nisha D'Souza", "Mangaluru · Karnataka · 575003", 21, 2, "Coffee shop", "Rented", 420, "Mall unit", 3, "English", ""],
  ["APP-012", "Vijay Kulkarni", "Hubballi-Dharwad · Karnataka · 580021", 26, 5, "Food court QSR", "None", "", "", 2, "Kannada", "Strong profile, space hunting"],
  ["APP-013", "Anita Desai", "Hubballi-Dharwad · Karnataka · 580001", 24, 3, "Bakery", "Owned", 400, "Ground", 3, "English", ""],
  ["APP-014", "Prakash Hegde", "Belagavi · Karnataka · 590006", 18, 2, "Hardware shop", "Rented", 380, "Ground", 5, "Kannada", ""],
  ["APP-015", "Rohit Patil", "Belagavi · Karnataka · 590001", 22, 6, "Retail", "Owned", 500, "Ground", 2, "Kannada", ""],
  ["APP-016", "Shruti Naik", "Tumakuru · Karnataka · 572102", 14, 1, "Tailoring", "Rented", 300, "Ground", 4, "Kannada", ""],
  ["APP-017", "Manjunath S", "Tumakuru · Karnataka · 572103", 12, 0, "Farming", "Owned", 700, "Ground", 9, "Kannada", "Selling farmland to invest"],
  ["APP-018", "Pooja Reddy", "Davanagere · Karnataka · 577002", 20, 4, "Tea stall chain", "Rented", 450, "Ground", 3, "Kannada", ""],
  ["APP-019", "Gopal Krishna", "Pune · Maharashtra · 411001", 40, 5, "Retail", "Owned", 500, "Ground", 2, "English", "Wants to expand outside Karnataka"],
  ["APP-020", "Latha M", "Bengaluru · Karnataka · 560078", 38, 3, "Restaurant & catering", "Owned", 520, "Ground", 2, "Kannada", ""],
  ["APP-021", "Ibrahim Khan", "Davanagere · Karnataka · 57700", "₹ 25 lakh", "3 yrs", "", "Rented", "", "", "", "", "messy row: short pin, text numbers"],
  ["APP-022", "Chitra Rao", " 590010.0 ", 22, 2, "Dessert cafe", "Not yet identified", 450, "Ground", 3, "Kannada", "contradiction case: no space yet but floor/size filled in"],
];

export const SAMPLE_TERRITORIES: (string | number)[][] = [
  ["TER-01", "Bengaluru · Karnataka", "560001, 560002, 560034, 560038, 560066, 560076, 560078, 560085, 560095", "Tier 1", 3, "High"],
  ["TER-02", "Mysuru · Karnataka", "570001, 570002, 570008, 570009, 570017", "Tier 2", 2, "Medium"],
  ["TER-03", "Mangaluru · Karnataka", "575001, 575002, 575003", "Tier 2", 2, "Medium"],
  ["TER-04", "Hubballi-Dharwad · Karnataka", "580020, 580021, 580001, 580008", "Tier 2", 1, "Medium"],
  ["TER-05", "Belagavi · Karnataka", "590001, 590006, 590010", "Tier 2", 2, "Low"],
  ["TER-06", "Tumakuru · Karnataka", "572101, 572102, 572103", "Tier 3", 2, "Medium"],
  ["TER-07", "Davanagere · Karnataka", "577001, 577002, 577004", "Tier 3", 1, "Low"],
];

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
export const SAMPLE_STORES = FIXED_STORES;
