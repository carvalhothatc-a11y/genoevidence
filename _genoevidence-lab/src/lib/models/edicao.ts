import { clopperPearson } from "@/lib/ideia/evidencia";

/**
 * Frequência OBSERVADA de edição numa amostra de versões analisadas, com intervalo exato.
 *
 * Ran et al. (2013) descrevem a eficiência como o número de versões modificadas dividido pelo total
 * de versões analisadas, e recomendam analisar mais de 24 para uma aproximação razoável.
 * O intervalo de Clopper–Pearson descreve a incerteza dessa amostra — não prevê uma nova tentativa.
 */
export const VERSOES_RECOMENDADAS = 24;

export type FrequenciaEdicao = {
  modificadas: number;
  analisadas: number;
  proporcao: number;
  ic95: [number, number];
  /** Abaixo do recomendado pela referência: o intervalo fica largo demais para concluir. */
  poucasVersoes: boolean;
};

export function frequenciaEdicao(modificadas: number, analisadas: number): FrequenciaEdicao {
  if (!Number.isInteger(analisadas) || analisadas < 1) throw new RangeError("Versões analisadas: número inteiro maior que zero.");
  if (!Number.isInteger(modificadas) || modificadas < 0 || modificadas > analisadas)
    throw new RangeError("Versões modificadas: número inteiro entre zero e o total analisado.");
  return {
    modificadas,
    analisadas,
    proporcao: modificadas / analisadas,
    ic95: clopperPearson(modificadas, analisadas, 0.95),
    poucasVersoes: analisadas <= VERSOES_RECOMENDADAS,
  };
}
