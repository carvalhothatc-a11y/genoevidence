import { ApiError, handle, json, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { LIMITS } from "@/lib/config";
import { checkUpload } from "@/lib/files/validate";
import { getRepository } from "@/lib/repo";
import { contentLengthOk } from "@/lib/security";

/** Envio de arquivo original (imagens de resultado, CSV, texto). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/files">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "editar");
  // Tamanho conferido ANTES de ler o corpo (margem para o envelope multipart).
  const size = contentLengthOk(req, LIMITS.maxUploadBytes + 64 * 1024);
  if (size === "grande") throw new ApiError(413, `Arquivo acima do limite de ${Math.round(LIMITS.maxUploadBytes / 1024 / 1024)} MB.`);
  if (size === "ausente") throw new ApiError(411, "Tamanho do envio não informado.");
  const form = await req.formData().catch(() => {
    throw new ApiError(400, "Envio inválido (esperado multipart/form-data).");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Nenhum arquivo enviado.");
  const role = (form.get("role") as string | null)?.slice(0, 120) || undefined;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(file.name, bytes, ["csv", "imagem", "texto", "pdf"]);
  if (!check.ok) throw new ApiError(422, check.error);
  const record = await getRepository().putFile(id, actorOf(user), { name: file.name, mimeType: check.mimeType, kind: check.kind, bytes, role });
  if (!record) throw new ApiError(404, "Projeto não encontrado (ou sem permissão de acesso).");
  return json({ file: { id: record.id, name: record.name, kind: record.kind, size: record.size } }, 201);
});
