"use client";
import { create } from "zustand";
import { interpretarDescricao, type Interpretacao } from "@/lib/ideia/parse";
import { Cenario, setCampo, type Campo, type Valor } from "@/lib/ideia/schema";

/**
 * Estado do fluxo “Explorar uma ideia”:
 * descrever → conferir plano → visualizar → avaliar → comparar.
 * Antes da confirmação, as edições corrigem o rascunho; depois dela, cada alteração cria uma
 * NOVA VERSÃO do cenário e a anterior é preservada para comparação.
 */
export type Passo = "descrever" | "conferir" | "visualizar" | "avaliar" | "comparar";

export type CenarioVersoes = { id: string; versoes: Cenario[] };

type Estado = {
  passo: Passo;
  ideiaId: string;
  titulo: string;
  texto: string;
  via: Cenario["entrada"]["via"];
  interpretacao: Interpretacao | null;
  /** Rascunho em conferência (antes da confirmação). */
  rascunho: Cenario | null;
  cenarios: CenarioVersoes[];
  ativo: string | null;
  /** Última alteração aplicada (para explicar o que mudou). */
  ultimaMudanca: { cenarioId: string; de: number; para: number } | null;
  projetoId: string | null;
  salvoEm: string | null;
  setPasso: (p: Passo) => void;
  setTexto: (t: string, via?: Cenario["entrada"]["via"]) => void;
  setTitulo: (t: string) => void;
  setProjeto: (id: string | null) => void;
  interpretar: () => void;
  /** Interpreta sem abrir a conferência (o plano fica disponível como rascunho). */
  interpretarSilencioso: () => void;
  editarRascunho: (campo: Campo, valor: Valor) => void;
  setReferencias: (ids: string[]) => void;
  confirmar: () => void;
  aplicar: (cenarioId: string, mudancas: { campo: Campo; valor: Valor }[]) => void;
  duplicar: () => void;
  setAtivo: (id: string) => void;
  marcarSalvo: (quando: string) => void;
  carregar: (dados: { ideiaId: string; titulo: string; cenarios: CenarioVersoes[]; projetoId: string | null }) => void;
  reiniciar: () => void;
};

const rid = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export function atual(c: CenarioVersoes): Cenario {
  return c.versoes[c.versoes.length - 1];
}

const inicial = () => ({
  passo: "descrever" as Passo,
  ideiaId: rid("id_"),
  titulo: "",
  texto: "",
  via: "texto" as Cenario["entrada"]["via"],
  interpretacao: null,
  rascunho: null,
  cenarios: [],
  ativo: null,
  ultimaMudanca: null,
  salvoEm: null,
});

export const useIdeia = create<Estado>((set, get) => ({
  ...inicial(),
  projetoId: null,
  setPasso: (passo) => set({ passo }),
  setTexto: (texto, via) => set((s) => ({ texto, via: via ?? s.via })),
  setTitulo: (titulo) => set({ titulo }),
  setProjeto: (projetoId) => set((s) => ({ projetoId, rascunho: s.rascunho ? { ...s.rascunho, projetoId, referencias: [] } : null })),
  interpretar: () => {
    const { texto, via, projetoId } = get();
    const r = interpretarDescricao(texto, { id: rid("c_"), via });
    r.cenario.projetoId = projetoId;
    set({ interpretacao: r, rascunho: r.cenario, passo: "conferir", cenarios: [], ativo: null, ultimaMudanca: null, salvoEm: null });
  },
  interpretarSilencioso: () => {
    const { texto, via, projetoId } = get();
    const r = interpretarDescricao(texto, { id: rid("c_"), via });
    r.cenario.projetoId = projetoId;
    set({ interpretacao: r, rascunho: r.cenario, cenarios: [], ativo: null, ultimaMudanca: null, salvoEm: null, passo: "descrever" });
  },
  editarRascunho: (campo, valor) => set((s) => (s.rascunho ? { rascunho: setCampo(s.rascunho, campo, valor) } : {})),
  setReferencias: (ids) => set((s) => (s.rascunho ? { rascunho: { ...s.rascunho, referencias: ids } } : {})),
  confirmar: () => {
    const r = get().rascunho;
    if (!r) return;
    const valido = Cenario.parse({ ...r, versao: 1, nome: "Cenário A", criadoEm: new Date().toISOString() });
    set({ cenarios: [{ id: valido.id, versoes: [valido] }], ativo: valido.id, passo: "visualizar", ultimaMudanca: null, titulo: get().titulo || (valido.objetivo ?? "Ideia sem título").slice(0, 160) });
  },
  aplicar: (cenarioId, mudancas) =>
    set((s) => {
      const cv = s.cenarios.find((c) => c.id === cenarioId);
      if (!cv || !mudancas.length) return {};
      const base = atual(cv);
      let next = base;
      for (const m of mudancas) next = setCampo(next, m.campo, m.valor);
      next = Cenario.parse({ ...next, versao: base.versao + 1, criadoEm: new Date().toISOString() });
      return {
        cenarios: s.cenarios.map((c) => (c.id === cenarioId ? { ...c, versoes: [...c.versoes, next] } : c)),
        ultimaMudanca: { cenarioId, de: base.versao, para: next.versao },
        salvoEm: null,
      };
    }),
  duplicar: () =>
    set((s) => {
      const a = s.cenarios[0];
      if (!a || s.cenarios.length >= 2) return {};
      const copia = Cenario.parse({ ...structuredClone(atual(a)), id: rid("c_"), nome: "Cenário B", versao: 1, criadoEm: new Date().toISOString() });
      return { cenarios: [...s.cenarios, { id: copia.id, versoes: [copia] }], ativo: copia.id, passo: "comparar", salvoEm: null };
    }),
  setAtivo: (ativo) => set({ ativo }),
  marcarSalvo: (salvoEm) => set({ salvoEm }),
  carregar: ({ ideiaId, titulo, cenarios, projetoId }) =>
    set({ ...inicial(), ideiaId, titulo, cenarios, ativo: cenarios[0]?.id ?? null, projetoId, texto: cenarios[0]?.versoes[0]?.entrada.texto ?? "", passo: "visualizar" }),
  reiniciar: () => set({ ...inicial() }),
}));
