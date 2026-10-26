export interface LatLng { lat: number; lng: number }

const CITY_CENTERS: Record<string, LatLng> = {
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  mysuru: { lat: 12.2958, lng: 76.6394 },
  mangaluru: { lat: 12.9141, lng: 74.856 },
  hubballi: { lat: 15.3647, lng: 75.124 },
  belagavi: { lat: 15.8497, lng: 74.4977 },
  tumakuru: { lat: 13.3379, lng: 77.1173 },
  davanagere: { lat: 14.4644, lng: 75.9218 },
};
const PREFIX_CITY: Record<string, string> = {
  "560": "bengaluru", "561": "bengaluru", "562": "bengaluru", "570": "mysuru", "571": "mysuru", "575": "mangaluru", "574": "mangaluru",
  "580": "hubballi", "581": "hubballi", "590": "belagavi", "591": "belagavi", "572": "tumakuru", "577": "davanagere",
};

function cityKey(city: string): string | undefined {
  const c = city.toLowerCase();
  return Object.keys(CITY_CENTERS).find((k) => c.includes(k)) || (c.includes("dharwad") ? "hubballi" : undefined);
}

/** Deterministic approximate coordinates used when no Google Maps key is available. */
export function fallbackCoords(pin: string, city = ""): LatLng {
  const key = PREFIX_CITY[pin.slice(0, 3)] || cityKey(city) || "bengaluru";
  const c = CITY_CENTERS[key];
  const n = parseInt(pin.slice(3) || "0", 10) || 0;
  // spread pins within ~±5.5 km of the city centre, stable per pin
  const a = ((n * 37) % 100) / 100 - 0.5;
  const b = ((n * 61 + 17) % 100) / 100 - 0.5;
  return { lat: c.lat + a * 0.1, lng: c.lng + b * 0.1 };
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
