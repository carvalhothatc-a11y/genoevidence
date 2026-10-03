import { handle, json, notFound, requireUser } from "@/lib/api";
import { actorOf, authorizeProject } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { getRepository } from "@/lib/repo";

/**
 * Arquivo ORIGINAL. ?modo=visualizar → exibição dentro do app (estruturas e imagens; papel leitor);
 * padrão → download como anexo (exige permissão "baixar"). Autorização conferida em cada pedido.
 */
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/files/[fileId]">) => {
  const user = await requireUser();
  const { id, fileId } = await ctx.params;
  const view = new URL(req.url).searchParams.get("modo") === "visualizar";
  await authorizeProject(user, id, view ? "visualizar_arquivo" : "baixar");
  const found = await getRepository().readFile(id, fileId);
  if (!found) notFound("Arquivo");
  if (view && found.record.kind !== "estrutura" && found.record.kind !== "imagem") notFound("Arquivo");
  if (!view) await audit("download", { userId: user.id, projectId: id, target: fileId, result: "ok" });
  const inline = view && found.record.kind === "imagem";
  const safeType = found.record.kind === "imagem" ? found.record.mimeType : found.record.kind === "pdf" ? "application/pdf" : "application/octet-stream";
  return new Response(Buffer.from(found.bytes), {
    headers: {
      "Content-Type": view && found.record.kind === "estrutura" ? "text/plain; charset=utf-8" : safeType,
      "Content-Length": String(found.bytes.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(found.record.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});

/** Exclui o arquivo; com ?cascata=1 remove também os itens derivados dele. */
export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/files/[fileId]">) => {
  const user = await requireUser();
  const { id, fileId } = await ctx.params;
  const { project } = await authorizeProject(user, id, "excluir_item");
  if (!project.files.some((f) => f.id === fileId)) notFound("Arquivo");
  const repo = getRepository();
  const datasets = project.datasets.filter((d) => d.fileId === fileId);
  const structures = project.structures.filter((s) => s.fileId === fileId);
  const references = project.references.filter((r) => r.fileId === fileId);
  const dependents = datasets.length + structures.length + references.length;
  if (dependents && new URL(req.url).searchParams.get("cascata") !== "1") {
    return json({ error: "O arquivo tem itens derivados. Confirme a exclusão em cascata.", dependents }, 409);
  }
  if (dependents) {
    await repo.mutateProject(id, actorOf(user), (draft) => {
      draft.datasets = draft.datasets.filter((d) => d.fileId !== fileId);
      draft.structures = draft.structures.filter((s) => s.fileId !== fileId);
      draft.references = draft.references.filter((r) => r.fileId !== fileId);
      return [{ actor: "pesquisador", action: "derivados_excluidos", detail: `Excluídos ${dependents} item(ns) derivados do arquivo.` }];
    });
    for (const d of datasets) await repo.deleteDerived(id, "datasets", d.id);
    for (const r of references) await repo.deleteDerived(id, "references", r.id);
  }
  await repo.deleteFile(id, actorOf(user), fileId);
  return json({ deleted: true, dependentsRemoved: dependents });
});
