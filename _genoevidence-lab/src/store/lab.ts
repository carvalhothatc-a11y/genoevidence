"use client";
import { create } from "zustand";
import type { ZoneId } from "@/lib/lab/objects";

export type TubeLocation = "gelo" | "centrifuga" | "termociclador";

export type IntroState = "pendente" | "tocando" | "concluida";
export type Overlay = null | "molecular" | "resultados";

type LabState = {
  /** Entrada no laboratório (breve, pulável). */
  intro: IntroState;
  /** Escala aberta sobre a bancada (processo molecular ou resultados). */
  overlay: Overlay;
  /** Vista atual: "geral", uma zona ou um objeto. */
  view: string;
  /** Contador que força a câmera a voltar à vista atual (reiniciar câmera). */
  cameraNonce: number;
  selected: string | null;
  selectedPart: string | null;
  hovered: string | null;
  // Interações com valor educativo
  thermocyclerOpen: boolean;
  tubes: TubeLocation;
  programRunning: boolean;
  centrifugeOpen: boolean;
  /** Posições ocupadas no rotor de 8 posições (0–7). */
  rotorSlots: number[];
  spinning: boolean;
  /** Reagente destacado no balde de gelo (sincronizado com o master mix). */
  highlightReagent: string | null;
  setIntro: (v: IntroState) => void;
  setOverlay: (v: Overlay) => void;
  setView: (v: string) => void;
  resetCamera: () => void;
  select: (id: string | null, part?: string | null) => void;
  setHovered: (id: string | null) => void;
  setThermocyclerOpen: (v: boolean) => void;
  setTubes: (v: TubeLocation) => void;
  setProgramRunning: (v: boolean) => void;
  setCentrifugeOpen: (v: boolean) => void;
  toggleRotorSlot: (i: number) => void;
  setSpinning: (v: boolean) => void;
  setHighlightReagent: (id: string | null) => void;
};

export const useLab = create<LabState>((set) => ({
  intro: "pendente",
  overlay: null,
  view: "geral",
  cameraNonce: 0,
  selected: null,
  selectedPart: null,
  hovered: null,
  thermocyclerOpen: false,
  tubes: "gelo",
  programRunning: false,
  centrifugeOpen: false,
  rotorSlots: [],
  spinning: false,
  highlightReagent: null,
  setIntro: (intro) => set({ intro }),
  setOverlay: (overlay) => set({ overlay }),
  setView: (view) => set({ view }),
  resetCamera: () => set((s) => ({ cameraNonce: s.cameraNonce + 1 })),
  select: (selected, part = null) => set({ selected, selectedPart: part }),
  setHovered: (hovered) => set({ hovered }),
  setThermocyclerOpen: (thermocyclerOpen) => set((s) => ({ thermocyclerOpen, programRunning: thermocyclerOpen ? false : s.programRunning })),
  setTubes: (tubes) => set({ tubes }),
  setProgramRunning: (programRunning) => set({ programRunning }),
  setCentrifugeOpen: (centrifugeOpen) => set({ centrifugeOpen }),
  toggleRotorSlot: (i) => set((s) => ({ rotorSlots: s.rotorSlots.includes(i) ? s.rotorSlots.filter((x) => x !== i) : [...s.rotorSlots, i].sort() })),
  setSpinning: (spinning) => set({ spinning }),
  setHighlightReagent: (highlightReagent) => set({ highlightReagent }),
}));

/** Rotor balanceado: cada posição ocupada tem a posição oposta (i+4) também ocupada. */
export function isRotorBalanced(slots: number[]): boolean {
  if (slots.length === 0) return false;
  return slots.every((i) => slots.includes((i + 4) % 8));
}

export function zoneOfView(view: string): ZoneId | null {
  return (["pre", "amp", "pos", "analise"] as const).find((z) => z === view) ?? null;
}
