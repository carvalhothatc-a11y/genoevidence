import { ApiError, handle, json, notFound, requireUser } from "@/lib/api";
import { checkUpload } from "@/lib/files/validate";
import { getRepository } from "@/lib/repo";

/** Envio genérico de arquivo original (imagens de resultado, CSV, etc.). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/files">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const form = await req.formData().catch(() => {
    throw new ApiError(400, "Envio inválido (esperado multipart/form-data).");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Nenhum arquivo enviado.");
  const role = (form.get("role") as string | null)?.slice(0, 120) || undefined;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(file.name, bytes, ["csv", "imagem", "texto"]);
  if (!check.ok) throw new ApiError(422, check.error);
  const record = await getRepository().putFile(user.id, id, { name: file.name, mimeType: check.mimeType, kind: check.kind, bytes, role });
  if (!record) notFound();
  return json({ file: record }, 201);
});
