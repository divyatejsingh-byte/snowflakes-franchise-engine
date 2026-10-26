"use client";
import { ArrowDownRight, ArrowUpRight, Waves } from "lucide-react";
import type { Cascade } from "@/lib/engine";

/** Animated "domino" banner: who took a slot and who was bumped. */
export default function CascadeAlert({ cascade }: { cascade: Cascade[] }) {
  if (!cascade.length) return null;
  return (
    <div className="animate-[cascadeIn_0.5s_ease-out] rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-rose-50 p-3 text-sm shadow-md" role="alert">
      <style>{`@keyframes cascadeIn{0%{transform:translateY(-8px);opacity:0}100%{transform:none;opacity:1}} @keyframes nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}`}</style>
      <p className="mb-1.5 flex items-center gap-2 font-bold text-amber-900"><Waves size={16} className="animate-pulse" /> Cascade displacement alert</p>
      <ul className="space-y-1">
        {cascade.map((c, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800"><ArrowUpRight size={13} /> {c.promotedAppId} promoted</span>
            {c.displacedAppId ? <><span className="inline-block animate-[nudge_1s_ease-in-out_infinite] text-slate-400">→</span><span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800"><ArrowDownRight size={13} /> {c.displacedAppId} displaced</span></> : <span className="text-slate-500">into a free slot</span>}
            <span className="text-xs text-slate-500">territory {c.territoryId} · slot #{c.slotNumber}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 font-mono text-[10px] text-slate-400">{JSON.stringify(cascade[0])}</p>
    </div>
  );
}
