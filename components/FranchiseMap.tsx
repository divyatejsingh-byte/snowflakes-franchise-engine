"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CircleF, GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { fallbackCoords, haversineKm, type LatLng } from "@/lib/geo";
import type { Store } from "@/lib/types";

export interface MapApplicant {
  pin: string;
  city: string;
  label: string; // tooltip status text
}
interface Props {
  stores: Store[];
  applicant?: MapApplicant;
  height?: number;
}

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GEOAPIFY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
// Leaflet touches `window`, so it is loaded in the browser only
const GeoapifyMap = dynamic(() => import("./GeoapifyMap"), { ssr: false, loading: () => <div className="flex h-[300px] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">Loading map…</div> });
const RADIUS_M = 5000;

export default function FranchiseMap(props: Props) {
  if (GEOAPIFY) return <GeoapifyMap {...props} />; // preferred provider
  return KEY ? <GoogleView {...props} apiKey={KEY} /> : <SchematicView {...props} />;
}

/* ---------------- Google Maps (needs API key) ---------------- */
const geoCache = new Map<string, LatLng>();

function GoogleView({ stores, applicant, height = 380, apiKey }: Props & { apiKey: string }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey, id: "gmaps-script" });
  const [coords, setCoords] = useState<Record<string, LatLng>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const keys = useMemo(
    () => [...stores.map((s) => ({ pin: s.pin, city: s.city })), ...(applicant ? [{ pin: applicant.pin, city: applicant.city }] : [])],
    [stores, applicant],
  );

  useEffect(() => {
    if (!isLoaded) return;
    const geocoder = new google.maps.Geocoder();
    let cancelled = false;
    keys.forEach(({ pin, city }) => {
      if (!/^\d{6}$/.test(pin)) return;
      const cached = geoCache.get(pin);
      if (cached) { setCoords((c) => (c[pin] ? c : { ...c, [pin]: cached })); return; }
      geocoder.geocode({ address: `${pin}, Karnataka, India` }, (res, status) => {
        const loc = status === "OK" && res?.[0]?.geometry.location;
        const ll = loc ? { lat: loc.lat(), lng: loc.lng() } : fallbackCoords(pin, city); // graceful fallback
        geoCache.set(pin, ll);
        if (!cancelled) setCoords((c) => ({ ...c, [pin]: ll }));
      });
    });
    return () => { cancelled = true; };
  }, [isLoaded, keys]);

  const at = (pin: string, city: string) => coords[pin] ?? fallbackCoords(pin, city);
  const center = applicant ? at(applicant.pin, applicant.city) : { lat: 14.5, lng: 76.0 };

  useEffect(() => {
    if (map) { map.panTo(center); map.setZoom(applicant ? 11 : 7); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, applicant?.pin, coords[applicant?.pin ?? ""]]);

  if (loadError) return <SchematicView stores={stores} applicant={applicant} height={height} note="Google Maps failed to load — showing schematic map." />;
  if (!isLoaded) return <div className="flex items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500" style={{ height }}>Loading map…</div>;

  return (
    <div className="space-y-2">
      <GoogleMap mapContainerStyle={{ height, width: "100%", borderRadius: 12 }} center={center} zoom={applicant ? 11 : 7} onLoad={setMap}>
        {stores.map((s) => {
          const p = at(s.pin, s.city);
          return (
            <MarkerF key={s.id} position={p} icon="https://maps.google.com/mapfiles/ms/icons/red-dot.png" onClick={() => setOpen(s.id)}>
              {open === s.id && (
                <InfoWindowF onCloseClick={() => setOpen(null)}>
                  <div className="text-sm"><b>{s.id}</b><br />{s.city} · {s.pin}<br />Operating since {s.opened}</div>
                </InfoWindowF>
              )}
            </MarkerF>
          );
        })}
        {applicant && (
          <>
            <MarkerF position={center} icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png" onClick={() => setOpen("applicant")}>
              {open === "applicant" && (
                <InfoWindowF onCloseClick={() => setOpen(null)}>
                  <div className="text-sm"><b>Applicant · {applicant.pin}</b><br />{applicant.city}<br />{applicant.label}</div>
                </InfoWindowF>
              )}
            </MarkerF>
            <CircleF center={center} radius={RADIUS_M} options={{ strokeColor: "#2f8aa6", fillColor: "#3f98b3", fillOpacity: 0.15, strokeWeight: 2 }} />
          </>
        )}
      </GoogleMap>
      <Legend />
    </div>
  );
}

/* ---------------- Schematic fallback (no key / load failure) ---------------- */
function SchematicView({ stores, applicant, height = 380, note }: Props & { note?: string }) {
  const [wide, setWide] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const W = 640, H = height;

  const pts = useMemo(() => stores.map((s) => ({ s, p: fallbackCoords(s.pin, s.city) })), [stores]);
  const a = applicant && /^\d{6}$/.test(applicant.pin) ? fallbackCoords(applicant.pin, applicant.city) : null;

  const all = [...pts.map((x) => x.p), ...(a ? [a] : [])];
  const centre: LatLng = !wide && a ? a : all.length
    ? { lat: (Math.min(...all.map((p) => p.lat)) + Math.max(...all.map((p) => p.lat))) / 2, lng: (Math.min(...all.map((p) => p.lng)) + Math.max(...all.map((p) => p.lng))) / 2 }
    : { lat: 14.5, lng: 76 };
  const kmPerDegLat = 111, kmPerDegLng = 111 * Math.cos((centre.lat * Math.PI) / 180);
  const spanKm = !wide && a ? 24 : Math.max(60, ...all.map((p) => Math.abs(p.lat - centre.lat) * kmPerDegLat * 2.3), ...all.map((p) => Math.abs(p.lng - centre.lng) * kmPerDegLng * 2.3));
  const pxPerKm = W / spanKm;
  const proj = (p: LatLng) => ({ x: W / 2 + (p.lng - centre.lng) * kmPerDegLng * pxPerKm, y: H / 2 - (p.lat - centre.lat) * kmPerDegLat * pxPerKm });

  const nearby = a ? pts.filter((x) => haversineKm(a, x.p) <= 5).length : 0;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-sky-50" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
          {Array.from({ length: 9 }).map((_, i) => (
            <g key={i} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 4">
              <line x1={(i + 1) * (W / 10)} y1="0" x2={(i + 1) * (W / 10)} y2={H} />
              <line x1="0" y1={(i + 1) * (H / 10)} x2={W} y2={(i + 1) * (H / 10)} />
            </g>
          ))}
          {a && (() => {
            const c = proj(a);
            return <circle cx={c.x} cy={c.y} r={5 * pxPerKm} fill="#3f98b3" fillOpacity="0.15" stroke="#2f8aa6" strokeWidth="2" />;
          })()}
          {pts.map(({ s, p }) => {
            const c = proj(p);
            if (c.x < -10 || c.x > W + 10 || c.y < -10 || c.y > H + 10) return null;
            return (
              <g key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
                <circle cx={c.x} cy={c.y} r="7" fill="#dc2626" stroke="white" strokeWidth="2" />
                {hover === s.id && (
                  <g transform={`translate(${Math.min(c.x + 10, W - 150)},${Math.max(c.y - 52, 4)})`}>
                    <rect width="146" height="46" rx="6" fill="white" stroke="#e2e8f0" />
                    <text x="8" y="17" fontSize="12" fontWeight="700" fill="#0f172a">{s.id} · {s.city}</text>
                    <text x="8" y="33" fontSize="11" fill="#475569">Open since {s.opened} · {s.pin}</text>
                  </g>
                )}
              </g>
            );
          })}
          {a && (() => {
            const c = proj(a);
            return (
              <g onMouseEnter={() => setHover("applicant")} onMouseLeave={() => setHover(null)} className="cursor-pointer">
                <circle cx={c.x} cy={c.y} r="8" fill="#2563eb" stroke="white" strokeWidth="2.5" />
                {hover === "applicant" && (
                  <g transform={`translate(${Math.min(c.x + 12, W - 190)},${Math.max(c.y - 52, 4)})`}>
                    <rect width="186" height="46" rx="6" fill="white" stroke="#e2e8f0" />
                    <text x="8" y="17" fontSize="12" fontWeight="700" fill="#0f172a">Applicant · {applicant!.pin}</text>
                    <text x="8" y="33" fontSize="11" fill="#475569">{applicant!.label.slice(0, 34)}</text>
                  </g>
                )}
              </g>
            );
          })()}
          <text x="10" y={H - 10} fontSize="11" fill="#64748b">{wide ? "Statewide view" : "Catchment view (~24 km)"}</text>
        </svg>
        <div className="absolute right-2 top-2 flex gap-1">
          <button className="rounded-md bg-white/90 px-2 py-1 text-xs font-semibold shadow ring-1 ring-slate-200" onClick={() => setWide((w) => !w)}>
            {wide ? "Zoom to catchment" : "Statewide"}
          </button>
        </div>
      </div>
      <Legend />
      <p className="text-xs text-slate-500">
        {note ?? "No Google Maps key configured — using approximate fallback coordinates."}
        {a && ` ${nearby} existing store(s) within the 5 km radius.`}
      </p>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
      <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-full bg-red-600" /> Existing store</span>
      <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-full bg-blue-600" /> Applicant pin</span>
      <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-full border-2 border-brand-600 bg-brand-100" /> 5 km catchment</span>
    </div>
  );
}
