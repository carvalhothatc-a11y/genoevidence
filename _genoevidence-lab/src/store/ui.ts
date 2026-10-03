"use client";
import { create } from "zustand";

export type Quality = "baixa" | "media" | "alta";

type UiState = {
  /** Pausa global de animações (3D, ilustrações moleculares e interface). */
  paused: boolean;
  quality: Quality;
  /** Dicas discretas para iniciantes (podem ser desativadas). */
  hints: boolean;
  setHints: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  togglePaused: () => void;
  setQuality: (q: Quality) => void;
};

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* armazenamento indisponível: preferência vale só nesta sessão */
  }
}

export const useUi = create<UiState>((set, get) => ({
  paused: false,
  quality: "media",
  hints: true,
  setHints: (v) => {
    writePref("lv:hints", String(v));
    set({ hints: v });
  },
  setPaused: (v) => {
    document.documentElement.dataset.paused = String(v);
    writePref("lv:paused", String(v));
    set({ paused: v });
  },
  togglePaused: () => get().setPaused(!get().paused),
  setQuality: (q) => {
    writePref("lv:quality", q);
    set({ quality: q });
  },
}));

/** Carrega preferências salvas (chamado uma vez no cliente). */
export function hydrateUiPrefs() {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const paused = readPref("lv:paused", ["true", "false"] as const, reduced ? "true" : "false") === "true";
  const small = window.matchMedia?.("(max-width: 767px)").matches ?? false;
  const quality = readPref("lv:quality", ["baixa", "media", "alta"] as const, small ? "baixa" : "media");
  const hints = readPref("lv:hints", ["true", "false"] as const, "true") === "true";
  document.documentElement.dataset.paused = String(paused);
  useUi.setState({ paused, quality, hints });
}

export function readIntroSeen(): boolean {
  try {
    return window.localStorage.getItem("lv:intro-vista") === "1";
  } catch {
    return false;
  }
}
export function markIntroSeen() {
  writePref("lv:intro-vista", "1");
}
