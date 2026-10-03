import { ApiError, handle, json, readJsonBody, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { LIMITS } from "@/lib/config";
import { nowIso } from "@/lib/ids";
import { getRepository } from "@/lib/repo";
import { contentLengthOk } from "@/lib/security";
import { addStructure, fetchFromRcsb } from "@/lib/structures/service";

/** Adiciona estrutura por arquivo (multipart) ou por identificador do RCSB PDB (JSON). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/structures">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "editar");
  const repo = getRepository();
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await readJsonBody(req, 10_000)) as { pdbId?: string };
    const pdbId = String(body.pdbId ?? "").trim();
    const { bytes, url } = await fetchFromRcsb(pdbId);
    const record = await addStructure(repo, id, actorOf(user), { name: `${pdbId.toUpperCase()}.cif`, bytes, source: { type: "rcsb", pdbId: pdbId.toUpperCase(), url, retrievedAt: nowIso() } });
    return json({ structure: { id: record.id } }, 201);
  }
  const size = contentLengthOk(req, LIMITS.maxStructureBytes + 64 * 1024);
  if (size === "grande") throw new ApiError(413, "Estrutura acima do limite de tamanho.");
  if (size === "ausente") throw new ApiError(411, "Tamanho do envio não informado.");
  const form = await req.formData().catch(() => {
    throw new ApiError(400, "Envio inválido.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Nenhum arquivo enviado.");
  const record = await addStructure(repo, id, actorOf(user), { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()), source: { type: "upload" } });
  return json({ structure: { id: record.id } }, 201);
});
