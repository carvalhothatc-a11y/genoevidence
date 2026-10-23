import { THREE_TO_ONE } from "@/lib/structures/parse";

/**
 * Átomos de um arquivo de estrutura (mmCIF ou PDB), para os CÁLCULOS que o GenoLab faz por conta
 * própria — superposição, RMSD, pares de bases. O desenho em 3D é do Mol*, que lê o mesmo arquivo.
 *
 * Regras de leitura, as mesmas da maioria dos programas:
 *  - só o primeiro modelo (estruturas de RMN trazem vários);
 *  - em posições com conformações alternativas, fica a primeira (sem marca, "A" ou a primeira que aparecer);
 *  - numeração e cadeia do AUTOR (auth_seq_id, auth_asym_id) — a mesma que os artigos citam.
 */

export type Atomo = {
  cadeia: string;
  numero: number;
  insercao: string;
  residuo: string;
  nome: string;
  elemento: string;
  x: number;
  y: number;
  z: number;
  b: number;
  hetero: boolean;
};

export type TipoResiduo = "aminoacido" | "nucleotideo" | "agua" | "outro";

export type Residuo = {
  cadeia: string;
  numero: number;
  insercao: string;
  nome: string;
  /** Letra única (aminoácido ou base); "X" quando não há. */
  letra: string;
  tipo: TipoResiduo;
  atomos: Atomo[];
};

export type Cadeia = {
  id: string;
  tipo: "proteina" | "dna" | "rna" | "outro";
  residuos: Residuo[];
  /** Sequência dos resíduos de polímero, na ordem do arquivo. */
  sequencia: string;
};

const AMINO = new Set(["ALA", "ARG", "ASN", "ASP", "CYS", "GLN", "GLU", "GLY", "HIS", "ILE", "LEU", "LYS", "MET", "PHE", "PRO", "SER", "THR", "TRP", "TYR", "VAL", "SEC", "PYL", "MSE"]);
const DESOXI = new Set(["DA", "DC", "DG", "DT", "DU", "DI"]);
const RIBO = new Set(["A", "C", "G", "U", "I"]);
const AGUA = new Set(["HOH", "WAT", "DOD", "H2O"]);

export function tipoDoResiduo(nome: string): TipoResiduo {
  if (AMINO.has(nome)) return "aminoacido";
  if (DESOXI.has(nome) || RIBO.has(nome)) return "nucleotideo";
  if (AGUA.has(nome)) return "agua";
  return "outro";
}

// ---------------------------------------------------------------- mmCIF

const TOKEN = /'(?:[^']|'(?=\S))*'|"(?:[^"]|"(?=\S))*"|\S+/g;

function tirarAspas(t: string): string {
  return (t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"')) ? t.slice(1, -1) : t;
}

function lerMmcif(texto: string): Atomo[] {
  const linhas = texto.split(/\r?\n/);
  let i = 0;
  // procura o laço do _atom_site
  for (; i < linhas.length; i++) {
    if (linhas[i].startsWith("_atom_site.")) break;
  }
  const colunas: string[] = [];
  for (; i < linhas.length && linhas[i].startsWith("_atom_site."); i++) colunas.push(linhas[i].trim().slice("_atom_site.".length));
  if (!colunas.length) throw new Error("O arquivo não tem a tabela de átomos (_atom_site).");
  const c = (n: string) => colunas.indexOf(n);
  const col = {
    grupo: c("group_PDB"),
    elemento: c("type_symbol"),
    nome: c("auth_atom_id") >= 0 ? c("auth_atom_id") : c("label_atom_id"),
    alt: c("label_alt_id"),
    residuo: c("auth_comp_id") >= 0 ? c("auth_comp_id") : c("label_comp_id"),
    cadeia: c("auth_asym_id") >= 0 ? c("auth_asym_id") : c("label_asym_id"),
    numero: c("auth_seq_id") >= 0 ? c("auth_seq_id") : c("label_seq_id"),
    insercao: c("pdbx_PDB_ins_code"),
    x: c("Cartn_x"),
    y: c("Cartn_y"),
    z: c("Cartn_z"),
    b: c("B_iso_or_equiv"),
    modelo: c("pdbx_PDB_model_num"),
  };
  if (col.x < 0 || col.y < 0 || col.z < 0) throw new Error("A tabela de átomos não tem coordenadas.");

  const brutos: { a: Atomo; alt: string; modelo: string }[] = [];
  for (; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l || l.startsWith("#") || l.startsWith("loop_") || l.startsWith("_")) {
      if (brutos.length) break;
      continue;
    }
    const t = l.match(TOKEN)?.map(tirarAspas) ?? [];
    if (t.length < colunas.length) continue;
    const v = (k: number) => (k >= 0 ? t[k] : "");
    const ins = v(col.insercao);
    brutos.push({
      alt: v(col.alt),
      modelo: v(col.modelo) || "1",
      a: {
        cadeia: v(col.cadeia),
        numero: Number(v(col.numero)),
        insercao: ins === "?" || ins === "." ? "" : ins,
        residuo: v(col.residuo),
        nome: v(col.nome),
        elemento: v(col.elemento),
        x: Number(v(col.x)),
        y: Number(v(col.y)),
        z: Number(v(col.z)),
        b: Number(v(col.b)),
        hetero: v(col.grupo) === "HETATM",
      },
    });
  }
  return filtrar(brutos);
}

// ---------------------------------------------------------------- PDB

function lerPdb(texto: string): Atomo[] {
  const brutos: { a: Atomo; alt: string; modelo: string }[] = [];
  let modelo = "1";
  let viuModelo = false;
  for (const l of texto.split(/\r?\n/)) {
    if (l.startsWith("MODEL")) {
      if (viuModelo) break; // só o primeiro modelo
      viuModelo = true;
      modelo = l.slice(10, 14).trim() || "1";
      continue;
    }
    if (!l.startsWith("ATOM  ") && !l.startsWith("HETATM")) continue;
    const nome = l.slice(12, 16).trim();
    brutos.push({
      alt: l.slice(16, 17).trim(),
      modelo,
      a: {
        cadeia: l.slice(21, 22).trim(),
        numero: Number(l.slice(22, 26)),
        insercao: l.slice(26, 27).trim(),
        residuo: l.slice(17, 20).trim(),
        nome,
        elemento: l.slice(76, 78).trim() || nome.replace(/[^A-Za-z]/g, "").slice(0, 1),
        x: Number(l.slice(30, 38)),
        y: Number(l.slice(38, 46)),
        z: Number(l.slice(46, 54)),
        b: Number(l.slice(60, 66)),
        hetero: l.startsWith("HETATM"),
      },
    });
  }
  if (!brutos.length) throw new Error("O arquivo não tem linhas ATOM/HETATM.");
  return filtrar(brutos);
}

/** Primeiro modelo; primeira conformação alternativa de cada átomo. */
function filtrar(brutos: { a: Atomo; alt: string; modelo: string }[]): Atomo[] {
  const primeiroModelo = brutos[0]?.modelo;
  const altEscolhida = new Map<string, string>();
  const vistos = new Set<string>();
  const out: Atomo[] = [];
  for (const { a, alt, modelo } of brutos) {
    if (modelo !== primeiroModelo) continue;
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.z) || !Number.isFinite(a.numero)) continue;
    const res = `${a.cadeia}|${a.numero}|${a.insercao}`;
    const marca = alt === "." || alt === "?" ? "" : alt;
    if (marca) {
      const escolhida = altEscolhida.get(res);
      if (escolhida === undefined) altEscolhida.set(res, marca);
      else if (escolhida !== marca) continue;
    }
    const chave = `${res}|${a.nome}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(a);
  }
  return out;
}

export function lerAtomos(texto: string, formato: "mmcif" | "pdb"): Atomo[] {
  return formato === "pdb" ? lerPdb(texto) : lerMmcif(texto);
}

/** Formato pelo conteúdo (para arquivos abertos do computador). */
export function detectarFormato(texto: string): "mmcif" | "pdb" | null {
  if (/^data_/m.test(texto) && texto.includes("_atom_site.")) return "mmcif";
  if (/^(ATOM {2}|HETATM)/m.test(texto)) return "pdb";
  return null;
}

// ---------------------------------------------------------------- cadeias e resíduos

export function agrupar(atomos: Atomo[]): Cadeia[] {
  const cadeias = new Map<string, Residuo[]>();
  let ultimo: Residuo | null = null;
  for (const a of atomos) {
    if (!ultimo || ultimo.cadeia !== a.cadeia || ultimo.numero !== a.numero || ultimo.insercao !== a.insercao) {
      const tipo = tipoDoResiduo(a.residuo);
      ultimo = { cadeia: a.cadeia, numero: a.numero, insercao: a.insercao, nome: a.residuo, letra: THREE_TO_ONE[a.residuo] ?? "X", tipo, atomos: [] };
      if (!cadeias.has(a.cadeia)) cadeias.set(a.cadeia, []);
      cadeias.get(a.cadeia)!.push(ultimo);
    }
    ultimo.atomos.push(a);
  }
  return [...cadeias.entries()].map(([id, residuos]) => {
    const pol = residuos.filter((r) => r.tipo === "aminoacido" || r.tipo === "nucleotideo");
    const nAmino = pol.filter((r) => r.tipo === "aminoacido").length;
    const nDesoxi = pol.filter((r) => DESOXI.has(r.nome)).length;
    const tipo: Cadeia["tipo"] = !pol.length ? "outro" : nAmino >= pol.length / 2 ? "proteina" : nDesoxi >= (pol.length - nAmino) / 2 ? "dna" : "rna";
    const doTipo = pol.filter((r) => (tipo === "proteina" ? r.tipo === "aminoacido" : r.tipo === "nucleotideo"));
    return { id, tipo, residuos, sequencia: doTipo.map((r) => r.letra).join("") };
  });
}

/** Rótulo legível de um resíduo, como aparece em artigo: "Lys 120 (cadeia A)". */
export function rotuloResiduo(r: { nome: string; numero: number; insercao?: string; cadeia: string }): string {
  return `${r.nome} ${r.numero}${r.insercao ?? ""} · cadeia ${r.cadeia}`;
}

// ---------------------------------------------------------------- pares de bases

export type ParDeBases = {
  a: Residuo;
  b: Residuo;
  /** Distância N1(purina)–N3(pirimidina), em Å, medida nas coordenadas do arquivo. */
  distancia: number;
};

const PURINA = new Set(["A", "G", "DA", "DG"]);
const BASE: Record<string, string> = { A: "A", DA: "A", G: "G", DG: "G", C: "C", DC: "C", T: "T", DT: "T", U: "U", DU: "U" };
const COMPLEMENTAR: Record<string, string[]> = { A: ["T", "U"], G: ["C"], C: ["G"], T: ["A"], U: ["A"] };

/**
 * Pares de Watson-Crick encontrados NAS COORDENADAS: bases complementares (A–T/U, G–C) cujo N1 da
 * purina fica a até `limite` Å do N3 da pirimidina — a ligação de hidrogênio central do par.
 * Num par canônico essa distância é perto de 2,9 Å. Pares não canônicos (G·U, Hoogsteen…) não entram.
 */
export function paresDeBases(cadeias: Cadeia[], limite = 3.3): ParDeBases[] {
  const nts = cadeias.flatMap((c) => c.residuos.filter((r) => r.tipo === "nucleotideo" && BASE[r.nome]));
  const n1 = (r: Residuo) => r.atomos.find((a) => a.nome === (PURINA.has(r.nome) ? "N1" : "N3"));
  const pares: ParDeBases[] = [];
  const usado = new Set<Residuo>();
  const candidatos: ParDeBases[] = [];
  for (let i = 0; i < nts.length; i++) {
    const a = nts[i];
    const pa = n1(a);
    if (!pa) continue;
    for (let j = i + 1; j < nts.length; j++) {
      const b = nts[j];
      if (!COMPLEMENTAR[BASE[a.nome]]?.includes(BASE[b.nome])) continue;
      if (PURINA.has(a.nome) === PURINA.has(b.nome)) continue;
      const pb = n1(b);
      if (!pb) continue;
      const d = Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
      if (d <= limite) candidatos.push({ a, b, distancia: d });
    }
  }
  // cada base num par só: fica o mais curto
  for (const p of candidatos.sort((x, y) => x.distancia - y.distancia)) {
    if (usado.has(p.a) || usado.has(p.b)) continue;
    usado.add(p.a);
    usado.add(p.b);
    pares.push(p);
  }
  return pares;
}

/**
 * Sentido das duas fitas em cada par, MEDIDO nas coordenadas.
 *
 * O eixo local da hélice sai dos centros dos pares vizinhos (média dos C1' de cada par); o sentido
 * 5'→3' de cada fita é o deslocamento entre os C4' do nucleotídeo anterior e do seguinte. Projetando
 * os dois no eixo: sinais opostos = fitas antiparalelas. (Comparar só o passo entre vizinhos não
 * serve: numa hélice ele tem um componente lateral maior que o avanço ao longo do eixo.)
 * Os pares das pontas, sem vizinho dos dois lados, ficam em `semMedida`.
 */
export function sentidoDasFitas(cadeias: Cadeia[], pares: ParDeBases[]): { antiparalelos: number; paralelos: number; semMedida: number } {
  const ordem = new Map<Residuo, { lista: Residuo[]; i: number }>();
  for (const c of cadeias) {
    const nts = c.residuos.filter((r) => r.tipo === "nucleotideo");
    nts.forEach((r, i) => ordem.set(r, { lista: nts, i }));
  }
  const atomo = (r: Residuo | undefined, ...nomes: string[]) => r?.atomos.find((a) => nomes.includes(a.nome));
  const vizinho = (r: Residuo, d: number) => {
    const o = ordem.get(r);
    return o ? o.lista[o.i + d] : undefined;
  };
  const passo = (r: Residuo) => {
    const p = atomo(vizinho(r, -1), "C4'", "C4*");
    const q = atomo(vizinho(r, 1), "C4'", "C4*");
    return p && q ? [q.x - p.x, q.y - p.y, q.z - p.z] : null;
  };
  const centro = (p: ParDeBases) => {
    const a = atomo(p.a, "C1'", "C1*");
    const b = atomo(p.b, "C1'", "C1*");
    return a && b ? [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2] : null;
  };
  const doResiduo = new Map<Residuo, ParDeBases>();
  for (const p of pares) {
    doResiduo.set(p.a, p);
    doResiduo.set(p.b, p);
  }
  let antiparalelos = 0;
  let paralelos = 0;
  let semMedida = 0;
  for (const p of pares) {
    const antes = vizinho(p.a, -1);
    const depois = vizinho(p.a, 1);
    const c0 = antes && doResiduo.get(antes) ? centro(doResiduo.get(antes)!) : null;
    const c1 = depois && doResiduo.get(depois) ? centro(doResiduo.get(depois)!) : null;
    const u = passo(p.a);
    const w = passo(p.b);
    if (!c0 || !c1 || !u || !w) {
      semMedida++;
      continue;
    }
    const eixo = [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]];
    const sa = u[0] * eixo[0] + u[1] * eixo[1] + u[2] * eixo[2];
    const sb = w[0] * eixo[0] + w[1] * eixo[1] + w[2] * eixo[2];
    if (sa * sb < 0) antiparalelos++;
    else paralelos++;
  }
  return { antiparalelos, paralelos, semMedida };
}
