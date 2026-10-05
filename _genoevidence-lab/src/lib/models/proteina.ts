/**
 * Volume de extrato proteico para aplicar uma massa desejada por poço (Mahmood & Yang, 2012):
 * a concentração medida permite calcular a massa aplicada pela relação massa = concentração × volume.
 * O protocolo da referência usa 50 µg por poço, 5 µL de tampão de amostra e sugere 15 µL por
 * canaleta, completando com água. Esses valores são exemplos do protocolo, não regras.
 */
export const MASSA_PADRAO_UG = 50;
export const TAMPAO_UL = 5;
export const TOTAL_SUGERIDO_UL = 15;

export type VolumeProteina = { volumeExtratoUl: number; aguaUl: number | null; cabe: boolean };

export function volumeParaMassa(massaUg: number, concentracaoUgPorUl: number, totalUl = TOTAL_SUGERIDO_UL, tampaoUl = TAMPAO_UL): VolumeProteina {
  if (!Number.isFinite(massaUg) || massaUg <= 0) throw new RangeError("Massa: número > 0 (µg).");
  if (!Number.isFinite(concentracaoUgPorUl) || concentracaoUgPorUl <= 0) throw new RangeError("Concentração: número > 0 (µg/µL).");
  const volumeExtratoUl = massaUg / concentracaoUgPorUl;
  const resto = totalUl - tampaoUl - volumeExtratoUl;
  return { volumeExtratoUl, aguaUl: resto >= 0 ? resto : null, cabe: resto >= 0 };
}
