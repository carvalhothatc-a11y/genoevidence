import "server-only";
import { cookies } from "next/headers";
import { applyBootstrap, getAccount, getSession, type AccountRole, type AccountStatus } from "@/lib/auth/store";

/** Cookie da conta (HttpOnly). O token só existe no cookie; no servidor fica apenas o hash. */
export const ACCOUNT_COOKIE = "lv_conta";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  status: AccountStatus;
  role: AccountRole;
  sessionHash: string;
};

/** Usuário da sessão atual, revalidado no servidor a cada requisição (estado e papel atuais). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(ACCOUNT_COOKIE)?.value;
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  let account = await getAccount(session.userId);
  if (!account) return null;
  account = await applyBootstrap(account);
  return { id: account.id, name: account.name, email: account.email, status: account.status, role: account.role, sessionHash: session.hash };
}

export const sessionCookieOptions = (expires: Date) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires,
});
