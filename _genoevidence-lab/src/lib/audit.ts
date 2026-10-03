import "server-only";
import { appendFile, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { dataRoot } from "@/lib/repo";
import { sha } from "@/lib/auth/store";
import { MESES_REGISTRO_SEGURANCA } from "@/lib/privacidade";

/**
 * Registro de eventos de segurança (JSON Lines por mês). NUNCA registra conteúdo de pesquisa,
 * senhas, tokens, nomes de arquivos ou e-mails em claro — apenas identificadores, ações e resultados.
 */
export type AuditEvent =
  | "cadastro"
  | "login_ok"
  | "login_falha"
  | "login_bloqueado"
  | "logout"
  | "acesso_negado"
  | "origem_recusada"
  | "limite_excedido"
  | "conta_status"
  | "conta_papel"
  | "conta_excluida"
  | "senha_alterada"
  | "sessoes_encerradas"
  | "compartilhamento"
  | "compartilhamento_removido"
  | "equipe"
  | "download"
  | "exportacao"
  | "projeto_excluido"
  | "geninho";

export type AuditEntry = {
  at: string;
  event: AuditEvent;
  userId?: string;
  emailHash?: string;
  projectId?: string;
  target?: string;
  action?: string;
  result?: "ok" | "negado" | "falha";
  detail?: string;
};

const dir = () => path.join(dataRoot(), "audit");

/** Identificador estável de e-mail sem armazená-lo em claro. */
export const hashEmail = (email: string) => sha("email:" + email.trim().toLowerCase()).slice(0, 16);

/** Mês (AAAA-MM) mais antigo que ainda deve ser guardado. */
export function mesMaisAntigo(agora: Date, meses = MESES_REGISTRO_SEGURANCA): string {
  const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - (meses - 1), 1));
  return d.toISOString().slice(0, 7);
}

let ultimaLimpeza = "";

/** Apaga arquivos mensais além da retenção (uma vez por mês por processo). */
async function limparAntigos(mes: string) {
  if (ultimaLimpeza === mes) return;
  ultimaLimpeza = mes;
  const limite = mesMaisAntigo(new Date(`${mes}-01T00:00:00Z`));
  for (const f of await readdir(dir())) {
    const m = /^(\d{4}-\d{2})\.jsonl$/.exec(f);
    if (m && m[1] < limite) await rm(path.join(dir(), f), { force: true });
  }
}

export async function audit(event: AuditEvent, data: Omit<AuditEntry, "at" | "event"> = {}) {
  const entry: AuditEntry = { at: new Date().toISOString(), event, ...data };
  if (entry.detail) entry.detail = entry.detail.slice(0, 200);
  try {
    await mkdir(dir(), { recursive: true });
    await appendFile(path.join(dir(), `${entry.at.slice(0, 7)}.jsonl`), JSON.stringify(entry) + "\n", { mode: 0o600 });
    await limparAntigos(entry.at.slice(0, 7));
  } catch {
    // O registro não pode derrubar a operação principal.
  }
}

export async function recentAudit(limit = 200): Promise<AuditEntry[]> {
  const month = new Date().toISOString().slice(0, 7);
  try {
    const text = await readFile(path.join(dir(), `${month}.jsonl`), "utf8");
    return text
      .trim()
      .split("\n")
      .slice(-limit)
      .map((l) => JSON.parse(l) as AuditEntry)
      .reverse();
  } catch {
    return [];
  }
}
