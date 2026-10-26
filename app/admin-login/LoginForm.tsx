"use client";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

export default function LoginForm({ demoHint, open }: { demoHint: { user: string; password: string } | null; open?: boolean }) {
  const [username, setUsername] = useState(demoHint?.user ?? ""); // demo mode: prefilled so a reviewer can sign in with one click
  const [password, setPassword] = useState(demoHint?.password ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      window.location.href = next.startsWith("/dashboard") ? next : "/dashboard"; // full load so the layout picks up the session
    } else {
      setErr((await res.json().catch(() => ({}))).error || "Could not sign in.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-brand-600 p-2 text-white"><Lock size={18} /></span>
          <div>
            <h1 className="text-xl font-bold text-brand-900">SnowFlakes Admin login</h1>
            <p className="text-sm text-slate-500">The dashboard is for the SnowFlakes franchise team only.</p>
          </div>
        </div>
        <div><label className="label" htmlFor="u">Username</label><input id="u" className="input" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} /></div>
        <div><label className="label" htmlFor="p">Password</label><input id="p" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {open && <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">Demo mode: no login is required. <a className="font-bold underline" href="/dashboard">Open the dashboard</a>. Set ADMIN_PASSWORD to turn the login on.</p>}
        {err && <p className="text-sm font-medium text-rose-600">{err}</p>}
        <button className="btn w-full" disabled={busy || !username || !password}>{busy && <Loader2 size={16} className="animate-spin" />} Sign in</button>
        {demoHint && <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">Demo login prefilled — username <b>{demoHint.user}</b>, password <b>{demoHint.password}</b>. Set ADMIN_USERNAME / ADMIN_PASSWORD to use your own.</p>}
      </form>
    </div>
  );
}
