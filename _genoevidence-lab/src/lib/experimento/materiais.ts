import { z } from "@/lib/zod";
import { OBJETO_IDS } from "@/lib/cena/biblioteca";
import { PapelColuna } from "./schema";

/**
 * Materiais enviados pelo pesquisador, já extraídos (sem os bytes). Os arquivos originais ficam
 * no navegador até o salvamento e, depois, nos arquivos do projeto (acesso controlado).
 */
const Id = z.string().regex(/^[A-Za-z0-9_-]{2,64}$/);

export const ElementoImagem = z.object({
  id: Id,
  objeto: z.enum(OBJETO_IDS),
  rotulo: z.string().max(80),
  /** Onde aparece / observação (“tubos na estante, à esquerda”). */
  nota: z.string().max(200).optional(),
  origem: z.enum(["usuario", "ia"]),
  /** Elementos sugeridos pela IA só entram na cena depois de confirmados. */
  confirmado: z.boolean(),
});
export type ElementoImagem = z.infer<typeof ElementoImagem>;

export const MaterialImagem = z.object({
  id: Id,
  tipo: z.literal("imagem"),
  nome: z.string().max(200),
  mime: z.string().max(40),
  bytes: z.number().int().min(0),
  legenda: z.string().max(300).default(""),
  elementos: z.array(ElementoImagem).max(30),
  /** Identificação automática feita (com autorização) e quando. */
  analisadaEm: z.string().nullable().default(null),
  arquivoId: z.string().max(64).nullable().default(null),
});
export type MaterialImagem = z.infer<typeof MaterialImagem>;

export const MaterialTabela = z.object({
  id: Id,
  tipo: z.literal("tabela"),
  nome: z.string().max(200),
  aba: z.string().max(80).nullable().default(null),
  colunas: z.array(z.string().max(120)).max(60),
  linhas: z.array(z.array(z.string().max(200).nullable()).max(60)).max(2000),
  papeis: z.array(PapelColuna).max(60),
  /** Unidade dos valores, quando não está numa coluna. */
  unidade: z.string().max(24).nullable().default(null),
  totalLinhas: z.number().int().min(0),
  avisos: z.array(z.string().max(300)).max(20).default([]),
  arquivoId: z.string().max(64).nullable().default(null),
});
export type MaterialTabela = z.infer<typeof MaterialTabela>;

export const MaterialRelatorio = z.object({
  id: Id,
  tipo: z.literal("relatorio"),
  nome: z.string().max(200),
  formato: z.enum(["pdf", "docx", "texto"]),
  estado: z.enum(["extraido", "sem_texto", "falhou"]),
  texto: z.string().max(60_000),
  paginas: z.number().int().min(0).nullable().default(null),
  aviso: z.string().max(300).nullable().default(null),
  arquivoId: z.string().max(64).nullable().default(null),
});
export type MaterialRelatorio = z.infer<typeof MaterialRelatorio>;

export const MaterialReferencia = z.object({
  id: Id,
  tipo: z.literal("referencia"),
  forma: z.enum(["doi", "url", "bibliografica"]),
  valor: z.string().max(500),
  titulo: z.string().max(300),
});
export type MaterialReferencia = z.infer<typeof MaterialReferencia>;

export const Material = z.discriminatedUnion("tipo", [MaterialImagem, MaterialTabela, MaterialRelatorio, MaterialReferencia]);
export type Material = z.infer<typeof Material>;

export const EntradaExperimento = z.object({
  texto: z.string().max(8000),
  via: z.enum(["texto", "voz"]),
  materiais: z.array(Material).max(30),
  etapasDe: z.enum(["descricao", "relatorio", "ambos"]),
});
export type EntradaExperimento = z.infer<typeof EntradaExperimento>;

/** Classifica uma referência digitada: DOI, link ou texto bibliográfico. */
export function classificarReferencia(valor: string): { forma: MaterialReferencia["forma"]; valor: string; titulo: string } {
  const v = valor.trim();
  const doi = /(?:doi\.org\/|doi:\s*)?(10\.\d{4,9}\/[^\s"<>]+)/i.exec(v);
  if (doi) return { forma: "doi", valor: doi[1].replace(/[.,;]+$/, ""), titulo: v.length > doi[0].length + 5 ? v : `DOI ${doi[1]}` };
  if (/^https?:\/\/\S+$/i.test(v)) {
    let host = v;
    try {
      host = new URL(v).hostname;
    } catch {
      /* mantém o texto */
    }
    return { forma: "url", valor: v, titulo: host };
  }
  return { forma: "bibliografica", valor: v, titulo: v.slice(0, 300) };
}
