import { ApiError, handle, json, requireUser } from "@/lib/api";
import { LIMITS } from "@/lib/config";
import { checkUpload } from "@/lib/files/validate";
import { contentLengthOk } from "@/lib/security";
import { anexarArquivo } from "@/lib/caderno/store";

export const dynamic = "force-dynamic";

/**
 * Anexa uma foto, tabela ou relatório ao dia. O arquivo fica no caderno da pessoa, no servidor do
 * GenoLab, e não é enviado a nenhum serviço externo.
 */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/caderno/[id]/arquivos">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  // Tamanho conferido ANTES de ler o corpo (margem para o envelope multipart).
  const size = contentLengthOk(req, LIMITS.maxUploadBytes + 64 * 1024);
  if (size === "grande") throw new ApiError(413, `Arquivo acima do limite de ${Math.round(LIMITS.maxUploadBytes / 1024 / 1024)} MB.`);
  if (size === "ausente") throw new ApiError(411, "Tamanho do envio não informado.");
  const form = await req.formData().catch(() => {
    throw new ApiError(400, "Envio inválido (esperado multipart/form-data).");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Nenhum arquivo enviado.");
  const legenda = (form.get("legenda") as string | null)?.slice(0, 300) || undefined;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(file.name, bytes, ["csv", "imagem", "texto", "pdf", "planilha", "documento"]);
  if (!check.ok) throw new ApiError(422, check.error);

  let r: Awaited<ReturnType<typeof anexarArquivo>>;
  try {
    r = await anexarArquivo(user.id, id, { nome: file.name, mime: check.mimeType, bytes, legenda });
  } catch (e) {
    throw new ApiError(409, e instanceof Error ? e.message : "Não foi possível anexar o arquivo.");
  }
  if (!r) throw new ApiError(404, "Registro não encontrado.");
  return json({ registro: r.registro, arquivo: r.arquivo }, 201);
});
