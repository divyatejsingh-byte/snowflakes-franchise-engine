/**
 * Provider-agnostic LLM client. Configure with env vars (nothing is called until these are set):
 *   LLM_PROVIDER = gemini | anthropic | openai   (openai also covers any OpenAI-compatible endpoint via LLM_BASE_URL)
 *   LLM_API_KEY  = your key (for gemini, GEMINI_API_KEY / GOOGLE_API_KEY also work)
 *   LLM_MODEL    = model id (required, except gemini which defaults to gemini-3.8-flash)
 *   LLM_BASE_URL = optional override
 * Add another provider by implementing `LlmClient` and returning it from getLlm().
 */
export type LlmPart =
  | { type: "text"; text: string }
  | { type: "file"; mime: string; base64: string; filename?: string }; // images + PDFs

export interface LlmMessage { role: "user" | "assistant"; content: string | LlmPart[] }
export interface LlmRequest { system?: string; messages: LlmMessage[]; maxTokens?: number; json?: boolean }

export interface LlmClient { readonly provider: string; readonly model: string; complete(req: LlmRequest): Promise<string> }

const apiKey = () => process.env.LLM_API_KEY || (process.env.LLM_PROVIDER?.toLowerCase() === "gemini" ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY : undefined);
const modelName = () => process.env.LLM_MODEL || (process.env.LLM_PROVIDER?.toLowerCase() === "gemini" ? "gemini-3.8-flash" : undefined);

export function llmConfigured(): boolean {
  return !!(process.env.LLM_PROVIDER && apiKey() && modelName());
}

export function getLlm(): LlmClient | null {
  if (!llmConfigured()) return null;
  const provider = process.env.LLM_PROVIDER!.toLowerCase();
  const key = apiKey()!, model = modelName()!, base = process.env.LLM_BASE_URL;
  if (provider === "gemini") return gemini(key, model, base);
  if (provider === "anthropic") return anthropic(key, model, base);
  if (provider === "openai") return openai(key, model, base);
  return null;
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`LLM request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function anthropic(key: string, model: string, base?: string): LlmClient {
  return {
    provider: "anthropic", model,
    async complete(req) {
      const toBlocks = (c: LlmMessage["content"]) =>
        typeof c === "string" ? [{ type: "text", text: c }] : c.map((p) => p.type === "text" ? { type: "text", text: p.text }
          : { type: p.mime === "application/pdf" ? "document" : "image", source: { type: "base64", media_type: p.mime, data: p.base64 } });
      const data = await post(`${base || "https://api.anthropic.com"}/v1/messages`, { "x-api-key": key, "anthropic-version": "2023-06-01" }, {
        model, max_tokens: req.maxTokens ?? 1024, system: req.system, messages: req.messages.map((m) => ({ role: m.role, content: toBlocks(m.content) })),
      });
      return (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    },
  };
}

function openai(key: string, model: string, base?: string): LlmClient {
  return {
    provider: "openai", model,
    async complete(req) {
      const toContent = (c: LlmMessage["content"]) =>
        typeof c === "string" ? c : c.map((p) => p.type === "text" ? { type: "text", text: p.text }
          : p.mime === "application/pdf" ? { type: "file", file: { filename: p.filename || "document.pdf", file_data: `data:${p.mime};base64,${p.base64}` } }
          : { type: "image_url", image_url: { url: `data:${p.mime};base64,${p.base64}` } });
      const messages = [...(req.system ? [{ role: "system", content: req.system }] : []), ...req.messages.map((m) => ({ role: m.role, content: toContent(m.content) }))];
      const data = await post(`${base || "https://api.openai.com/v1"}/chat/completions`, { Authorization: `Bearer ${key}` }, {
        model, messages, max_tokens: req.maxTokens ?? 1024, ...(req.json ? { response_format: { type: "json_object" } } : {}),
      });
      return data.choices?.[0]?.message?.content ?? "";
    },
  };
}

/** Google Gemini (Generative Language API, generateContent). Supports text, images and PDFs as inline data. */
function gemini(key: string, model: string, base?: string): LlmClient {
  return {
    provider: "gemini", model,
    async complete(req) {
      const parts = (c: LlmMessage["content"]) =>
        typeof c === "string" ? [{ text: c }] : c.map((p) => (p.type === "text" ? { text: p.text } : { inlineData: { mimeType: p.mime, data: p.base64 } }));
      const data = await post(`${base || "https://generativelanguage.googleapis.com"}/v1beta/models/${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": key }, {
        ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
        contents: req.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: parts(m.content) })),
        safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map((category) => ({ category, threshold: "BLOCK_MEDIUM_AND_ABOVE" })),
        generationConfig: { maxOutputTokens: req.maxTokens ?? 1024, temperature: 0.3, ...(req.json ? { responseMimeType: "application/json" } : {}) },
      });
      const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
      if (!text) throw new Error(`Gemini returned no text (${data.candidates?.[0]?.finishReason ?? data.promptFeedback?.blockReason ?? "unknown reason"})`);
      return text;
    },
  };
}
