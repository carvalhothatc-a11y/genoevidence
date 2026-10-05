/**
 * TPM (transcritos por milhão) a partir de contagens e comprimentos INFORMADOS.
 *
 * Zhao et al. (2020) descrevem que as contagens dependem da expressão, do comprimento do gene e da
 * profundidade de sequenciamento; que TPM é proporcional ao RPKM (leituras por kilobase por milhão
 * de leituras mapeadas) e que a média de TPM numa amostra é 10⁶ dividido pelo número de
 * transcritos — ou seja, a soma dos TPM de uma amostra é 10⁶. A fórmula abaixo é a única que
 * satisfaz essas duas propriedades (a profundidade se cancela dentro da amostra):
 *   taxaᵢ = leiturasᵢ / comprimentoᵢ(kb)
 *   TPMᵢ  = 10⁶ · taxaᵢ / Σⱼ taxaⱼ
 * O cálculo não reproduz os quantificadores citados na referência (RSEM, Kallisto, Salmon).
 */
export type GeneContagem = { id: string; leituras: number; comprimentoPb: number };
export type GeneTpm = GeneContagem & { taxa: number; tpm: number };

export function validarGene(g: GeneContagem): string | null {
  if (!g.id.trim()) return "Dê um nome ao gene.";
  if (!Number.isInteger(g.leituras) || g.leituras < 0) return "Leituras: número inteiro ≥ 0.";
  if (!Number.isFinite(g.comprimentoPb) || g.comprimentoPb <= 0) return "Comprimento: número > 0 (pb).";
  return null;
}

export function tpm(genes: GeneContagem[]): GeneTpm[] {
  if (!genes.length) throw new RangeError("Nenhum gene informado.");
  for (const g of genes) {
    const e = validarGene(g);
    if (e) throw new RangeError(`${g.id || "gene"}: ${e}`);
  }
  const taxas = genes.map((g) => g.leituras / (g.comprimentoPb / 1000));
  const soma = taxas.reduce((a, b) => a + b, 0);
  if (soma <= 0) throw new RangeError("Todas as contagens são zero: TPM não é definido.");
  return genes.map((g, i) => ({ ...g, taxa: taxas[i], tpm: (1e6 * taxas[i]) / soma }));
}

/** Exemplo FICTÍCIO (genes e números inventados para ensino; não são dados de pesquisa). */
export const EXEMPLO_FICTICIO: GeneContagem[] = [
  { id: "GENE_A (fictício)", leituras: 1200, comprimentoPb: 1500 },
  { id: "GENE_B (fictício)", leituras: 1200, comprimentoPb: 6000 },
  { id: "GENE_C (fictício)", leituras: 300, comprimentoPb: 750 },
  { id: "GENE_D (fictício)", leituras: 0, comprimentoPb: 2000 },
];
