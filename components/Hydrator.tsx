"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Restores persisted state after mount (avoids SSR/client markup mismatch). */
export default function Hydrator() {
  useEffect(() => {
    // purge anything an older version left in long-lived browser storage
    try { ["franchise-engine-v2", "franchise-engine-v3", "franchise-engine-v4"].forEach((k) => localStorage.removeItem(k)); } catch { /* storage unavailable */ }
    useStore.persist.rehydrate();
  }, []);
  return null;
}
