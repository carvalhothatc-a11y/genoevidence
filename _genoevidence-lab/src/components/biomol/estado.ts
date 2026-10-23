"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { FitaFornecida, TipoSequencia } from "@/lib/biomol/sequencias";

/**
 * Estado compartilhado entre as abas da BioMol: as sequências que a pessoa colou, qual está ativa,
 * o código genético e qual fita do DNA ela forneceu.
 *
 * Fica só NESTE navegador, no armazenamento da aba (sessionStorage): some quando a aba fecha e ao
 * sair da conta. Nada disso vai para o servidor.
 */

export const CHAVE_BIOMOL = "genolab:biomol";

export type SeqSalva = {
  id: string;
  nome: string;
  descricao?: string;
  seq: string;
  tipo: TipoSequencia;
  /** O tipo veio da detecção automática e ainda não foi confirmado pela pessoa. */
  tipoSugerido?: boolean;
  exemplo?: boolean;
};

type Estado = {
  sequencias: SeqSalva[];
  ativa: string | null;
  codigo: number;
  /** Qual fita do DNA a pessoa colou. Começa vazio: é a pessoa quem diz, não o GenoLab que supõe. */
  fita: FitaFornecida | null;
  adicionar: (novas: Omit<SeqSalva, "id">[]) => void;
  substituir: (novas: Omit<SeqSalva, "id">[]) => void;
  remover: (id: string) => void;
  escolher: (id: string) => void;
  definirTipo: (id: string, tipo: TipoSequencia) => void;
  /** Guarda uma sequência derivada (complemento, RNA, proteína…) como nova e a deixa ativa. */
  derivar: (base: SeqSalva, nome: string, seq: string, tipo: TipoSequencia, descricao: string) => void;
  setCodigo: (id: number) => void;
  setFita: (f: FitaFornecida) => void;
  limpar: () => void;
};

const novoId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const MAX_SEQUENCIAS = 20;

export const useBioMol = create<Estado>()(
  persist(
    (set) => ({
      sequencias: [],
      ativa: null,
      codigo: 1,
      fita: null,
      adicionar: (novas) =>
        set((s) => {
          const comId = novas.map((n) => ({ ...n, id: novoId() }));
          const sequencias = [...s.sequencias, ...comId].slice(-MAX_SEQUENCIAS);
          return { sequencias, ativa: comId[0]?.id ?? s.ativa };
        }),
      substituir: (novas) =>
        set(() => {
          const sequencias = novas.slice(0, MAX_SEQUENCIAS).map((n) => ({ ...n, id: novoId() }));
          return { sequencias, ativa: sequencias[0]?.id ?? null };
        }),
      remover: (id) =>
        set((s) => {
          const sequencias = s.sequencias.filter((x) => x.id !== id);
          return { sequencias, ativa: s.ativa === id ? (sequencias[0]?.id ?? null) : s.ativa };
        }),
      escolher: (id) => set({ ativa: id }),
      definirTipo: (id, tipo) => set((s) => ({ sequencias: s.sequencias.map((x) => (x.id === id ? { ...x, tipo, tipoSugerido: false } : x)) })),
      derivar: (base, nome, seq, tipo, descricao) =>
        set((s) => {
          const nova: SeqSalva = { id: novoId(), nome, seq, tipo, descricao, exemplo: base.exemplo };
          return { sequencias: [...s.sequencias, nova].slice(-MAX_SEQUENCIAS), ativa: nova.id };
        }),
      setCodigo: (codigo) => set({ codigo }),
      setFita: (fita) => set({ fita }),
      limpar: () => set({ sequencias: [], ativa: null }),
    }),
    {
      name: CHAVE_BIOMOL,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ sequencias: s.sequencias, ativa: s.ativa, codigo: s.codigo, fita: s.fita }),
      // Lido depois da montagem (ver `useHidratarBioMol`): o servidor não vê o armazenamento da aba,
      // e ler antes faria a primeira tela do navegador diferir da do servidor.
      skipHydration: true,
    },
  ),
);

/** Lê o que estava guardado na aba. Chamado uma vez, pelas abas da BioMol. */
export function useHidratarBioMol() {
  useEffect(() => {
    void useBioMol.persist.rehydrate();
  }, []);
}

/** A sequência ativa (ou null). */
export function useAtiva(): SeqSalva | null {
  return useBioMol((s) => s.sequencias.find((x) => x.id === s.ativa) ?? null);
}
