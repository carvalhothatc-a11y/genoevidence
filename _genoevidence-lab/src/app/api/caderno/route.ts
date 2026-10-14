import { ApiError, handle, json, requireUser } from "@/lib/api";
import { criarRegistro, listarRegistros } from "@/lib/caderno/store";
import { EntradaRegistro } from "@/lib/caderno/tipos";

export const dynamic = "force-dynamic";

/**
 * Caderno de laboratório da pessoa que está na sessão.
 *
 * Não pede projeto: o registro do dia é anterior a qualquer organização em projetos, e exigir que
 * a pessoa crie um projeto antes de escrever o que fez hoje seria perder o registro.
 */
export const GET = handle(async () => {
  const user = await requireUser();
  return json({ registros: await listarRegistros(user.id) });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const corpo = await req.json().catch(() => null);
  const entrada = EntradaRegistro.safeParse(corpo);
  if (!entrada.success) throw new ApiError(400, entrada.error.issues[0]?.message ?? "Registro inválido.", entrada.error.issues);
  return json({ registro: await criarRegistro(user.id, entrada.data) }, 201);
});
