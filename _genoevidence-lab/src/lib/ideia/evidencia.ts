import { z } from "zod";
import type { Cenario } from "./schema";

/**
 * PREVISÕES QUANTITATIVAS RASTREÁVEIS.
 *
 * Três informações apresentadas separadamente:
 *  1. Frequência observada — o que a fonte relata (sucessos/total, com contexto e trecho).
 *  2. Probabilidade estimada — SOMENTE por um modelo preditivo validado e registrado abaixo.
 *  3. Qualidade da evidência — avaliação das fontes e da compatibilidade com o cenário
 *     (qualitativa; nunca apresentada como probabilidade de sucesso).
 *
 * Toda conta é feita por rotinas determinísticas deste arquivo (nenhum número vem de modelo de
 * linguagem). Não há combinação de estudos: cada frequência é mostrada isoladamente.
 */

// ---------------------------------------------------------------- 1. resultado previsto (definição prévia)

export type ResultadoDefinido = {
  id: string;
  resultado: string;
  criterioSucesso: string;
  condicoes: string;
  contexto: string;
};

/** Primeiro (e único) resultado mensurável definido nesta versão. */
export const RESULTADOS: ResultadoDefinido[] = [
  {
    id: "banda_unica_tamanho_esperado",
    resultado: "Banda única do tamanho esperado no gel de agarose",
    criterioSucesso: "Uma banda na canaleta da amostra com o tamanho esperado estimado pelo marcador, sem bandas adicionais, e ausência de banda no controle negativo.",
    condicoes: "PCR convencional de ponto final com o par de primers, a polimerase e o programa descritos no cenário.",
    contexto: "Aplica-se a um par de primers e um molde específicos; não vale para “sucesso da pesquisa” em geral.",
  },
];

// ---------------------------------------------------------------- 2. frequências publicadas (evidência extraída)

export const FrequenciaPublicada = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{4,64}$/),
    resultadoId: z.enum(["banda_unica_tamanho_esperado"]),
    sucessos: z.number().int().min(0).max(1_000_000),
    total: z.number().int().min(1).max(1_000_000),
    /** O que exatamente foi contado (ex.: "pares de primers", "reações", "amostras"). */
    unidadeContagem: z.string().min(2).max(80),
    contexto: z.string().min(5).max(500),
    condicoes: z.object({
      polimerase: z.enum(["taq", "pfu", "outra", "nao_informado"]),
      ampliconMinPb: z.number().int().min(1).nullable(),
      ampliconMaxPb: z.number().int().min(1).nullable(),
      ciclosMin: z.number().int().min(1).nullable(),
      ciclosMax: z.number().int().min(1).nullable(),
      tipoMolde: z.string().max(80).nullable(),
    }),
    fonte: z.object({
      referenciaId: z.string().max(64).nullable(),
      citacao: z.string().min(5).max(400),
      localizador: z.string().min(1).max(120),
      trecho: z.string().min(10).max(1200),
    }),
    /** Identifica a amostra/coorte para impedir contar duas vezes os mesmos dados. */
    grupoAmostral: z.string().max(120).nullable(),
    origem: z.enum(["pesquisador", "catalogo"]),
    conferidaPor: z.string().max(120).nullable(),
    registradaEm: z.string(),
  })
  .refine((f) => f.sucessos <= f.total, { message: "Sucessos não podem exceder o total.", path: ["sucessos"] });
export type FrequenciaPublicada = z.infer<typeof FrequenciaPublicada>;

/**
 * Catálogo embutido: VAZIO. Nas seções lidas das fontes do módulo de PCR (Lorenz 2012; Lee et al.
 * 2012) não foram extraídas contagens de sucesso com denominador para o resultado definido acima.
 * Nenhum número é colocado aqui para preencher a interface.
 */
export const FREQUENCIAS_CATALOGO: FrequenciaPublicada[] = [];

/** O trecho deve conter os números informados (conferência mínima de rastreabilidade). */
export function trechoSustentaNumeros(f: Pick<FrequenciaPublicada, "sucessos" | "total" | "fonte">): boolean {
  const nums = new Set((f.fonte.trecho.match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => x.replace(",", ".")));
  return nums.has(String(f.sucessos)) && nums.has(String(f.total));
}

// ---------------------------------------------------------------- intervalo exato (Clopper–Pearson)

function lgamma(x: number): number {
  // Lanczos (g = 7, n = 9)
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Função beta incompleta regularizada I_x(a, b). */
export function betaRegularizada(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Quantil da distribuição Beta por bisseção (monotônica; 100 iterações → erro < 1e-15). */
function betaQuantil(p: number, a: number, b: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (betaRegularizada(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Intervalo exato de Clopper–Pearson para uma proporção binomial (x sucessos em n). */
export function clopperPearson(x: number, n: number, confianca = 0.95): [number, number] {
  if (!Number.isInteger(x) || !Number.isInteger(n) || n < 1 || x < 0 || x > n) throw new RangeError("Contagens inválidas.");
  const alpha = 1 - confianca;
  const lo = x === 0 ? 0 : betaQuantil(alpha / 2, x, n - x + 1);
  const hi = x === n ? 1 : betaQuantil(1 - alpha / 2, x + 1, n - x);
  return [lo, hi];
}

/** Percentual sem precisão desnecessária (inteiro; "<1%" e ">99%" nos extremos). */
export function pct(p: number): string {
  const v = p * 100;
  if (v > 0 && v < 1) return "<1%";
  if (v < 100 && v > 99) return ">99%";
  return `${Math.round(v)}%`;
}

// ---------------------------------------------------------------- 3. qualidade e compatibilidade

export type Compat = "compativel" | "diferente" | "nao_comparavel";
export type ItemCompat = { condicao: string; cenario: string; fonte: string; estado: Compat };

export function compatibilidade(f: FrequenciaPublicada, c: Cenario): ItemCompat[] {
  const out: ItemCompat[] = [];
  const pol = c.polimerase ?? "nao_informado";
  out.push({
    condicao: "Polimerase",
    cenario: pol === "nao_informado" ? "não informada" : pol,
    fonte: f.condicoes.polimerase === "nao_informado" ? "não informada" : f.condicoes.polimerase,
    estado: pol === "nao_informado" || f.condicoes.polimerase === "nao_informado" ? "nao_comparavel" : pol === f.condicoes.polimerase ? "compativel" : "diferente",
  });
  const amp = c.alvo.ampliconPb;
  const { ampliconMinPb: amin, ampliconMaxPb: amax } = f.condicoes;
  out.push({
    condicao: "Tamanho do amplicon",
    cenario: amp === null ? "não informado" : `${amp} pb`,
    fonte: amin === null && amax === null ? "não informado" : `${amin ?? "?"}–${amax ?? "?"} pb`,
    estado: amp === null || (amin === null && amax === null) ? "nao_comparavel" : (amin === null || amp >= amin) && (amax === null || amp <= amax) ? "compativel" : "diferente",
  });
  const cic = c.programa.ciclos;
  const { ciclosMin: cmin, ciclosMax: cmax } = f.condicoes;
  out.push({
    condicao: "Número de ciclos",
    cenario: cic === null ? "não informado" : String(cic),
    fonte: cmin === null && cmax === null ? "não informado" : `${cmin ?? "?"}–${cmax ?? "?"}`,
    estado: cic === null || (cmin === null && cmax === null) ? "nao_comparavel" : (cmin === null || cic >= cmin) && (cmax === null || cic <= cmax) ? "compativel" : "diferente",
  });
  return out;
}

export type Qualidade = {
  tamanhoAmostra: string;
  rastreabilidade: string;
  compatibilidade: string;
  alertas: string[];
};

/** Avaliação QUALITATIVA da evidência. Não é probabilidade de sucesso. */
export function qualidadeEvidencia(f: FrequenciaPublicada, c: Cenario, todas: FrequenciaPublicada[]): Qualidade {
  const comp = compatibilidade(f, c);
  const dif = comp.filter((x) => x.estado === "diferente").length;
  const nc = comp.filter((x) => x.estado === "nao_comparavel").length;
  const alertas: string[] = [];
  if (!trechoSustentaNumeros(f)) alertas.push("O trecho registrado não contém os dois números informados: confira a extração.");
  if (f.grupoAmostral && todas.some((o) => o.id !== f.id && o.grupoAmostral === f.grupoAmostral)) alertas.push("Outra frequência usa o mesmo grupo amostral: os dados não podem ser somados (contagem duplicada).");
  if (f.origem === "pesquisador" && !f.conferidaPor) alertas.push("Registrada sem conferência do trecho.");
  return {
    tamanhoAmostra: f.total < 10 ? `Amostra muito pequena (${f.total} ${f.unidadeContagem}).` : f.total < 30 ? `Amostra pequena (${f.total} ${f.unidadeContagem}).` : `${f.total} ${f.unidadeContagem}.`,
    rastreabilidade: f.origem === "catalogo" ? "Extraída e conferida no catálogo do GenoLab." : f.conferidaPor ? `Registrada e conferida pelo pesquisador (${f.conferidaPor}); trecho não verificado pela plataforma.` : "Registrada pelo pesquisador; trecho não verificado pela plataforma.",
    compatibilidade: dif ? `${dif} condição(ões) diferente(s) do cenário.` : nc ? `Sem diferenças identificadas; ${nc} condição(ões) não comparável(is) por falta de informação.` : "Condições registradas compatíveis com o cenário.",
    alertas,
  };
}

// ---------------------------------------------------------------- 4. modelos preditivos validados

export type ModeloPreditivo = {
  id: string;
  versao: string;
  resultadoId: string;
  metodo: string;
  pressupostos: string[];
  /** Domínio coberto; fora dele a previsão é suspensa. */
  dominio: (c: Cenario) => { suportado: boolean; motivo?: string };
  prever: (c: Cenario) => { p: number; intervalo: [number, number] };
  validacao: { estrategia: string; nIndependente: number; calibracao: string };
  referencias: string[];
};

/**
 * Registro de modelos validados: VAZIO nesta versão. Um modelo só entra aqui com dados de
 * treinamento rastreáveis, validação em dados independentes e verificação de calibração.
 */
export const MODELOS_VALIDADOS: ModeloPreditivo[] = [];

export type Previsao =
  | { status: "calculada"; modelo: ModeloPreditivo; p: number; intervalo: [number, number] }
  | { status: "suspensa"; motivo: string };

export function preverResultado(resultadoId: string, c: Cenario, modelos = MODELOS_VALIDADOS): Previsao {
  const m = modelos.find((x) => x.resultadoId === resultadoId);
  if (!m) return { status: "suspensa", motivo: "Não há modelo preditivo validado para este resultado. Nenhuma probabilidade é exibida." };
  const dom = m.dominio(c);
  if (!dom.suportado) return { status: "suspensa", motivo: `O cenário está fora das condições suportadas pelo modelo ${m.id} v${m.versao}${dom.motivo ? `: ${dom.motivo}` : ""}. A previsão foi suspensa (sem extrapolação).` };
  const r = m.prever(c);
  return { status: "calculada", modelo: m, p: r.p, intervalo: r.intervalo };
}
