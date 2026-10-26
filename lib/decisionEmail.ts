import { candidateNarrative, candidateTips } from "./candidate";
import { buildCongratsEmail, type Approval, type CongratsEmail } from "./congratsEmail";
import type { Outcome } from "./store";
import type { Result } from "./types";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const THEME: Record<Exclude<Outcome, "ACCEPTED">, { badge: string; title: string; emoji: string; grad: string; solid: string; subject: (first: string, id: string) => string }> = {
  REJECTED: { badge: "An update on your application", title: "Thank you for applying", emoji: "💌", grad: "linear-gradient(135deg,#3d5a80 0%,#5b86a8 55%,#98c1d9 100%)", solid: "#4a6f94", subject: (f, id) => `An update on your SnowFlakes application (${id})` },
  ON_HOLD: { badge: "Your application is on hold", title: "We need a little more from you", emoji: "⏳", grad: "linear-gradient(135deg,#1c5d73 0%,#2f8fb0 55%,#6fc3dc 100%)", solid: "#24708a", subject: (f, id) => `Your SnowFlakes application is on hold (${id})` },
  WAITLISTED: { badge: "You're on our waitlist", title: "You're on the list", emoji: "🍨", grad: "linear-gradient(135deg,#2d6a6a 0%,#4aa3a0 55%,#9bd8d2 100%)", solid: "#3a8a88", subject: (f, id) => `You're on the SnowFlakes waitlist (${id})` },
};

/** What the candidate is told, in plain friendly words. If the reviewer overrode the AI, we don't reuse the engine's wording. */
function reasonFor(r: Result, outcome: Outcome, first: string): string {
  const engineMatches = r.status === outcome;
  if (engineMatches) return candidateNarrative(r);
  if (outcome === "REJECTED") return `Thank you for your interest, ${first}. After reviewing your application, we are not able to offer you a store at pin code ${r.app.pin} right now.`;
  if (outcome === "WAITLISTED") return `Thank you, ${first}. We have a strong set of applications for this area, so we have placed you on our waitlist and will reach out if a spot opens up.`;
  return `Thank you, ${first}. We are keeping your application on hold while we review a few details.`;
}

/** The email for any human decision: accepted gets the congratulations mail, the others get a considerate update that invites changes. */
export function buildDecisionEmail(r: Result, outcome: Outcome, to: string, meta: Approval, baseUrl = "", contactEmail = ""): CongratsEmail {
  if (outcome === "ACCEPTED") return buildCongratsEmail(r, to, meta, baseUrl);
  const a = r.app;
  const first = (a.name || "there").split(" ")[0];
  const th = THEME[outcome];
  const city = r.prefix?.city || r.territory?.city || a.city || "Karnataka";
  const reason = reasonFor(r, outcome, first);
  const tips = candidateTips(r).slice(0, 4);
  const applyUrl = baseUrl ? `${baseUrl}/apply?pincode=${encodeURIComponent(a.pin || "")}&city=${encodeURIComponent(city)}` : "";
  const mailto = contactEmail ? `mailto:${contactEmail}?subject=${encodeURIComponent(`Update to my application ${a.id}`)}` : "";
  const subject = th.subject(first, a.id);

  const tipHtml = tips.map((t) => `
    <tr><td width="26" valign="top" style="padding:0 0 12px 0;font-size:16px;color:${th.solid};font-family:Arial,Helvetica,sans-serif;">✓</td>
    <td style="padding:0 0 12px 0;font-size:14px;line-height:21px;color:#3b5663;font-family:Arial,Helvetica,sans-serif;">${esc(t)}</td></tr>`).join("");

  const btn = (href: string, label: string, solid: boolean) => `<a href="${esc(href)}" style="display:inline-block;margin:4px 6px;background:${solid ? th.solid : "#ffffff"};color:${solid ? "#ffffff" : th.solid};border:2px solid ${th.solid};font-weight:800;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;">${esc(label)}</a>`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#eef3f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">If anything changes on your side, tell us and we will happily take another look.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f7;padding:28px 12px;"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
    <tr><td align="center" style="padding:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;">
      <span style="font-size:26px;font-weight:900;color:#24708a;letter-spacing:-.5px;">❄ Snow🍦Flakes</span><br>
      <span style="font-size:12px;color:#6b8a97;letter-spacing:.14em;text-transform:uppercase;">Scoops of Joy!</span>
    </td></tr>

    <tr><td bgcolor="${th.solid}" style="background:${th.solid};background-image:${th.grad};border-radius:24px 24px 0 0;padding:40px 32px 36px 32px;text-align:center;">
      <div style="font-size:42px;line-height:48px;">${th.emoji}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#e3eef5;margin-top:12px;font-weight:700;">${esc(th.badge)}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:38px;font-weight:900;color:#ffffff;margin:8px 0 0 0;">${esc(th.title)}, ${esc(first)}</div>
    </td></tr>

    <tr><td style="background:#ffffff;padding:30px 32px 6px 32px;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${th.solid};font-weight:800;margin-bottom:8px;">Application ${esc(a.id)} · pin ${esc(a.pin || "n/a")}</div>
      <div style="font-size:16px;line-height:25px;color:#26414d;">${esc(reason)}</div>
      ${meta.note ? `<div style="margin-top:16px;background:#f4f8fb;border-left:4px solid ${th.solid};border-radius:8px;padding:12px 16px;font-size:14px;line-height:21px;color:#3b5663;"><b>A note from our team:</b> ${esc(meta.note)}</div>` : ""}
    </td></tr>

    ${tips.length ? `<tr><td style="background:#ffffff;padding:22px 32px 4px 32px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${th.solid};font-weight:800;margin-bottom:12px;">What could help</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tipHtml}</table>
    </td></tr>` : ""}

    <tr><td style="background:#ffffff;padding:14px 32px 34px 32px;">
      <div style="background:#f4f8fb;border:2px dashed ${th.solid};border-radius:18px;padding:22px 22px 18px 22px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:18px;font-weight:900;color:#0f3a4a;margin-bottom:6px;">Things change, and so can our decision</div>
        <div style="font-size:14px;line-height:22px;color:#3b5663;margin-bottom:14px;">If you make any changes, such as a new shop space, a higher investment or corrected details, <b>please let us know</b>. We will review your application again and may well rethink our decision.</div>
        ${applyUrl ? btn(applyUrl, "Update my application", true) : ""}${mailto ? btn(mailto, "Email us your changes", false) : ""}
        ${!applyUrl && !mailto ? `<div style="font-size:14px;font-weight:700;color:${th.solid};">Simply reply to this email with your update.</div>` : ""}
      </div>
    </td></tr>

    <tr><td bgcolor="#0f3a4a" style="background:#0f3a4a;border-radius:0 0 24px 24px;padding:24px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:15px;font-weight:800;color:#ffffff;">Thank you for your interest in SnowFlakes 🍨</div>
      <div style="font-size:12px;color:#9fc3d0;margin-top:6px;">SnowFlakes · Franchise Partner Portal · Karnataka</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `Hi ${first},`, ``, reason, meta.note ? `` : "", meta.note ? `A note from our team: ${meta.note}` : "",
    tips.length ? `\nWhat could help:\n${tips.map((t) => `- ${t}`).join("\n")}` : "",
    ``, `If you make any changes (a new shop space, a higher investment, corrected details), please let us know. We will review your application again and may rethink our decision.`,
    applyUrl ? `Update your application: ${applyUrl}` : "Simply reply to this email with your update.", mailto ? `Or email: ${contactEmail}` : "",
    ``, `— Team SnowFlakes · Scoops of Joy!`,
  ].filter((l) => l !== "").join("\n");
  return { to, subject, html, text };
}
