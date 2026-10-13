import { z } from "@/lib/zod";

/**
 * Caderno de laboratório: o que a pessoa fez em cada dia de bancada.
 *
 * Duas decisões que valem para tudo aqui:
 *
 * 1. **Não exige projeto.** O registro é da pessoa, não de um projeto. Ligar a um projeto ou a um
 *    experimento é opcional e pode ser feito depois — ninguém precisa nomear um projeto para
 *    escrever o que aconteceu hoje.
 * 2. **Nada é reescrito em silêncio.** Toda edição guarda a versão anterior. Um caderno que pode
 *    ser alterado sem deixar rastro não serve como registro, e é exatamente para servir de
 *    registro que ele existe.
 */

/** Um dia tem no máximo isto de texto; o suficiente para um dia de bancada detalhado. */
export const MAX_TEXTO = 20_000;
export const MAX_ARQUIVOS = 12;
/** Guardamos as últimas versões; acima disso, as mais antigas saem (a original sempre fica). */
export const MAX_VERSOES = 30;

/** Data no calendário local (YYYY-MM-DD), não instante: o dia de bancada é um dia, não um horário. */
export const Dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dia inválido.");

export const ArquivoRegistro = z.object({
  id: z.string(),
  nome: z.string(),
  mime: z.string(),
  tamanho: z.number().int().nonnegative(),
  sha256: z.string(),
  /** Legenda opcional: o que a foto mostra. */
  legenda: z.string().max(300).optional(),
  enviadoEm: z.string(),
});
export type ArquivoRegistro = z.infer<typeof ArquivoRegistro>;

/** Versão anterior de um registro, guardada ao editar. */
export const VersaoRegistro = z.object({
  dia: Dia,
  texto: z.string(),
  /** Quando esta versão deixou de ser a atual. */
  substituidaEm: z.string(),
});
export type VersaoRegistro = z.infer<typeof VersaoRegistro>;

export const Registro = z.object({
  id: z.string(),
  dia: Dia,
  texto: z.string().max(MAX_TEXTO),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
  /** Vínculos opcionais. Guardamos só o identificador; o acesso é conferido na hora de mostrar. */
  projetoId: z.string().optional(),
  experimentoId: z.string().optional(),
  arquivos: z.array(ArquivoRegistro).max(MAX_ARQUIVOS).default([]),
  versoes: z.array(VersaoRegistro).default([]),
});
export type Registro = z.infer<typeof Registro>;

/** O que a interface envia ao criar ou editar. */
export const EntradaRegistro = z.object({
  dia: Dia,
  texto: z.string().trim().min(1, "Escreva o que você fez.").max(MAX_TEXTO),
  projetoId: z.string().max(80).optional(),
  experimentoId: z.string().max(80).optional(),
});
export type EntradaRegistro = z.infer<typeof EntradaRegistro>;

/** Dia de hoje no fuso de quem escreve (o servidor não decide o dia por conta própria). */
export function diaDeHoje(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** “quinta, 9 de outubro de 2026”. Interpreta como data local, não UTC. */
export function diaPorExtenso(dia: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!m) return dia;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const semana = DIAS[d.getDay()].replace("-feira", "");
  return `${semana}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Quantas vezes o registro foi editado (versões guardadas). */
export function vezesEditado(r: Pick<Registro, "versoes">): number {
  return r.versoes.length;
}
