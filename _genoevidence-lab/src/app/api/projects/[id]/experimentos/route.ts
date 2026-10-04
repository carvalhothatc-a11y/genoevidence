import { ApiError, handle, json, readJsonBody, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { nowIso } from "@/lib/ids";
import { getRepository } from "@/lib/repo";
import { ExperimentoSalvo, excluirExperimento, gravarExperimento, lerExperimentos } from "@/lib/experimento/store";

const MAX_CORPO = 4_000_000;

/** Lista os experimentos do projeto ou devolve um deles (?id=). Papel mínimo: leitor. */
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/experimentos">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "ler");
  const itens = await lerExperimentos(id);
  const qual = new URL(req.url).searchParams.get("id");
  if (qual) {
    const e = itens.find((x) => x.id === qual);
    if (!e) throw new ApiError(404, "Experimento não encontrado neste projeto.");
    return json({ experimento: e });
  }
  return json({ itens: itens.map((e) => ({ id: e.id, titulo: e.titulo, atualizadoEm: e.atualizadoEm, versoes: e.versoes.length, etapas: e.versoes.at(-1)?.acoes.length ?? 0 })) });
});

/** Salva o experimento (acrescenta versões; nada é sobrescrito). Papel mínimo: editor. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/experimentos">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "editar");
  const corpo = (await readJsonBody(req, MAX_CORPO)) as object;
  const exp = ExperimentoSalvo.parse({ ...corpo, atualizadoEm: nowIso() });
  const salvo = await gravarExperimento(id, exp);
  await getRepository().mutateProject(id, actorOf(user), () => [
    {
      actor: "pesquisador",
      action: "experimento_salvo",
      detail: `Experimento “${salvo.titulo}”: ${salvo.versoes.length} versão(ões), ${salvo.versoes.at(-1)?.acoes.length ?? 0} etapa(s), ${salvo.entrada.materiais.length} material(is).`,
      entity: { type: "experimento", id: salvo.id },
    },
  ]);
  return json({ ok: true, versoes: salvo.versoes.length }, 201);
});

/** Exclui o experimento (os arquivos originais continuam no projeto até serem excluídos lá). Papel: editor. */
export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/experimentos">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "excluir_item");
  const qual = new URL(req.url).searchParams.get("id") ?? "";
  if (!(await excluirExperimento(id, qual))) throw new ApiError(404, "Experimento não encontrado neste projeto.");
  await getRepository().mutateProject(id, actorOf(user), () => [{ actor: "pesquisador", action: "experimento_excluido", detail: "Experimento excluído.", entity: { type: "experimento", id: qual } }]);
  return json({ ok: true });
});
