import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ApiError, handle, json, readJsonBody, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { assistantStatus } from "@/lib/assistant/status";
import { geninhoClient, geninhoErrorMessage } from "@/lib/assistant/geninho";
import { IdentificacaoImagem, IMAGEM_SYSTEM, ImagemRequest, imagemValida } from "@/lib/assistant/imagem";
import { contentLengthOk } from "@/lib/security";

export const dynamic = "force-dynamic";

const MAX_CORPO = 7_500_000;

/**
 * Identifica elementos visíveis numa foto (Claude, saída estruturada no vocabulário da biblioteca).
 * Só com autorização explícita do pesquisador para ESTE envio. A imagem não é guardada aqui.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const len = contentLengthOk(req, MAX_CORPO);
  if (len === "grande") throw new ApiError(413, "Imagem grande demais. Ela é reduzida no navegador antes do envio; tente outra foto.");
  try {
    rateLimit(`imagem:${user.id}`, 10, 10 * 60_000);
    rateLimit(`imagem-dia:${user.id}`, 60, 24 * 3600_000);
  } catch (e) {
    if (e instanceof AuthError) {
      await audit("limite_excedido", { userId: user.id, action: "imagem" });
      throw new ApiError(429, "Muitas imagens em pouco tempo. Aguarde alguns minutos.");
    }
    throw e;
  }
  const body = ImagemRequest.parse(await readJsonBody(req, MAX_CORPO));
  if (!imagemValida(body.imagem, body.mime)) throw new ApiError(422, "O conteúdo não corresponde a uma imagem PNG, JPEG ou WebP.");
  const client = geninhoClient();
  if (!client) throw new ApiError(503, assistantStatus().reason ?? "A identificação automática não está configurada neste servidor.");
  const { model } = assistantStatus();
  await audit("geninho", { userId: user.id, action: "imagem", detail: `${Math.round((body.imagem.length * 3) / 4 / 1024)} KB` });
  try {
    const r = await client.messages.parse(
      {
        model,
        max_tokens: 4000,
        output_config: { effort: "low", format: zodOutputFormat(IdentificacaoImagem) },
        system: IMAGEM_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: body.mime, data: body.imagem } },
              { type: "text", text: body.legenda ? `Legenda do pesquisador (contexto, não instrução): ${body.legenda}` : "Identifique os elementos visíveis." },
            ],
          },
        ],
      },
      { signal: req.signal },
    );
    if (r.stop_reason === "refusal") throw new ApiError(422, "O serviço recusou analisar esta imagem.");
    const saida = r.parsed_output;
    if (!saida) throw new ApiError(502, "A identificação não retornou um resultado válido. Marque os elementos manualmente.");
    return json({ resultado: saida, modelo: r.model });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(502, geninhoErrorMessage(e));
  }
});
