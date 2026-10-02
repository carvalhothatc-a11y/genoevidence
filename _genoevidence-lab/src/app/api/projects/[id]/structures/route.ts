import { ApiError, handle, json, readJsonBody, requireUser } from "@/lib/api";
import { nowIso } from "@/lib/ids";
import { getRepository } from "@/lib/repo";
import { addStructure, fetchFromRcsb } from "@/lib/structures/service";

/** Adiciona estrutura por arquivo (multipart) ou por identificador do RCSB PDB (JSON). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/structures">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const repo = getRepository();
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await readJsonBody(req)) as { pdbId?: string };
    const pdbId = (body.pdbId ?? "").trim();
    const { bytes, url } = await fetchFromRcsb(pdbId);
    const record = await addStructure(repo, user.id, id, { name: `${pdbId.toUpperCase()}.cif`, bytes, source: { type: "rcsb", pdbId: pdbId.toUpperCase(), url, retrievedAt: nowIso() } });
    return json({ structure: record }, 201);
  }
  const form = await req.formData().catch(() => {
    throw new ApiError(400, "Envio inválido.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Nenhum arquivo enviado.");
  const record = await addStructure(repo, user.id, id, { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()), source: { type: "upload" } });
  return json({ structure: record }, 201);
});
