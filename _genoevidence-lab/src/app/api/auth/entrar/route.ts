import { cookies, headers } from "next/headers";
import { z } from "zod";
import { ApiError, handle, json, readJsonBody } from "@/lib/api";
import { applyBootstrap, AuthError, createSession, rateLimit, verifyCredentials } from "@/lib/auth/store";
import { audit, hashEmail } from "@/lib/audit";
import { clientKey } from "@/lib/security";
import { ACCOUNT_COOKIE, sessionCookieOptions } from "@/lib/session";

const Body = z.object({ email: z.string().trim().max(200), password: z.string().max(200) });

export const POST = handle(async (req: Request) => {
  const body = Body.parse(await readJsonBody(req, 10_000));
  const client = clientKey(await headers());
  try {
    rateLimit(`entrar:conta:${hashEmail(body.email)}`, 8, 15 * 60 * 1000);
    rateLimit(`entrar:cliente:${client}`, 60, 15 * 60 * 1000);
  } catch (e) {
    if (e instanceof AuthError) {
      await audit("login_bloqueado", { emailHash: hashEmail(body.email), result: "negado" });
      throw new ApiError(e.status, e.message);
    }
    throw e;
  }
  const found = await verifyCredentials(body.email, body.password);
  if (!found) {
    await audit("login_falha", { emailHash: hashEmail(body.email), result: "falha" });
    throw new ApiError(401, "E-mail ou senha incorretos.");
  }
  const account = await applyBootstrap(found);
  // Sessão nova a cada login (impede fixação de sessão); a anterior deste navegador é descartada.
  const store = await cookies();
  const { token, expiresAt } = await createSession(account.id);
  store.set(ACCOUNT_COOKIE, token, sessionCookieOptions(expiresAt));
  await audit("login_ok", { userId: account.id, result: "ok" });
  return json({ status: account.status });
});
