import { describe, expect, it } from "vitest";
import { FORMA_B, heliceDupla, heliceSimples } from "@/lib/biomol/helice";
import { complemento } from "@/lib/biomol/sequencias";

/** O esquema não é estrutura medida, mas precisa respeitar as medidas médias que ele declara. */
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("hélice esquemática (forma B)", () => {
  const seq = "ATGCGTACGTTAGC";
  const { fita1, fita2 } = heliceDupla(seq, complemento(seq, "dna"));

  it("um nucleotídeo por letra em cada fita, com a base certa e a complementar em frente", () => {
    expect(fita1.map((n) => n.base).join("")).toBe(seq);
    expect(fita2.map((n) => n.base).join("")).toBe(complemento(seq, "dna"));
  });

  it("sobe 3,38 Å por par e gira 360/10,5 graus", () => {
    expect(fita1[1].esqueleto[2] - fita1[0].esqueleto[2]).toBeCloseTo(FORMA_B.subida, 10);
    const ang = (p: number[]) => Math.atan2(p[1], p[0]);
    let d = ((ang(fita1[1].esqueleto) - ang(fita1[0].esqueleto)) * 180) / Math.PI;
    if (d < 0) d += 360;
    expect(d).toBeCloseTo(360 / 10.5, 8);
  });

  it("esqueleto a 8,9 Å do eixo (diâmetro ~ 18 Å entre fosfatos opostos no esquema)", () => {
    for (const n of [...fita1, ...fita2]) expect(Math.hypot(n.esqueleto[0], n.esqueleto[1])).toBeCloseTo(8.9, 8);
  });

  it("as duas bases de um par se encontram no meio, sem se cruzar", () => {
    for (let i = 0; i < seq.length; i++) {
      const folga = dist(fita1[i].ponta, fita2[i].ponta);
      expect(folga).toBeGreaterThan(0.1);
      expect(folga).toBeLessThan(2);
      expect(fita1[i].ponta[2]).toBe(fita2[i].ponta[2]);
    }
  });

  it("centralizada no eixo z", () => {
    expect(fita1[0].esqueleto[2]).toBeCloseTo(-fita1[seq.length - 1].esqueleto[2], 10);
  });

  it("fita simples: uma posição por letra, bases apontando para dentro", () => {
    const r = heliceSimples("AUGC");
    expect(r).toHaveLength(4);
    for (const n of r) expect(Math.hypot(n.ponta[0], n.ponta[1])).toBeLessThan(Math.hypot(n.esqueleto[0], n.esqueleto[1]));
  });
});
