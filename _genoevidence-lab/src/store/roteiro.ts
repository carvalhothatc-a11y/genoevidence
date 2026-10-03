"use client";
import { create } from "zustand";
import { interpretarRoteiro, reconstruirPasso, type Acao, type PassoVisual } from "@/lib/visual/roteiro";

/** Roteiro visual gerado a partir da descrição (qualquer técnica), com a etapa em exibição. */
type Estado = {
  texto: string;
  passos: PassoVisual[];
  idx: number;
  tocando: boolean;
  geradoEm: string | null;
  gerar: (texto: string) => void;
  setIdx: (i: number) => void;
  setTocando: (v: boolean) => void;
  corrigir: (id: string, acao: Acao) => void;
  limpar: () => void;
};

export const useRoteiro = create<Estado>((set, get) => ({
  texto: "",
  passos: [],
  idx: 0,
  tocando: false,
  geradoEm: null,
  gerar: (texto) => set({ texto, passos: interpretarRoteiro(texto), idx: 0, tocando: true, geradoEm: new Date().toISOString() }),
  setIdx: (idx) => set({ idx: Math.max(0, Math.min(idx, get().passos.length - 1)) }),
  setTocando: (tocando) => set({ tocando }),
  corrigir: (id, acao) => set((s) => ({ passos: s.passos.map((p) => (p.id === id ? reconstruirPasso(p, acao) : p)) })),
  limpar: () => set({ texto: "", passos: [], idx: 0, tocando: false, geradoEm: null }),
}));
