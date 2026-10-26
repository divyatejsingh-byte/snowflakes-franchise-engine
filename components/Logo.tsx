import clsx from "clsx";

/** The SnowFlakes mark: an actual six-armed snowflake. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sfFlake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8e4fa" /><stop offset="1" stopColor="#3ea6d6" /></linearGradient>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 32L32.00 5.00M32.00 17.96L24.72 11.85M32.00 17.96L39.28 11.85M32.00 11.48L27.02 7.30M32.00 11.48L36.98 7.30M32 32L55.38 18.50M44.16 24.98L45.81 15.62M44.16 24.98L53.09 28.23M49.77 21.74L50.90 15.34M49.77 21.74L55.88 23.96M32 32L55.38 45.50M44.16 39.02L53.09 35.77M44.16 39.02L45.81 48.38M49.77 42.26L55.88 40.04M49.77 42.26L50.90 48.66M32 32L32.00 59.00M32.00 46.04L39.28 52.15M32.00 46.04L24.72 52.15M32.00 52.52L36.98 56.70M32.00 52.52L27.02 56.70M32 32L8.62 45.50M19.84 39.02L18.19 48.38M19.84 39.02L10.91 35.77M14.23 42.26L13.10 48.66M14.23 42.26L8.12 40.04M32 32L8.62 18.50M19.84 24.98L10.91 28.23M19.84 24.98L18.19 15.62M14.23 21.74L8.12 23.96M14.23 21.74L13.10 15.34" stroke="#1f5f86" strokeWidth="7.4" />
        <path d="M32 32L32.00 5.00M32.00 17.96L24.72 11.85M32.00 17.96L39.28 11.85M32.00 11.48L27.02 7.30M32.00 11.48L36.98 7.30M32 32L55.38 18.50M44.16 24.98L45.81 15.62M44.16 24.98L53.09 28.23M49.77 21.74L50.90 15.34M49.77 21.74L55.88 23.96M32 32L55.38 45.50M44.16 39.02L53.09 35.77M44.16 39.02L45.81 48.38M49.77 42.26L55.88 40.04M49.77 42.26L50.90 48.66M32 32L32.00 59.00M32.00 46.04L39.28 52.15M32.00 46.04L24.72 52.15M32.00 52.52L36.98 56.70M32.00 52.52L27.02 56.70M32 32L8.62 45.50M19.84 39.02L18.19 48.38M19.84 39.02L10.91 35.77M14.23 42.26L13.10 48.66M14.23 42.26L8.12 40.04M32 32L8.62 18.50M19.84 24.98L10.91 28.23M19.84 24.98L18.19 15.62M14.23 21.74L8.12 23.96M14.23 21.74L13.10 15.34" stroke="url(#sfFlake)" strokeWidth="4.4" />
        <path d="M32 32L32.00 5.00M32.00 17.96L24.72 11.85M32.00 17.96L39.28 11.85M32.00 11.48L27.02 7.30M32.00 11.48L36.98 7.30M32 32L55.38 18.50M44.16 24.98L45.81 15.62M44.16 24.98L53.09 28.23M49.77 21.74L50.90 15.34M49.77 21.74L55.88 23.96M32 32L55.38 45.50M44.16 39.02L53.09 35.77M44.16 39.02L45.81 48.38M49.77 42.26L55.88 40.04M49.77 42.26L50.90 48.66M32 32L32.00 59.00M32.00 46.04L39.28 52.15M32.00 46.04L24.72 52.15M32.00 52.52L36.98 56.70M32.00 52.52L27.02 56.70M32 32L8.62 45.50M19.84 39.02L18.19 48.38M19.84 39.02L10.91 35.77M14.23 42.26L13.10 48.66M14.23 42.26L8.12 40.04M32 32L8.62 18.50M19.84 24.98L10.91 28.23M19.84 24.98L18.19 15.62M14.23 21.74L8.12 23.96M14.23 21.74L13.10 15.34" stroke="#ffffff" strokeWidth="1.3" opacity="0.85" />
      </g>
      <circle cx="32" cy="32" r="4.2" fill="#ffffff" stroke="#1f5f86" strokeWidth="1.6" />
    </svg>
  );
}

/** The ice-cream cone that sits between "Snow" and "Flakes" in the wordmark (drawn in the same outlined style as the letters). */
function WordCone({ x }: { x: number }) {
  const cone = `M${x - 8.5} 20 L${x + 8.5} 20 L${x} 40 Z`;
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <defs>
        <linearGradient id="sfWc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f4c985" /><stop offset="1" stopColor="#d9954a" /></linearGradient>
        <linearGradient id="sfWs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd3e2" /><stop offset="1" stopColor="#f58fb2" /></linearGradient>
      </defs>
      <path d={cone} fill="#1f5f86" stroke="#1f5f86" strokeWidth="5" />
      <circle cx={x} cy="13" r="10.5" fill="#1f5f86" stroke="#1f5f86" strokeWidth="3" />
      <path d={cone} fill="#fff" stroke="#fff" strokeWidth="2.6" />
      <circle cx={x} cy="13" r="10.5" fill="#fff" stroke="#fff" strokeWidth="1.2" />
      <path d={cone} fill="url(#sfWc)" />
      <path d={`M${x - 5} 22.5 L${x + 3} 33 M${x + 5} 22.5 L${x - 3} 33 M${x - 7} 27 L${x + 7} 27`} stroke="#b9772f" strokeWidth="1.1" fill="none" />
      <circle cx={x} cy="13" r="9" fill="url(#sfWs)" />
      <path d={`M${x - 8} 17 q2 4 4 0 q2 4 4 0 q2 4 4 0 q2 4 4 0`} fill="none" stroke="#f58fb2" strokeWidth="1.2" />
      <ellipse cx={x - 3.5} cy="9.5" rx="3.2" ry="1.9" fill="#fff" opacity="0.8" transform={`rotate(-30 ${x - 3.5} 9.5)`} />
    </g>
  );
}

/** Full lockup: snowflake mark + layered "Snow 🍦 Flakes" wordmark + tagline. */
export default function Logo({ size = 40, tagline = true, className }: { size?: number; tagline?: boolean; className?: string }) {
  const VW = 232, VH = 44;
  const w = size * 5.2;
  const text = { fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 700, fontSize: 36 } as const;
  const part = (txt: string, x: number, len: number) => (
    <>
      <text x={x} y="33" style={text} textLength={len} lengthAdjust="spacingAndGlyphs" stroke="#1f5f86" strokeWidth="6.5" strokeLinejoin="round" fill="#1f5f86">{txt}</text>
      <text x={x} y="33" style={text} textLength={len} lengthAdjust="spacingAndGlyphs" stroke="#ffffff" strokeWidth="3.6" strokeLinejoin="round" fill="#ffffff">{txt}</text>
      <text x={x} y="33" style={text} textLength={len} lengthAdjust="spacingAndGlyphs" fill="url(#sfGrad)">{txt}</text>
    </>
  );
  return (
    <span className={clsx("inline-flex items-center gap-2", className)} aria-label="SnowFlakes — Scoops of Joy!">
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <svg width={w} height={w * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`} role="img" aria-hidden="true">
          <defs>
            <linearGradient id="sfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd8f5" /><stop offset="1" stopColor="#3ea6d6" /></linearGradient>
          </defs>
          {part("Snow", 3, 84)}
          <WordCone x={104} />
          {part("Flakes", 120, 108)}
        </svg>
        {tagline && <span className="mt-0.5 pl-1 font-display text-[11px] font-semibold tracking-wide text-brand-900">Scoops of Joy!</span>}
      </span>
    </span>
  );
}
