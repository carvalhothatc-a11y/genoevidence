import { z } from "zod";
import { ProjectFields } from "@/lib/domain/schemas";
import { handle, json, readJsonBody, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { getRepository } from "@/lib/repo";
import { describeFieldChanges } from "@/lib/projects/history";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { project, role } = await authorizeProject(user, id, "ler");
  // Dono vê a lista completa de compartilhamentos; demais papéis não recebem identificadores de terceiros.
  const visible = role === "dono" || role === "gestor" ? project : { ...project, shares: [], ownerId: "" };
  return json({ project: visible, role });
});

const Patch = z.object({
  fields: ProjectFields.partial().optional(),
  aiConsent: z.object({ claudeApi: z.boolean() }).optional(),
});

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = Patch.parse(await readJsonBody(req));
  await authorizeProject(user, id, body.aiConsent ? "compartilhar" : "editar");
  const project = await getRepository().mutateProject(id, actorOf(user), (draft) => {
    const entries = [];
    if (body.fields) {
      const changes = describeFieldChanges(draft, body.fields);
      Object.assign(draft, body.fields);
      if (changes) entries.push({ actor: "pesquisador" as const, action: "campos_editados", detail: changes });
    }
    if (body.aiConsent && body.aiConsent.claudeApi !== draft.aiConsent.claudeApi) {
      draft.aiConsent = { claudeApi: body.aiConsent.claudeApi, changedAt: new Date().toISOString() };
      entries.push({
        actor: "pesquisador" as const,
        action: body.aiConsent.claudeApi ? "consentimento_ia_concedido" : "consentimento_ia_revogado",
        detail: body.aiConsent.claudeApi ? "Autorizado o envio de trechos deste projeto a um serviço de IA." : "Revogado o envio de trechos deste projeto a serviços de IA.",
      });
    }
    return entries;
  });
  return json({ ok: Boolean(project) });
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await authorizeProject(user, id, "excluir_projeto");
  await getRepository().deleteProject(id);
  await audit("projeto_excluido", { userId: user.id, projectId: id, result: "ok" });
  return json({ deleted: true });
});
