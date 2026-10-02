import "server-only";

export const DEFAULT_MODEL = "claude-opus-5";

/** Estado REAL da integração com a API do Claude (sem expor a chave). */
export function assistantStatus() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return {
    configured: Boolean(key),
    model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    reason: key ? undefined : "A variável ANTHROPIC_API_KEY não está definida no servidor.",
  };
}
