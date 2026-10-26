import clsx from "clsx";
import { useId } from "react";

/* ---------- helpers ---------- */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v : 255 - v) * amt)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246122517); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000; };
}
/** Dome with a ruffled "skirt", drawn in a 100×70 box. */
const SCOOP_PATH = (() => {
  let d = "M10 54 C8 26 28 8 50 8 C72 8 92 26 90 54";
  const n = 8, step = 80 / n;
  for (let i = 0; i < n; i++) { const x0 = 90 - i * step, x1 = x0 - step; d += ` Q${(x0 + x1) / 2} ${54 + 17} ${x1} 54`; }
  return d + " Z";
})();

/** One scoop as an SVG group (use inside an <svg>). Gradients are uniquely id'd so many can share a page. */
export function ScoopShape({ color, accent, sprinkles = false, drizzle }: { color: string; accent: string; sprinkles?: boolean; drizzle?: string }) {
  const id = useId().replace(/:/g, "");
  const rnd = seeded(color + accent);
  const flecks = Array.from({ length: 9 }, () => ({ x: 20 + rnd() * 60, y: 18 + rnd() * 38, rx: 1.6 + rnd() * 2.2, ry: 1.1 + rnd() * 1.6, rot: rnd() * 180 }));
  const sprinkleColors = ["#f26a8d", "#ffd23f", "#4cc9f0", "#7bd88f", "#ffffff"];
  return (
    <g>
      <defs>
        <radialGradient id={`b${id}`} cx="32%" cy="26%" r="85%">
          <stop offset="0" stopColor={shade(color, 0.35)} /><stop offset="0.55" stopColor={color} /><stop offset="1" stopColor={shade(color, -0.22)} />
        </radialGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.18" /></linearGradient>
        <filter id={`bl${id}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>
      <path d={SCOOP_PATH} fill={`url(#b${id})`} />
      <path d={SCOOP_PATH} fill={`url(#s${id})`} />
      <path d="M12 54 Q50 64 88 54" fill="none" stroke={shade(color, -0.25)} strokeWidth="1.2" opacity="0.55" strokeLinecap="round" />
      {flecks.map((f, i) => <ellipse key={i} cx={f.x} cy={f.y} rx={f.rx} ry={f.ry} fill={accent} opacity="0.55" transform={`rotate(${f.rot} ${f.x} ${f.y})`} />)}
      {drizzle && <path d="M22 26 Q30 40 36 26 T50 28 Q56 44 62 28 T78 30" fill="none" stroke={drizzle} strokeWidth="3.2" strokeLinecap="round" opacity="0.9" />}
      {sprinkles && Array.from({ length: 12 }, (_, i) => { const x = 24 + rnd() * 52, y = 14 + rnd() * 24; return <rect key={i} x={x} y={y} width="5" height="1.8" rx="0.9" fill={sprinkleColors[i % 5]} transform={`rotate(${rnd() * 180} ${x} ${y})`} />; })}
      <ellipse cx="34" cy="24" rx="15" ry="7.5" fill="#fff" opacity="0.55" filter={`url(#bl${id})`} transform="rotate(-28 34 24)" />
      <ellipse cx="30" cy="21" rx="5" ry="2.4" fill="#fff" opacity="0.8" transform="rotate(-28 30 21)" />
    </g>
  );
}

/** Standalone scoop. */
export function Scoop({ color, accent, size = 72, className }: { color: string; accent: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 100 78" className={className} aria-hidden="true">
      <ellipse cx="50" cy="73" rx="34" ry="4" fill="#0f3f52" opacity="0.14" />
      <g transform="translate(0,1)"><ScoopShape color={color} accent={accent} /></g>
    </svg>
  );
}

function WaffleCone({ x, y, w, h, uid }: { x: number; y: number; w: number; h: number; uid: string }) {
  const tipX = x + w / 2, tipY = y + h;
  return (
    <g>
      <defs>
        <linearGradient id={`c${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f2c37d" /><stop offset="0.5" stopColor="#e5a95a" /><stop offset="1" stopColor="#c98a3f" /></linearGradient>
        <clipPath id={`cc${uid}`}><path d={`M${x} ${y}L${x + w} ${y}L${tipX} ${tipY}Z`} /></clipPath>
      </defs>
      <path d={`M${x} ${y}L${x + w} ${y}L${tipX} ${tipY}Z`} fill={`url(#c${uid})`} />
      <g clipPath={`url(#cc${uid})`} stroke="#a8702c" strokeWidth="1.3" opacity="0.55">
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => <line key={`a${k}`} x1={x + w / 2 + k * (w / 5)} y1={y} x2={x + w / 2 + k * (w / 5) + w * 0.9} y2={y + h * 0.9} />)}
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => <line key={`b${k}`} x1={x + w / 2 + k * (w / 5)} y1={y} x2={x + w / 2 + k * (w / 5) - w * 0.9} y2={y + h * 0.9} />)}
      </g>
      <path d={`M${x} ${y}L${x + w} ${y}L${tipX} ${tipY}Z`} fill="none" stroke="#9a6224" strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  );
}

/** A scoop on a mini waffle cone — used on the flavour cards. */
export function ConeScoop({ color, accent, size = 96, className }: { color: string; accent: string; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size * 1.42} viewBox="0 0 100 142" className={className} aria-hidden="true">
      <ellipse cx="50" cy="138" rx="14" ry="2.6" fill="#0f3f52" opacity="0.14" />
      <WaffleCone x={27} y={58} w={46} h={78} uid={uid} />
      <g transform="translate(0,6)"><ScoopShape color={color} accent={accent} /></g>
      <ellipse cx="50" cy="60" rx="24" ry="3.2" fill="#9a6224" opacity="0.35" />
    </svg>
  );
}

/** Hero illustration: waffle cone, two stacked scoops, syrup, sprinkles and a cherry. */
export function Cone({ size = 120, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size * 1.75} viewBox="0 0 140 245" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`ch${uid}`} cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#ff8aa6" /><stop offset="0.6" stopColor="#e5233f" /><stop offset="1" stopColor="#8f1228" /></radialGradient>
      </defs>
      <ellipse cx="70" cy="240" rx="22" ry="3.5" fill="#0f3f52" opacity="0.18" />
      <WaffleCone x={36} y={118} w={68} h={120} uid={uid} />
      <g transform="translate(20,86) scale(1)"><ScoopShape color="#8fd9c4" accent="#2f9a82" /></g>
      <g transform="translate(25,50) scale(0.9)"><ScoopShape color="#f7a8c4" accent="#d9547f" sprinkles drizzle="#6d4630" /></g>
      <ellipse cx="70" cy="122" rx="36" ry="4.5" fill="#9a6224" opacity="0.35" />
      <circle cx="72" cy="53" r="10" fill={`url(#ch${uid})`} />
      <ellipse cx="69" cy="49" rx="3" ry="2" fill="#fff" opacity="0.8" />
      <path d="M73 44 Q75 30 90 24" stroke="#4a8a3c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export const FLAVORS = [
  { name: "Minty Snowflake", color: "#8fd9c4", accent: "#2f9a82" },
  { name: "Berry Blast", color: "#b98ae0", accent: "#6f35b0" },
  { name: "Caramel Crunch", color: "#e8b46e", accent: "#a8702c" },
  { name: "Choco Drift", color: "#a9795a", accent: "#4e2e1c" },
  { name: "Vanilla Cloud", color: "#f8e6b0", accent: "#d9b04a" },
  { name: "Strawberry Swirl", color: "#f7a0bc", accent: "#cf4676" },
  { name: "Mango Magic", color: "#ffcb62", accent: "#e8901a" },
  { name: "Pistachio Pop", color: "#b7d98f", accent: "#5f9a3c" },
];

export function Snowflake({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={clsx("h-6 w-6", className)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />
    </svg>
  );
}
