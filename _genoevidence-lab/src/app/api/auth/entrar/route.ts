import { cookies, headers } from "next/headers";
import { z } from "zod";
import { ApiError, handle, json, readJsonBody } from "@/lib/api";
import { AuthError, createSession, rateLimit, toPublic, verifyCredentials } from "@/lib/auth/store";
import { ACCOUNT_COOKIE, sessionCookieOptions } from "@/lib/session";

const Body = z.object({ email: z.string().trim().max(200), password: z.string().max(200) });

export const POST = handle(async (req: Request) => {
  const ip = (await headers()).get("x-forwarded-for") ?? "local";
  const body = Body.parse(await readJsonBody(req));
  try {
    rateLimit(`entrar:${ip}:${body.email.toLowerCase()}`, 8);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(e.status, e.message);
    throw e;
  }
  const account = await verifyCredentials(body.email, body.password);
  if (!account) throw new ApiError(401, "E-mail ou senha incorretos.");
  const { token, expiresAt } = await createSession(account.id);
  (await cookies()).set(ACCOUNT_COOKIE, token, sessionCookieOptions(expiresAt));
  return json({ account: toPublic(account) });
});
