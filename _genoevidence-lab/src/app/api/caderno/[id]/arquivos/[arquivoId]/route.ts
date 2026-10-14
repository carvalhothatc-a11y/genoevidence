import { ApiError, handle, json, requireUser } from "@/lib/api";
import { lerAnexo, removerAnexo } from "@/lib/caderno/store";

export const dynamic = "force-dynamic";

/**
 * Arquivo do dia. Imagem abre dentro da página; o resto baixa como anexo.
 *
 * O caminho no disco inclui o identificador do usuário, então um anexo de outra pessoa não é
 * "negado": não existe para esta sessão.
 */
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/caderno/[id]/arquivos/[arquivoId]">) => {
  const user = await requireUser();
  const { id, arquivoId } = await ctx.params;
  const achado = await lerAnexo(user.id, id, arquivoId);
  if (!achado) throw new ApiError(404, "Arquivo não encontrado.");
  const imagem = achado.arquivo.mime.startsWith("image/");
  const inline = imagem && new URL(req.url).searchParams.get("modo") === "visualizar";
  return new Response(Buffer.from(achado.bytes), {
    headers: {
      "Content-Type": imagem ? achado.arquivo.mime : "application/octet-stream",
      "Content-Length": String(achado.bytes.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(achado.arquivo.nome)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/caderno/[id]/arquivos/[arquivoId]">) => {
  const user = await requireUser();
  const { id, arquivoId } = await ctx.params;
  const registro = await removerAnexo(user.id, id, arquivoId);
  if (!registro) throw new ApiError(404, "Arquivo não encontrado.");
  return json({ registro });
});
