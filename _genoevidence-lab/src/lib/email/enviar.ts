import "server-only";

/**
 * Envio de e-mail pelo Resend.
 *
 * Duas decisões que valem a pena registrar:
 *
 * 1. **Sem biblioteca.** A API é um POST com JSON; `fetch` dá conta. Uma dependência a menos na
 *    imagem de produção.
 * 2. **O estado é dito, não presumido.** Quando a chave não está no servidor, a interface mostra
 *    "não configurado" e oferece abrir o e-mail da pessoa — nunca um botão que finge enviar.
 *
 * Sobre o endereço remetente: o Resend permite enviar de `onboarding@resend.dev` **sem configurar
 * DNS**, mas só entrega para o e-mail da própria conta Resend. Como aqui cada pessoa recebe no
 * PRÓPRIO endereço, isso funciona para a dona da conta e falha (403) para qualquer outra — e a
 * mensagem de erro diz exatamente isso, em vez de "falhou".
 */

const ENDERECO = "https://api.resend.com/emails";
const PADRAO_REMETENTE = "GenoLab <onboarding@resend.dev>";
export const LIMITE_ASSUNTO = 180;

export type EstadoEmail = {
  configurado: boolean;
  remetente: string;
  /** Verdadeiro quando o remetente é o endereço de teste do Resend (só entrega para a dona da conta). */
  soParaDonaDaConta: boolean;
  motivo?: string;
};

export function estadoEmail(): EstadoEmail {
  const chave = process.env.RESEND_API_KEY?.trim();
  const remetente = process.env.EMAIL_REMETENTE?.trim() || PADRAO_REMETENTE;
  const teste = /@resend\.dev>?\s*$/.test(remetente);
  return {
    configurado: Boolean(chave),
    remetente,
    soParaDonaDaConta: teste,
    motivo: !chave
      ? "A variável RESEND_API_KEY não está definida no servidor."
      : teste
        ? "O remetente é o endereço de teste do Resend: ele só entrega para o e-mail da conta do Resend. Para enviar a outras pessoas, verifique um domínio e defina EMAIL_REMETENTE."
        : undefined,
  };
}

export type ResultadoEnvio = { ok: true; id: string } | { ok: false; motivo: string };

type RespostaResend = { id?: string; message?: string; name?: string; error?: { message?: string } };

/** Mensagens honestas: cada falha diz a causa real, não "não foi possível enviar". */
function mensagemDeErro(status: number, corpo: RespostaResend, destino: string): string {
  const detalhe = corpo.error?.message ?? corpo.message ?? "";
  if (status === 401 || status === 403) {
    if (/testing emails to your own|own email address/i.test(detalhe))
      return `O serviço de e-mail está no modo de teste e só entrega para o endereço da conta do Resend — e ${destino} não é esse endereço. Para enviar a outras pessoas, é preciso verificar um domínio.`;
    return "A chave do serviço de e-mail foi recusada. Avise a administração.";
  }
  if (status === 422) return `O endereço ${destino} foi recusado pelo serviço de e-mail${detalhe ? `: ${detalhe}` : "."}`;
  if (status === 429) return "O limite de envios do serviço de e-mail foi atingido. Tente mais tarde.";
  if (status >= 500) return "O serviço de e-mail está instável agora. Tente de novo em alguns minutos.";
  return detalhe ? `O serviço de e-mail recusou o envio: ${detalhe}` : `O serviço de e-mail recusou o envio (${status}).`;
}

/** Anexo do e-mail. O conteúdo vai em base64, como o serviço espera. */
export type Anexo = { nome: string; bytes: Uint8Array };

export async function enviarEmail(opcoes: { para: string; assunto: string; texto: string; html?: string; anexos?: Anexo[] }): Promise<ResultadoEnvio> {
  const estado = estadoEmail();
  if (!estado.configurado) return { ok: false, motivo: estado.motivo ?? "Envio de e-mail não configurado neste servidor." };

  let res: Response;
  try {
    res = await fetch(ENDERECO, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: estado.remetente,
        to: [opcoes.para],
        subject: opcoes.assunto.slice(0, LIMITE_ASSUNTO),
        text: opcoes.texto,
        ...(opcoes.html ? { html: opcoes.html } : {}),
        ...(opcoes.anexos?.length
          ? { attachments: opcoes.anexos.map((a) => ({ filename: a.nome, content: Buffer.from(a.bytes).toString("base64") })) }
          : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, motivo: "Não foi possível falar com o serviço de e-mail a partir do servidor." };
  }

  const corpo = (await res.json().catch(() => ({}))) as RespostaResend;
  if (!res.ok) return { ok: false, motivo: mensagemDeErro(res.status, corpo, opcoes.para) };
  if (!corpo.id) return { ok: false, motivo: "O serviço respondeu sem confirmar o envio." };
  return { ok: true, id: corpo.id };
}
