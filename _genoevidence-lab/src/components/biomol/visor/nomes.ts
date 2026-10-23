import { AMINOACIDOS } from "@/lib/biomol/sequencias";
import { THREE_TO_ONE } from "@/lib/structures/parse";

const NUCLEOTIDEO: Record<string, string> = {
  DA: "desoxiadenosina (base adenina)",
  DC: "desoxicitidina (base citosina)",
  DG: "desoxiguanosina (base guanina)",
  DT: "desoxitimidina (base timina)",
  DU: "desoxiuridina (base uracila)",
  A: "adenosina (base adenina)",
  C: "citidina (base citosina)",
  G: "guanosina (base guanina)",
  U: "uridina (base uracila)",
};

/** Nome por extenso de um resíduo (aminoácido ou nucleotídeo); para o resto, o código do arquivo. */
export function nomeDoResiduo(codigo: string): string {
  if (NUCLEOTIDEO[codigo]) return NUCLEOTIDEO[codigo];
  const uma = THREE_TO_ONE[codigo];
  if (uma && AMINOACIDOS[uma] && codigo.length === 3) return AMINOACIDOS[uma].nome;
  if (codigo === "HOH") return "água";
  return codigo;
}

/** "Lys" a partir de "LYS"; nucleotídeos ficam como estão. */
export function tresLetras(codigo: string): string {
  return codigo.length === 3 ? codigo[0] + codigo.slice(1).toLowerCase() : codigo;
}

export const NOME_ELEMENTO: Record<string, string> = {
  C: "carbono", N: "nitrogênio", O: "oxigênio", S: "enxofre", P: "fósforo", H: "hidrogênio", SE: "selênio",
  FE: "ferro", ZN: "zinco", MG: "magnésio", CA: "cálcio", NA: "sódio", K: "potássio", CL: "cloro", MN: "manganês", CU: "cobre",
};
