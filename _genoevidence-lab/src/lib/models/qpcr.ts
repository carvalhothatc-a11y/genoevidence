/**
 * Quantificação relativa em qPCR a partir de valores de Ct INFORMADOS pelo pesquisador.
 *
 * Definições (Rao et al., 2013, Background; Livak & Schmittgen, 2001, resumo):
 *   ΔCt  = Ct(gene-alvo) − Ct(gene de referência)
 *   ΔΔCt = ΔCt(amostra-alvo) − ΔCt(amostra de referência)
 *   mudança relativa = 2^(−ΔΔCt)   — pressupõe eficiência de 100% (2 = 1 + eficiência 1)
 *
 * Razão corrigida pela eficiência: derivada do modelo exponencial N = N₀·(1+E)ⁿ, supondo que, para
 * cada gene, o limiar corresponde à mesma quantidade de produto em todas as amostras:
 *   razão = (1+E_alvo)^(Ct_alvo,ref − Ct_alvo,amostra) / (1+E_ref)^(Ct_ref,ref − Ct_ref,amostra)
 * Pfaffl (2001, resumo) descreve um modelo calculado só com eficiências e diferenças de ciclo da
 * amostra versus o controle; a equação do artigo não foi lida (ver o cartão do modelo).
 * Nada aqui estima eficiência, variância ou significância.
 */
export type CtPar = { alvo: number; referencia: number };

export const CT_MIN = 1;
export const CT_MAX = 50;
/** Faixa aceita para a eficiência informada (em fração: 1 = 100%). Fora dela recusamos como erro de digitação. */
export const EFICIENCIA_MIN = 0.1;
export const EFICIENCIA_MAX = 1.5;
/** Faixas relatadas na literatura citada por Rao et al. (2013): a mais ampla é 60–110%. */
export const EFICIENCIA_RELATADA: [number, number] = [0.6, 1.1];

export function validarCt(v: number): string | null {
  if (!Number.isFinite(v)) return "Informe um número.";
  if (v < CT_MIN || v > CT_MAX) return `Ct fora de ${CT_MIN}–${CT_MAX}: confira a digitação.`;
  return null;
}

export function validarEficiencia(e: number): string | null {
  if (!Number.isFinite(e)) return "Informe um número.";
  if (e < EFICIENCIA_MIN || e > EFICIENCIA_MAX) return `Eficiência fora de ${EFICIENCIA_MIN * 100}–${EFICIENCIA_MAX * 100}%: confira a digitação.`;
  return null;
}

export const deltaCt = (p: CtPar) => p.alvo - p.referencia;

export type ResultadoDdct = { dctAmostra: number; dctReferencia: number; ddct: number; mudanca: number };

/** 2^(−ΔΔCt). `amostra` é a amostra-alvo (ex.: tratada); `referencia` é a amostra de referência (ex.: controle). */
export function ddct(amostra: CtPar, referencia: CtPar): ResultadoDdct {
  for (const v of [amostra.alvo, amostra.referencia, referencia.alvo, referencia.referencia]) {
    const e = validarCt(v);
    if (e) throw new RangeError(e);
  }
  const dctAmostra = deltaCt(amostra);
  const dctReferencia = deltaCt(referencia);
  const d = dctAmostra - dctReferencia;
  return { dctAmostra, dctReferencia, ddct: d, mudanca: Math.pow(2, -d) };
}

/** Razão corrigida pelas eficiências (fração: 0,9 = 90%) do gene-alvo e do gene de referência. */
export function razaoCorrigida(amostra: CtPar, referencia: CtPar, eficienciaAlvo: number, eficienciaRef: number): number {
  for (const v of [amostra.alvo, amostra.referencia, referencia.alvo, referencia.referencia]) {
    const e = validarCt(v);
    if (e) throw new RangeError(e);
  }
  for (const e of [eficienciaAlvo, eficienciaRef]) {
    const m = validarEficiencia(e);
    if (m) throw new RangeError(m);
  }
  const numerador = Math.pow(1 + eficienciaAlvo, referencia.alvo - amostra.alvo);
  const denominador = Math.pow(1 + eficienciaRef, referencia.referencia - amostra.referencia);
  return numerador / denominador;
}

/** Valor com até 3 algarismos significativos, sem notação científica para a faixa usual. */
export function formatarRazao(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1000 || abs < 0.001) return v.toExponential(2).replace(".", ",");
  return Number(v.toPrecision(3)).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}
