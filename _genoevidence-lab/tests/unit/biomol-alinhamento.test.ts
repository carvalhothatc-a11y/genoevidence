import { describe, expect, it } from "vitest";
import { SubstitutionMatrices } from "molstar/lib/mol-model/sequence/alignment/substitution-matrix";
import { alinhar, emBlocos, ESQUEMA_DNA, ESQUEMA_PROTEINA, pontuarAlinhamento, substituicao, type Esquema } from "@/lib/biomol/alinhamento";
import { BLOSUM62, LETRAS } from "@/lib/biomol/blosum62";

/**
 * Alinhamento conferido de três jeitos:
 *  1. exemplos clássicos com resposta publicada;
 *  2. busca EXAUSTIVA: para sequências curtas, enumera todos os alinhamentos possíveis e confere que
 *     a pontuação devolvida é a melhor de todas (global e local, lacuna linear e afim);
 *  3. coerência: a pontuação recalculada a partir do alinhamento devolvido é a mesma, e tirar os "-"
 *     devolve exatamente o trecho das sequências originais.
 */

const linear = (acerto: number, erro: number, lacuna: number): Esquema => ({ tipo: "nucleotideo", acerto, erro, abertura: lacuna, extensao: lacuna });

describe("casos clássicos", () => {
  it("Needleman–Wunsch: GCATGCU × GATTACA (+1/−1/−1) tem pontuação 0", () => {
    const r = alinhar("GCATGCU", "GATTACA", "global", linear(1, -1, 1));
    expect(r.pontuacao).toBe(0);
    expect(r.a.replace(/-/g, "")).toBe("GCATGCU");
    expect(r.b.replace(/-/g, "")).toBe("GATTACA");
    expect(pontuarAlinhamento(r.a, r.b, linear(1, -1, 1))).toBe(0);
  });

  it("Smith–Waterman: TGTTACGG × GGTTGACTA (+3/−3/−2) = 13, GTT-AC × GTTGAC", () => {
    const r = alinhar("TGTTACGG", "GGTTGACTA", "local", linear(3, -3, 2));
    expect(r.pontuacao).toBe(13);
    expect(r.a).toBe("GTT-AC");
    expect(r.b).toBe("GTTGAC");
    expect([r.inicioA, r.fimA, r.inicioB, r.fimB]).toEqual([2, 6, 2, 7]);
  });

  it("idênticas: 100% de identidade e pontuação = soma da diagonal", () => {
    const r = alinhar("MKTAYIAK", "MKTAYIAK", "global", ESQUEMA_PROTEINA);
    expect(r.identidade).toBe(100);
    expect(r.lacunas).toBe(0);
    expect(r.pontuacao).toBe([..."MKTAYIAK"].reduce((s, c) => s + substituicao(c, c, ESQUEMA_PROTEINA), 0));
  });

  it("local sem nada em comum: alinhamento vazio, pontuação 0", () => {
    const r = alinhar("AAAA", "CCCC", "local", ESQUEMA_DNA);
    expect(r.pontuacao).toBe(0);
    expect(r.comprimento).toBe(0);
    expect(r.fimA).toBeLessThan(r.inicioA);
  });

  it("global com uma sequência vazia: só lacuna, cobrada como uma lacuna", () => {
    const r = alinhar("", "ACG", "global", ESQUEMA_DNA);
    expect(r.b).toBe("ACG");
    expect(r.a).toBe("---");
    expect(r.pontuacao).toBe(-(10 + 2 * 0.5));
  });

  it("lacuna afim: prefere uma lacuna longa a duas curtas", () => {
    const e: Esquema = { tipo: "nucleotideo", acerto: 5, erro: -4, abertura: 10, extensao: 0.5 };
    const r = alinhar("ACGTTTTTACGT", "ACGTACGT", "global", e);
    expect(r.a).toBe("ACGTTTTTACGT");
    expect(r.b.match(/-+/g)).toHaveLength(1);
    expect(r.pontuacao).toBe(8 * 5 - (10 + 3 * 0.5));
  });

  it("recusa sequências que não cabem na memória", () => {
    expect(() => alinhar("A".repeat(3000), "A".repeat(3000), "global", ESQUEMA_DNA)).toThrow(/grandes demais/);
  });
});

// ---------------------------------------------------------------- busca exaustiva

/** Enumera TODOS os alinhamentos globais de a e b e devolve a melhor pontuação. */
function enumerar(a: string, b: string, e: Esquema): number {
  let melhor = -Infinity;
  const colA: string[] = [];
  const colB: string[] = [];
  const passo = (i: number, j: number) => {
    if (i === a.length && j === b.length) {
      melhor = Math.max(melhor, pontuarAlinhamento(colA.join(""), colB.join(""), e));
      return;
    }
    if (i < a.length && j < b.length) {
      colA.push(a[i]);
      colB.push(b[j]);
      passo(i + 1, j + 1);
      colA.pop();
      colB.pop();
    }
    if (i < a.length) {
      colA.push(a[i]);
      colB.push("-");
      passo(i + 1, j);
      colA.pop();
      colB.pop();
    }
    if (j < b.length) {
      colA.push("-");
      colB.push(b[j]);
      passo(i, j + 1);
      colA.pop();
      colB.pop();
    }
  };
  passo(0, 0);
  return a.length === 0 && b.length === 0 ? 0 : melhor;
}

function melhorLocalExaustivo(a: string, b: string, e: Esquema): number {
  let melhor = 0;
  for (let i = 0; i < a.length; i++)
    for (let i2 = i + 1; i2 <= a.length; i2++)
      for (let j = 0; j < b.length; j++)
        for (let j2 = j + 1; j2 <= b.length; j2++) melhor = Math.max(melhor, enumerar(a.slice(i, i2), b.slice(j, j2), e));
  return melhor;
}

/** Gerador pseudoaleatório com semente fixa: o teste é sempre o mesmo. */
function sorteador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("busca exaustiva: a pontuação devolvida é a melhor possível", () => {
  const esquemas: [string, Esquema, string][] = [
    ["DNA linear", linear(2, -1, 2), "ACGT"],
    ["DNA afim", { tipo: "nucleotideo", acerto: 5, erro: -4, abertura: 6, extensao: 1 }, "ACGT"],
    ["DNA afim com extensão fracionária", { tipo: "nucleotideo", acerto: 5, erro: -4, abertura: 3, extensao: 0.5 }, "ACGT"],
    ["proteína BLOSUM62, extensão 0,5", { tipo: "blosum62", abertura: 3, extensao: 0.5 }, "AGSTW"],
    ["proteína BLOSUM62 afim", { tipo: "blosum62", abertura: 5, extensao: 1 }, "ACDEKLW"],
  ];
  for (const [nome, e, alfabeto] of esquemas) {
    it(`global — ${nome}`, () => {
      const r = sorteador(42);
      for (let k = 0; k < 1500; k++) {
        const a = Array.from({ length: Math.floor(r() * 6) }, () => alfabeto[Math.floor(r() * alfabeto.length)]).join("");
        const b = Array.from({ length: Math.floor(r() * 6) }, () => alfabeto[Math.floor(r() * alfabeto.length)]).join("");
        const res = alinhar(a, b, "global", e);
        expect(res.pontuacao, `${a} × ${b}`).toBe(enumerar(a, b, e));
        expect(pontuarAlinhamento(res.a, res.b, e), `${a} × ${b} recalculado`).toBe(res.pontuacao);
        expect(res.a.replace(/-/g, "")).toBe(a);
        expect(res.b.replace(/-/g, "")).toBe(b);
      }
    });
    it(`local — ${nome}`, () => {
      const r = sorteador(7);
      for (let k = 0; k < 120; k++) {
        const a = Array.from({ length: 1 + Math.floor(r() * 5) }, () => alfabeto[Math.floor(r() * alfabeto.length)]).join("");
        const b = Array.from({ length: 1 + Math.floor(r() * 5) }, () => alfabeto[Math.floor(r() * alfabeto.length)]).join("");
        const res = alinhar(a, b, "local", e);
        expect(res.pontuacao, `${a} × ${b}`).toBe(melhorLocalExaustivo(a, b, e));
        if (res.comprimento) {
          expect(pontuarAlinhamento(res.a, res.b, e)).toBe(res.pontuacao);
          expect(res.a.replace(/-/g, "")).toBe(a.slice(res.inicioA - 1, res.fimA));
          expect(res.b.replace(/-/g, "")).toBe(b.slice(res.inicioB - 1, res.fimB));
        }
      }
    });
  }
});

describe("BLOSUM62", () => {
  it("é simétrica e tem os valores conhecidos", () => {
    for (let i = 0; i < LETRAS.length; i++) for (let j = 0; j < LETRAS.length; j++) expect(BLOSUM62[i][j]).toBe(BLOSUM62[j][i]);
    const v = (a: string, b: string) => BLOSUM62[LETRAS.indexOf(a)][LETRAS.indexOf(b)];
    expect(v("W", "W")).toBe(11);
    expect(v("C", "C")).toBe(9);
    expect(v("A", "A")).toBe(4);
    expect(v("E", "K")).toBe(1);
  });

  it("é igual à BLOSUM62 do Mol* (implementação independente)", () => {
    const mol = SubstitutionMatrices.blosum62;
    for (const a of "ARNDCQEGHILKMFPSTWYVBZX")
      for (const b of "ARNDCQEGHILKMFPSTWYVBZX") expect(BLOSUM62[LETRAS.indexOf(a)][LETRAS.indexOf(b)], `${a}${b}`).toBe(mol[a][b]);
  });

  it("letras fora da matriz (J, U, O) contam como X", () => {
    expect(substituicao("U", "A", ESQUEMA_PROTEINA)).toBe(substituicao("X", "A", ESQUEMA_PROTEINA));
  });
});

describe("texto em blocos", () => {
  it("mostra posição de início e fim de cada linha", () => {
    const r = alinhar("TGTTACGG", "GGTTGACTA", "local", linear(3, -3, 2));
    const t = emBlocos(r, ["seqA", "seqB"]);
    expect(t).toContain("seqA      2 GTT-AC 6");
    expect(t).toContain("seqB      2 GTTGAC 7");
  });
});
