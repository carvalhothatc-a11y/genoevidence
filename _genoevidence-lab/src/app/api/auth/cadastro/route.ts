import { headers } from "next/headers";
import { z } from "zod";
import { ApiError, handle, json, readJsonBody } from "@/lib/api";
import { AuthError, rateLimit, registerAccount } from "@/lib/auth/store";
import { audit, hashEmail } from "@/lib/audit";
import { clientKey } from "@/lib/security";
import { POLITICA_VERSAO } from "@/lib/privacidade";

const Body = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().email("E-mail inválido.").max(200),
  institution: z.string().trim().max(200).optional(),
  password: z.string().min(10, "A senha precisa de pelo menos 10 caracteres.").max(200),
  acceptPrivacy: z.literal(true, { message: "É preciso concordar para continuar." }),
});

/**
 * Cadastro aberto com aprovação manual. A resposta é SEMPRE a mesma (e-mail novo ou já existente),
 * e nenhuma sessão é aberta aqui: a pessoa entra depois e vê o estado do acesso.
 */
export const POST = handle(async (req: Request) => {
  try {
    rateLimit(`cadastro:${clientKey(await headers())}`, 10, 60 * 60 * 1000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(e.status, e.message);
    throw e;
  }
  const body = Body.parse(await readJsonBody(req, 10_000));
  const r = await registerAccount({ ...body, privacyVersion: POLITICA_VERSAO });
  await audit("cadastro", { userId: r.account?.id, emailHash: hashEmail(body.email), result: r.created ? "ok" : "falha", detail: r.created ? (r.account?.status ?? "") : "e-mail já cadastrado" });
  return json({ message: "Cadastro recebido. Entre com seu e-mail e senha para acompanhar a autorização do acesso." }, 202);
});
