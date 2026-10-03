import { handle, json, notFound, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { getRepository } from "@/lib/repo";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/structures/[structureId]">) => {
  const user = await requireUser();
  const { id, structureId } = await ctx.params;
  const { project } = await authorizeProject(user, id, "ler");
  const s = project.structures.find((x) => x.id === structureId);
  if (!s) notFound("Estrutura");
  return json({ structure: s });
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/structures/[structureId]">) => {
  const user = await requireUser();
  const { id, structureId } = await ctx.params;
  const { project } = await authorizeProject(user, id, "excluir_item");
  const s = project.structures.find((x) => x.id === structureId);
  if (!s) notFound("Estrutura");
  await getRepository().mutateProject(id, actorOf(user), (draft) => {
    draft.structures = draft.structures.filter((x) => x.id !== structureId);
    return [{ actor: "pesquisador", action: "estrutura_removida", detail: `Estrutura removida do projeto (arquivo original mantido): ${s.summary.idCode ?? s.id}.` }];
  });
  return json({ deleted: true });
});
