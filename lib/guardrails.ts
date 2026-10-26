/**
 * Chatbot guardrails that run in code, independent of the model:
 *  - input: prompt-injection / jailbreak attempts are refused before any LLM call
 *  - rate limit: per-visitor cap so the endpoint can't be hammered (or used as a free general-purpose chatbot)
 *  - output: replies are scrubbed (no links, no markdown, no leaked instructions/keys, no guarantees of approval or returns)
 */
export const ENQUIRY_EMAILS = ["Divyatej_singh@pg27.mesaschool.co", "Shaik_Roshan@pg27.mesaschool.co"];

export const INJECTION_REPLY = "I can only help with questions about SnowFlakes, the franchise process and your application, and I can't change how I work or share my instructions. 🍦 Is there something about your application I can help with?";
export const RATE_LIMIT_REPLY = "You've asked a lot of questions in a short time — please give me a minute and try again. For anything urgent, the Franchise Expansion Desk is on the Enquiry page. 🍦";
export const NO_INFO_REPLY = `I don't have that detail to hand, and I'd rather not guess. Please ask the Franchise Expansion Desk (${ENQUIRY_EMAILS.join(" or ")}) and they'll help you directly.`;

/** Normalise before matching so spacing tricks, zero-width characters and look-alike letters don't slip through. */
export function normalizeForGuard(message: string): string {
  return message.normalize("NFKC").replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "").replace(/[\u0000-\u001F]+/g, " ").replace(/\s+/g, " ").trim();
}

const INJECTION = new RegExp([
  // override / ignore / forget
  String.raw`(ignore|disregard|forget|skip|drop|discard|override|overrule|bypass|circumvent|disable|turn off|stop following)\b.{0,40}\b(instruction|prompt|rule|guideline|restriction|filter|safety|guardrail|polic(y|ies)|constraint|programming|training)s?`,
  String.raw`(ignore|disregard|forget) (everything|all|anything)\b`,
  String.raw`\b(new|updated|revised|real|actual|secret|hidden) (instructions?|rules?|system (message|prompt)|directive)s?\s*[:\-]`,
  String.raw`\bfrom now on\b|\bfrom this point (on|forward)\b|\byou (must|will|shall|are to) (now|only|always|never)\b`,
  // reveal the prompt / configuration / secrets
  String.raw`(reveal|show|print|display|output|repeat|recite|dump|leak|expose|tell me|give me|share|send me|read out|copy|translate|summari[sz]e|spell out)\b.{0,30}\b(your|ur) (system |hidden |initial |original |secret |internal |full )?(prompt|instruction|configuration|config|setup|settings|context|training)s?`,
  String.raw`(reveal|show|print|display|output|repeat|recite|dump|leak|expose|tell me|give me|share|read out|copy|translate|summari[sz]e)\b.{0,30}\b(your|ur|the) (system|hidden|initial|original|secret|internal) (prompt|instruction|rule|guideline|message|configuration)s?`,
  String.raw`(your|ur) (system |hidden |initial |original |secret |internal )(prompt|instruction|rule|guideline|message)s?`,
  String.raw`\bsystem\s*(prompt|message|instruction)`, String.raw`\bwhat (were|are) you (told|instructed|programmed|trained)\b`,
  String.raw`\b(repeat|recite|print|say|echo|copy)\b.{0,25}\b(words|text|everything|message|prompt|instructions?) (above|before|so far)`, String.raw`starting with ['"]?you are\b`,
  String.raw`\b(initial|first|original) (prompt|message|instruction)s?\b`,
  String.raw`api[\s_-]?keys?|\b(access|auth|bearer|secret|private) ?(key|token)s?\b|\bpasswords?\b|\bcredentials?\b|\benv(ironment)?[\s_-]?(var|variable|file)s?\b|\.env\b|\bsource code\b|\bwhich (llm|model|ai)\b|\bwho (made|built|trained) you\b`,
  // role-play / persona switches / jailbreak vocabulary
  String.raw`\byou are (now|no longer|actually|really)\b|\bact (as|like) (?!an? (franchise|partner|applicant)|my (franchise|partner))`,
  String.raw`\b(pretend|imagine|suppose|assume) (to be|you('| a)?re|that you|you are|you can)\b`, String.raw`\brole[\s-]?play|\bpersona\b|\bcharacter\b`,
  String.raw`jailbreak|developer mode|debug mode|god mode|admin mode|sudo\b|\bdan\b|do anything now|unfiltered|uncensored|no restrictions|without (any )?(restrictions|rules|filters|limits)|prompt injection`,
  String.raw`\b(hypothetically|in a (story|fiction|movie|game|poem)|for (educational|research|testing) purposes)\b`,
  // markup that tries to look like a system turn
  String.raw`<\s*\/?\s*(system|instructions?|assistant|prompt|admin)\s*>|\[\s*\/?\s*(inst|system|sys)\s*\]|^\s*(system|assistant|developer)\s*:|###\s*(system|instruction)|\bbase64\b|\brot13\b|\bdecode (this|the following)\b`,
  // using the bot as a free general-purpose tool
  String.raw`\b(write|compose|generate|create|draft|make) (me )?(a |an |some |the )?(\w+ ){0,3}(poem|song|story|essay|joke|code|script|haiku|limerick|speech|lyrics|riddle)\b`,
].join("|"), "i");

/** Letters only, no spaces: catches "i g n o r e  p r e v i o u s" and similar spacing / punctuation tricks. */
const SQUASHED = /ignore(all|the|any|your)?(previous|prior|above|earlier)(instructions?|rules?|prompts?)|systemprompt|forgeteverything|disregard(all|your|the)(instructions?|rules?)|revealyour(prompt|instructions?)|youarenow|developermode|jailbreak/;
export const isInjection = (message: string) => {
  const t = normalizeForGuard(message);
  return INJECTION.test(t) || SQUASHED.test(t.toLowerCase().replace(/[^a-z]/g, ""));
};

/** The public concierge only ever needs short plain strings from the page; everything else is dropped. */
export function cleanText(v: unknown, max = 80): string {
  return typeof v === "string" ? normalizeForGuard(v).replace(/[<>{}`]/g, "").slice(0, max) : "";
}

/** Global ceiling across all visitors (protects the model budget even if per-visitor limits are spoofed). */
const globalHits: number[] = [];
export function globallyLimited(max = 400, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  while (globalHits.length && now - globalHits[0] > windowMs) globalHits.shift();
  globalHits.push(now);
  return globalHits.length > max;
}

/* simple in-memory sliding-window limiter (per server instance) */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 20, windowMs = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return arr.length > max;
}

const LEAK = /NETWORK DATA|OFFICIAL FACTS|REFERENCE ANSWER|CANDIDATE'S LIVE DRAFT FORM|system prompt|AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_-]{20,}|re_[0-9A-Za-z_]{20,}|sk-[A-Za-z0-9]{20,}|neondb_owner|postgres(ql)?:\/\//i;
const GUARANTEE = /\b(guarantee[sd]?|assured|certain)\b[^.]{0,40}\b(approv|accept|selection|return|profit|income|payback|success)/gi;
/** A guarantee is only a problem when the reply makes one; "I can't guarantee approval" is the right thing to say. */
function makesGuarantee(text: string): boolean {
  for (const m of text.matchAll(GUARANTEE)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 30), m.index ?? 0).toLowerCase();
    if (!/(can'?t|cannot|can not|not|never|no|unable|without|don'?t|won'?t|isn'?t|aren'?t|nobody|neither)\b[^.]{0,25}$/.test(before)) return true;
  }
  return false;
}

/** Returns a safe reply, or null if the model output should be discarded in favour of the rules-engine answer. */
export function sanitizeOutput(text: string): string | null {
  if (LEAK.test(text) || makesGuarantee(text)) return null;
  const clean = text
    .replace(/https?:\/\/\S+/gi, "") // no external links
    .replace(/\*+/g, "").replace(/`+/g, "").replace(/^[#>]+\s*/gm, "") // no markdown (underscores are kept: they appear in email addresses)
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, 1200);
  return clean.length >= 2 ? clean : null;
}
