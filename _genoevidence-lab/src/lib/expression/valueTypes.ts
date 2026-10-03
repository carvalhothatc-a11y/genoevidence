import type { ExpressionValueType } from "@/lib/domain/schemas";
import type { SourceRef } from "@/lib/sources/catalog";

export type ValueTypeInfo = {
  label: string;
  description: string;
  /** Unidades esperadas (minúsculas, sem espaços extras) para conferência. */
  unitAliases: string[];
  allowNegative: boolean;
  integerExpected: boolean;
  /** Valor relativo a uma referência (razão/diferença), não abundância. */
  relative: boolean;
  /** Escala sugerida para o eixo. */
  axis: "linear" | "linear-log-opcional";
  notes: string[];
  refs: SourceRef[];
};

/**
 * Tipos de valor de expressão. NÃO são intercambiáveis: cada conjunto de dados declara um único tipo,
 * e os gráficos nunca misturam tipos ou unidades diferentes no mesmo eixo.
 */
export const VALUE_TYPES: Record<ExpressionValueType, ValueTypeInfo> = {
  contagem_bruta: {
    label: "Contagens brutas (reads)",
    description: "Número de leituras atribuídas a cada gene, sem normalização.",
    unitAliases: ["contagens", "contagem", "counts", "count", "reads", "leituras"],
    allowNegative: false,
    integerExpected: true,
    relative: false,
    axis: "linear-log-opcional",
    notes: [
      "Dependem da profundidade de sequenciamento e do comprimento do transcrito; comparações diretas entre amostras exigem normalização.",
      "Contagens fracionárias podem indicar contagens estimadas por quantificadores ou valores já normalizados.",
    ],
    refs: [
      { id: "wagner2012", locator: "Resumo" },
      { id: "love2014", locator: "Resumo" },
    ],
  },
  cpm: {
    label: "CPM (contagens por milhão)",
    description: "Contagens escalonadas pela profundidade de sequenciamento da amostra.",
    unitAliases: ["cpm"],
    allowNegative: false,
    integerExpected: false,
    relative: false,
    axis: "linear-log-opcional",
    notes: ["Não corrige o comprimento do transcrito."],
    refs: [],
  },
  tpm: {
    label: "TPM (transcritos por milhão)",
    description: "Medida de abundância relativa que considera comprimento e profundidade.",
    unitAliases: ["tpm"],
    allowNegative: false,
    integerExpected: false,
    relative: false,
    axis: "linear-log-opcional",
    notes: ["TPM foi proposto como alternativa ao RPKM para respeitar uma propriedade de invariância entre amostras."],
    refs: [{ id: "wagner2012", locator: "Resumo" }],
  },
  fpkm_rpkm: {
    label: "FPKM / RPKM",
    description: "Leituras (ou fragmentos) por kilobase por milhão.",
    unitAliases: ["fpkm", "rpkm"],
    allowNegative: false,
    integerExpected: false,
    relative: false,
    axis: "linear-log-opcional",
    notes: ["RPKM foi descrito como inconsistente entre amostras; compare com cautela."],
    refs: [{ id: "wagner2012", locator: "Resumo" }],
  },
  normalizado: {
    label: "Contagens normalizadas (método informado)",
    description: "Valores normalizados por um método específico (ex.: fatores de tamanho).",
    unitAliases: ["normalizado", "normalizada", "normalized", "norm", "contagens normalizadas"],
    allowNegative: false,
    integerExpected: false,
    relative: false,
    axis: "linear-log-opcional",
    notes: ["Informe o método de normalização no campo de observação; valores de métodos diferentes não são comparáveis."],
    refs: [{ id: "love2014", locator: "Resumo" }],
  },
  log2_normalizado: {
    label: "log2 de valores normalizados",
    description: "Ex.: log2(CPM+1) ou transformações estabilizadoras de variância.",
    unitAliases: ["log2", "log2cpm", "log2(cpm+1)", "log2 normalizado", "vst", "rlog"],
    allowNegative: true,
    integerExpected: false,
    relative: false,
    axis: "linear",
    notes: ["Já está em escala logarítmica: diferenças correspondem a razões na escala original."],
    refs: [],
  },
  fold_change: {
    label: "Fold change (razão linear)",
    description: "Razão entre condição e referência.",
    unitAliases: ["fc", "fold change", "fold-change", "razao", "razão", "x"],
    allowNegative: false,
    integerExpected: false,
    relative: true,
    axis: "linear-log-opcional",
    notes: ["É relativo a um grupo de referência; não representa abundância.", "1 = sem diferença em relação à referência."],
    refs: [],
  },
  log2_fold_change: {
    label: "log2 fold change",
    description: "Logaritmo base 2 da razão entre condição e referência.",
    unitAliases: ["log2fc", "log2 fold change", "lfc", "log2(fc)", "log2 fc"],
    allowNegative: true,
    integerExpected: false,
    relative: true,
    axis: "linear",
    notes: ["0 = sem diferença; +1 = o dobro; −1 = a metade.", "Estimativas de fold change de métodos diferentes não são equivalentes."],
    refs: [{ id: "love2014", locator: "Resumo" }],
  },
  ct: {
    label: "Ct / Cq (qPCR)",
    description: "Ciclo de quantificação em PCR em tempo real.",
    unitAliases: ["ct", "cq", "ciclos", "ciclo"],
    allowNegative: false,
    integerExpected: false,
    relative: false,
    axis: "linear",
    notes: [
      "Ct menor indica mais molde inicial; a escala é inversa e logarítmica.",
      "Comparações de expressão requerem normalização (ex.: gene de referência) e informações mínimas do ensaio.",
    ],
    refs: [
      { id: "livak2001", locator: "Resumo" },
      { id: "bustin2009", locator: "Resumo" },
    ],
  },
  delta_ct: {
    label: "ΔCt",
    description: "Diferença de Ct entre o gene-alvo e um gene de referência.",
    unitAliases: ["dct", "δct", "delta ct", "deltact", "Δct"],
    allowNegative: true,
    integerExpected: false,
    relative: true,
    axis: "linear",
    notes: ["Depende do gene de referência escolhido; informe-o."],
    refs: [{ id: "livak2001", locator: "Resumo" }],
  },
  expressao_relativa: {
    label: "Expressão relativa (ex.: 2^−ΔΔCt)",
    description: "Expressão de um tratamento em relação a uma amostra de referência (calibrador).",
    unitAliases: ["2^-ddct", "2^-δδct", "rq", "relativa", "expressão relativa", "expressao relativa", "relative"],
    allowNegative: false,
    integerExpected: false,
    relative: true,
    axis: "linear-log-opcional",
    notes: ["O método 2^−ΔΔCt tem pressupostos próprios; confira-os na referência."],
    refs: [{ id: "livak2001", locator: "Resumo" }],
  },
  outro: {
    label: "Outro (descrever)",
    description: "Tipo não listado. Descreva-o no campo de observação.",
    unitAliases: [],
    allowNegative: true,
    integerExpected: false,
    relative: false,
    axis: "linear",
    notes: ["Sem conferência automática de unidade."],
    refs: [],
  },
};

export function normalizeUnit(u: string): string {
  return u.trim().toLowerCase().replace(/\s+/g, " ");
}
