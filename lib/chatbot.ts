import { PIN_PREFIXES, prefixOf } from "./allowed";
import { scoreApplication, TIER_BENCHMARK } from "./engine";
import type { Application } from "./types";

/**
 * Grounded concierge: answers come only from the official field guide below plus the candidate's live draft form.
 * Deterministic on purpose, so it can never invent policy.
 */
export const KNOWLEDGE = {
  benchmarks: { 1: 30, 2: 20, 3: 15 } as Record<number, number>,
  prefixes: Object.entries(PIN_PREFIXES).map(([p, v]) => ({ prefix: p, ...v })),
  footprint: "250–450 sq ft",
  languages: ["Kannada", "English", "Hindi"],
};

export interface ChatContext {
  form: Partial<Record<"name" | "investment" | "experience" | "business" | "language" | "launch" | "pin" | "floor" | "size" | "ownership", string>>;
  pin?: { kind: string; city?: string; tier?: number; slots?: number } | null;
}
export interface ChatAction { label: string; patch: Record<string, string> }
export interface ChatReply { reply: string; actions: ChatAction[]; suggestions: string[] }

const CITY_ALIASES: [RegExp, string][] = [
  [/bengaluru|bangalore|blr/i, "560"], [/mysuru|mysore/i, "570"], [/mangaluru|mangalore/i, "575"],
  [/hubballi|hubli|dharwad/i, "580"], [/belagavi|belgaum/i, "590"], [/tumakuru|tumkur/i, "572"], [/davanagere|davangere/i, "577"],
];

const num = (s?: string) => (s == null || s.trim() === "" || isNaN(+s) ? null : +s);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function cityFromText(t: string) {
  for (const [re, prefix] of CITY_ALIASES) if (re.test(t)) return { prefix, ...PIN_PREFIXES[prefix] };
  return null;
}

function draft(ctx: ChatContext): Application {
  const f = ctx.form;
  return {
    id: "DRAFT", name: f.name || "You", location: "", city: "", pin: f.pin || "", investment: num(f.investment), experience: num(f.experience) ?? 0,
    business: f.business || "", space: f.ownership || "", size: num(f.size), floor: f.floor || "", launch: num(f.launch), language: f.language || "", notes: "",
  };
}

/** Same levers as the Application Strength sidebar, ranked by real point gain. */
function levers(ctx: ChatContext, tier: 1 | 2 | 3) {
  const app = draft(ctx);
  const base = scoreApplication(app, tier).total;
  const bench = TIER_BENCHMARK[tier];
  const out: { key: string; label: string; patch: Record<string, string>; gain: number; text: string }[] = [];
  const add = (key: string, label: string, patch: Record<string, string>, ap: Partial<Application>, text: string) => {
    const gain = scoreApplication({ ...app, ...ap }, tier).total - base;
    if (gain > 0) out.push({ key, label, patch, gain, text });
  };
  const fl = ctx.form.floor ?? "";
  if (fl !== "Ground") add("floor", "Update Form to Ground Floor", { floor: "Ground" }, { floor: "Ground" }, "a ground-floor shop");
  const sz = num(ctx.form.size);
  if (sz == null || sz < 250 || sz > 450) add("size", "Update Form to 350 sq ft", { size: "350" }, { size: 350 }, "a compact shop of about 350 sq ft");
  const inv = num(ctx.form.investment);
  if (inv == null || inv < bench * 1.2) { const t = Math.ceil(bench * 1.2); add("capital", `Update Form to ₹${t} lakh`, { investment: String(t) }, { investment: t }, `a budget of about ₹${t} lakh`); }
  const lm = num(ctx.form.launch);
  if (lm == null || lm > 3) add("launch", "Update Form to 2-month launch", { launch: "2" }, { launch: 2 }, "opening within about 60 days");
  return out.sort((a, b) => b.gain - a.gain);
}

const SUGGESTIONS = [
  "What is the minimum investment for my city?",
  "Why does ground floor matter so much?",
  "Can I apply without an identified shop space?",
  "How does training and onboarding work?",
];
export const MORE_SUGGESTIONS = ["How much power load do I need for a scoop shop?", "Is 300 sq ft enough?", "What is the shelf life and delivery schedule?"];

function tierOf(ctx: ChatContext): { tier: 1 | 2 | 3; city?: string } | null {
  const info = prefixOf(ctx.form.pin ?? "");
  if (info) return { tier: info.tier, city: info.city };
  if (ctx.pin?.tier && ctx.pin.city) return { tier: ctx.pin.tier as 1 | 2 | 3, city: ctx.pin.city };
  return null;
}

function pinNote(ctx: ChatContext): string {
  const p = ctx.pin;
  if (!p) return "";
  if (p.kind === "cannibalised") return `One heads-up on pin ${ctx.form.pin}: we already have a store there and keep one store per pin code. You're very welcome to explore a nearby pin code in ${p.city ?? "the same city"} — I can help you pick one.`;
  if (p.kind === "out_of_scope") return `One heads-up on pin ${ctx.form.pin}: it's outside the areas we're currently opening in. We're recruiting for pin codes starting 560, 570, 572, 575, 577, 580 and 590 — do you have a location in one of those cities?`;
  if (p.kind === "unmapped") return `Pin ${ctx.form.pin} is in ${p.city}, but we're still confirming that exact area, so your application would stay under review for now.`;
  if (p.kind === "full") return `${p.city} is very popular right now, so you'd join our waitlist for a spot.`;
  return "";
}

/** Anything about the franchise, the application, ice cream parlours, or this app counts as on-topic. */
const DOMAIN = /\bopen(ing)?\b|\b(pune|hyderabad|chennai|mumbai|delhi|kerala|goa)\b|\b(city|cities|location|area|nearby|karnataka|bengaluru|bangalore|mysuru|mysore|mangaluru|mangalore|hubballi|dharwad|belagavi|tumakuru|davanagere)\b|franchis|appl(y|ic)|partner|snowflake|ice\s?cream|scoop|parlou?r|gelato|\bstores?\b|\bshops?\b|premises|invest|budget|\bcapital (depth|required|needed|investment|ratio)|my capital|starting capital|lakh|\blac\b|payback|space|sq\s?ft|square f|footprint|\bfloor|ground|\bmall\b|food court|launch|onboard|roadmap|training|kannada|hindi|language|score|waitlist|on hold|territor|slot|catchment|cannibal|\bpin\b|pincode|pin code|prefix|\btier\b|fssai|licen[cs]e|\bkw\b|3[\s-]?phase|\bdg\b|\bups\b|freezer|cabinet|cold[\s-]?chain|reefer|certif|experience|document|upload|dpdp|consent|approver|\bloi\b|letter of intent|fit[\s-]?out|landlord|\bnoc\b|royalt|minimum|requirement|eligib|my (city|application|budget|score|status)/i;
const SMALLTALK = /^(hi|hello|hey|namaste|namaskara|thanks?|thank you|ok(ay)?|cool|great|nice|good|bye|goodbye|yes|no|sure|please)\b/i;

export const OFFTOPIC_REPLY = "Aw, I wish I could help with that one! 🍦 I'm afraid it's outside what I can answer — I only know about the SnowFlakes franchise: investment, shop space, pin codes, your application and onboarding. Is there anything about those I can help you with?";

/** Unmistakably unrelated subjects. These are declined even if a word like "score" or "launch" appears, unless the question is clearly about the franchise. */
const CLEARLY_OFF = /\b(cricket|ipl|football|soccer|movies?|films?|actors?|actress|celebrity|songs?|lyrics|poems?|jokes?|weather|recipes?|biryani|cooking|capital of|prime minister|president|election|politic(s|al|ian)?|religion|stock market|share price|bitcoin|crypto|quantum|physics|chemistry|homework|horoscope|astrology|war|python|javascript)\b|write (me )?(a |an )?(code|script|essay|story)/i;
const FRANCHISE_CUE = /franchis|snowflake|ice\s?cream|parlou?r|scoop|my application|pin ?code|\bapply\b|onboard|territor/i;
export const isOffTopic = (message: string) => {
  const m = message.trim();
  if (!m) return false;
  if (CLEARLY_OFF.test(m) && !FRANCHISE_CUE.test(m)) return true;
  return !SMALLTALK.test(m) && !DOMAIN.test(m);
};

export function respond(message: string, ctx: ChatContext): ChatReply {
  if (isOffTopic(message)) return { reply: OFFTOPIC_REPLY, actions: [], suggestions: SUGGESTIONS };
  if (/^\s*(thanks?|thank you|great|cool|nice|ok(ay)?)\b/i.test(message)) return { reply: "You're very welcome! 🍦 Ask me anything else about your SnowFlakes application whenever you like.", actions: [], suggestions: SUGGESTIONS };
  if (/^\s*(bye|goodbye)\b/i.test(message)) return { reply: "Goodbye, and good luck with your application! 🍦", actions: [], suggestions: SUGGESTIONS };
  const t = message.toLowerCase();
  const reply = (text: string, actions: ChatAction[] = [], suggestions: string[] = SUGGESTIONS): ChatReply => ({ reply: text, actions, suggestions });
  const here = tierOf(ctx);
  const f = ctx.form;

  // 1. applying without a shop
  if (/(without|no|don'?t have|not (yet )?(found|identified)|haven'?t).*(shop|space|premises|store|property)|(shop|space).*(not (yet )?identified)/.test(t) && /apply|application|submit|need|required/.test(t)) {
    return reply(
      `Yes, you can still apply — you don't need a shop on day one. Without an identified space your application stays "under review" rather than moving forward, and you'll score lower on the real-estate part. As soon as you find a unit — ideally ${KNOWLEDGE.footprint} on the ground floor, owned or rented — update us and we'll move things along. Many partners shortlist two or three units first and apply once one is confirmed.`,
      [], ["Why does ground floor matter so much?", "How can I improve my chances?", "How does training and onboarding work?"],
    );
  }

  // 1b. ice-cream operations FAQs
  if (/power|kw\b|kilowatt|3[\s-]?phase|three[\s-]?phase|electric|generator|\bdg\b|ups\b|backup|load/.test(t)) {
    return reply(
      "Scoop shops run deep freezers and dipping cabinets around the clock, so you need a 3-phase commercial electrical connection — minimum 10–12 kW, ideally 12–15 kW — plus 24/7 power backup (a DG set or UPS) so stock doesn't melt during outages. Please confirm both with your landlord or an electrician before you commit to a space; we also check this at site sign-off.",
      [], ["Is 300 sq ft enough?", "How does training and onboarding work?", "Why does ground floor matter so much?"],
    );
  }
  if (/fssai|food licen|licen[sc]e|food safety|hygiene/.test(t)) {
    return reply("Every parlour needs an FSSAI state food licence. Don't worry — we kick off the application with you in the first 10 days of your 45-day roadmap, together with the landlord NOC and the electrical-load check, and hygiene training is part of your first week.", [], ["How does training and onboarding work?", "How much power load do I need for a scoop shop?"]);
  }
  if (/shelf|deliver|reefer|truck|restock|supply|stock|dairy hub|distribution/.test(t)) {
    return reply("Stock comes in refrigerated reefer trucks from our Karnataka distribution centres — twice a week once you're open, with a first opening delivery in the last 10 days of your launch roadmap. We'll walk you through ordering and stock rotation (first-in, first-out) in training.", [], ["How much power load do I need for a scoop shop?", "How does training and onboarding work?"]);
  }
  if (/certif|scoop master|cold[\s-]?chain/.test(t)) {
    return reply("If your background isn't in food, cafes, bakery, dairy or similar, you'll complete a 5-day Cold-Chain & Scoop Master certification before opening — it covers freezer temperature control, hygiene and scoop portioning. Backgrounds in cafe, bakery, dessert, dairy, QSR or restaurants skip this step.", [], ["How does training and onboarding work?", "How can I improve my chances?"]);
  }

  // 2. training / onboarding
  if (/train|onboard|roadmap|ramp|learn|language|kannada|hindi|english/.test(t) && !/invest|budget/.test(t)) {
    const lang = KNOWLEDGE.languages.find((l) => t.includes(l.toLowerCase()));
    const actions: ChatAction[] = lang && f.language !== lang ? [{ label: `Update Form to ${lang} training`, patch: { language: lang } }] : [];
    return reply(
      `Once you're shortlisted, you get a guided 45-day launch roadmap with four tracks running side by side: legal and site approvals, store fit-out, staff training, and inventory stocking. Training is offered in ${KNOWLEDGE.languages.join(", ")} — ${f.language ? `you've chosen ${f.language}` : "you pick your preferred language on the form"}. Your ramp-up length depends on experience: about 4 weeks if you've run retail for 5+ years, 8 weeks with some experience, and 12 weeks with a buddy store if you're new to retail. No retail background? That's absolutely fine.`,
      actions, ["Can I apply without an identified shop space?", "What is the minimum investment for my city?"],
    );
  }

  // 3. budget / investment
  if (/invest|budget|capital|lakh|\blac\b|\d\s*l\b|afford|enough|money|minimum|cost/.test(t) && !/floor|sq\s?ft/.test(t)) {
    const named = cityFromText(t);
    const loc = named ? { tier: named.tier, city: named.city } : here;
    const m = t.match(/(\d+(?:\.\d+)?)\s*(?:l\b|lakh|lac)/i);
    const amount = m ? parseFloat(m[1]) : num(f.investment);
    if (!loc) {
      return reply(
        `Our starting investment depends on the city: Bengaluru (Tier 1) is about ₹${KNOWLEDGE.benchmarks[1]} lakh; Mysuru, Mangaluru, Hubballi-Dharwad and Belagavi (Tier 2) about ₹${KNOWLEDGE.benchmarks[2]} lakh; Tumakuru and Davanagere (Tier 3) about ₹${KNOWLEDGE.benchmarks[3]} lakh. Tell me your city or pin code and I'll check your budget against it.`,
      );
    }
    const bench = KNOWLEDGE.benchmarks[loc.tier];
    let text = `${loc.city} is a Tier ${loc.tier} city, so the baseline investment is ₹${bench} lakh.`;
    const actions: ChatAction[] = [];
    if (amount != null) {
      const r = amount / bench;
      const buffer = Math.ceil(bench * 1.2);
      if (r >= 1.5) text += ` Your ₹${fmt(amount)} lakh is comfortably above that — a really strong position.`;
      else if (r >= 1.2) text += ` Your ₹${fmt(amount)} lakh clears the baseline with a healthy cushion. Nice!`;
      else if (r >= 1.0) text += ` Your ₹${fmt(amount)} lakh meets the baseline. I'd suggest keeping a small working-capital buffer (around ₹${buffer} lakh in total) for early stock and running costs — it also lifts your score.`;
      else if (r >= 0.8) text += ` Your ₹${fmt(amount)} lakh is just under the baseline. Adding a co-investor or a little more capital to reach ₹${bench}–${buffer} lakh would put you in a much stronger spot.`;
      else text += ` Your ₹${fmt(amount)} lakh is a bit below what we usually look for, so your application would be reviewed more closely. Reaching at least ₹${Math.ceil(bench * 0.8)} lakh — ideally ₹${buffer} lakh — would help a lot.`;
      if (r < 1.2) actions.push({ label: `Update Form to ₹${buffer} lakh`, patch: { investment: String(buffer) } });
    } else text += " Share your budget and I'll tell you how it compares.";
    return reply(text, actions);
  }

  // 4. floor
  if (/floor|ground|upper|first floor|mall|footfall/.test(t)) {
    const cur = f.floor ?? "";
    const gain = cur === "Ground" ? 0 : cur === "Mall unit" ? 3 : cur === "First floor" ? 12 : 15;
    const lead = cur === "" ? "" : cur === "Ground" ? " You've already picked ground floor — great choice!" : ` Switching from ${cur === "First floor" ? "an upper floor" : cur.toLowerCase()} to ground floor would add about ${gain} points to your real-estate score.`;
    return reply(
      `Ground-floor shops get far more walk-in customers, which means faster sales and quicker payback. That's why floor is the biggest part of the real-estate score: ground floor earns 15 points, a mall food-court unit 11, and an upper floor just 3. Ice cream is an impulse buy — most customers decide on a post-dinner stroll — so a non-mall upper floor sees only about a quarter of the footfall and keeps an application on hold until you find a ground-floor or mall unit.${lead}`,
      gain > 0 ? [{ label: "Update Form to Ground Floor", patch: { floor: "Ground" } }] : [],
      ["What size of shop is ideal?", "Can I apply without an identified shop space?"],
    );
  }

  // 5. size
  if (/sq\s?ft|size|footprint|area|square|big|small|enough/.test(t) && !/invest|budget|lakh/.test(t)) {
    const asked = t.match(/(\d{2,4})\s*(?:sq|sft)/);
    const sz = asked ? parseInt(asked[1], 10) : num(f.size);
    const fine = sz != null && sz >= 250 && sz <= 450;
    return reply(
      `${sz != null && fine ? `Yes! ${sz} sq ft is right in our sweet spot. ` : ""}${KNOWLEDGE.footprint} is our ideal footprint for a high-efficiency scoop parlour — room for the dipping cabinets, counter and a short queue lane without paying rent for space you don't need.${sz == null || fine ? "" : sz > 450 ? ` Your ${sz} sq ft works, but bigger spaces add rent without adding much sales.` : sz >= 200 ? ` Your ${sz} sq ft is a little tight but workable.` : ` Your ${sz} sq ft is likely too cramped for cabinets and a queue.`}`,
      fine || sz == null ? [] : [{ label: "Update Form to 350 sq ft", patch: { size: "350" } }],
    );
  }

  // 6. launch timing
  if (/launch|how (fast|soon|long)|timeline|months|open (the )?store/.test(t)) {
    const lm = num(f.launch);
    return reply(
      `Faster openings score higher: 2 months or less earns the full 25 points, 3 months earns 20, and 4–6 months earns 12. A realistic plan is best, though — our 45-day roadmap covers licences, fit-out, training and stocking, so about 60 days is achievable if your space is ready.${lm != null && lm > 3 ? ` You've entered ${lm} months; targeting 60 days would raise your score.` : ""}`,
      lm != null && lm <= 2 ? [] : [{ label: "Update Form to 2-month launch", patch: { launch: "2" } }],
    );
  }

  // 7. pin codes / cities / eligibility
  if (/pin|prefix|which cities|where|area|city|cities|eligib|cannibal|available|location/.test(t)) {
    const list = KNOWLEDGE.prefixes.map((p) => `${p.prefix} ${p.city}`).join(", ");
    const note = pinNote(ctx);
    return reply(`We're currently opening stores in these areas (pin code prefixes): ${list}. We keep one store per pin code so every partner has a strong customer base.${note ? " " + note : ""}`);
  }

  // 8. experience
  if (/experience|retail background|new to retail|beginner|never|background/.test(t)) {
    return reply(`Experience helps, but it isn't a requirement. A food-and-beverage background (ice cream, cafe, bakery, dessert, dairy, QSR, restaurant, tea/coffee) earns the most credit; general retail or grocery earns a bit less. If your background is in something unrelated, you'll simply complete our 5-day Cold-Chain & Scoop Master certification, and new partners get a buddy store and a longer ramp-up.`, [], ["How does training and onboarding work?", "How can I improve my chances?"]);
  }

  // 9. improve / score
  if (/improve|boost|chance|score|strength|qualif|stronger|better|help/.test(t)) {
    const tier = (here?.tier ?? 2) as 1 | 2 | 3;
    const ls = levers(ctx, tier).slice(0, 3);
    if (!ls.length) return reply("Your draft already looks strong on the things within your control — nice work! Double-check your details and submit when you're ready.");
    return reply(
      `Here are the quickest wins for your draft: ${ls.map((l) => `${l.text} (+${l.gain} points)`).join("; ")}. Only change things that match your real plans — we'll verify details with you.${pinNote(ctx) ? " " + pinNote(ctx) : ""}`,
      ls.map((l) => ({ label: l.label, patch: l.patch })),
    );
  }

  // 10. greeting
  if (/^(hi|hello|hey|namaste|namaskara|good (morning|afternoon|evening))\b/.test(t)) {
    const place = here?.city ? ` I can see you're looking at ${here.city}${f.pin ? ` (pin ${f.pin})` : ""}.` : "";
    return reply(`Hello! I'm your SnowFlakes concierge — happy to help you put together a strong application.${place} What would you like to know?`);
  }

  return reply(`I want to make sure I give you accurate information, and I'm not sure I understood that. I can help with investment by city, shop floor and size, launch timing, pin codes, training and onboarding, or ways to strengthen your application. For anything else about your application, the Franchise Expansion Desk on the Enquiry page can help directly. Try one of these:`);
}
