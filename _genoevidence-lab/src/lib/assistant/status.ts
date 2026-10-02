import "server-only";

export const DEFAULT_MODEL = "claude-opus-5";

/** Chaves de usuário (não vinculadas a um workspace) exigem o ID do workspace em cada requisição. */
function exigeWorkspace(key: string) {
  return key.startsWith("sk-ant-usr");
}

/** Estado REAL da integração com a API do Claude (sem expor a chave). */
export function assistantStatus() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  const faltaWorkspace = Boolean(key && exigeWorkspace(key) && !workspace);
  return {
    configured: Boolean(key) && !faltaWorkspace,
    model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    workspace: workspace || undefined,
    reason: !key
      ? "A variável ANTHROPIC_API_KEY não está definida no servidor."
      : faltaWorkspace
        ? "A chave configurada não pertence a um workspace: defina ANTHROPIC_WORKSPACE_ID (ID do workspace no Console da Anthropic) ou use uma chave de workspace."
        : undefined,
  };
}
