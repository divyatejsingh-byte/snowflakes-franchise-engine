import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres over HTTP (the serverless driver suits Vercel's short-lived functions: no connection pool to exhaust).
 * Optional: when DATABASE_URL is missing every helper returns quietly and the app runs exactly as before.
 */
export const dbEnabled = () => !!process.env.DATABASE_URL;

let ready: Promise<void> | null = null;
function client() {
  return neon(process.env.DATABASE_URL!);
}

/** Creates the audit table on first use (idempotent). */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const sql = client();
      await sql`CREATE TABLE IF NOT EXISTS audit_events (
        id BIGSERIAL PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL DEFAULT now(),
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        actor TEXT
      )`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export async function addAuditEvents(events: { kind: string; text: string; actor?: string }[]): Promise<number> {
  if (!dbEnabled() || !events.length) return 0;
  await ensureSchema();
  const sql = client();
  const rows = events.slice(0, 50);
  await sql`INSERT INTO audit_events (kind, text, actor) SELECT * FROM unnest(${rows.map((e) => e.kind)}::text[], ${rows.map((e) => e.text)}::text[], ${rows.map((e) => e.actor ?? "admin")}::text[])`;
  return rows.length;
}

export async function listAuditEvents(limit = 200): Promise<{ id: number; at: string; kind: string; text: string; actor: string | null }[]> {
  if (!dbEnabled()) return [];
  await ensureSchema();
  const rows = await client()`SELECT id, at, kind, text, actor FROM audit_events ORDER BY id DESC LIMIT ${Math.min(limit, 500)}`;
  return rows as { id: number; at: string; kind: string; text: string; actor: string | null }[];
}

export async function pingDb(): Promise<boolean> {
  if (!dbEnabled()) return false;
  const rows = await client()`SELECT 1 AS ok`;
  return rows[0]?.ok === 1;
}
