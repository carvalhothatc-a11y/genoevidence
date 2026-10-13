import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataRoot } from "@/lib/repo";
import { newId, nowIso } from "@/lib/ids";
import { ArquivoRegistro, MAX_ARQUIVOS, MAX_VERSOES, Registro, type EntradaRegistro } from "./tipos";

/**
 * Armazenamento do caderno, em arquivos, ao lado do resto dos dados (pasta de LAB_DATA_DIR).
 *
 * Tudo é por pessoa: o identificador do usuário entra no CAMINHO. Não existe consulta que
 * atravesse contas — se o id do usuário não bate, o arquivo simplesmente não está lá.
 */

const VALID_USER = /^u_[A-Za-z0-9_-]{8,64}$/;
const VALID_REG = /^r_[A-Za-z0-9_-]{8,64}$/;
const VALID_ARQ = /^a_[A-Za-z0-9_-]{8,64}$/;

function pastaDoUsuario(userId: string): string {
  if (!VALID_USER.test(userId)) throw new Error("Identificador de usuário inválido.");
  return path.join(dataRoot(), "caderno", userId);
}
const arquivoDoRegistro = (userId: string, id: string) => path.join(pastaDoUsuario(userId), "registros", `${id}.json`);
const bytesDoAnexo = (userId: string, id: string) => path.join(pastaDoUsuario(userId), "anexos", id);

async function escreverJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(tmp, file);
}

async function lerJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Lista os registros da pessoa, do dia mais recente para o mais antigo. */
export async function listarRegistros(userId: string): Promise<Registro[]> {
  const dir = path.join(pastaDoUsuario(userId), "registros");
  let nomes: string[];
  try {
    nomes = await readdir(dir);
  } catch {
    return [];
  }
  const out: Registro[] = [];
  for (const nome of nomes) {
    if (!nome.endsWith(".json")) continue;
    const bruto = await lerJson<unknown>(path.join(dir, nome));
    const r = Registro.safeParse(bruto);
    if (r.success) out.push(r.data);
  }
  // Dia primeiro; no mesmo dia, o escrito por último aparece em cima.
  return out.sort((a, b) => (a.dia === b.dia ? b.criadoEm.localeCompare(a.criadoEm) : b.dia.localeCompare(a.dia)));
}

export async function lerRegistro(userId: string, id: string): Promise<Registro | null> {
  if (!VALID_REG.test(id)) return null;
  const r = Registro.safeParse(await lerJson<unknown>(arquivoDoRegistro(userId, id)));
  return r.success ? r.data : null;
}

export async function criarRegistro(userId: string, entrada: EntradaRegistro): Promise<Registro> {
  const agora = nowIso();
  const registro: Registro = {
    id: newId("r_"),
    dia: entrada.dia,
    texto: entrada.texto,
    criadoEm: agora,
    atualizadoEm: agora,
    projetoId: entrada.projetoId,
    experimentoId: entrada.experimentoId,
    arquivos: [],
    versoes: [],
  };
  await escreverJson(arquivoDoRegistro(userId, registro.id), registro);
  return registro;
}

/**
 * Edita um registro guardando a versão anterior. A versão mais antiga (a original) nunca é
 * descartada: quando o limite estoura, saem as do meio.
 */
export async function editarRegistro(userId: string, id: string, entrada: EntradaRegistro): Promise<Registro | null> {
  const atual = await lerRegistro(userId, id);
  if (!atual) return null;
  const mudou = atual.texto !== entrada.texto || atual.dia !== entrada.dia;
  const versoes = mudou ? [...atual.versoes, { dia: atual.dia, texto: atual.texto, substituidaEm: nowIso() }] : atual.versoes;
  const podadas = versoes.length > MAX_VERSOES ? [versoes[0], ...versoes.slice(versoes.length - (MAX_VERSOES - 1))] : versoes;
  const novo: Registro = {
    ...atual,
    dia: entrada.dia,
    texto: entrada.texto,
    projetoId: entrada.projetoId,
    experimentoId: entrada.experimentoId,
    atualizadoEm: nowIso(),
    versoes: podadas,
  };
  await escreverJson(arquivoDoRegistro(userId, id), novo);
  return novo;
}

/** Apaga o registro, as versões e os anexos dele. Não tem volta — a interface avisa antes. */
export async function excluirRegistro(userId: string, id: string): Promise<boolean> {
  const atual = await lerRegistro(userId, id);
  if (!atual) return false;
  for (const a of atual.arquivos) await rm(bytesDoAnexo(userId, a.id), { force: true });
  await rm(arquivoDoRegistro(userId, id), { force: true });
  return true;
}

export type NovoAnexo = { nome: string; mime: string; bytes: Uint8Array; legenda?: string };

export async function anexarArquivo(userId: string, id: string, entrada: NovoAnexo): Promise<{ registro: Registro; arquivo: ArquivoRegistro } | null> {
  const atual = await lerRegistro(userId, id);
  if (!atual) return null;
  if (atual.arquivos.length >= MAX_ARQUIVOS) throw new Error(`Este dia já tem ${MAX_ARQUIVOS} arquivos.`);
  const arquivo: ArquivoRegistro = {
    id: newId("a_"),
    // Nome exibido saneado; no disco o arquivo usa só o id aleatório.
    nome: entrada.nome.replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, "_").replace(/^\.+/, "_").slice(0, 255) || "arquivo",
    mime: entrada.mime.slice(0, 120) || "application/octet-stream",
    tamanho: entrada.bytes.byteLength,
    sha256: createHash("sha256").update(entrada.bytes).digest("hex"),
    legenda: entrada.legenda?.slice(0, 300) || undefined,
    enviadoEm: nowIso(),
  };
  const destino = bytesDoAnexo(userId, arquivo.id);
  await mkdir(path.dirname(destino), { recursive: true, mode: 0o700 });
  await writeFile(destino, entrada.bytes, { flag: "wx", mode: 0o600 });
  const novo: Registro = { ...atual, arquivos: [...atual.arquivos, arquivo], atualizadoEm: nowIso() };
  await escreverJson(arquivoDoRegistro(userId, id), novo);
  return { registro: novo, arquivo };
}

/** Bytes de um anexo. Só encontra se o anexo pertencer a um registro DESTA pessoa. */
export async function lerAnexo(userId: string, id: string, arquivoId: string): Promise<{ arquivo: ArquivoRegistro; bytes: Uint8Array } | null> {
  if (!VALID_ARQ.test(arquivoId)) return null;
  const registro = await lerRegistro(userId, id);
  const arquivo = registro?.arquivos.find((a) => a.id === arquivoId);
  if (!arquivo) return null;
  try {
    return { arquivo, bytes: new Uint8Array(await readFile(bytesDoAnexo(userId, arquivoId))) };
  } catch {
    return null;
  }
}

export async function removerAnexo(userId: string, id: string, arquivoId: string): Promise<Registro | null> {
  const atual = await lerRegistro(userId, id);
  if (!atual || !atual.arquivos.some((a) => a.id === arquivoId)) return null;
  await rm(bytesDoAnexo(userId, arquivoId), { force: true });
  const novo: Registro = { ...atual, arquivos: atual.arquivos.filter((a) => a.id !== arquivoId), atualizadoEm: nowIso() };
  await escreverJson(arquivoDoRegistro(userId, id), novo);
  return novo;
}

/** Apaga o caderno inteiro de uma conta (usado na exclusão da conta pela administração). */
export async function apagarCadernoDaConta(userId: string): Promise<void> {
  await rm(pastaDoUsuario(userId), { recursive: true, force: true });
}
