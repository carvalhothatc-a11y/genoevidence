import { z } from "zod";
import { handle, json, readJsonBody, requireUser } from "@/lib/api";
import { getRepository } from "@/lib/repo";
import { confirmImport, ImportOptions, previewCsv, validateImport } from "@/lib/expression/importService";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), fileId: z.string(), delimiter: z.enum([",", ";", "\t", "|"]).optional() }),
  ImportOptions.extend({ action: z.literal("validate") }),
  ImportOptions.extend({ action: z.literal("confirm"), name: z.string().min(1).max(200), confirmed: z.literal(true) }),
]);

/** Fluxo de importação: preview → validate → confirm (a confirmação revalida no servidor). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/datasets">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = Body.parse(await readJsonBody(req));
  const repo = getRepository();
  if (body.action === "preview") return json(await previewCsv(repo, user.id, id, body.fileId, body.delimiter));
  if (body.action === "validate") {
    const { result } = await validateImport(repo, user.id, id, body);
    return json({
      issues: result.issues,
      canConfirm: result.canConfirm,
      summary: {
        genes: result.genes,
        groups: result.groups,
        samples: result.samples,
        units: result.units,
        validCount: result.validCount,
        missingCount: result.missingCount,
        invalidCount: result.invalidCount,
        replicates: result.replicates,
      },
      preview: result.rows.slice(0, 40),
    });
  }
  const project = await repo.getProject(user.id, id);
  const meta = await confirmImport(repo, user.id, id, { ...body, synthetic: project?.synthetic });
  return json({ dataset: meta }, 201);
});
