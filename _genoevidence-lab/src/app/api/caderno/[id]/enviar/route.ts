import { ApiError, handle, json, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { lerRegistro } from "@/lib/caderno/store";
import { assuntoDoDia, corpoDoDia, htmlDoDia } from "@/lib/caderno/email";
import { enviarEmail } from "@/lib/email/enviar";

export const dynamic = "force-dynamic";

/**
 * Envia o registro do dia para o e-mail DA PRÓPRIA PESSOA que está na sessão.
 *
 * O destinatário nunca vem do pedido: é lido da sessão. Assim esta rota não serve para mandar
 * mensagem a terceiros, nem por engano nem de propósito — ela só devolve a você o que você escreveu.
 */
export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/caderno/[id]/enviar">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  try {
    rateLimit(`caderno-email:${user.id}`, 10, 60 * 60_000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(429, "Muitos envios nesta hora. Tente mais tarde.");
    throw e;
  }

  const registro = await lerRegistro(user.id, id);
  if (!registro) throw new ApiError(404, "Registro não encontrado.");

  const r = await enviarEmail({
    para: user.email,
    assunto: assuntoDoDia(registro),
    texto: corpoDoDia(registro, { enderecoDoLab: process.env.NEXT_PUBLIC_LAB_URL }),
    html: htmlDoDia(registro, { enderecoDoLab: process.env.NEXT_PUBLIC_LAB_URL }),
  });
  if (!r.ok) throw new ApiError(502, r.motivo);
  return json({ enviado: true, para: user.email });
});
