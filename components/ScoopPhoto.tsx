import clsx from "clsx";

/**
 * Every flavour is shown the same way: a round "scoop" crop of a real photo, centred on the scoop itself,
 * with the same ring, shadow and caption. Crops are computed from each photo's focal point, zoom and aspect ratio.
 */
export interface FlavourPhoto { name: string; file: string; aspect: number; fx: number; fy: number; zoom: number; note: string }

export const FLAVOUR_PHOTOS: FlavourPhoto[] = [
  { name: "Strawberry Swirl", file: "strawberry-cone", aspect: 1.5, fx: 0.5, fy: 0.27, zoom: 1.5, note: "Strawberry & cream" },
  { name: "Choco Drift", file: "chocolate-cone", aspect: 1.25, fx: 0.5, fy: 0.68, zoom: 1.4, note: "Dark chocolate" },
  { name: "Vanilla Cloud", file: "five-bowls", aspect: 0.667, fx: 0.095, fy: 0.48, zoom: 4.4, note: "Madagascan vanilla" },
  { name: "Pistachio Pop", file: "pistachio-cup", aspect: 1.5, fx: 0.55, fy: 0.51, zoom: 1.4, note: "Roasted pistachio" },
  { name: "Mango Magic", file: "mango-scoops", aspect: 1.42, fx: 0.5, fy: 0.6, zoom: 1.2, note: "Alphonso mango" },
  { name: "Berry Blast", file: "berry-sorbet", aspect: 1.33, fx: 0.5, fy: 0.47, zoom: 1.35, note: "Berry sorbet" },
  { name: "Minty Snowflake", file: "five-bowls", aspect: 0.667, fx: 0.49, fy: 0.5, zoom: 4.4, note: "Cool mint & cream" },
];

export const flavour = (name: string) => FLAVOUR_PHOTOS.find((f) => f.name === name)!;

function position(f: FlavourPhoto) {
  const w = f.zoom, h = f.zoom * f.aspect; // displayed image size in container widths
  const px = w === 1 ? 50 : ((0.5 - f.fx * w) / (1 - w)) * 100;
  const py = h === 1 ? 50 : ((0.5 - f.fy * h) / (1 - h)) * 100;
  return `${Math.max(0, Math.min(100, px))}% ${Math.max(0, Math.min(100, py))}%`;
}

export default function ScoopPhoto({ f, size = 160, className, label = true }: { f: FlavourPhoto; size?: number; className?: string; label?: boolean }) {
  return (
    <figure className={clsx("flex flex-col items-center text-center", className)}>
      <div
        role="img" aria-label={`${f.name} — ${f.note}`}
        className="shrink-0 rounded-full bg-ice-100 shadow-xl shadow-brand-600/20 ring-4 ring-white transition duration-300 hover:scale-105"
        style={{ width: size, height: size, backgroundImage: `url(/photos/${f.file}.jpg)`, backgroundSize: `${f.zoom * 100}% auto`, backgroundPosition: position(f), backgroundRepeat: "no-repeat" }}
      />
      {label && <figcaption className="mt-2.5"><p className="font-display text-base font-bold leading-tight text-brand-900">{f.name}</p><p className="text-xs text-slate-500">{f.note}</p></figcaption>}
    </figure>
  );
}
