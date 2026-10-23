import { alinhar, ESQUEMA_DNA, ESQUEMA_PROTEINA, type ResultadoAlinhamento } from "./alinhamento";
import type { Atomo, Cadeia, Residuo } from "./estrutura";
import { superpor, type Superposicao } from "./geometria";

/**
 * Comparar duas cadeias: primeiro decidir QUAIS átomos correspondem, depois superpor.
 *
 * A correspondência sai de um alinhamento das sequências das duas cadeias (Needleman–Wunsch ou
 * Smith–Waterman): cada coluna com resíduo dos dois lados vira um par. Um átomo por resíduo — o Cα
 * nas proteínas, o C4' nos ácidos nucleicos. Sem correspondência válida, RMSD não significa nada;
 * por isso o resultado traz o alinhamento, a identidade e a cobertura junto com o número.
 */

export type ParCorrespondente = { a: Residuo; b: Residuo; atomoA: Atomo; atomoB: Atomo; identico: boolean };

export type OpcoesComparacao = {
  modo: "global" | "local";
  /** "alinhados" = todas as colunas com resíduo dos dois lados; "identicos" = só as idênticas. */
  pares: "alinhados" | "identicos";
};

export type Comparacao = {
  atomo: "CA" | "C4'";
  alinhamento: ResultadoAlinhamento;
  pares: ParCorrespondente[];
  /** Fração dos resíduos de cada cadeia que entrou nos pares. */
  coberturaA: number;
  coberturaB: number;
  superposicao: Superposicao | null;
  /** Por que não houve superposição, ou o que merece cuidado. */
  avisos: string[];
};

function residuosComAtomo(c: Cadeia, nome: string): { r: Residuo; at: Atomo }[] {
  const tipo = c.tipo === "proteina" ? "aminoacido" : "nucleotideo";
  return c.residuos
    .filter((r) => r.tipo === tipo)
    .map((r) => ({ r, at: r.atomos.find((a) => a.nome === nome || (nome === "C4'" && a.nome === "C4*")) }))
    .filter((x): x is { r: Residuo; at: Atomo } => Boolean(x.at));
}

export function compararCadeias(A: Cadeia, B: Cadeia, opcoes: OpcoesComparacao): Comparacao {
  const proteina = A.tipo === "proteina";
  if (proteina !== (B.tipo === "proteina")) throw new Error("Só dá para comparar proteína com proteína, ou ácido nucleico com ácido nucleico.");
  const atomo = proteina ? "CA" : "C4'";
  const ra = residuosComAtomo(A, atomo);
  const rb = residuosComAtomo(B, atomo);
  const norm = (s: string) => (proteina ? s : s.replace(/U/g, "T"));
  const alinhamento = alinhar(norm(ra.map((x) => x.r.letra).join("")), norm(rb.map((x) => x.r.letra).join("")), opcoes.modo, proteina ? ESQUEMA_PROTEINA : ESQUEMA_DNA);

  const pares: ParCorrespondente[] = [];
  let ia = alinhamento.inicioA - 1;
  let ib = alinhamento.inicioB - 1;
  for (let k = 0; k < alinhamento.comprimento; k++) {
    const ca = alinhamento.a[k];
    const cb = alinhamento.b[k];
    if (ca !== "-" && cb !== "-") {
      const identico = ca === cb;
      if (opcoes.pares === "alinhados" || identico) pares.push({ a: ra[ia].r, b: rb[ib].r, atomoA: ra[ia].at, atomoB: rb[ib].at, identico });
    }
    if (ca !== "-") ia++;
    if (cb !== "-") ib++;
  }

  const avisos: string[] = [];
  let superposicao: Superposicao | null = null;
  if (pares.length < 3) avisos.push(`Só ${pares.length} par(es) de átomos correspondentes: são precisos pelo menos 3 para superpor.`);
  else {
    superposicao = superpor(
      pares.map((p) => p.atomoA),
      pares.map((p) => p.atomoB),
    );
    if (alinhamento.identidade < 30)
      avisos.push(
        `As sequências têm só ${alinhamento.identidade.toFixed(0)}% de identidade no alinhamento: a correspondência entre resíduos pode estar errada, e então o RMSD não compara posições equivalentes. Confira o alinhamento.`,
      );
    const cobertura = Math.min(pares.length / ra.length, pares.length / rb.length);
    if (cobertura < 0.5) avisos.push(`Os pares cobrem só ${(100 * cobertura).toFixed(0)}% de uma das cadeias: o RMSD vale para esse trecho, não para a cadeia inteira.`);
  }
  return {
    atomo,
    alinhamento,
    pares,
    coberturaA: ra.length ? pares.length / ra.length : 0,
    coberturaB: rb.length ? pares.length / rb.length : 0,
    superposicao,
    avisos,
  };
}
