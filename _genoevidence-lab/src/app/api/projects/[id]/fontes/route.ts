import { ApiError, handle, json, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { authorizeProject } from "@/lib/authz";
import { trechosDoProjeto } from "@/lib/fontes/indice";
import { responderComFontes } from "@/lib/fontes/responder";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Quais arquivos do projeto viraram trecho citável, e quais não — com o motivo. */
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/projects/[id]/fontes">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { project } = await authorizeProject(user, id, "ler");
  const { fontes, trechos } = await trechosDoProjeto(project);
  return json({ fontes, total: trechos.length });
});

const Pergunta = z.object({ pergunta: z.string().trim().min(3, "Escreva a pergunta.").max(500) });

/**
 * Pergunta aos documentos do projeto.
 *
 * O conteúdo dos trechos relevantes vai para a API do Claude — por isso a resposta deixa claro na
 * interface o que foi consultado. Só os trechos encontrados saem daqui, não os arquivos inteiros.
 */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/projects/[id]/fontes">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { project } = await authorizeProject(user, id, "ler");
  try {
    rateLimit(`fontes:${user.id}`, 30, 10 * 60_000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(429, "Muitas perguntas em pouco tempo. Aguarde alguns minutos.");
    throw e;
  }

  const corpo = Pergunta.safeParse(await req.json().catch(() => null));
  if (!corpo.success) throw new ApiError(400, corpo.error.issues[0]?.message ?? "Pergunta inválida.");

  const { trechos } = await trechosDoProjeto(project);
  const r = await responderComFontes(corpo.data.pergunta, trechos);
  if ("erro" in r) throw new ApiError(502, r.erro);
  return json(r);
});
