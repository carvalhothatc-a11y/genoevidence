import { ModuleSession } from "@/lib/domain/schemas";
import { handle, json, notFound, readJsonBody, requireUser } from "@/lib/api";
import { newId, nowIso } from "@/lib/ids";
import { getRepository } from "@/lib/repo";

const Body = ModuleSession.omit({ id: true, savedAt: true });

/** Salva uma experiência de módulo no projeto (registrada no histórico). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/sessions">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = Body.parse(await readJsonBody(req));
  const session = ModuleSession.parse({ ...body, id: newId("s_"), savedAt: nowIso() });
  const project = await getRepository().mutateProject(user.id, id, (draft) => {
    if (session.primaryReferenceId && !draft.references.some((r) => r.id === session.primaryReferenceId)) session.primaryReferenceId = undefined;
    draft.sessions.push(session);
    return [
      {
        actor: "pesquisador",
        action: "experiencia_salva",
        detail: `${session.title}: ${session.stepsVisited.length} etapa(s), ${session.choices.length} escolha(s), ${session.questions.length} dúvida(s).`,
        entity: { type: "experiencia", id: session.id },
      },
    ];
  });
  if (!project) notFound();
  return json({ session }, 201);
});
