"use client";
import { useState } from "react";
import { netAtVolume, type Economics } from "@/lib/economics";

/** Monthly net cash flow vs daily orders. Hover/drag to read values; marks break-even and the applicant's modelled volume. */
export default function BreakEvenChart({ eco }: { eco: Economics }) {
  const W = 320, H = 130, PAD = { l: 34, r: 8, t: 8, b: 20 };
  const maxX = 160;
  const pts = Array.from({ length: 17 }, (_, i) => ({ x: i * 10, y: netAtVolume(eco, i * 10) }));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const sx = (x: number) => PAD.l + (x / maxX) * (W - PAD.l - PAD.r);
  const sy = (y: number) => PAD.t + (1 - (y - minY) / (maxY - minY || 1)) * (H - PAD.t - PAD.b);
  const [hover, setHover] = useState<number | null>(null);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join("");
  const hx = hover ?? eco.scoopsPerDay;
  const hy = netAtVolume(eco, hx);
  const lakh = (v: number) => `${v < 0 ? "−" : ""}₹${Math.abs(v / 100000).toFixed(2)}L`;

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img" aria-label="Break-even curve"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(maxX, Math.round(((x - PAD.l) / (W - PAD.l - PAD.r)) * maxX)))); }}
        onMouseLeave={() => setHover(null)}>
        {minY < 0 && maxY > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={sy(0)} y2={sy(0)} stroke="#94a3b8" strokeDasharray="3 3" />}
        <path d={path} fill="none" stroke="#2f8aa6" strokeWidth="2.5" strokeLinejoin="round" />
        {eco.breakEvenScoops != null && eco.breakEvenScoops <= maxX && <g><line x1={sx(eco.breakEvenScoops)} x2={sx(eco.breakEvenScoops)} y1={PAD.t} y2={H - PAD.b} stroke="#f59e0b" strokeDasharray="3 3" /><text x={sx(eco.breakEvenScoops) + 3} y={PAD.t + 9} fontSize="9" fill="#b45309">break-even {eco.breakEvenScoops}</text></g>}
        <g><line x1={sx(eco.scoopsPerDay)} x2={sx(eco.scoopsPerDay)} y1={PAD.t} y2={H - PAD.b} stroke="#10b981" strokeDasharray="2 3" /><text x={Math.min(sx(eco.scoopsPerDay) + 3, W - 70)} y={H - PAD.b - 4} fontSize="9" fill="#047857">modelled {eco.scoopsPerDay}/day</text></g>
        <circle cx={sx(hx)} cy={sy(hy)} r="4" fill={hy >= 0 ? "#10b981" : "#e11d48"} stroke="#fff" strokeWidth="1.5" />
        {[0, 40, 80, 120, 160].map((x) => <text key={x} x={sx(x)} y={H - 6} fontSize="9" fill="#64748b" textAnchor="middle">{x}</text>)}
        <text x={4} y={sy(maxY) + 3} fontSize="8" fill="#64748b">{lakh(maxY)}</text>
        <text x={4} y={sy(minY) + 3} fontSize="8" fill="#64748b">{lakh(minY)}</text>
      </svg>
      <p className="text-center text-[11px] text-slate-600">At <b>{hx}</b> orders/day: net cash flow <b className={hy >= 0 ? "text-emerald-700" : "text-rose-600"}>{lakh(hy)}</b>/month</p>
    </div>
  );
}
