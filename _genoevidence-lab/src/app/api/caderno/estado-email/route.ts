import { handle, json, requireUser } from "@/lib/api";
import { estadoEmail } from "@/lib/email/enviar";

export const dynamic = "force-dynamic";

/**
 * O que o servidor consegue fazer com e-mail, hoje.
 *
 * A interface pergunta antes de oferecer o botão: sem isto ela mostraria "enviar" num servidor que
 * não envia. O motivo vai junto, para a mensagem na tela ser específica em vez de genérica.
 */
export const GET = handle(async () => {
  await requireUser();
  const e = estadoEmail();
  return json({ configurado: e.configurado, soParaDonaDaConta: e.soParaDonaDaConta, motivo: e.motivo });
});
