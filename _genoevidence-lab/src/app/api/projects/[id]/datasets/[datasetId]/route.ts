import { handle, json, notFound, requireUser } from "@/lib/api";
import { getRepository } from "@/lib/repo";
import type { StoredDataset } from "@/lib/expression/importService";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/datasets/[datasetId]">) => {
  const user = await requireUser();
  const { id, datasetId } = await ctx.params;
  const data = await getRepository().getDerived<StoredDataset>(user.id, id, "datasets", datasetId);
  if (!data) notFound("Conjunto de dados");
  return json(data);
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/datasets/[datasetId]">) => {
  const user = await requireUser();
  const { id, datasetId } = await ctx.params;
  const repo = getRepository();
  const updated = await repo.mutateProject(user.id, id, (draft) => {
    const d = draft.datasets.find((x) => x.id === datasetId);
    if (!d) return [];
    draft.datasets = draft.datasets.filter((x) => x.id !== datasetId);
    return [{ actor: "pesquisador", action: "dados_excluidos", detail: `Interpretação excluída: “${d.name}”. O arquivo original foi mantido.` }];
  });
  if (!updated) notFound();
  await repo.deleteDerived(user.id, id, "datasets", datasetId);
  return json({ deleted: true });
});
