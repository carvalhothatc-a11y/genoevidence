/**
 * Política de privacidade: versão vigente e canal de contato.
 * A versão é gravada na conta no momento do aceite (cadastro); ao mudar o texto da política
 * de forma relevante, atualize POLITICA_VERSAO.
 */
export const POLITICA_VERSAO = "2026-10-03";

/** Local do servidor de produção (Hostinger). Atualize se a VPS mudar de região. */
export const LOCAL_DOS_DADOS = "Estados Unidos";

/** Registros de segurança são apagados após este número de meses (ver src/lib/audit.ts). */
export const MESES_REGISTRO_SEGURANCA = 12;

/** Dias de retenção dos backups (ver deploy/backup.sh). */
export const DIAS_BACKUP = 14;

/**
 * E-mail para pedidos sobre dados pessoais (LGPD). Definido no servidor, nunca no código:
 * LAB_CONTATO_PRIVACIDADE=privacidade@exemplo.com
 */
export function contatoPrivacidade(): string | null {
  const v = process.env.LAB_CONTATO_PRIVACIDADE?.trim();
  return v && /^\S+@\S+\.\S+$/.test(v) ? v : null;
}
