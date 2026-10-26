"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Check, Loader2, Send, Wand2, X } from "lucide-react";
import clsx from "clsx";
import type { ChatAction, ChatContext, ChatReply } from "@/lib/chatbot";
import { useStore } from "@/lib/store";

interface Msg { role: "user" | "bot"; text: string; actions?: ChatAction[]; applied?: Set<number>; ai?: string }

const INITIAL = [
  "What is the minimum investment for my city?",
  "Why does ground floor matter so much?",
  "Can I apply without an identified shop space?",
  "How does training and onboarding work?",
  "How much power load do I need for a scoop shop?",
  "Is 300 sq ft enough?",
  "What is the shelf life and delivery schedule?",
];

/**
 * Floating concierge. On /apply, pass `context` (live draft form) and `onApplyPreset` so replies can adjust the form.
 * On other pages, answers are general and no form actions are offered.
 */
export interface CopilotConfig {
  title: string; subtitle: string; triggerLabel: string; triggerSub: string; greeting: string; pills: string[];
  answer: (q: string) => { reply: string; actions?: ChatAction[]; suggestions?: string[] };
}

export default function ChatbotWidget({
  context, onApplyPreset, copilot, autoSend,
}: { context?: ChatContext; onApplyPreset?: (patch: Record<string, string>) => void; copilot?: CopilotConfig; autoSend?: { text: string; n: number } | null }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: copilot?.greeting ?? "Hi! I'm the SnowFlakes Application Copilot 🍦 Ask me about investment, shop requirements, pin codes or training, and I'll help you put together a strong application." },
  ]);
  const [pills, setPills] = useState<string[]>(copilot?.pills ?? INITIAL);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const territories = useStore((s) => s.territories);
  const stores = useStore((s) => s.stores);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy, open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: q }]);
    if (copilot) {
      const r = copilot.answer(q); // deterministic, runs against the live in-browser dataset
      setMsgs((m) => [...m, { role: "bot", text: r.reply, actions: r.actions ?? [], applied: new Set() }]);
      setPills(r.suggestions?.length ? r.suggestions : copilot.pills);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, context: context ?? { form: {} }, catalog: { territories: territories.map((t) => ({ id: t.id, city: t.city, tier: t.tier, slots: t.slots, pins: t.pins })), storePins: stores.map((s) => s.pin) }, history: msgs.slice(1).map((m) => ({ role: m.role === "bot" ? "assistant" : "user", text: m.text })) }) });
      const data = (await res.json()) as ChatReply & { source?: string; provider?: string };
      if (!res.ok || !data.reply) throw new Error();
      setMsgs((m) => [...m, { role: "bot", text: data.reply, actions: onApplyPreset ? data.actions : [], applied: new Set(), ai: data.source === "llm" ? (data.provider ?? "ai").split(":")[0] : undefined }]);
      setPills(data.suggestions?.length ? data.suggestions : INITIAL);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Sorry, I couldn't reach the assistant just now. Please try again in a moment." }]);
    }
    setBusy(false);
  };

  // the landing-page enquiry bar opens the concierge via a window event
  useEffect(() => { const h = () => setOpen(true); window.addEventListener("open-concierge", h); return () => window.removeEventListener("open-concierge", h); }, []);

  // lets the demo chips open the copilot and ask a question on the user's behalf
  useEffect(() => { if (autoSend) { setOpen(true); send(autoSend.text); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [autoSend?.n]);

  const apply = (mi: number, ai: number, a: ChatAction) => {
    onApplyPreset?.(a.patch);
    setMsgs((m) => m.map((x, i) => (i === mi ? { ...x, applied: new Set([...(x.applied ?? []), ai]) } : x)));
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)} aria-label={copilot ? "Open expansion copilot" : "Open Application Copilot"}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-brand-700"
        >
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
          <Bot size={20} /> <span className="text-left leading-tight">{copilot?.triggerLabel ?? "Need help with your application?"}<span className="block text-[11px] font-normal text-brand-100">{copilot?.triggerSub ?? "Ask our Application Copilot"}</span></span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-3 z-40 flex h-[34rem] max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[24rem]" role="dialog" aria-label={copilot?.title ?? "SnowFlakes Application Copilot"}>
          <div className="flex items-center gap-2 bg-brand-600 px-4 py-3 text-white">
            <Bot size={20} />
            <div className="flex-1"><p className="font-semibold leading-tight">{copilot?.title ?? "SnowFlakes Application Copilot"}</p><p className="text-xs text-brand-100">{copilot?.subtitle ?? (context?.form ? "Aware of your draft application" : "Here to help you get started")}</p></div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 hover:bg-white/20"><X size={18} /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {msgs.map((m, i) => (
              <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={clsx("max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed", m.role === "user" ? "bg-brand-600 text-white" : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200")}>
                  <p>{m.text}</p>
                  {m.ai && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-brand-600">✨ {m.ai === "gemini" ? "Gemini" : m.ai}</p>}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {m.actions.map((a, ai) => {
                        const done = m.applied?.has(ai);
                        return (
                          <button key={ai} disabled={done} onClick={() => apply(i, ai, a)} className={clsx("flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition", done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-brand-500 text-brand-700 hover:bg-brand-50")}>
                            {done ? <><Check size={14} /> Applied to your form</> : <><Wand2 size={14} /> [{a.label}]</>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Thinking…</div>}
            <div ref={end} />
          </div>

          <div className="border-t border-slate-200 bg-white p-2">
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {pills.map((p) => (
                <button key={p} onClick={() => send(p)} className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-brand-100">{p}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
              <input className="input" placeholder="Type your question…" value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} />
              <button className="btn !px-3" disabled={busy || !input.trim()} aria-label="Send"><Send size={16} /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
