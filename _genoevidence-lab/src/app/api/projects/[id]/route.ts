import { z } from "zod";
import { ProjectFields } from "@/lib/domain/schemas";
import { handle, json, notFound, readJsonBody, requireUser } from "@/lib/api";
import { getRepository } from "@/lib/repo";
import { describeFieldChanges } from "@/lib/projects/history";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const project = await getRepository().getProject(user.id, id);
  if (!project) notFound();
  return json({ project });
});

const Patch = z.object({
  fields: ProjectFields.partial().optional(),
  aiConsent: z.object({ claudeApi: z.boolean() }).optional(),
});

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = Patch.parse(await readJsonBody(req));
  const project = await getRepository().mutateProject(user.id, id, (draft) => {
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
        detail: body.aiConsent.claudeApi
          ? "Autorizado o envio de trechos deste projeto à API do Claude (Anthropic) para o assistente."
          : "Revogado o envio de trechos deste projeto à API do Claude.",
      });
    }
    return entries;
  });
  if (!project) notFound();
  return json({ project });
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const ok = await getRepository().deleteProject(user.id, id);
  if (!ok) notFound();
  return json({ deleted: true });
});
