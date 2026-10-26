export const ADMIN_COOKIE = "admin_session";

/** Credentials come from env; demo defaults apply when ADMIN_PASSWORD is not set. */
export const adminCreds = () => ({
  user: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "admin123",
  demo: !process.env.ADMIN_PASSWORD,
});

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Session token derived from the credentials, so changing the password invalidates old sessions. Works in Edge + Node. */
export async function sessionToken() {
  const c = adminCreds();
  return sha256Hex(`${c.user}:${c.password}:${process.env.ADMIN_SESSION_SECRET || "franchise-engine"}`);
}

/** Login is required for the dashboard by default. Set ADMIN_AUTH=open to switch it off (e.g. for an unattended demo). */
export const authRequired = () => process.env.ADMIN_AUTH !== "open";

export async function isAdminCookie(value: string | undefined) {
  if (!authRequired()) return true;
  return !!value && value === (await sessionToken());
}
