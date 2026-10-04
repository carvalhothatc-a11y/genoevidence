import { z } from "@/lib/zod";
import { OBJETO_IDS } from "@/lib/cena/biblioteca";
import { ACAO_IDS } from "./schema";

/**
 * Correções feitas pelo pesquisador na síntese. São guardadas à parte e reaplicadas a cada nova
 * interpretação (quando o item correspondente continua existindo), para que reinterpretar os
 * materiais não desfaça silenciosamente o que foi conferido.
 */
export const Correcoes = z.object({
  /** Tipo de ação corrigido, pela chave do trecho. */
  acoes: z.record(z.string().max(200), z.enum(ACAO_IDS)).default({}),
  /** Ações removidas da cena, pela chave do trecho. */
  removidas: z.array(z.string().max(200)).max(60).default([]),
  /** Valor de parâmetro corrigido ou conferido, pela chave “ação|grandeza:contexto”. */
  parametros: z.record(z.string().max(160), z.object({ valor: z.number(), unidade: z.string().max(16), valorCanonico: z.number(), conferido: z.boolean() })).default({}),
  /** Nome do participante no material do pesquisador, pelo objeto. */
  participantes: z.partialRecord(z.enum(OBJETO_IDS), z.string().max(80)).default({}),
  /** Valor escolhido em cada conflito, pela chave. */
  conflitos: z.record(z.string().max(160), z.number().int().min(0)).default({}),
  /** Objetivo reescrito. */
  objetivo: z.string().max(500).nullable().default(null),
});
export type Correcoes = z.infer<typeof Correcoes>;

export const correcoesVazias = (): Correcoes => ({ acoes: {}, removidas: [], parametros: {}, participantes: {}, conflitos: {}, objetivo: null });

/** Chave estável de um trecho (sem acentos, espaços e pontuação). */
export const chaveTrecho = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 200);
