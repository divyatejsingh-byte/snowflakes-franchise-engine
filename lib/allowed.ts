import type { Store, Territory } from "./types";

/** "Allowed values" sheet: first 3 digits of the pin code determine city and tier. */
export const PIN_PREFIXES: Record<string, { city: string; tier: 1 | 2 | 3 }> = {
  "560": { city: "Bengaluru", tier: 1 },
  "570": { city: "Mysuru", tier: 2 },
  "575": { city: "Mangaluru", tier: 2 },
  "580": { city: "Hubballi-Dharwad", tier: 2 },
  "590": { city: "Belagavi", tier: 2 },
  "572": { city: "Tumakuru", tier: 3 },
  "577": { city: "Davanagere", tier: 3 },
};

export interface PrefixInfo { prefix: string; city: string; tier: 1 | 2 | 3 }

export function prefixOf(pin: string): PrefixInfo | null {
  const p = PIN_PREFIXES[pin.slice(0, 3)];
  return /^\d{6}$/.test(pin) && p ? { prefix: pin.slice(0, 3), ...p } : null;
}

export type PinCheck =
  | { kind: "out_of_scope" }
  | { kind: "cannibalised"; info: PrefixInfo; store: Store }
  | { kind: "unmapped"; info: PrefixInfo }
  | { kind: "full"; info: PrefixInfo; territory: Territory }
  | { kind: "eligible"; info: PrefixInfo; territory: Territory };

/** Sequential flow: A) prefix, B) cannibalisation, C) territory + open slots. */
export function checkPin(pin: string, stores: Store[], territories: Territory[]): PinCheck {
  const info = prefixOf(pin);
  if (!info) return { kind: "out_of_scope" };
  const store = stores.find((s) => s.pin === pin);
  if (store) return { kind: "cannibalised", info, store };
  const territory = territories.find((t) => t.pins.includes(pin));
  if (!territory) return { kind: "unmapped", info };
  return territory.slots > 0 ? { kind: "eligible", info, territory } : { kind: "full", info, territory };
}
