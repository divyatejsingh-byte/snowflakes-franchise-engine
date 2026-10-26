import { NextResponse } from "next/server";
import { isOffTopic, respond, type ChatContext } from "@/lib/chatbot";
import { respondWithLlm, type Catalog, type ChatTurn } from "@/lib/chatLlm";
import { INJECTION_REPLY, NO_INFO_REPLY, RATE_LIMIT_REPLY, REVIEWER_SCOPE_REPLY, cleanText, globallyLimited, isInjection, isReviewerQuestion, normalizeForGuard, rateLimited } from "@/lib/guardrails";

export const runtime = "nodejs";
export const maxDuration = 60;

const FORM_KEYS = ["name", "investment", "experience", "business", "language", "launch", "pin", "floor", "size", "ownership"] as const;
const PIN_KINDS = ["eligible", "out_of_scope", "cannibalised", "unmapped", "full"];

/**
 * Chat endpoint for the public concierge. Everything the page sends is treated as untrusted:
 * the message is size-capped and checked for injection, the draft form is reduced to known short fields, the history is
 * re-checked turn by turn, and the territory catalogue is reduced to plain ids/numbers.
 * With an LLM configured it answers personally; otherwise (or on any error) it falls back to deterministic rules.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: unknown; context?: { form?: Record<string, unknown>; pin?: { kind?: unknown; city?: unknown; tier?: unknown; slots?: unknown } | null }; history?: unknown; catalog?: { territories?: unknown; storePins?: unknown } };
    const message = normalizeForGuard(String(body.message ?? "")).slice(0, 500);
    if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    const form: ChatContext["form"] = {};
    for (const k of FORM_KEYS) { const v = cleanText(body.context?.form?.[k]); if (v) form[k] = v; }
    const rp = body.context?.pin;
    const pin: ChatContext["pin"] = rp && typeof rp.kind === "string" && PIN_KINDS.includes(rp.kind)
      ? { kind: rp.kind, city: cleanText(rp.city, 40) || undefined, tier: Number.isFinite(Number(rp.tier)) ? Number(rp.tier) : undefined, slots: Number.isFinite(Number(rp.slots)) ? Number(rp.slots) : undefined }
      : null;
    const ctx: ChatContext = { form, pin };

    const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim().slice(0, 64);
    if (rateLimited(ip) || globallyLimited()) return NextResponse.json({ reply: RATE_LIMIT_REPLY, actions: [], suggestions: [], source: "guardrail" }, { status: 200 });
    if (isInjection(message)) return NextResponse.json({ reply: INJECTION_REPLY, actions: [], suggestions: [], source: "guardrail" });

    if (isReviewerQuestion(message)) return NextResponse.json({ reply: REVIEWER_SCOPE_REPLY, actions: [], suggestions: [], source: "guardrail" });
    if (isOffTopic(message)) return NextResponse.json({ ...respond(message, ctx), source: "rules" }); // never spend an LLM call on off-topic questions

    // history comes from the browser, so a forged "assistant" turn could carry instructions: re-check every turn and cap lengths
    const rawHist = Array.isArray(body.history) ? body.history : [];
    const history: ChatTurn[] = rawHist
      .filter((h): h is { role: "user" | "assistant"; text: string } => !!h && typeof h === "object" && ((h as ChatTurn).role === "user" || (h as ChatTurn).role === "assistant") && typeof (h as ChatTurn).text === "string")
      .map((h) => ({ role: h.role, text: normalizeForGuard(h.text).slice(0, 600) }))
      .filter((h) => h.text && !isInjection(h.text))
      .slice(-6);

    const terr = Array.isArray(body.catalog?.territories) ? (body.catalog!.territories as Record<string, unknown>[]).slice(0, 12) : [];
    const catalog: Catalog | undefined = terr.length
      ? {
          territories: terr.map((t) => ({ id: cleanText(t.id, 12), city: cleanText(t.city, 30), tier: Number(t.tier) || 3, slots: Math.max(0, Math.min(99, Number(t.slots) || 0)), pins: (Array.isArray(t.pins) ? t.pins : []).map((p) => String(p)).filter((p) => /^\d{6}$/.test(p)).slice(0, 60) })),
          storePins: (Array.isArray(body.catalog?.storePins) ? (body.catalog!.storePins as unknown[]) : []).map((p) => String(p)).filter((p) => /^\d{6}$/.test(p)).slice(0, 60),
        }
      : undefined;

    const out = await respondWithLlm(message, ctx, history, catalog);
    if (out.reply) return NextResponse.json({ ...out.reply, source: "llm", provider: out.provider });
    const rules = respond(message, ctx);
    // the model was configured but its answer was unusable: never show the vague fallback, point to the human desk instead
    if (out.error && rules.reply.startsWith("I want to make sure")) return NextResponse.json({ ...rules, reply: NO_INFO_REPLY, source: "rules", llmError: out.error });
    return NextResponse.json({ ...rules, source: "rules", llmError: out.error });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
