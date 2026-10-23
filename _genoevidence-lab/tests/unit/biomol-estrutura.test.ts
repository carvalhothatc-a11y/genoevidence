import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MinimizeRmsd } from "molstar/lib/mol-math/linear-algebra/3d/minimize-rmsd";
import { Vec3 } from "molstar/lib/mol-math/linear-algebra/3d/vec3";
import { agrupar, detectarFormato, lerAtomos, paresDeBases, sentidoDasFitas, type Atomo } from "@/lib/biomol/estrutura";
import { angulo, aplicar, diedro, distancia, superpor, type Ponto } from "@/lib/biomol/geometria";

/**
 * Estruturas reais do PDB (domínio público) em tests/fixtures/pdb: 1CRN e 1EJG (crambina) e 1BNA
 * (DNA de Dickerson). Os valores esperados foram calculados À PARTE, com numpy (Kabsch por SVD e
 * fórmulas diretas), e o RMSD também é conferido contra o MinimizeRmsd do Mol*.
 */
const F = (n: string) => readFileSync(path.join(__dirname, "../fixtures/pdb", n), "utf8");
const crn = lerAtomos(F("1CRN.cif"), "mmcif");
const ejg = lerAtomos(F("1EJG.cif"), "mmcif");
const bna = lerAtomos(F("1BNA.cif"), "mmcif");
const at = (lista: Atomo[], num: number, nome: string, cadeia = "A") => lista.find((a) => a.cadeia === cadeia && a.numero === num && a.nome === nome)!;

describe("leitura de átomos", () => {
  it("1CRN: 327 átomos, uma cadeia de proteína com a sequência da crambina", () => {
    expect(crn).toHaveLength(327);
    const [a] = agrupar(crn);
    expect(a.id).toBe("A");
    expect(a.tipo).toBe("proteina");
    expect(a.sequencia).toBe("TTCCPSIVARSNFNVCRLPGTPEAICATYTGCIIIPGATCPGDYAN");
  });

  it("mmCIF e PDB do mesmo arquivo dão os mesmos átomos", () => {
    const pdb = lerAtomos(F("1CRN.pdb"), "pdb");
    expect(pdb).toHaveLength(crn.length);
    for (let i = 0; i < crn.length; i += 37) {
      expect(pdb[i]).toMatchObject({ cadeia: crn[i].cadeia, numero: crn[i].numero, nome: crn[i].nome, residuo: crn[i].residuo, x: crn[i].x, y: crn[i].y, z: crn[i].z });
    }
  });

  it("conformações alternativas (1EJG): fica só a primeira de cada átomo", () => {
    // 637 = átomos sem marca + os da conformação A (conferido à parte)
    expect(ejg).toHaveLength(637);
    const cas = ejg.filter((a) => a.nome === "CA" && a.numero === 1);
    expect(cas).toHaveLength(1);
    expect(cas[0].x).toBe(16.938); // a conformação A
  });

  it("1BNA: duas fitas de DNA de 12 nucleotídeos, CGCGAATTCGCG", () => {
    const cad = agrupar(bna).filter((c) => c.tipo === "dna");
    expect(cad.map((c) => [c.id, c.sequencia])).toEqual([
      ["A", "CGCGAATTCGCG"],
      ["B", "CGCGAATTCGCG"],
    ]);
  });

  it("formato pelo conteúdo", () => {
    expect(detectarFormato(F("1CRN.cif"))).toBe("mmcif");
    expect(detectarFormato(F("1CRN.pdb"))).toBe("pdb");
    expect(detectarFormato("isto não é estrutura")).toBeNull();
  });

  it("arquivo sem átomos é erro claro", () => {
    expect(() => lerAtomos("data_x\n_cell.length_a 1\n", "mmcif")).toThrow(/_atom_site/);
    expect(() => lerAtomos("HEADER nada\n", "pdb")).toThrow(/ATOM/);
  });
});

describe("pares de bases medidos nas coordenadas (1BNA)", () => {
  const cad = agrupar(bna);
  const pares = paresDeBases(cad);

  it("os 12 pares de Watson-Crick do dodecâmero: A1·B24, A2·B23, …, A12·B13", () => {
    expect(pares).toHaveLength(12);
    const nomes = pares.map((p) => [p.a, p.b].sort((x, y) => x.cadeia.localeCompare(y.cadeia)).map((r) => `${r.cadeia}${r.numero}`).join("·")).sort();
    const esperado = Array.from({ length: 12 }, (_, i) => `A${i + 1}·B${24 - i}`).sort();
    expect(nomes).toEqual(esperado);
    for (const p of pares) {
      expect(p.distancia).toBeGreaterThan(2.5);
      expect(p.distancia).toBeLessThan(3.3);
    }
  });

  it("as fitas são antiparalelas — medido, não suposto", () => {
    const s = sentidoDasFitas(cad, pares);
    expect(s.paralelos).toBe(0);
    expect(s.antiparalelos).toBe(10); // os 2 pares das pontas não têm vizinho dos dois lados
    expect(s.semMedida).toBe(2);
  });

  it("e a medida não diz “antiparalelas” para tudo: invertendo a ordem de uma fita, acusa paralelas", () => {
    const invertida = cad.map((c) => (c.id === "B" ? { ...c, residuos: [...c.residuos].reverse() } : c));
    const s = sentidoDasFitas(invertida, pares);
    expect(s.antiparalelos).toBe(0);
    expect(s.paralelos).toBe(10);
  });
});

describe("distância, ângulo e diedro (referência numpy)", () => {
  it("ponte dissulfeto Cys3–Cys40: 2,004 Å", () => {
    expect(distancia(at(crn, 3, "SG"), at(crn, 40, "SG"))).toBeCloseTo(2.004107, 5);
  });

  it("ângulo N–CA–C do resíduo 10: 111,25°", () => {
    expect(angulo(at(crn, 10, "N"), at(crn, 10, "CA"), at(crn, 10, "C"))).toBeCloseTo(111.247834, 4);
  });

  it("φ, ψ do resíduo 10 (hélice α) e ω da ligação 10–11 (trans)", () => {
    expect(diedro(at(crn, 9, "C"), at(crn, 10, "N"), at(crn, 10, "CA"), at(crn, 10, "C"))).toBeCloseTo(-63.193412, 4);
    expect(diedro(at(crn, 10, "N"), at(crn, 10, "CA"), at(crn, 10, "C"), at(crn, 11, "N"))).toBeCloseTo(-43.303486, 4);
    expect(diedro(at(crn, 10, "CA"), at(crn, 10, "C"), at(crn, 11, "N"), at(crn, 11, "CA"))).toBeCloseTo(-179.806309, 4);
  });

  it("concorda com o Mol* (Vec3.angle e Vec3.dihedralAngle)", () => {
    const pts = [at(crn, 9, "C"), at(crn, 10, "N"), at(crn, 10, "CA"), at(crn, 10, "C")].map((a) => Vec3.create(a.x, a.y, a.z));
    const ang = (Vec3.angle(Vec3.sub(Vec3(), pts[0], pts[1]), Vec3.sub(Vec3(), pts[2], pts[1])) * 180) / Math.PI;
    expect(angulo(at(crn, 9, "C"), at(crn, 10, "N"), at(crn, 10, "CA"))).toBeCloseTo(ang, 8);
    const d = (Vec3.dihedralAngle(pts[0], pts[1], pts[2], pts[3]) * 180) / Math.PI;
    expect(Math.abs(diedro(at(crn, 9, "C"), at(crn, 10, "N"), at(crn, 10, "CA"), at(crn, 10, "C")))).toBeCloseTo(Math.abs(d), 6);
  });

  it("sinal do diedro (IUPAC): cis = 0°, trans = 180°, +90° e −90°", () => {
    const P = (x: number, y: number, z: number): Ponto => ({ x, y, z });
    expect(diedro(P(1, 1, 0), P(0, 0, 0), P(0, 0, 1), P(1, 1, 1))).toBeCloseTo(0, 10);
    expect(Math.abs(diedro(P(1, 0, 0), P(0, 0, 0), P(0, 0, 1), P(-1, 0, 1)))).toBeCloseTo(180, 10);
    expect(diedro(P(1, 0, 0), P(0, 0, 0), P(0, 0, 1), P(0, 1, 1))).toBeCloseTo(90, 10);
    expect(diedro(P(1, 0, 0), P(0, 0, 0), P(0, 0, 1), P(0, -1, 1))).toBeCloseTo(-90, 10);
  });
});

// ---------------------------------------------------------------- superposição

const cas = (lista: Atomo[]) => {
  const m = new Map<number, Atomo>();
  for (const a of lista) if (a.nome === "CA" && a.cadeia === "A" && !m.has(a.numero)) m.set(a.numero, a);
  return m;
};

/** Rotação a partir de eixo e ângulo (para criar casos com resposta conhecida). */
function girar(p: Ponto, eixo: [number, number, number], graus: number, t: [number, number, number]): Ponto {
  const [ux, uy, uz] = (() => {
    const n = Math.hypot(...eixo);
    return eixo.map((x) => x / n) as [number, number, number];
  })();
  const a = (graus * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a), C = 1 - c;
  return {
    x: (c + ux * ux * C) * p.x + (ux * uy * C - uz * s) * p.y + (ux * uz * C + uy * s) * p.z + t[0],
    y: (uy * ux * C + uz * s) * p.x + (c + uy * uy * C) * p.y + (uy * uz * C - ux * s) * p.z + t[1],
    z: (uz * ux * C - uy * s) * p.x + (uz * uy * C + ux * s) * p.y + (c + uz * uz * C) * p.z + t[2],
  };
}

describe("superposição e RMSD", () => {
  const a = cas(crn);
  const b = cas(ejg);
  const chaves = [...a.keys()].filter((k) => b.has(k));
  const A = chaves.map((k) => a.get(k)!);
  const B = chaves.map((k) => b.get(k)!);

  it("1CRN × 1EJG, 46 pares de Cα: RMSD 0,1056 Å (numpy: 0,105598)", () => {
    const s = superpor(A, B);
    expect(s.n).toBe(46);
    expect(s.rmsd).toBeCloseTo(0.105598, 5);
    expect(s.rmsdAntes).toBeCloseTo(0.140295, 5);
  });

  it("girar e deslocar uma das estruturas não muda o RMSD superposto", () => {
    const Bmovido = B.map((p) => girar(p, [0.3, -1, 2], 137, [40, -12, 7]));
    const s = superpor(A, Bmovido);
    expect(s.rmsdAntes).toBeGreaterThan(20);
    expect(s.rmsd).toBeCloseTo(0.105598, 5);
  });

  it("uma cópia girada volta exatamente: RMSD ≈ 0 e a transformação desfaz o giro", () => {
    const copia = A.map((p) => girar(p, [1, 1, 0], -73, [5, 5, 5]));
    const s = superpor(A, copia);
    expect(s.rmsd).toBeLessThan(1e-9);
    const volta = aplicar(s, copia[10]);
    expect(distancia(volta, A[10])).toBeLessThan(1e-9);
  });

  it("nunca espelha: uma imagem no espelho não superpõe com RMSD 0", () => {
    const espelho = A.map((p) => ({ x: -p.x, y: p.y, z: p.z }));
    const s = superpor(A, espelho);
    expect(s.rmsd).toBeGreaterThan(1);
    const [r0, r1, r2] = s.rotacao;
    const det = r0[0] * (r1[1] * r2[2] - r1[2] * r2[1]) - r0[1] * (r1[0] * r2[2] - r1[2] * r2[0]) + r0[2] * (r1[0] * r2[1] - r1[1] * r2[0]);
    expect(det).toBeCloseTo(1, 10);
  });

  it("concorda com o MinimizeRmsd do Mol* (implementação independente)", () => {
    const Bmovido = B.map((p) => girar(p, [2, 1, -1], 61, [-3, 8, 1]));
    const pos = (l: Ponto[]) => ({ x: l.map((p) => p.x), y: l.map((p) => p.y), z: l.map((p) => p.z) });
    const mol = MinimizeRmsd.compute({ a: pos(A), b: pos(Bmovido) });
    // O Mol* estima o RMSD pelo autovalor (atalho com erro na 4ª casa); aplicando a TRANSFORMAÇÃO
    // dele aos átomos e medindo, o resultado tem de ser o nosso.
    const m = mol.bTransform;
    const movidos = Bmovido.map((p) => ({ x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12], y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13], z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14] }));
    const rmsdMol = Math.sqrt(movidos.reduce((t, p, i) => t + distancia(p, A[i]) ** 2, 0) / A.length);
    expect(superpor(A, Bmovido).rmsd).toBeCloseTo(rmsdMol, 6);
    expect(Math.abs(mol.rmsd - rmsdMol)).toBeLessThan(1e-3);
  });

  it("a matriz 4×4 (para o Mol*) faz o mesmo que a rotação + translação", () => {
    const Bmovido = B.map((p) => girar(p, [0, 0, 1], 90, [1, 2, 3]));
    const s = superpor(A, Bmovido);
    const p = Bmovido[5];
    const m = s.matriz;
    const viaMatriz = { x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12], y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13], z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14] };
    expect(distancia(viaMatriz, aplicar(s, p))).toBeLessThan(1e-10);
  });

  it("desvios por par: um por par, e a média dos quadrados é o RMSD²", () => {
    const s = superpor(A, B);
    expect(s.desvios).toHaveLength(46);
    expect(Math.sqrt(s.desvios.reduce((t, d) => t + d * d, 0) / 46)).toBeCloseTo(s.rmsd, 12);
  });

  it("menos de 3 pares, ou listas de tamanhos diferentes: erro", () => {
    expect(() => superpor(A.slice(0, 2), B.slice(0, 2))).toThrow(/3 pares/);
    expect(() => superpor(A, B.slice(1))).toThrow(/mesmo número/);
  });
});

describe("comparar cadeias: correspondência por alinhamento + superposição", async () => {
  const { compararCadeias } = await import("@/lib/biomol/comparar");
  const cadeia = (t: string) => agrupar(lerAtomos(F(t), "mmcif")).find((c) => c.tipo === "proteina")!;

  it("mesma proteína (1CRN × 1EJG): 46 pares de Cα, 45 idênticos, e o RMSD de referência", () => {
    const r = compararCadeias(cadeia("1CRN.cif"), cadeia("1EJG.cif"), { modo: "global", pares: "alinhados" });
    expect(r.atomo).toBe("CA");
    expect(r.pares).toHaveLength(46);
    // a 1EJG tem duas variantes nas posições 22 e 25; a conformação A traz Pro22 (igual) e Leu25 (a 1CRN tem Ile25)
    expect(r.alinhamento.identidade).toBeCloseTo((100 * 45) / 46, 6);
    expect(r.superposicao!.rmsd).toBeCloseTo(0.105598, 5);
    expect(r.avisos).toEqual([]);
  });

  it("lisozima de galinha × humana (1LYZ × 1LZ1): o alinhamento acha a inserção e casa as posições", () => {
    const hen = cadeia("1LYZ.cif");
    const hum = cadeia("1LZ1.cif");
    expect(hen.sequencia).toHaveLength(129);
    expect(hum.sequencia).toHaveLength(130);
    const r = compararCadeias(hen, hum, { modo: "global", pares: "alinhados" });
    expect(r.alinhamento.lacunas).toBeGreaterThanOrEqual(1);
    expect(r.pares.length).toBeGreaterThanOrEqual(125);
    expect(r.alinhamento.identidade).toBeGreaterThan(50);
    expect(r.alinhamento.identidade).toBeLessThan(70);
    // cada par liga resíduos do mesmo tipo de átomo de referência e anda sempre para a frente nas duas cadeias
    for (let i = 1; i < r.pares.length; i++) {
      expect(hen.residuos.indexOf(r.pares[i].a)).toBeGreaterThan(hen.residuos.indexOf(r.pares[i - 1].a));
      expect(hum.residuos.indexOf(r.pares[i].b)).toBeGreaterThan(hum.residuos.indexOf(r.pares[i - 1].b));
    }
    // o RMSD sobre esses pares é o mesmo calculado pelo Mol* (aplicando a transformação dele)
    const A = r.pares.map((p) => p.atomoA);
    const B = r.pares.map((p) => p.atomoB);
    const pos = (l: Ponto[]) => ({ x: l.map((p) => p.x), y: l.map((p) => p.y), z: l.map((p) => p.z) });
    const m = MinimizeRmsd.compute({ a: pos(A), b: pos(B) }).bTransform;
    const movidos = B.map((p) => ({ x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12], y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13], z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14] }));
    const rmsdMol = Math.sqrt(movidos.reduce((t, p, i) => t + distancia(p, A[i]) ** 2, 0) / A.length);
    expect(r.superposicao!.rmsd).toBeCloseTo(rmsdMol, 5); // a matriz do Mol* é de precisão simples
    // checagem de sanidade, não referência: duas lisozimas do tipo c têm o mesmo enovelamento
    expect(r.superposicao!.rmsd).toBeLessThan(2);
  });

  it("só idênticos: menos pares, todos idênticos", () => {
    const r = compararCadeias(cadeia("1LYZ.cif"), cadeia("1LZ1.cif"), { modo: "global", pares: "identicos" });
    expect(r.pares.every((p) => p.identico)).toBe(true);
    expect(r.pares.length).toBeLessThan(110);
  });

  it("proteína × DNA é recusado", () => {
    const dna = agrupar(bna).find((c) => c.tipo === "dna")!;
    expect(() => compararCadeias(cadeia("1CRN.cif"), dna, { modo: "global", pares: "alinhados" })).toThrow(/proteína com proteína/);
  });

  it("DNA × DNA usa o C4' (1BNA fita A × fita B)", () => {
    const [a, b] = agrupar(bna).filter((c) => c.tipo === "dna");
    const r = compararCadeias(a, b, { modo: "global", pares: "alinhados" });
    expect(r.atomo).toBe("C4'");
    expect(r.pares).toHaveLength(12);
  });
});
