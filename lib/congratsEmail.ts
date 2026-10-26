import type { Result } from "./types";

export interface Approval { by: string; at: string; note?: string }
export interface CongratsEmail { to: string; subject: string; html: string; text: string }

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The plain next-step list shown in the dossier, the approvals screen and the email (one source of truth). */
export function nextStepsFor(r: Result): { title: string; detail: string }[] {
  const steps: { title: string; detail: string }[] = [
    { title: "Sign the Letter of Intent", detail: "A short, non-binding letter confirming your pin code and premises. Our team will send it for signature." },
    { title: "Premises verification", detail: `We visit and verify the space${r.app.floor && r.app.floor !== "Not known" ? ` (${r.app.floor.toLowerCase()} floor${r.app.size ? `, ${r.app.size} sq ft` : ""})` : ""} and confirm that no other SnowFlakes store operates in pin ${r.app.pin}.` },
  ];
  for (const q of r.requirements) steps.push({ title: "Before you open", detail: q });
  if (r.onboarding) {
    steps.push({ title: `Training in ${r.onboarding.language}`, detail: `${r.onboarding.track}. ${r.onboarding.languageNote}` });
    for (const m of r.onboarding.milestones.slice(0, 4)) steps.push({ title: m.week, detail: m.title });
  } else {
    steps.push({ title: "Training & fit-out plan", detail: "Our team will share your training schedule, fit-out checklist and opening timeline once the letter is signed." });
  }
  return steps;
}

export function buildCongratsEmail(r: Result, to: string, approval: Approval, baseUrl = ""): CongratsEmail {
  const a = r.app;
  const first = (a.name || "there").split(" ")[0];
  const city = r.territory?.city || r.prefix?.city || a.city || "Karnataka";
  const steps = nextStepsFor(r);
  const when = new Date(approval.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const rows: [string, string][] = [
    ["Application", a.id],
    ["Your pin code", `${a.pin} · ${city}`],
    ["Premises", [a.floor && a.floor !== "Not known" ? a.floor : "", a.size ? `${a.size} sq ft` : ""].filter(Boolean).join(" · ") || "To be confirmed"],
    ["Target launch", a.launch != null ? `${a.launch} month(s) from signing` : "To be agreed"],
    ["Approved on", `${when} by ${approval.by}`],
  ];
  const subject = `🍦 Congratulations ${first}! Your SnowFlakes franchise is approved (${a.id})`;

  const stepHtml = steps.map((s, i) => `
    <tr>
      <td width="44" valign="top" style="padding:0 0 18px 0;">
        <div style="width:32px;height:32px;line-height:32px;border-radius:16px;background:#24708a;color:#ffffff;font-weight:800;font-size:14px;text-align:center;font-family:Arial,Helvetica,sans-serif;">${i + 1}</div>
      </td>
      <td valign="top" style="padding:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:15px;font-weight:700;color:#0f3a4a;line-height:20px;">${esc(s.title)}</div>
        <div style="font-size:14px;color:#4b6470;line-height:21px;margin-top:2px;">${esc(s.detail)}</div>
      </td>
    </tr>`).join("");

  const rowHtml = rows.map(([k, v]) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e3f1f6;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b8a97;font-family:Arial,Helvetica,sans-serif;" width="38%">${esc(k)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e3f1f6;font-size:15px;font-weight:700;color:#0f3a4a;font-family:Arial,Helvetica,sans-serif;">${esc(v)}</td>
    </tr>`).join("");

  const cta = baseUrl ? `<a href="${esc(baseUrl)}" style="display:inline-block;background:#ffffff;color:#24708a;font-weight:800;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;">Visit SnowFlakes</a>` : "";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#eaf6fa;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Welcome to the SnowFlakes family. Here is what happens next.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eaf6fa;padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
    <tr><td align="center" style="padding:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;">
      <span style="font-size:26px;font-weight:900;color:#24708a;letter-spacing:-.5px;">❄ Snow🍦Flakes</span><br>
      <span style="font-size:12px;color:#6b8a97;letter-spacing:.14em;text-transform:uppercase;">Scoops of Joy!</span>
    </td></tr>

    <tr><td bgcolor="#24708a" style="background:#24708a;background-image:linear-gradient(135deg,#1c5d73 0%,#2f8fb0 55%,#6fc3dc 100%);border-radius:24px 24px 0 0;padding:44px 32px 40px 32px;text-align:center;">
      <div style="font-size:46px;line-height:52px;">🎉🍦🎉</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#cfeaf3;margin-top:14px;font-weight:700;">You're approved</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:36px;line-height:42px;font-weight:900;color:#ffffff;margin:8px 0 12px 0;">Congratulations, ${esc(first)}!</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#e6f5fa;max-width:440px;margin:0 auto 24px auto;">Welcome to the SnowFlakes family. We're delighted to approve your application to open a scoop parlour in <b style="color:#ffffff;">${esc(city)}</b>.</div>
      ${cta}
    </td></tr>

    <tr><td style="background:#ffffff;padding:32px 32px 8px 32px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#24708a;font-weight:800;margin-bottom:6px;">Your approval at a glance</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowHtml}</table>
      ${approval.note ? `<div style="margin-top:16px;background:#f2fafc;border-left:4px solid #6fc3dc;border-radius:8px;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#3b5663;"><b>A note from our team:</b> ${esc(approval.note)}</div>` : ""}
    </td></tr>

    <tr><td style="background:#ffffff;padding:24px 32px 12px 32px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#24708a;font-weight:800;margin-bottom:14px;">Your next steps</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stepHtml}</table>
    </td></tr>

    <tr><td style="background:#ffffff;padding:8px 32px 36px 32px;">
      <div style="background:#f2fafc;border-radius:16px;padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#3b5663;">
        <b style="color:#0f3a4a;">Good to know:</b> this approval is subject to premises verification and the signed franchise agreement. Reply to this email any time, we are happy to help.
      </div>
    </td></tr>

    <tr><td bgcolor="#0f3a4a" style="background:#0f3a4a;border-radius:0 0 24px 24px;padding:26px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:15px;font-weight:800;color:#ffffff;">Spreading joy, one scoop at a time 🍨</div>
      <div style="font-size:12px;color:#9fc3d0;margin-top:6px;">SnowFlakes · Franchise Partner Portal · Karnataka</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `Congratulations, ${first}!`,
    ``,
    `Your SnowFlakes franchise application (${a.id}) has been approved for pin code ${a.pin} in ${city}.`,
    `Approved on ${when} by ${approval.by}.`,
    approval.note ? `Note from our team: ${approval.note}` : "",
    ``,
    `YOUR NEXT STEPS`,
    ...steps.map((s, i) => `${i + 1}. ${s.title}: ${s.detail}`),
    ``,
    `This approval is subject to premises verification and the signed franchise agreement.`,
    `— Team SnowFlakes · Scoops of Joy!`,
  ].filter((l) => l !== "").join("\n");

  return { to, subject, html, text };
}
