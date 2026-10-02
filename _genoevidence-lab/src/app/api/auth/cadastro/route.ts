import { cookies, headers } from "next/headers";
import { z } from "zod";
import { ApiError, handle, json, readJsonBody } from "@/lib/api";
import { AuthError, createAccount, createSession, rateLimit, toPublic } from "@/lib/auth/store";
import { getRepository } from "@/lib/repo";
import { ACCOUNT_COOKIE, LEGACY_COOKIE, legacyAnonymousUserId, sessionCookieOptions } from "@/lib/session";

const Body = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().email("E-mail inválido.").max(200),
  institution: z.string().trim().max(200).optional(),
  password: z.string().min(10, "A senha precisa de pelo menos 10 caracteres.").max(200),
  acceptPrivacy: z.literal(true, { message: "É preciso concordar com o uso local dos dados." }),
});

export const POST = handle(async (req: Request) => {
  const ip = (await headers()).get("x-forwarded-for") ?? "local";
  try {
    rateLimit(`cadastro:${ip}`, 10);
    const body = Body.parse(await readJsonBody(req));
    const account = await createAccount(body);
    const { token, expiresAt } = await createSession(account.id);
    const store = await cookies();
    store.set(ACCOUNT_COOKIE, token, sessionCookieOptions(expiresAt));
    // Projetos criados neste navegador antes do cadastro passam para a nova conta.
    const legacy = await legacyAnonymousUserId();
    const migrated = legacy ? await getRepository().transferProjects(legacy, account.id) : 0;
    if (legacy) store.delete(LEGACY_COOKIE);
    return json({ account: toPublic(account), migratedProjects: migrated }, 201);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(e.status, e.message);
    throw e;
  }
});
