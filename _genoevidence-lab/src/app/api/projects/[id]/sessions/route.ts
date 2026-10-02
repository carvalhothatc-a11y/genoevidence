import { ModuleSession } from "@/lib/domain/schemas";
import { handle, json, readJsonBody, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { newId, nowIso } from "@/lib/ids";
import { getRepository } from "@/lib/repo";

const Body = ModuleSession.omit({ id: true, savedAt: true });

/** Salva uma experiência de módulo no projeto (registrada no histórico). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/sessions">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "editar");
  const body = Body.parse(await readJsonBody(req));
  const session = ModuleSession.parse({ ...body, id: newId("s_"), savedAt: nowIso() });
  await getRepository().mutateProject(id, actorOf(user), (draft) => {
    if (session.primaryReferenceId && !draft.references.some((r) => r.id === session.primaryReferenceId)) session.primaryReferenceId = undefined;
    draft.sessions.push(session);
    const exp = typeof session.state?.experimentId === "string" ? draft.experiments.find((e) => e.id === session.state!.experimentId) : undefined;
    if (exp) {
      exp.status = "realizado";
      exp.runs.push({ at: session.savedAt, sessionId: session.id, notes: "" });
      exp.updatedAt = session.savedAt;
    }
    return [
      {
        actor: "pesquisador",
        action: "experiencia_salva",
        detail: `${session.title}: ${session.stepsVisited.length} etapa(s), ${session.choices.length} escolha(s), ${session.questions.length} dúvida(s).`,
        entity: { type: "experiencia", id: session.id },
      },
    ];
  });
  return json({ session: { id: session.id } }, 201);
});
