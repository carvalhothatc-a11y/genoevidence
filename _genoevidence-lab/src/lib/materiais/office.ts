import { unzipSync } from "fflate";

/**
 * Leitura de XLSX e DOCX (pacotes ZIP com XML) sem executar nada do arquivo: só os XML de dados
 * são descompactados, com limite de tamanho descompactado (proteção contra “zip bomb”).
 * Fórmulas não são calculadas: vale o último valor salvo pela planilha.
 */
export class OfficeError extends Error {}

const LIMITE_DESCOMPACTADO = 40 * 1024 * 1024;
export const MAX_LINHAS = 2000;
export const MAX_COLUNAS = 60;

export const isZip = (b: Uint8Array) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

function abrir(bytes: Uint8Array, quer: (nome: string) => boolean): Record<string, string> {
  if (!isZip(bytes)) throw new OfficeError("O arquivo não é um pacote do Office válido.");
  let total = 0;
  let arquivos: Record<string, Uint8Array>;
  try {
    arquivos = unzipSync(bytes, {
      filter: (f) => {
        if (!quer(f.name)) return false;
        total += f.originalSize;
        if (f.originalSize > LIMITE_DESCOMPACTADO || total > LIMITE_DESCOMPACTADO) throw new OfficeError("Conteúdo descompactado grande demais.");
        return true;
      },
    });
  } catch (e) {
    if (e instanceof OfficeError) throw e;
    throw new OfficeError("Não foi possível abrir o pacote (arquivo corrompido ou protegido por senha).");
  }
  const dec = new TextDecoder("utf-8");
  return Object.fromEntries(Object.entries(arquivos).map(([k, v]) => [k, dec.decode(v)]));
}

export function decodificarXml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const attr = (tag: string, nome: string) => {
  const m = new RegExp(`\\s${nome}="([^"]*)"`).exec(tag);
  return m ? decodificarXml(m[1]) : null;
};

// ---------------------------------------------------------------- DOCX

export function textoDocx(bytes: Uint8Array): string {
  const arq = abrir(bytes, (n) => n === "word/document.xml");
  const xml = arq["word/document.xml"];
  if (!xml) throw new OfficeError("Documento sem conteúdo principal (word/document.xml).");
  const corpo = /<w:body[^>]*>([\s\S]*)<\/w:body>/.exec(xml)?.[1] ?? xml;
  const paragrafos = corpo.split(/<\/w:p>/).map((p) => {
    let s = "";
    for (const m of p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br[^>]*\/>/g)) s += m[1] !== undefined ? decodificarXml(m[1]) : m[0].startsWith("<w:tab") ? "\t" : "\n";
    return s;
  });
  return paragrafos
    .map((p) => p.replace(/[  ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------- XLSX

export type Planilha = { abas: string[]; aba: string; colunas: string[]; linhas: (string | null)[][]; totalLinhas: number; avisos: string[] };

function indiceColuna(ref: string): number {
  const letras = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

export function lerXlsx(bytes: Uint8Array, abaPedida?: string | null): Planilha {
  const meta = abrir(bytes, (n) => n === "xl/workbook.xml" || n === "xl/_rels/workbook.xml.rels" || n === "xl/sharedStrings.xml");
  const wb = meta["xl/workbook.xml"];
  if (!wb) throw new OfficeError("Planilha sem pasta de trabalho (xl/workbook.xml).");
  const rels = meta["xl/_rels/workbook.xml.rels"] ?? "";
  const alvos = new Map<string, string>();
  for (const r of rels.match(/<Relationship\b[^>]*>/g) ?? []) {
    const id = attr(r, "Id");
    const t = attr(r, "Target");
    if (id && t) alvos.set(id, t.replace(/^\/?xl\//, "").replace(/^\//, ""));
  }
  const abas = (wb.match(/<sheet\b[^>]*\/?>/g) ?? []).map((s) => ({ nome: attr(s, "name") ?? "Planilha", alvo: alvos.get(attr(s, "r:id") ?? "") ?? null }));
  if (!abas.length) throw new OfficeError("Nenhuma aba encontrada.");
  const escolhida = abas.find((a) => a.nome === abaPedida) ?? abas[0];
  if (!escolhida.alvo) throw new OfficeError(`Não foi possível localizar os dados da aba “${escolhida.nome}”.`);
  const caminho = `xl/${escolhida.alvo.replace(/^\.\//, "")}`;
  const folha = abrir(bytes, (n) => n === caminho)[caminho];
  if (!folha) throw new OfficeError(`Aba “${escolhida.nome}” sem dados.`);

  const compartilhadas: string[] = [];
  for (const si of (meta["xl/sharedStrings.xml"] ?? "").match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    const partes = [...si.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodificarXml(m[1]));
    compartilhadas.push(partes.join(""));
  }

  const avisos: string[] = [];
  const grade: (string | null)[][] = [];
  let totalLinhas = 0;
  let formulas = 0;
  let colunasCortadas = false;
  for (const row of folha.match(/<row\b[\s\S]*?(?:<\/row>|\/>)/g) ?? []) {
    const r = Number(attr(row, "r") ?? grade.length + 1) - 1;
    const celulas: (string | null)[] = [];
    let alguma = false;
    for (const c of row.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
      const ref = attr(c, "r") ?? "";
      const col = ref ? indiceColuna(ref) : celulas.length;
      if (col >= MAX_COLUNAS) {
        colunasCortadas = true;
        continue;
      }
      const t = attr(c, "t");
      if (/<f[\s>]/.test(c)) formulas++;
      let valor: string | null = null;
      if (t === "inlineStr") valor = [...c.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodificarXml(m[1])).join("");
      else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1];
        if (v !== undefined) valor = t === "s" ? (compartilhadas[Number(v)] ?? null) : t === "b" ? (v === "1" ? "VERDADEIRO" : "FALSO") : decodificarXml(v);
      }
      while (celulas.length < col) celulas.push(null);
      celulas[col] = valor === "" ? null : valor;
      if (valor !== null && valor !== "") alguma = true;
    }
    if (!alguma) continue;
    totalLinhas++;
    if (grade.length <= MAX_LINHAS) grade[r] = celulas;
  }
  const linhasCheias = grade.filter(Boolean);
  if (!linhasCheias.length) throw new OfficeError(`A aba “${escolhida.nome}” está vazia.`);
  const cabecalho = linhasCheias[0];
  const nCols = Math.min(MAX_COLUNAS, Math.max(...linhasCheias.map((l) => l.length)));
  const colunas = Array.from({ length: nCols }, (_, i) => (cabecalho[i]?.trim() || `Coluna ${i + 1}`).slice(0, 120));
  const linhas = linhasCheias.slice(1, MAX_LINHAS + 1).map((l) => Array.from({ length: nCols }, (_, i) => (l[i] ?? null) === null ? null : String(l[i]).slice(0, 200)));
  if (totalLinhas - 1 > MAX_LINHAS) avisos.push(`A aba tem ${totalLinhas - 1} linhas de dados; foram lidas as primeiras ${MAX_LINHAS}.`);
  if (colunasCortadas) avisos.push(`Colunas além da ${MAX_COLUNAS}ª foram ignoradas.`);
  if (formulas) avisos.push(`${formulas} célula(s) com fórmula: foi usado o último valor salvo pela planilha (as fórmulas não são recalculadas).`);
  if (abas.length > 1) avisos.push(`A planilha tem ${abas.length} abas; mostrando “${escolhida.nome}”.`);
  return { abas: abas.map((a) => a.nome), aba: escolhida.nome, colunas, linhas, totalLinhas: Math.max(0, totalLinhas - 1), avisos };
}
