import type { Result } from "./types";

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}
export interface DispatchOutcome {
  mode: "resend" | "mock";
  note?: string;
  candidate: Email;
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function buildEmails(r: Result, candidateEmail: string): { candidate: Email } {
  const a = r.app;
  const candText = [
    `Hi ${a.name},`,
    ``,
    `Thank you for applying to SnowFlakes! Your application (${a.id}) for pin code ${a.pin || "n/a"} has been submitted for review.`,
    ``,
    `What happens next: our expansion team will review your location, space and details, and you will hear from us by email with the outcome.`,
    ``,
    `— Team SnowFlakes · Scoops of Joy!`,
  ].join("\n");

  const candidate: Email = {
    to: candidateEmail,
    subject: `SnowFlakes · We have received your application (${a.id})`,
    text: candText,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
      <h2 style="color:#24708a">Thanks, ${esc(a.name)} — your application is submitted for review 🍦</h2>
      <p>Reference: <b>${esc(a.id)}</b> · Pin code ${esc(a.pin || "n/a")}</p>
      <p>Our expansion team will review your location, space and details, and you will hear from us by email with the outcome.</p></div>`,
  };
  return { candidate };
}

/** Sends the candidate confirmation via Resend when RESEND_API_KEY is set; otherwise returns a mock dispatch with a preview. */
export async function dispatchApplicationNotifications(r: Result, candidateEmail: string): Promise<DispatchOutcome> {
  const { candidate } = buildEmails(r, candidateEmail);
  const key = process.env.RESEND_API_KEY;
  if (!key) return { mode: "mock", note: "RESEND_API_KEY not set — email simulated.", candidate };
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const from = process.env.MAIL_FROM || "SnowFlakes Franchise Desk <onboarding@resend.dev>";
    const res = await resend.emails.send({ from, to: candidate.to, subject: candidate.subject, html: candidate.html, text: candidate.text });
    if (res.error) return { mode: "mock", note: `Resend error: ${res.error.message} — email simulated.`, candidate };
    return { mode: "resend", candidate };
  } catch (e) {
    return { mode: "mock", note: `Email send failed (${(e as Error).message}) — email simulated.`, candidate };
  }
}

/** Generic single-email send (used for the congratulations mail). Falls back to a mock when Resend isn't configured. */
export async function sendEmail(m: Email): Promise<{ mode: "resend" | "mock"; note?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { mode: "mock", note: "RESEND_API_KEY not set — email simulated." };
  try {
    const { Resend } = await import("resend");
    const from = process.env.MAIL_FROM || "SnowFlakes Franchise Desk <onboarding@resend.dev>";
    const res = await new Resend(key).emails.send({ from, to: m.to, subject: m.subject, html: m.html, text: m.text, ...(process.env.MAIL_REPLY_TO ? { replyTo: process.env.MAIL_REPLY_TO } : {}) });
    if (res.error) return { mode: "mock", note: `Resend error: ${res.error.message} — email simulated.` };
    return { mode: "resend" };
  } catch (e) {
    return { mode: "mock", note: `Email send failed (${(e as Error).message}) — email simulated.` };
  }
}
