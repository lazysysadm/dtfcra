"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "***";
const EVENT = "dtfcra-ttc-change";
export const TVA_RATE = 0.2;

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

// Option d'affichage TTC (TVA 20 %) — interface uniquement, jamais dans les exports.
export function useTtc() {
  const ttc = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  function toggle() {
    const next = !getSnapshot();
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // stockage indisponible : l'option reste appliquée pour la session
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return { ttc, toggle };
}

export function withTtc(cents: number, ttc: boolean): number {
  return ttc ? Math.round(cents * (1 + TVA_RATE)) : cents;
}
