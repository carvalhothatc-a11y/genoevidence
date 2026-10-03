import { z } from "zod";
import { ApiError, handle, json, notFound, readJsonBody, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { newId, nowIso } from "@/lib/ids";
import { getRepository } from "@/lib/repo";
import { checkResidue } from "@/lib/structures/parse";

const Body = z.object({
  chain: z.string().min(1).max(4),
  residueNumber: z.number().int().min(-9999).max(99999),
  insertionCode: z.string().max(1).optional(),
  expectedResidue: z.string().max(3).optional(),
  label: z.string().max(80).optional(),
  dryRun: z.boolean().optional(),
});

/** Confere (leitor) e registra (editor) um destaque de resíduo. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/structures/[structureId]/highlights">) => {
  const user = await requireUser();
  const { id, structureId } = await ctx.params;
  const body = Body.parse(await readJsonBody(req, 10_000));
  const { project } = await authorizeProject(user, id, body.dryRun ? "ler" : "editar");
  const s = project.structures.find((x) => x.id === structureId);
  if (!s) notFound("Estrutura");
  const result = checkResidue(s.summary, body.chain, body.residueNumber, body.insertionCode ?? "", body.expectedResidue);
  if (body.dryRun) return json({ result });
  if (result.check === "nao_encontrado") throw new ApiError(422, result.message);
  const highlight = {
    id: newId("r_"),
    chain: body.chain,
    residueNumber: body.residueNumber,
    insertionCode: body.insertionCode || undefined,
    expectedResidue: body.expectedResidue?.toUpperCase() || undefined,
    observedResidue: result.observed,
    check: result.check,
    label: body.label,
    createdAt: nowIso(),
  };
  await getRepository().mutateProject(id, actorOf(user), (draft) => {
    const target = draft.structures.find((x) => x.id === structureId);
    if (!target) return [];
    target.highlights.push(highlight);
    return [{ actor: "pesquisador", action: "residuo_destacado", detail: `${s.summary.idCode ?? "estrutura"} · ${result.message} (destaque visual; não calcula estrutura mutante).` }];
  });
  return json({ highlight, result }, 201);
});

export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/structures/[structureId]/highlights">) => {
  const user = await requireUser();
  const { id, structureId } = await ctx.params;
  await authorizeProject(user, id, "editar");
  const hid = new URL(req.url).searchParams.get("h") ?? "";
  await getRepository().mutateProject(id, actorOf(user), (draft) => {
    const target = draft.structures.find((x) => x.id === structureId);
    if (!target || !target.highlights.some((h) => h.id === hid)) return [];
    target.highlights = target.highlights.filter((h) => h.id !== hid);
    return [{ actor: "pesquisador", action: "destaque_removido", detail: "Destaque de resíduo removido." }];
  });
  return json({ deleted: true });
});
