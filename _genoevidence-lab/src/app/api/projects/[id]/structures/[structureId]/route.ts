import { handle, json, notFound, requireUser } from "@/lib/api";
import { getRepository } from "@/lib/repo";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/structures/[structureId]">) => {
  const user = await requireUser();
  const { id, structureId } = await ctx.params;
  const project = await getRepository().getProject(user.id, id);
  const s = project?.structures.find((x) => x.id === structureId);
  if (!s) notFound("Estrutura");
  return json({ structure: s });
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/structures/[structureId]">) => {
  const user = await requireUser();
  const { id, structureId } = await ctx.params;
  const updated = await getRepository().mutateProject(user.id, id, (draft) => {
    const s = draft.structures.find((x) => x.id === structureId);
    if (!s) return [];
    draft.structures = draft.structures.filter((x) => x.id !== structureId);
    return [{ actor: "pesquisador", action: "estrutura_removida", detail: `Estrutura removida do projeto (arquivo original mantido): ${s.summary.idCode ?? s.id}.` }];
  });
  if (!updated) notFound();
  return json({ deleted: true });
});
