import { floorOf, ownershipOf } from "./engine";
import type { Result } from "./types";

export type Lang = "English" | "Kannada" | "Hindi";

const L = {
  English: { schedule: "14-day training schedule", day: "Day", fast: "Fast-track: review only", buddy: "Buddy-store support" },
  Kannada: { schedule: "14 ದಿನಗಳ ತರಬೇತಿ ವೇಳಾಪಟ್ಟಿ", day: "ದಿನ", fast: "ವೇಗದ ಮಾರ್ಗ: ಪರಿಶೀಲನೆ ಮಾತ್ರ", buddy: "ಮಾರ್ಗದರ್ಶಕ ಅಂಗಡಿಯ ಬೆಂಬಲ" },
  Hindi: { schedule: "14 दिन का प्रशिक्षण कार्यक्रम", day: "दिन", fast: "फास्ट-ट्रैक: केवल समीक्षा", buddy: "बडी-स्टोर सहायता" },
} as const;

// [English, Kannada, Hindi] — draft translations, have a native speaker review before production use
const DAYS: [string, string, string][] = [
  ["SnowFlakes brand & values orientation", "ಸ್ನೋಫ್ಲೇಕ್ಸ್ ಬ್ರಾಂಡ್ ಮತ್ತು ಮೌಲ್ಯಗಳ ಪರಿಚಯ", "स्नोफ्लेक्स ब्रांड और मूल्यों का परिचय"],
  ["Food safety & hygiene (FSSAI basics)", "ಆಹಾರ ಸುರಕ್ಷತೆ ಮತ್ತು ಸ್ವಚ್ಛತೆ (FSSAI ಮೂಲಭೂತ)", "खाद्य सुरक्षा और स्वच्छता (FSSAI मूल बातें)"],
  ["Flavours, scooping & portion control", "ಫ್ಲೇವರ್‌ಗಳು, ಸ್ಕೂಪಿಂಗ್ ಮತ್ತು ಪ್ರಮಾಣ ನಿಯಂತ್ರಣ", "फ्लेवर, स्कूपिंग और पोर्शन कंट्रोल"],
  ["POS & billing", "ಪಿಒಎಸ್ ಮತ್ತು ಬಿಲ್ಲಿಂಗ್", "पीओएस और बिलिंग"],
  ["Cold chain & freezer management", "ಕೋಲ್ಡ್ ಚೈನ್ ಮತ್ತು ಫ್ರೀಜರ್ ನಿರ್ವಹಣೆ", "कोल्ड चेन और फ्रीजर प्रबंधन"],
  ["Customer service & upselling", "ಗ್ರಾಹಕ ಸೇವೆ ಮತ್ತು ಹೆಚ್ಚುವರಿ ಮಾರಾಟ", "ग्राहक सेवा और अपसेलिंग"],
  ["Inventory & ordering", "ದಾಸ್ತಾನು ಮತ್ತು ಆರ್ಡರ್ ನಿರ್ವಹಣೆ", "इन्वेंटरी और ऑर्डरिंग"],
  ["Merchandising & store display", "ವ್ಯಾಪಾರ ಪ್ರದರ್ಶನ ಮತ್ತು ಅಂಗಡಿ ಅಲಂಕಾರ", "मर्चेंडाइजिंग और स्टोर डिस्प्ले"],
  ["Staff hiring & scheduling", "ಸಿಬ್ಬಂದಿ ನೇಮಕಾತಿ ಮತ್ತು ವೇಳಾಪಟ್ಟಿ", "स्टाफ भर्ती और शेड्यूलिंग"],
  ["Marketing & local promotions", "ಮಾರ್ಕೆಟಿಂಗ್ ಮತ್ತು ಸ್ಥಳೀಯ ಪ್ರಚಾರ", "मार्केटिंग और स्थानीय प्रचार"],
  ["Shadow shift at the nearest SnowFlakes store", "ಹತ್ತಿರದ ಸ್ನೋಫ್ಲೇಕ್ಸ್ ಅಂಗಡಿಯಲ್ಲಿ ಅನುಭವ ಶಿಫ್ಟ್", "नज़दीकी स्नोफ्लेक्स स्टोर पर शैडो शिफ्ट"],
  ["Mock trading day", "ಮಾದರಿ ವ್ಯಾಪಾರ ದಿನ", "मॉक ट्रेडिंग डे"],
  ["Compliance audit & checklist sign-off", "ನಿಯಮ ಪಾಲನೆ ಪರಿಶೀಲನೆ ಮತ್ತು ಅನುಮೋದನೆ", "अनुपालन ऑडिट और चेकलिस्ट साइन-ऑफ"],
  ["Soft launch & grand-opening plan", "ಸಾಫ್ಟ್ ಲಾಂಚ್ ಮತ್ತು ಗ್ರ್ಯಾಂಡ್ ಓಪನಿಂಗ್ ಯೋಜನೆ", "सॉफ्ट लॉन्च और ग्रैंड ओपनिंग योजना"],
];

export interface TrainingDay { n: number; title: string; tag?: string }

export function trainingSchedule(r: Result): { lang: Lang; heading: string; days: TrainingDay[]; note: string } {
  const lang = (r.onboarding?.language ?? "English") as Lang;
  const idx = lang === "Kannada" ? 1 : lang === "Hindi" ? 2 : 0;
  const yrs = r.app.experience ?? 0;
  const t = L[lang];
  const days = DAYS.map((d, i) => ({
    n: i + 1, title: d[idx],
    tag: yrs >= 5 && i < 3 ? t.fast : yrs < 1 && (i === 2 || i === 5 || i === 10) ? t.buddy : undefined,
  }));
  const note = yrs >= 5 ? "Experienced operator: foundation days are fast-tracked." : yrs < 1 ? "New to retail: extra buddy-store support on key days." : "Standard programme.";
  return { lang, heading: t.schedule, days, note };
}

export interface FitOut { zones: { name: string; pct: number; sqft: number }[]; items: string[]; layoutNote: string }

/** Fit-out guidance scaled to the applicant's actual space. */
export function fitOut(r: Result): FitOut {
  const size = r.app.size ?? 450;
  const compact = size < 400, large = size > 600;
  const zones = [
    { name: "Display freezers & scooping counter", pct: compact ? 40 : 35 },
    { name: "Order & billing counter", pct: 12 },
    { name: "Customer seating / waiting", pct: compact ? 18 : large ? 38 : 28 },
    { name: "Storage & back-of-house", pct: 15 },
  ];
  const used = zones.reduce((s, z) => s + z.pct, 0);
  zones.push({ name: "Circulation & entry", pct: Math.max(5, 100 - used) });
  const floor = floorOf(r.app.floor);
  const items = [
    "Approved store layout drawing signed off by the SnowFlakes expansion team",
    "FSSAI licence and Shops & Establishments registration displayed",
    "Display freezers and back-up cold storage installed and temperature-logged",
    "Power back-up (inverter/genset) sized for freezers and lighting",
    "Hand-wash station, food-grade flooring and pest control in place",
    "SnowFlakes signage, menu boards and brand colours installed",
    "POS, billing printer, network and CCTV tested",
    ownershipOf(r.app.space) === "Owned" ? "Ownership documents on file for the premises" : "Landlord NOC and registered rent agreement on file",
  ];
  if (floor === "Upper") items.push("Street-level standee and stair/lift signage to compensate for upper-floor footfall");
  if (floor === "Mall unit") items.push("Mall management approval for signage and fit-out hours");
  return {
    zones: zones.map((z) => ({ ...z, sqft: Math.round((size * z.pct) / 100) })), items,
    layoutNote: compact ? `Compact ${size} sq ft layout: prioritise freezers and counter, keep seating minimal or take-away only.`
      : large ? `Spacious ${size} sq ft layout: add a larger seating area or a party corner; keep the counter in the first third of the shop.`
      : `${size} sq ft sits in the ideal 400–600 range: balanced counter, seating and storage.`,
  };
}
