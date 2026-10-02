import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getAccount, getSession } from "@/lib/auth/store";

/** Cookie da conta (HttpOnly). O token só existe no cookie; no servidor fica apenas o hash. */
export const ACCOUNT_COOKIE = "lv_conta";
/** Cookie da versão anterior (sessão anônima por navegador) — lido apenas para migrar projetos no cadastro. */
export const LEGACY_COOKIE = "lv_sessao";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  mode: "conta";
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(ACCOUNT_COOKIE)?.value;
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  const account = await getAccount(session.userId);
  return account ? { id: account.id, name: account.name, email: account.email, mode: "conta" } : null;
}

/** Usuário anônimo da versão anterior (para migrar projetos para a nova conta). */
export async function legacyAnonymousUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(LEGACY_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{40,128}$/.test(token)) return null;
  return "u_" + createHash("sha256").update(token).digest("base64url").slice(0, 32);
}

export const sessionCookieOptions = (expires: Date) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires,
});
