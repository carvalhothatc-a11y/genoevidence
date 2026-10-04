"use client";
import { normalizar } from "@/lib/ideia/parse";
import { numeroCelula } from "@/lib/experimento/interpretar";
import { classificarReferencia, type ElementoImagem, type MaterialImagem, type MaterialRelatorio, type MaterialTabela } from "@/lib/experimento/materiais";
import type { PapelColuna } from "@/lib/experimento/schema";
import { novoId, useExperimento } from "@/store/experimento";

/** Operações sobre materiais. Cada uma informa o estado real (sucesso, aviso ou falha). */
const LIMITE = 20 * 1024 * 1024;
const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp"];

export type Resultado = { ok: true; aviso?: string } | { ok: false; erro: string };

export function sugerirPapeis(colunas: string[], linhas: (string | null)[][]): PapelColuna[] {
  const usados = new Set<PapelColuna>();
  return colunas.map((c, i) => {
    const n = normalizar(c);
    const unico = (p: PapelColuna): PapelColuna => (usados.has(p) && p !== "valor" ? "ignorar" : (usados.add(p), p));
    if (/^(id|codigo|cod)\b|identificador/.test(n)) return unico("identificador");
    if (/amostra|sample|paciente|individuo|\bpoco\b|\bwell\b/.test(n)) return unico("amostra");
    if (/grupo|group|tratamento|condicao|treatment/.test(n)) return unico("grupo");
    if (/replica|\brep\b|repeticao/.test(n)) return unico("replica");
    if (/^unidade|^unit/.test(n)) return unico("unidade");
    if (/tempo|\btime\b|hora|minuto|\bdia\b|\bday\b/.test(n)) return unico("tempo");
    const vals = linhas.slice(0, 80).map((l) => numeroCelula(l[i] ?? null)).filter((v) => v !== null);
    if (vals.length && vals.every((v) => v !== undefined)) return "valor";
    return "ignorar";
  });
}

async function extrair(file: File, aba?: string | null) {
  const fd = new FormData();
  fd.append("file", file);
  if (aba) fd.append("aba", aba);
  const r = await fetch("/api/materiais/extrair", { method: "POST", body: fd });
  const d = (await r.json().catch(() => ({}))) as { extracao?: unknown; error?: string };
  if (!r.ok || !d.extracao) throw new Error(d.error ?? "Não foi possível ler o arquivo.");
  return d.extracao as
    | { tipo: "relatorio"; formato: MaterialRelatorio["formato"]; estado: MaterialRelatorio["estado"]; texto: string; paginas: number | null; aviso: string | null }
    | { tipo: "tabela"; formato: "csv" | "xlsx"; abas: string[]; aba: string | null; colunas: string[]; linhas: (string | null)[][]; totalLinhas: number; avisos: string[] };
}

/** Abas disponíveis em planilhas, por material (não faz parte do material persistido). */
export const abasPorMaterial = new Map<string, string[]>();

export function adicionarImagem(file: File): Resultado {
  if (!TIPOS_IMAGEM.includes(file.type)) return { ok: false, erro: `“${file.name}”: use PNG, JPEG ou WebP.` };
  if (file.size > LIMITE) return { ok: false, erro: `“${file.name}” passa de 20 MB.` };
  const m: MaterialImagem = { id: novoId("img"), tipo: "imagem", nome: file.name.slice(0, 200), mime: file.type, bytes: file.size, legenda: "", elementos: [], analisadaEm: null, arquivoId: null };
  useExperimento.getState().addMaterial(m, file);
  return { ok: true };
}

export async function adicionarTabela(file: File): Promise<Resultado> {
  if (file.size > LIMITE) return { ok: false, erro: `“${file.name}” passa de 20 MB.` };
  try {
    const x = await extrair(file);
    if (x.tipo !== "tabela") return { ok: false, erro: "O arquivo não é uma tabela (use CSV ou XLSX)." };
    const id = novoId("tab");
    if (x.abas.length) abasPorMaterial.set(id, x.abas);
    const m: MaterialTabela = { id, tipo: "tabela", nome: file.name.slice(0, 200), aba: x.aba, colunas: x.colunas, linhas: x.linhas, papeis: sugerirPapeis(x.colunas, x.linhas), unidade: null, totalLinhas: x.totalLinhas, avisos: x.avisos, arquivoId: null };
    useExperimento.getState().addMaterial(m, file);
    return { ok: true, aviso: x.avisos[0] };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao ler a tabela." };
  }
}

export async function trocarAba(id: string, aba: string): Promise<Resultado> {
  const st = useExperimento.getState();
  const file = st.arquivos[id];
  if (!file) return { ok: false, erro: "O arquivo original não está mais neste navegador; envie-o de novo para trocar de aba." };
  try {
    const x = await extrair(file, aba);
    if (x.tipo !== "tabela") return { ok: false, erro: "Aba inválida." };
    st.updMaterial(id, (m) => (m.tipo === "tabela" ? { ...m, aba: x.aba, colunas: x.colunas, linhas: x.linhas, papeis: sugerirPapeis(x.colunas, x.linhas), totalLinhas: x.totalLinhas, avisos: x.avisos } : m));
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao ler a aba." };
  }
}

export async function adicionarRelatorio(file: File): Promise<Resultado> {
  if (file.size > LIMITE) return { ok: false, erro: `“${file.name}” passa de 20 MB.` };
  try {
    const x = await extrair(file);
    if (x.tipo !== "relatorio") return { ok: false, erro: "Use PDF, DOCX ou TXT para relatórios." };
    const m: MaterialRelatorio = { id: novoId("rel"), tipo: "relatorio", nome: file.name.slice(0, 200), formato: x.formato, estado: x.estado, texto: x.texto, paginas: x.paginas, aviso: x.aviso, arquivoId: null };
    useExperimento.getState().addMaterial(m, file);
    return x.estado === "extraido" ? { ok: true, aviso: x.aviso ?? undefined } : { ok: true, aviso: x.aviso ?? "O conteúdo não pôde ser extraído." };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao ler o relatório." };
  }
}

export function adicionarReferencias(texto: string): number {
  const linhas = texto
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4)
    .slice(0, 20);
  for (const l of linhas) useExperimento.getState().addMaterial({ id: novoId("ref"), tipo: "referencia", ...classificarReferencia(l.slice(0, 500)) });
  return linhas.length;
}

/** Reduz a foto no navegador (lado maior ≤ 1568 px, JPEG) antes de qualquer envio. */
async function reduzir(file: File): Promise<{ base64: string; mime: "image/jpeg" }> {
  const bmp = await createImageBitmap(file);
  const escala = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * escala);
  c.height = Math.round(bmp.height * escala);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao preparar a imagem."))), "image/jpeg", 0.86));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { base64: btoa(bin), mime: "image/jpeg" };
}

/** Identificação automática (Claude). Só chamada depois da autorização explícita na tela. */
export async function identificarImagem(id: string): Promise<Resultado & { naoIdentificados?: string[]; descricao?: string }> {
  const st = useExperimento.getState();
  const file = st.arquivos[id];
  const m = st.materiais.find((x) => x.id === id);
  if (!file || !m || m.tipo !== "imagem") return { ok: false, erro: "O arquivo original não está mais neste navegador; envie a foto de novo." };
  try {
    const { base64, mime } = await reduzir(file);
    const r = await fetch("/api/interpretar/imagem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagem: base64, mime, legenda: m.legenda, consentimento: true }) });
    const d = (await r.json().catch(() => ({}))) as { resultado?: { descricao: string; elementos: { objeto: ElementoImagem["objeto"]; rotulo: string; nota: string; certeza: string }[]; naoIdentificados: string[] }; error?: string };
    if (!r.ok || !d.resultado) return { ok: false, erro: d.error ?? "A identificação falhou." };
    const novos: ElementoImagem[] = d.resultado.elementos.slice(0, 20).map((e) => ({ id: novoId("el"), objeto: e.objeto, rotulo: e.rotulo.slice(0, 80), nota: `${e.nota}${e.certeza !== "alta" ? ` (certeza ${e.certeza})` : ""}`.slice(0, 200), origem: "ia", confirmado: false }));
    st.updMaterial(id, (x) => (x.tipo === "imagem" ? { ...x, elementos: [...x.elementos.filter((e) => e.origem === "usuario"), ...novos], analisadaEm: new Date().toISOString() } : x));
    return { ok: true, naoIdentificados: d.resultado.naoIdentificados, descricao: d.resultado.descricao };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "A identificação falhou." };
  }
}
