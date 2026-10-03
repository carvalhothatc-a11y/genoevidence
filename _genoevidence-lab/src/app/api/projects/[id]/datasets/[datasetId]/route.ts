import { handle, json, notFound, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { getRepository } from "@/lib/repo";
import type { StoredDataset } from "@/lib/expression/importService";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/datasets/[datasetId]">) => {
  const user = await requireUser();
  const { id, datasetId } = await ctx.params;
  const { project } = await authorizeProject(user, id, "ler");
  if (!project.datasets.some((d) => d.id === datasetId)) notFound("Conjunto de dados");
  const data = await getRepository().getDerived<StoredDataset>(id, "datasets", datasetId);
  if (!data) notFound("Conjunto de dados");
  return json(data);
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/datasets/[datasetId]">) => {
  const user = await requireUser();
  const { id, datasetId } = await ctx.params;
  const { project } = await authorizeProject(user, id, "excluir_item");
  const d = project.datasets.find((x) => x.id === datasetId);
  if (!d) notFound("Conjunto de dados");
  const repo = getRepository();
  await repo.mutateProject(id, actorOf(user), (draft) => {
    draft.datasets = draft.datasets.filter((x) => x.id !== datasetId);
    return [{ actor: "pesquisador", action: "dados_excluidos", detail: `Interpretação excluída: “${d.name}”. O arquivo original foi mantido.` }];
  });
  await repo.deleteDerived(id, "datasets", datasetId);
  return json({ deleted: true });
});
