"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Restores persisted state after mount (avoids SSR/client markup mismatch). */
export default function Hydrator() {
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  return null;
}
