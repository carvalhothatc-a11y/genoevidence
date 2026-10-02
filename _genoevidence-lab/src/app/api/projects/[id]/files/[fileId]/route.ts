import { handle, json, notFound, requireUser } from "@/lib/api";
import { getRepository } from "@/lib/repo";

/** Download do arquivo ORIGINAL, sem alterações. */
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/files/[fileId]">) => {
  const user = await requireUser();
  const { id, fileId } = await ctx.params;
  const found = await getRepository().readFile(user.id, id, fileId);
  if (!found) notFound("Arquivo");
  const inline = found.record.kind === "imagem";
  return new Response(Buffer.from(found.bytes), {
    headers: {
      "Content-Type": found.record.mimeType,
      "Content-Length": String(found.bytes.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(found.record.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
});

/**
 * Exclui o arquivo. Se houver itens derivados (dados, estrutura, referência), exige ?cascata=1
 * e remove também os derivados, registrando tudo no histórico.
 */
export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/files/[fileId]">) => {
  const user = await requireUser();
  const { id, fileId } = await ctx.params;
  const repo = getRepository();
  const project = await repo.getProject(user.id, id);
  if (!project || !project.files.some((f) => f.id === fileId)) notFound("Arquivo");
  const datasets = project.datasets.filter((d) => d.fileId === fileId);
  const structures = project.structures.filter((s) => s.fileId === fileId);
  const references = project.references.filter((r) => r.fileId === fileId);
  const dependents = datasets.length + structures.length + references.length;
  const cascade = new URL(req.url).searchParams.get("cascata") === "1";
  if (dependents && !cascade) {
    return json(
      {
        error: "O arquivo tem itens derivados. Confirme a exclusão em cascata.",
        dependents: { datasets: datasets.map((d) => d.name), structures: structures.map((s) => s.id), references: references.map((r) => r.title) },
      },
      409,
    );
  }
  if (dependents) {
    await repo.mutateProject(user.id, id, (draft) => {
      draft.datasets = draft.datasets.filter((d) => d.fileId !== fileId);
      draft.structures = draft.structures.filter((s) => s.fileId !== fileId);
      draft.references = draft.references.filter((r) => r.fileId !== fileId);
      return [
        {
          actor: "pesquisador",
          action: "derivados_excluidos",
          detail: `Excluídos itens derivados do arquivo: ${[...datasets.map((d) => `dados “${d.name}”`), ...structures.map(() => "estrutura"), ...references.map((r) => `referência “${r.title}”`)].join(", ")}.`,
        },
      ];
    });
    for (const d of datasets) await repo.deleteDerived(user.id, id, "datasets", d.id);
    for (const r of references) await repo.deleteDerived(user.id, id, "references", r.id);
  }
  await repo.deleteFile(user.id, id, fileId);
  return json({ deleted: true, dependentsRemoved: dependents });
});
