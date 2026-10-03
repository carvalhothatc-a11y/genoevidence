import { handle, json, readJsonBody, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { nowIso } from "@/lib/ids";
import { getRepository } from "@/lib/repo";
import { IdeiaSalva, gravarIdeia, lerIdeias } from "@/lib/ideia/store";

/** Lista as ideias salvas no projeto (papel mínimo: leitor). */
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/ideias">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "ler");
  return json({ ideias: await lerIdeias(id) });
});

/** Salva (ou acrescenta versões a) uma ideia do projeto (papel mínimo: editor). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/ideias">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "editar");
  const ideia = IdeiaSalva.parse({ ...(await readJsonBody(req, 1_500_000) as object), atualizadaEm: nowIso() });
  for (const c of ideia.cenarios) for (const v of c.versoes) v.projetoId = id;
  await gravarIdeia(id, ideia);
  await getRepository().mutateProject(id, actorOf(user), () => [
    {
      actor: "pesquisador",
      action: "ideia_salva",
      detail: `Ideia “${ideia.titulo}”: ${ideia.cenarios.length} cenário(s), ${ideia.cenarios.reduce((n, c) => n + c.versoes.length, 0)} versão(ões).`,
      entity: { type: "ideia", id: ideia.id },
    },
  ]);
  return json({ ok: true }, 201);
});
