"use client";
import { create } from "zustand";
import { comporCena, type CenaSpec } from "@/lib/cena/compor";
import type { ObjetoId } from "@/lib/cena/biblioteca";
import { correcoesVazias, type Correcoes } from "@/lib/experimento/correcoes";
import { diferencas, interpretarExperimento } from "@/lib/experimento/interpretar";
import type { EntradaExperimento, Material } from "@/lib/experimento/materiais";
import type { Experimento } from "@/lib/experimento/schema";

/**
 * Estado da área de trabalho: rascunho (texto e materiais), versões da descrição estruturada,
 * cena composta, reprodução e salvamento. Arquivos originais ficam só na memória do navegador até
 * serem salvos num projeto; o rascunho (sem os arquivos) fica no armazenamento local.
 */
export type Velocidade = 0.5 | 1 | 2;

type Estado = {
  rascunhoId: string;
  titulo: string;
  texto: string;
  via: "texto" | "voz";
  materiais: Material[];
  arquivos: Record<string, File>;
  previas: Record<string, string>;
  etapasDe: EntradaExperimento["etapasDe"];
  correcoes: Correcoes;
  /** Correções feitas na síntese ainda não aplicadas à visualização. */
  pendente: boolean;
  versoes: Experimento[];
  atual: number;
  cena: CenaSpec | null;
  idx: number;
  tocando: boolean;
  velocidade: Velocidade;
  reinicio: number;
  selecao: ObjetoId | null;
  projetoId: string | null;
  arquivosSalvos: Record<string, string>;
  salvoEm: string | null;
  alterado: boolean;

  setTitulo: (t: string) => void;
  setTexto: (t: string, via?: "texto" | "voz") => void;
  addMaterial: (m: Material, arquivo?: File) => void;
  updMaterial: (id: string, fn: (m: Material) => Material) => void;
  rmMaterial: (id: string) => void;
  setEtapasDe: (v: EntradaExperimento["etapasDe"]) => void;
  /** Interpreta os materiais e cria uma nova versão (se algo mudou). */
  criar: () => { versao: number; mudancas: string[] } | null;
  corrigir: (fn: (c: Correcoes) => Correcoes) => void;
  irVersao: (i: number) => void;
  setIdx: (i: number) => void;
  setTocando: (v: boolean) => void;
  setVelocidade: (v: Velocidade) => void;
  reiniciar: () => void;
  selecionar: (o: ObjetoId | null) => void;
  marcarSalvo: (projetoId: string, arquivos: Record<string, string>, quando: string) => void;
  carregar: (d: { id: string; titulo: string; entrada: EntradaExperimento; correcoes: Correcoes; versoes: Experimento[]; arquivos: Record<string, string> }, projetoId: string) => void;
  novo: () => void;
};

const CHAVE = "genolab:rascunho:v1";
export const novoId = (p = "x") => `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export const entradaDe = (s: Pick<Estado, "texto" | "via" | "materiais" | "etapasDe">): EntradaExperimento => ({ texto: s.texto, via: s.via, materiais: s.materiais, etapasDe: s.etapasDe });

export const temConteudo = (s: Pick<Estado, "texto" | "materiais">) =>
  Boolean(s.texto.trim()) || s.materiais.some((m) => (m.tipo === "relatorio" && m.estado === "extraido") || (m.tipo === "tabela" && m.papeis.includes("valor")) || (m.tipo === "imagem" && m.elementos.some((e) => e.confirmado)));

function persistir(s: Estado) {
  try {
    const leve = {
      rascunhoId: s.rascunhoId,
      titulo: s.titulo,
      texto: s.texto,
      via: s.via,
      materiais: s.materiais,
      etapasDe: s.etapasDe,
      correcoes: s.correcoes,
      versoes: s.versoes.slice(-5),
      projetoId: s.projetoId,
      arquivosSalvos: s.arquivosSalvos,
      salvoEm: s.salvoEm,
    };
    const txt = JSON.stringify(leve);
    if (txt.length < 2_500_000) localStorage.setItem(CHAVE, txt);
  } catch {
    /* armazenamento indisponível: o rascunho vale só nesta sessão */
  }
}

export function lerRascunhoLocal(): Partial<Estado> | null {
  try {
    const t = localStorage.getItem(CHAVE);
    return t ? (JSON.parse(t) as Partial<Estado>) : null;
  } catch {
    return null;
  }
}

const inicial = () => ({
  rascunhoId: novoId("exp"),
  titulo: "",
  texto: "",
  via: "texto" as const,
  materiais: [] as Material[],
  arquivos: {} as Record<string, File>,
  previas: {} as Record<string, string>,
  etapasDe: "descricao" as const,
  correcoes: correcoesVazias(),
  pendente: false,
  versoes: [] as Experimento[],
  atual: -1,
  cena: null as CenaSpec | null,
  idx: 0,
  tocando: false,
  velocidade: 1 as Velocidade,
  reinicio: 0,
  selecao: null as ObjetoId | null,
  projetoId: null as string | null,
  arquivosSalvos: {} as Record<string, string>,
  salvoEm: null as string | null,
  alterado: false,
});

export const useExperimento = create<Estado>((set, get) => {
  const mudou = (patch: Partial<Estado>) => {
    set({ ...patch, alterado: true });
    persistir(get());
  };
  return {
    ...inicial(),
    setTitulo: (titulo) => mudou({ titulo: titulo.slice(0, 160) }),
    setTexto: (texto, via) => mudou({ texto: texto.slice(0, 8000), via: via ?? get().via }),
    addMaterial: (m, arquivo) => {
      const s = get();
      const arquivos = arquivo ? { ...s.arquivos, [m.id]: arquivo } : s.arquivos;
      const previas = arquivo && m.tipo === "imagem" ? { ...s.previas, [m.id]: URL.createObjectURL(arquivo) } : s.previas;
      mudou({ materiais: [...s.materiais, m], arquivos, previas });
    },
    updMaterial: (id, fn) => mudou({ materiais: get().materiais.map((m) => (m.id === id ? fn(m) : m)) }),
    rmMaterial: (id) => {
      const s = get();
      if (s.previas[id]) URL.revokeObjectURL(s.previas[id]);
      const { [id]: _a, ...arquivos } = s.arquivos;
      const { [id]: _p, ...previas } = s.previas;
      void _a;
      void _p;
      mudou({ materiais: s.materiais.filter((m) => m.id !== id), arquivos, previas });
    },
    setEtapasDe: (etapasDe) => mudou({ etapasDe }),
    criar: () => {
      const s = get();
      if (!temConteudo(s)) return null;
      const anterior = s.versoes[s.versoes.length - 1];
      const novo = interpretarExperimento(entradaDe(s), { id: s.rascunhoId, versao: (anterior?.versao ?? 0) + 1, correcoes: s.correcoes });
      const mudancas = anterior ? diferencas(anterior, novo) : [];
      if (anterior && !mudancas.length && JSON.stringify({ ...anterior, versao: 0, criadoEm: "", mudancas: [] }) === JSON.stringify({ ...novo, versao: 0, criadoEm: "", mudancas: [] })) {
        set({ atual: s.versoes.length - 1, cena: comporCena(anterior), idx: 0, tocando: true, pendente: false, reinicio: s.reinicio + 1 });
        return { versao: anterior.versao, mudancas: [] };
      }
      novo.mudancas = mudancas;
      const versoes = [...s.versoes, novo].slice(-30);
      mudou({ versoes, atual: versoes.length - 1, cena: comporCena(novo), idx: 0, tocando: true, pendente: false, selecao: null, reinicio: s.reinicio + 1 });
      return { versao: novo.versao, mudancas };
    },
    corrigir: (fn) => mudou({ correcoes: fn(get().correcoes), pendente: true }),
    irVersao: (i) => {
      const v = get().versoes[i];
      if (v) set({ atual: i, cena: comporCena(v), idx: 0, tocando: false, selecao: null, reinicio: get().reinicio + 1 });
    },
    setIdx: (i) => {
      const n = get().cena?.etapas.length ?? 0;
      set({ idx: Math.max(0, Math.min(i, n - 1)), selecao: null });
    },
    setTocando: (tocando) => set({ tocando }),
    setVelocidade: (velocidade) => set({ velocidade }),
    reiniciar: () => set({ idx: 0, tocando: true, reinicio: get().reinicio + 1 }),
    selecionar: (selecao) => set({ selecao }),
    marcarSalvo: (projetoId, arquivos, quando) => {
      set({ projetoId, arquivosSalvos: { ...get().arquivosSalvos, ...arquivos }, salvoEm: quando, alterado: false, materiais: get().materiais.map((m) => (m.tipo !== "referencia" && arquivos[m.id] ? { ...m, arquivoId: arquivos[m.id] } : m)) });
      persistir(get());
    },
    carregar: (d, projetoId) => {
      const versoes = d.versoes;
      const ult = versoes[versoes.length - 1];
      set({
        ...inicial(),
        rascunhoId: d.id,
        titulo: d.titulo,
        texto: d.entrada.texto,
        via: d.entrada.via,
        materiais: d.entrada.materiais,
        etapasDe: d.entrada.etapasDe,
        correcoes: d.correcoes,
        versoes,
        atual: versoes.length - 1,
        cena: ult ? comporCena(ult) : null,
        projetoId,
        arquivosSalvos: d.arquivos,
        salvoEm: new Date().toISOString(),
        alterado: false,
      });
      persistir(get());
    },
    novo: () => {
      for (const u of Object.values(get().previas)) URL.revokeObjectURL(u);
      set(inicial());
      persistir(get());
    },
  };
});

/** Restaura o rascunho local (sem os arquivos originais, que não sobrevivem ao recarregamento). */
export function restaurarRascunho() {
  const r = lerRascunhoLocal();
  if (!r || (!r.texto && !r.materiais?.length && !r.versoes?.length)) return false;
  const versoes = (r.versoes ?? []) as Experimento[];
  const ult = versoes[versoes.length - 1];
  useExperimento.setState({
    rascunhoId: r.rascunhoId ?? novoId("exp"),
    titulo: r.titulo ?? "",
    texto: r.texto ?? "",
    via: r.via ?? "texto",
    materiais: r.materiais ?? [],
    etapasDe: r.etapasDe ?? "descricao",
    correcoes: r.correcoes ?? correcoesVazias(),
    versoes,
    atual: versoes.length - 1,
    cena: ult ? comporCena(ult) : null,
    projetoId: r.projetoId ?? null,
    arquivosSalvos: r.arquivosSalvos ?? {},
    salvoEm: r.salvoEm ?? null,
  });
  return true;
}
