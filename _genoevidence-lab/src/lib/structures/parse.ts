import type { ChainSummary, StructureSummary } from "@/lib/domain/schemas";

/**
 * Leitura mínima de PDB e mmCIF para PROVENIÊNCIA e CONFERÊNCIA de numeração.
 * Não substitui o Mol*: serve para listar cadeias, sequência, numeração do autor e método,
 * e para conferir cadeia/resíduo antes de destacar uma variante.
 */

export const THREE_TO_ONE: Record<string, string> = {
  ALA: "A", ARG: "R", ASN: "N", ASP: "D", CYS: "C", GLN: "Q", GLU: "E", GLY: "G", HIS: "H", ILE: "I",
  LEU: "L", LYS: "K", MET: "M", PHE: "F", PRO: "P", SER: "S", THR: "T", TRP: "W", TYR: "Y", VAL: "V",
  SEC: "U", PYL: "O", MSE: "M",
  DA: "A", DC: "C", DG: "G", DT: "T", DU: "U", A: "A", C: "C", G: "G", U: "U", T: "T",
};
const ONE_TO_THREE: Record<string, string> = Object.fromEntries(
  ["ALA", "ARG", "ASN", "ASP", "CYS", "GLN", "GLU", "GLY", "HIS", "ILE", "LEU", "LYS", "MET", "PHE", "PRO", "SER", "THR", "TRP", "TYR", "VAL"].map((t) => [THREE_TO_ONE[t], t]),
);

const EXPERIMENTAL = ["X-RAY DIFFRACTION", "SOLUTION NMR", "SOLID-STATE NMR", "ELECTRON MICROSCOPY", "ELECTRON CRYSTALLOGRAPHY", "NEUTRON DIFFRACTION", "FIBER DIFFRACTION", "POWDER DIFFRACTION", "SOLUTION SCATTERING", "INFRARED SPECTROSCOPY", "FLUORESCENCE TRANSFER", "EPR"];

type Residue = { chain: string; num: number; ins: string; name: string; hetero: boolean };

export class StructureParseError extends Error {}

// ---------------------------------------------------------------- mmCIF

type CifData = { items: Map<string, string>; loops: Map<string, Record<string, string>[]>; categories: Set<string> };

function cifTokenize(text: string): string[] {
  const tokens: string[] = [];
  const lines = text.split(/\r?\n/);
  const re = /'(?:[^']|'(?=\S))*'|"(?:[^"]|"(?=\S))*"|\S+/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(";")) {
      const buf = [line.slice(1)];
      i++;
      while (i < lines.length && !lines[i].startsWith(";")) buf.push(lines[i++]);
      tokens.push(buf.join("\n").trim());
      continue;
    }
    const hash = line.indexOf("#");
    const content = hash === 0 ? "" : line;
    for (const m of content.matchAll(re)) {
      let t = m[0];
      if (t.startsWith("#")) break;
      if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) t = t.slice(1, -1);
      tokens.push(t);
    }
  }
  return tokens;
}

function parseCif(text: string): CifData {
  const tokens = cifTokenize(text);
  const items = new Map<string, string>();
  const loops = new Map<string, Record<string, string>[]>();
  const categories = new Set<string>();
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.startsWith("data_")) {
      i++;
      continue;
    }
    if (t === "loop_") {
      i++;
      const tags: string[] = [];
      while (i < tokens.length && tokens[i].startsWith("_")) tags.push(tokens[i++]);
      const rows: Record<string, string>[] = [];
      while (i < tokens.length && !tokens[i].startsWith("_") && tokens[i] !== "loop_" && !tokens[i].startsWith("data_")) {
        const row: Record<string, string> = {};
        for (const tag of tags) row[tag] = tokens[i++] ?? "";
        rows.push(row);
      }
      const cat = tags[0]?.split(".")[0] ?? "";
      categories.add(cat);
      loops.set(cat, rows);
      continue;
    }
    if (t.startsWith("_")) {
      items.set(t, tokens[i + 1] ?? "");
      categories.add(t.split(".")[0]);
      i += 2;
      continue;
    }
    i++;
  }
  return { items, loops, categories };
}

function cifValues(d: CifData, key: string): string[] {
  const cat = key.split(".")[0];
  if (d.items.has(key)) return [d.items.get(key)!];
  return (d.loops.get(cat) ?? []).map((r) => r[key]).filter((v) => v !== undefined && v !== "?" && v !== ".");
}

function readMmcif(text: string) {
  const d = parseCif(text);
  const atoms = d.loops.get("_atom_site");
  if (!atoms?.length) throw new StructureParseError("O arquivo mmCIF não contém a categoria _atom_site.");
  const models = new Set(atoms.map((a) => a["_atom_site.pdbx_PDB_model_num"]).filter(Boolean));
  const firstModel = atoms[0]["_atom_site.pdbx_PDB_model_num"];
  const residues: Residue[] = [];
  const seen = new Set<string>();
  for (const a of atoms) {
    if (firstModel && a["_atom_site.pdbx_PDB_model_num"] !== firstModel) continue;
    const chain = a["_atom_site.auth_asym_id"] ?? a["_atom_site.label_asym_id"];
    const num = Number(a["_atom_site.auth_seq_id"]);
    const insRaw = a["_atom_site.pdbx_PDB_ins_code"] ?? "";
    const ins = insRaw === "?" || insRaw === "." ? "" : insRaw;
    const name = a["_atom_site.auth_comp_id"] ?? a["_atom_site.label_comp_id"];
    const hetero = a["_atom_site.group_PDB"] === "HETATM";
    if (!Number.isFinite(num) || !chain) continue;
    const key = `${chain}|${num}|${ins}`;
    if (seen.has(key)) continue;
    seen.add(key);
    residues.push({ chain, num, ins, name, hetero });
  }
  const method = cifValues(d, "_exptl.method").join("; ") || undefined;
  const resolution = Number(cifValues(d, "_refine.ls_d_res_high")[0] ?? cifValues(d, "_reflns.d_resolution_high")[0] ?? cifValues(d, "_em_3d_reconstruction.resolution")[0]);
  const modelCif = [...d.categories].some((c) => c.startsWith("_ma_"));
  return {
    residues,
    title: cifValues(d, "_struct.title")[0],
    idCode: cifValues(d, "_entry.id")[0],
    method,
    resolution: Number.isFinite(resolution) ? resolution : undefined,
    modelCif,
    models: models.size,
    computedTitle: false,
  };
}

// ---------------------------------------------------------------- PDB

function readPdb(text: string) {
  const residues: Residue[] = [];
  const seen = new Set<string>();
  let title = "";
  let idCode: string | undefined;
  let method: string | undefined;
  let resolution: number | undefined;
  let models = 0;
  let inFirstModel = true;
  for (const line of text.split(/\r?\n/)) {
    const rec = line.slice(0, 6).trim();
    if (rec === "HEADER") idCode = line.slice(62, 66).trim() || undefined;
    else if (rec === "TITLE") title += (title ? " " : "") + line.slice(10).trim();
    else if (rec === "EXPDTA") method = line.slice(10).trim();
    else if (rec === "REMARK" && line.slice(6, 10).trim() === "2") {
      const m = /RESOLUTION\.\s+([\d.]+)\s+ANGSTROM/i.exec(line);
      if (m) resolution = Number(m[1]);
    } else if (rec === "MODEL") {
      models++;
      if (models > 1) inFirstModel = false;
    } else if ((rec === "ATOM" || rec === "HETATM") && inFirstModel) {
      const chain = line.slice(21, 22).trim() || "_";
      const num = Number(line.slice(22, 26).trim());
      const ins = line.slice(26, 27).trim();
      const name = line.slice(17, 20).trim();
      if (!Number.isFinite(num)) continue;
      const key = `${chain}|${num}|${ins}`;
      if (seen.has(key)) continue;
      seen.add(key);
      residues.push({ chain, num, ins, name, hetero: rec === "HETATM" });
    }
  }
  if (!residues.length) throw new StructureParseError("O arquivo PDB não contém registros ATOM/HETATM.");
  return { residues, title: title || undefined, idCode, method, resolution, modelCif: false, models: Math.max(models, 1), computedTitle: /ALPHAFOLD/i.test(title) };
}

// ---------------------------------------------------------------- resumo

export function detectFormat(name: string, text: string): "pdb" | "mmcif" {
  if (/\.(cif|mmcif)$/i.test(name) || /^\s*data_/m.test(text.slice(0, 2000))) return "mmcif";
  return "pdb";
}

export type ParsedStructure = { summary: StructureSummary; format: "pdb" | "mmcif" };

export function parseStructure(name: string, text: string): ParsedStructure {
  const format = detectFormat(name, text);
  const r = format === "mmcif" ? readMmcif(text) : readPdb(text);
  const warnings: string[] = [];
  if (r.models > 1) warnings.push(`O arquivo tem ${r.models} modelos; a conferência usa apenas o primeiro.`);

  const byChain = new Map<string, Residue[]>();
  for (const res of r.residues) {
    const polymer = !res.hetero || res.name === "MSE";
    if (!polymer || !(res.name in THREE_TO_ONE)) continue;
    if (!byChain.has(res.chain)) byChain.set(res.chain, []);
    byChain.get(res.chain)!.push(res);
  }
  const chains: ChainSummary[] = [...byChain.entries()].map(([id, list]) => {
    const gaps: [number, number][] = [];
    for (let k = 1; k < list.length; k++) if (list[k].num - list[k - 1].num > 1) gaps.push([list[k - 1].num + 1, list[k].num - 1]);
    return {
      id,
      entityType: "polimero" as const,
      residueCount: list.length,
      firstResidue: list[0]?.num,
      lastResidue: list[list.length - 1]?.num,
      sequence: list.map((x) => THREE_TO_ONE[x.name] ?? "X").join(""),
      gaps,
      hasInsertionCodes: list.some((x) => x.ins),
      residues: list.map((x) => [x.num, x.ins, x.name] as [number, string, string]),
    };
  });
  if (!chains.length) warnings.push("Nenhuma cadeia polimérica reconhecida.");
  if (chains.some((c) => c.hasInsertionCodes)) warnings.push("Há códigos de inserção na numeração; informe-os ao destacar resíduos.");
  if (chains.some((c) => c.gaps.length)) warnings.push("Há lacunas na numeração (resíduos ausentes do modelo).");

  const m = (r.method ?? "").toUpperCase();
  let classification: StructureSummary["classification"] = "desconhecida";
  let basis = "O arquivo não informa o método de obtenção.";
  if (r.modelCif) {
    classification = "computacional";
    basis = "O arquivo contém categorias ModelCIF (_ma_*), usadas para modelos computacionais.";
  } else if (m.includes("THEORETICAL MODEL") || r.computedTitle) {
    classification = "computacional";
    basis = r.computedTitle ? "O título do arquivo indica predição computacional (AlphaFold)." : `Método declarado no arquivo: ${r.method}.`;
  } else if (EXPERIMENTAL.some((e) => m.includes(e))) {
    classification = "experimental";
    basis = `Método declarado no arquivo: ${r.method}.`;
  } else if (r.method) {
    basis = `Método declarado no arquivo (${r.method}) não reconhecido pela plataforma.`;
  }

  return {
    format,
    summary: {
      title: r.title,
      idCode: r.idCode,
      method: r.method,
      resolution: r.resolution,
      classification,
      classificationBasis: basis,
      chains,
      numbering: "autor",
      warnings,
    },
  };
}

export type ResidueCheck = { check: "confere" | "diverge" | "nao_encontrado" | "sem_expectativa"; observed?: string; message: string };

/** Confere cadeia, numeração (do autor) e identidade do resíduo ANTES de destacar uma posição. */
export function checkResidue(summary: StructureSummary, chain: string, num: number, ins = "", expected?: string): ResidueCheck {
  const c = summary.chains.find((x) => x.id === chain);
  if (!c) return { check: "nao_encontrado", message: `A cadeia ${chain} não existe neste arquivo (cadeias: ${summary.chains.map((x) => x.id).join(", ") || "nenhuma"}).` };
  const res = c.residues?.find(([n, i]) => n === num && i === ins.trim().toUpperCase());
  if (!res) {
    const inGap = c.gaps.find(([a, b]) => num >= a && num <= b);
    return {
      check: "nao_encontrado",
      message: inGap
        ? `O resíduo ${num} está numa lacuna da cadeia ${chain} (ausente do modelo).`
        : `Não há resíduo ${num}${ins} na cadeia ${chain} (numeração do autor ${c.firstResidue}–${c.lastResidue}). A numeração pode diferir da UniProt.`,
    };
  }
  const observed = res[2];
  if (!expected?.trim()) return { check: "sem_expectativa", observed, message: `Resíduo observado: ${observed} ${num}${ins} (cadeia ${chain}).` };
  const e = expected.trim().toUpperCase();
  const exp3 = e.length === 1 ? ONE_TO_THREE[e] : e;
  if (!exp3) return { check: "diverge", observed, message: `Resíduo esperado “${expected}” não reconhecido.` };
  return exp3 === observed
    ? { check: "confere", observed, message: `Confere: ${observed} ${num}${ins} na cadeia ${chain}.` }
    : { check: "diverge", observed, message: `Diverge: o arquivo tem ${observed} na posição ${num}${ins} da cadeia ${chain}, não ${exp3}. Confira a numeração (autor × UniProt) e a cadeia antes de destacar.` };
}
