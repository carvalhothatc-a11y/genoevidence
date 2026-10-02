import { cookies } from "next/headers";
import { handle, json } from "@/lib/api";
import { deleteSession } from "@/lib/auth/store";
import { ACCOUNT_COOKIE } from "@/lib/session";

export const POST = handle(async () => {
  const store = await cookies();
  const token = store.get(ACCOUNT_COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(ACCOUNT_COOKIE);
  return json({ ok: true });
});
