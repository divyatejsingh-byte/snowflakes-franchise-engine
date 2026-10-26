import type { Economics } from "./economics";
export type StatusKind = "ACCEPTED" | "ON_HOLD" | "WAITLISTED" | "REJECTED";
export type Floor = "Ground" | "Mall unit" | "Upper" | "Unknown";
export type Ownership = "Owned" | "Rented" | "Identified" | "Unidentified";

export interface Application {
  id: string;
  name: string;
  email?: string;
  location: string; // original "City · State · Pin code"
  city: string;
  pin: string; // 6-digit zero padded, or "" when unusable
  investment: number | null; // ₹ lakh
  experience: number | null; // years
  business: string;
  space: string; // raw "Space available"
  size: number | null; // sq ft
  floor: string; // raw
  launch: number | null; // months
  language: string;
  notes: string;
  consent?: { granted: boolean; timestamp: string; recordedAt?: string; version: string }; // DPDP Act, 2023 consent record
  power?: string; // "Yes" | "No" | "Unsure" — 3-phase power & cold-chain DG/UPS backup
}

export interface Territory {
  id: string;
  city: string;
  state: string;
  pins: string[];
  tier: 1 | 2 | 3;
  slots: number;
  priority: "High" | "Medium" | "Low";
}

export interface Store {
  id: string;
  city: string;
  pin: string;
  opened: string;
}

export interface Dataset {
  applications: Application[];
  territories: Territory[];
  stores: Store[];
}

export interface ScorePart {
  pts: number;
  max: number;
  detail: string;
}
export interface Breakdown {
  launch: ScorePart;
  capital: ScorePart;
  experience: ScorePart & { parts: { years: number; keyword: number; affinity: "high" | "medium" | "low" } };
  realEstate: ScorePart & { parts: { floor: number; area: number } };
  total: number;
}

export interface Issue {
  issue: string;
  fix: string;
}

export interface Onboarding {
  language: "Kannada" | "English" | "Hindi";
  languageNote: string;
  track: string;
  rampWeeks: number;
  milestones: { week: string; title: string }[];
  timelineNote: string;
}

export interface AltPin { pin: string; territoryId: string; city: string; distanceKm: number; remainingSlots: number }

export interface Result {
  app: Application;
  territory?: Territory;
  prefix: { prefix: string; city: string; tier: 1 | 2 | 3 } | null;
  economics: Economics | null;
  breakdown: Breakdown | null;
  score: number | null;
  status: StatusKind;
  reason: string;
  label: string; // e.g. ON_HOLD (Unmapped Territory)
  narrative: string; // plain-language "why"
  bottlenecks: Issue[];
  onboarding?: Onboarding;
  pinWinnerId?: string;
  territoryRank?: number;
  territoryContenders?: number;
  openPinsInTerritory: string[];
  alternatives: AltPin[]; // nearest uncovered pins with open slots (for rejected / waitlisted partners)
  nextAction: string; // plain-language: what should happen to this partner next
  blockerCount?: number; // how many of the leading bottlenecks are hard blockers (ON_HOLD)
  requirements: string[]; // conditions the partner must meet (certification, power/cold-chain checks)
}
