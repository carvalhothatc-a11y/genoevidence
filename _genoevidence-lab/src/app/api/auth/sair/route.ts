import { cookies } from "next/headers";
import { handle, json } from "@/lib/api";
import { deleteSession, getSession } from "@/lib/auth/store";
import { audit } from "@/lib/audit";
import { ACCOUNT_COOKIE } from "@/lib/session";

export const POST = handle(async () => {
  const store = await cookies();
  const token = store.get(ACCOUNT_COOKIE)?.value;
  if (token) {
    const s = await getSession(token);
    await deleteSession(token);
    if (s) await audit("logout", { userId: s.userId, result: "ok" });
  }
  store.delete(ACCOUNT_COOKIE);
  return json({ ok: true });
});
