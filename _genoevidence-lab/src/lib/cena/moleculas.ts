import { normalizar } from "@/lib/ideia/parse";

/**
 * Moléculas CITADAS no texto de uma etapa, para o pesquisador poder pedir a estrutura real.
 *
 * Isto só reconhece candidatos no texto — não busca nada. A consulta às bases (UniProt, RCSB PDB,
 * PubChem) só acontece quando a pessoa clica, porque é uma saída de dados para fora do GenoLab.
 *
 * Gene, proteína e composto são tipos DIFERENTES: TP53 (gene) e p53 (proteína) não são o mesmo
 * objeto visual. Quando o texto não deixa claro qual dos dois, devolvemos `ambiguo` e a interface
 * pergunta antes de buscar.
 */
export type TipoMolecula = "gene" | "proteina" | "composto";

export type MoleculaCitada = {
  /** Termo como aparece no texto. */
  termo: string;
  tipo: TipoMolecula;
  /** Verdadeiro quando o termo pode ser gene OU proteína e o texto não decide. */
  ambiguo: boolean;
  /** Nome a enviar para a base (em inglês, quando conhecemos a tradução). */
  consulta: string;
};

/** Reagentes comuns cujo nome em português não é indexado no PubChem. */
const COMPOSTOS: { re: RegExp; consulta: string; rotulo: string }[] = [
  { re: /tiossulfato de sodio|tiossulfato/, consulta: "sodium thiosulfate", rotulo: "tiossulfato de sódio" },
  { re: /cloreto de calcio|\bcacl2\b/, consulta: "calcium chloride", rotulo: "cloreto de cálcio" },
  { re: /sulfato de amonio|\(nh4\)2so4/, consulta: "ammonium sulfate", rotulo: "sulfato de amônio" },
  { re: /sulfato de calcio|\bcaso4\b|gipsita/, consulta: "calcium sulfate", rotulo: "sulfato de cálcio" },
  { re: /acido clorid\w*|\bhcl\b/, consulta: "hydrochloric acid", rotulo: "ácido clorídrico" },
  { re: /acido citrico/, consulta: "citric acid", rotulo: "ácido cítrico" },
  { re: /brometo de etidio|\betidio\b/, consulta: "ethidium bromide", rotulo: "brometo de etídio" },
  { re: /\betanol\b/, consulta: "ethanol", rotulo: "etanol" },
  { re: /\bagarose\b/, consulta: "agarose", rotulo: "agarose" },
  { re: /\bdntps?\b/, consulta: "deoxyribonucleoside triphosphate", rotulo: "dNTPs" },
  { re: /\bsds\b|dodecil sulfato/, consulta: "sodium dodecyl sulfate", rotulo: "SDS" },
  { re: /\bedta\b/, consulta: "EDTA", rotulo: "EDTA" },
  { re: /\bdtt\b|ditiotreitol/, consulta: "dithiothreitol", rotulo: "DTT" },
  { re: /\biptg\b/, consulta: "IPTG", rotulo: "IPTG" },
  { re: /ampicilina/, consulta: "ampicillin", rotulo: "ampicilina" },
  { re: /canamicina/, consulta: "kanamycin", rotulo: "canamicina" },
  { re: /cloreto de magnesio|\bmgcl2\b/, consulta: "magnesium chloride", rotulo: "cloreto de magnésio" },
];

/** Subscritos e sobrescritos viram dígitos normais: CaCl₂ e Na₂S₂O₃ precisam casar com cacl2 e na2s2o3. */
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
function semSubscritos(t: string): string {
  return t.replace(/[₀-₉⁰-⁹]/g, (c) => {
    const i = SUB.indexOf(c);
    return String(i >= 0 ? i : SUP.indexOf(c));
  });
}

/**
 * Trechos de fórmula química não são símbolo de gene. Removemos antes de procurar genes, senão
 * “(NH₄)₂SO₄” vira os “genes” NH e SO.
 */
function semFormulas(t: string): string {
  return t
    // qualquer trecho com subscrito, junto com as letras de elemento ao redor
    .replace(/[A-Za-z()[\]]*[₀-₉][A-Za-z0-9₀-₉()[\]]*/g, " ")
    // grupo entre parênteses seguido de número: (NH4)2SO4
    .replace(/\([A-Za-z0-9]+\)\d+[A-Za-z0-9]*/g, " ")
    // elemento com letra minúscula e número: CaCl2, Na2S2O3, MgCl2
    .replace(/\b[A-Z][a-z]\d*(?:[A-Z][a-z]?\d*)+\b/g, " ");
}

/** Siglas em maiúsculas que NÃO são símbolo de gene. */
const NAO_GENE =
  /^(PCR|DNA|RNA|ATP|GTP|IPTG|NTC|LB|SOC|TAE|TBE|TBS|TBST|PBS|SDS|EDTA|DTT|UV|HCL|NACL|KCL|MGCL2|CACL2|CASO4|NH4|SNP|SNPS|NTA|XRD|FTIR|TEM|SEM|AFM|DLS|ECL|HRP|BSA|PVDF|CID|PDB|NGS|MIQE|RPM|PH|CT|TPM|RPKM|FPKM|QPCR|RTPCR|CDNA|MRNA|SGRNA|CRISPR|CAS9|HDR|NHEJ|PAM|FACS|ELISA|HEK|HELA|DH5|BL21|T4|T7|KB|PB|BP|NH|NH3|NH4|SO|SO2|SO3|SO4|NO|NO2|NO3|PO4|CO|CO2|CO3|HCO3|OH|H2O|O2|N2|NA|NACL|CA|MG|KCL|CL|CL2|S2O3|S2|NAOH|KOH|HNO3|H2SO4|TRIS|HEPES|MOPS|SOC|TE)$/;

/** Nomes de proteína escritos em minúscula, como aparecem no texto corrente. */
const PROTEINAS = /\bp53\b|\bp21\b|\bp16\b|beta[- ]?actina|\bgapdh\b|\bcas ?9\b|canalrodopsina|channelrhodopsin|\btaq\b|\bpfu\b/;

const CONTEXTO_GENE = /\bgene\b|\bmrna\b|\bcdna\b|transcri|amplific|primer|express[ãa]o|locus|alelo|promotor/i;
const CONTEXTO_PROTEINA = /\bprote[íi]na\b|western|anticorpo|enzima|imunoprecipit|\bkda\b|quinase|polimerase/i;

/**
 * Lista as moléculas citadas num trecho. `max` limita quantas aparecem na interface.
 * O resultado é estável: a mesma frase devolve sempre a mesma lista, na mesma ordem.
 */
export function moleculasCitadas(texto: string, max = 6): MoleculaCitada[] {
  const bruto = texto.slice(0, 2000);
  const n = semSubscritos(normalizar(bruto));
  const out: MoleculaCitada[] = [];
  const vistos = new Set<string>();
  const juntar = (m: MoleculaCitada) => {
    const chave = `${m.tipo}:${m.consulta.toLowerCase()}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    out.push(m);
  };

  for (const c of COMPOSTOS) if (c.re.test(n)) juntar({ termo: c.rotulo, tipo: "composto", ambiguo: false, consulta: c.consulta });

  const prot = bruto.match(new RegExp(PROTEINAS.source, "gi")) ?? [];
  for (const p of prot) juntar({ termo: p, tipo: "proteina", ambiguo: false, consulta: p });

  // Símbolos de gene: 2 a 10 caracteres em maiúsculas, começando por letra, com ao menos uma letra.
  const simbolos = semFormulas(bruto).match(/\b[A-Z][A-Z0-9]{1,9}\b/g) ?? [];
  const temGene = CONTEXTO_GENE.test(bruto);
  const temProteina = CONTEXTO_PROTEINA.test(bruto);
  for (const s of simbolos) {
    if (NAO_GENE.test(s) || /^\d+$/.test(s.slice(1))) continue;
    const ambiguo = !temGene && !temProteina;
    juntar({ termo: s, tipo: temProteina && !temGene ? "proteina" : "gene", ambiguo, consulta: s });
  }

  return out.slice(0, max);
}

export const ROTULO_TIPO: Record<TipoMolecula, string> = {
  gene: "gene",
  proteina: "proteína",
  composto: "composto",
};
