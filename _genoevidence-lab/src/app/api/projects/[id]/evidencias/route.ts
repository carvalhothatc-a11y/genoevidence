import { z } from "zod";
import { ApiError, handle, json, readJsonBody, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { newId, nowIso } from "@/lib/ids";
import { getRepository } from "@/lib/repo";
import { FrequenciaPublicada } from "@/lib/ideia/evidencia";
import { gravarEvidencias, lerEvidencias } from "@/lib/ideia/store";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/evidencias">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "ler");
  return json({ itens: await lerEvidencias(id) });
});

const Nova = z.object({
  resultadoId: z.literal("banda_unica_tamanho_esperado"),
  sucessos: z.number().int().min(0),
  total: z.number().int().min(1),
  unidadeContagem: z.string(),
  contexto: z.string(),
  condicoes: FrequenciaPublicada.shape.condicoes,
  fonte: FrequenciaPublicada.shape.fonte,
  grupoAmostral: z.string().max(120).nullable(),
  conferi: z.boolean(),
});

/** Registra uma frequência publicada, com fonte e trecho (papel mínimo: editor). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/evidencias">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { project } = await authorizeProject(user, id, "editar");
  const body = Nova.parse(await readJsonBody(req, 20_000));
  if (body.fonte.referenciaId && !project.references.some((r) => r.id === body.fonte.referenciaId)) throw new ApiError(400, "Referência não pertence a este projeto.");
  const item = FrequenciaPublicada.parse({
    ...body,
    id: newId("fq_"),
    origem: "pesquisador",
    conferidaPor: body.conferi ? user.name : null,
    registradaEm: nowIso(),
  });
  const itens = await lerEvidencias(id);
  await gravarEvidencias(id, [...itens, item]);
  await getRepository().mutateProject(id, actorOf(user), () => [
    { actor: "pesquisador", action: "evidencia_registrada", detail: `Frequência publicada registrada: ${item.sucessos}/${item.total} ${item.unidadeContagem} (${item.fonte.localizador}).`, entity: { type: "evidencia", id: item.id } },
  ]);
  return json({ item }, 201);
});

/** Remove uma frequência registrada (papel mínimo: editor com permissão de exclusão de itens). */
export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/evidencias">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "excluir_item");
  const alvo = new URL(req.url).searchParams.get("id") ?? "";
  const itens = await lerEvidencias(id);
  if (!itens.some((i) => i.id === alvo)) throw new ApiError(404, "Registro não encontrado.");
  await gravarEvidencias(id, itens.filter((i) => i.id !== alvo));
  await getRepository().mutateProject(id, actorOf(user), () => [{ actor: "pesquisador", action: "evidencia_removida", detail: "Frequência publicada removida.", entity: { type: "evidencia", id: alvo } }]);
  return json({ ok: true });
});
