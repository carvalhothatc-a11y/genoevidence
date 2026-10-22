import { ApiError, handle, json, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { lerRegistro } from "@/lib/caderno/store";
import { assuntoDoDia } from "@/lib/caderno/email";
import { documentoDoDia, nomeDoArquivo, reescreverComoRelatorio } from "@/lib/caderno/relatorio";
import { enviarEmail, estadoEmail } from "@/lib/email/enviar";
import { diaPorExtenso } from "@/lib/caderno/tipos";

export const dynamic = "force-dynamic";

/**
 * O registro do dia como documento do Word.
 *
 * `?enviar=1` manda para o e-mail DA PRÓPRIA PESSOA, com o documento anexado. O destinatário vem
 * da sessão, nunca do pedido.
 *
 * Sem isso, devolve o arquivo para baixar.
 */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/caderno/[id]/documento">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  // A reescrita consome API: o limite é mais apertado que o do caderno em si.
  try {
    rateLimit(`caderno-doc:${user.id}`, 12, 60 * 60_000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(429, "Muitos documentos gerados nesta hora. Tente mais tarde.");
    throw e;
  }

  const registro = await lerRegistro(user.id, id);
  if (!registro) throw new ApiError(404, "Registro não encontrado.");

  const reescrita = await reescreverComoRelatorio(registro);
  const bytes = documentoDoDia(registro, reescrita, { autor: user.name });
  const nome = nomeDoArquivo(registro);

  if (new URL(req.url).searchParams.get("enviar") === "1") {
    if (!estadoEmail().configurado) throw new ApiError(502, estadoEmail().motivo ?? "Envio de e-mail não configurado neste servidor.");
    const corpo =
      `${diaPorExtenso(registro.dia)}\n\n` +
      (reescrita.estado === "reescrito"
        ? "O documento em anexo foi reescrito automaticamente a partir da sua anotação, em linguagem de relatório. A anotação original está no fim dele, sem alteração.\n\n"
        : `O documento em anexo traz a sua anotação como você escreveu. ${reescrita.motivo}\n\n`) +
      "—\nEnviado pelo GenoLab a pedido seu.";
    const r = await enviarEmail({
      para: user.email,
      assunto: assuntoDoDia(registro),
      texto: corpo,
      anexos: [{ nome, bytes }],
    });
    if (!r.ok) throw new ApiError(502, r.motivo);
    return json({ enviado: true, para: user.email, reescrito: reescrita.estado === "reescrito", motivo: reescrita.estado === "fiel" ? reescrita.motivo : undefined });
  }

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Diz à interface se houve reescrita, para a tela poder avisar.
      "X-Reescrito": reescrita.estado === "reescrito" ? "1" : "0",
    },
  });
});
