import { handle, json } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Estado da sessão (sem dados pessoais): usado para não mostrar o login a quem já entrou. */
export const GET = handle(async () => {
  const user = await getSessionUser();
  return json({ autenticado: Boolean(user), status: user?.status ?? null }, 200);
});
