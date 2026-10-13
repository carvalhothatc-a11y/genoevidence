import { ApiError, handle, json, requireUser } from "@/lib/api";
import { editarRegistro, excluirRegistro, lerRegistro } from "@/lib/caderno/store";
import { EntradaRegistro } from "@/lib/caderno/tipos";

export const dynamic = "force-dynamic";

/**
 * Um dia do caderno. O identificador do usuário entra no caminho do arquivo, então o registro de
 * outra pessoa não é "negado": ele não existe para esta sessão (404), sem revelar que existe.
 */
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/caderno/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const registro = await lerRegistro(user.id, id);
  if (!registro) throw new ApiError(404, "Registro não encontrado.");
  return json({ registro });
});

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/caderno/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const corpo = await req.json().catch(() => null);
  const entrada = EntradaRegistro.safeParse(corpo);
  if (!entrada.success) throw new ApiError(400, entrada.error.issues[0]?.message ?? "Registro inválido.", entrada.error.issues);
  const registro = await editarRegistro(user.id, id, entrada.data);
  if (!registro) throw new ApiError(404, "Registro não encontrado.");
  return json({ registro });
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/caderno/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  if (!(await excluirRegistro(user.id, id))) throw new ApiError(404, "Registro não encontrado.");
  return json({ ok: true });
});
