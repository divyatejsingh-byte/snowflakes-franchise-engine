import type { Application } from "./types";

/** "YYYY-MM-DD HH:mm:ss" in the viewer's local time. */
export function fmtConsentTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const consentBadgeText = (a: Application) => (a.consent?.granted ? `✓ DPDP Consent Verified (Timestamp: ${fmtConsentTime(a.consent.timestamp)})` : "");
