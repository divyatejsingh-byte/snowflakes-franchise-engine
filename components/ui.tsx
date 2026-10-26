import clsx from "clsx";
import type { StatusKind } from "@/lib/types";

const STATUS_STYLE: Record<StatusKind, string> = {
  ACCEPTED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  ON_HOLD: "bg-amber-100 text-amber-800 ring-amber-200",
  WAITLISTED: "bg-sky-100 text-sky-800 ring-sky-200",
  REJECTED: "bg-rose-100 text-rose-800 ring-rose-200",
};

export function StatusBadge({ status, label }: { status: StatusKind; label: string }) {
  return (
    <span className={clsx("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", STATUS_STYLE[status])}>
      {label}
    </span>
  );
}

export function Bar({ pts, max, label, detail }: { pts: number; max: number; label: string; detail?: string }) {
  const pct = max ? (pts / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500"><b className="text-slate-900">{pts}</b>/{max}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={clsx("h-full rounded-full", pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${pct}%` }} />
      </div>
      {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-400">n/a</span>;
  return (
    <span className={clsx("font-bold tabular-nums", value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-500")}>
      {value > 0 ? "+" : ""}{value}
    </span>
  );
}
