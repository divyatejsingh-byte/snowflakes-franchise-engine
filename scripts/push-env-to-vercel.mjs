// Run this yourself:  node scripts/push-env-to-vercel.mjs
// Copies the keys from .env.local to your Vercel project (production + preview). Values are never printed.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
}
const NAMES = ["DATABASE_URL", "LLM_PROVIDER", "LLM_MODEL", "LLM_API_KEY", "RESEND_API_KEY", "NEXT_PUBLIC_GEOAPIFY_API_KEY"];
for (const name of NAMES) {
  if (!env[name]) { console.log(`skip  ${name} (not in .env.local)`); continue; }
  for (const target of ["production", "preview"]) {
    const r = spawnSync("vercel", ["env", "add", name, target, "--force"], { input: env[name], encoding: "utf8", shell: true });
    console.log(`${r.status === 0 ? "ok   " : "FAIL "} ${name} -> ${target}`);
  }
}
console.log("\nNow redeploy:  vercel deploy --prod --yes");
