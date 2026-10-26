"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { fallbackCoords, type LatLng } from "@/lib/geo";
import type { Store } from "@/lib/types";
import type { MapApplicant } from "./FranchiseMap";

const KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";
const RADIUS_M = 5000;
const cache = new Map<string, LatLng>();

let keyless = !KEY; // flips to true when Geoapify rejects us, so the map still works
let lastNominatim = 0;

/** Geocode a 6-digit pin code (cached). Geoapify when a working key exists, otherwise OpenStreetMap Nominatim (no key, 1 request/second);
 *  if both fail, approximate coordinates for the city are used. */
async function geocodePin(pin: string, city: string): Promise<LatLng> {
  const hit = cache.get(pin);
  if (hit) return hit;
  try {
    if (!keyless) {
      const res = await fetch(`https://api.geoapify.com/v1/geocode/search?postcode=${pin}&country=India&limit=1&format=json&apiKey=${KEY}`);
      if (res.status === 401 || res.status === 403) keyless = true;
      else {
        const j = await res.json();
        const r = j.results?.[0];
        if (r && typeof r.lat === "number") { const ll = { lat: r.lat, lng: r.lon }; cache.set(pin, ll); return ll; }
      }
    }
    if (keyless) {
      const wait = Math.max(0, lastNominatim + 1100 - Date.now());
      lastNominatim = Date.now() + wait;
      if (wait) await new Promise((r) => setTimeout(r, wait));
      const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pin}&country=India&format=jsonv2&limit=1`, { headers: { Accept: "application/json" } });
      const j = (await res.json()) as { lat?: string; lon?: string }[];
      if (j[0]?.lat) { const ll = { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon!) }; cache.set(pin, ll); return ll; }
    }
  } catch { /* fall through */ }
  const ll = fallbackCoords(pin, city);
  cache.set(pin, ll);
  return ll;
}

const dot = (color: string, size: number, ring = "#fff") =>
  L.divIcon({ className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid ${ring};box-shadow:0 1px 6px rgba(0,0,0,.4)"></span>` });
const storeIcon = dot("#dc2626", 16);
const applicantIcon = dot("#2563eb", 20);

function Recenter({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView([center.lat, center.lng], zoom); }, [map, center.lat, center.lng, zoom]);
  return null;
}

export default function GeoapifyMap({ stores, applicant, height = 380 }: { stores: Store[]; applicant?: MapApplicant; height?: number }) {
  const [coords, setCoords] = useState<Record<string, LatLng>>({});
  const [osm, setOsm] = useState(!KEY);
  const errors = useRef(0);
  const items = useMemo(
    () => [...stores.map((s) => ({ pin: s.pin, city: s.city })), ...(applicant && /^\d{6}$/.test(applicant.pin) ? [{ pin: applicant.pin, city: applicant.city }] : [])],
    [stores, applicant],
  );

  useEffect(() => {
    let live = true;
    (async () => {
      for (const it of items) {
        if (!/^\d{6}$/.test(it.pin) || cache.has(it.pin)) { if (cache.has(it.pin) && live) setCoords((c) => (c[it.pin] ? c : { ...c, [it.pin]: cache.get(it.pin)! })); continue; }
        const ll = await geocodePin(it.pin, it.city);
        if (live) setCoords((c) => ({ ...c, [it.pin]: ll }));
      }
    })();
    return () => { live = false; };
  }, [items]);

  const at = (pin: string, city: string) => coords[pin] ?? fallbackCoords(pin, city);
  const center = applicant && /^\d{6}$/.test(applicant.pin) ? at(applicant.pin, applicant.city) : { lat: 14.5, lng: 76.0 };
  const zoom = applicant ? 12 : 7;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
        <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          {osm ? (
            <TileLayer key="osm" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' maxZoom={19} />
          ) : (
            <TileLayer
              key="geoapify"
              url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${KEY}`}
              attribution='Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | © <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
              maxZoom={18}
              eventHandlers={{ tileerror: () => { errors.current += 1; if (errors.current >= 3) { keyless = true; setOsm(true); } } }}
            />
          )}
          <Recenter center={center} zoom={zoom} />
          {stores.map((s) => {
            const p = at(s.pin, s.city);
            return (
              <Marker key={s.id} position={[p.lat, p.lng]} icon={storeIcon}>
                <Tooltip direction="top" offset={[0, -8]}><b>{s.id}</b> · {s.city} · {s.pin}<br />Operating since {s.opened}</Tooltip>
              </Marker>
            );
          })}
          {applicant && /^\d{6}$/.test(applicant.pin) && (
            <>
              <Circle center={[center.lat, center.lng]} radius={RADIUS_M} pathOptions={{ color: "#2f8aa6", fillColor: "#3f98b3", fillOpacity: 0.15, weight: 2 }} />
              <Marker position={[center.lat, center.lng]} icon={applicantIcon}>
                <Tooltip direction="top" offset={[0, -10]} permanent><b>Pin {applicant.pin}</b><br />{applicant.label}</Tooltip>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-full bg-red-600" /> Existing store</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-full bg-blue-600" /> Applicant pin</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-full border-2 border-brand-600 bg-brand-100" /> 5 km catchment</span>
      </div>
    </div>
  );
}
