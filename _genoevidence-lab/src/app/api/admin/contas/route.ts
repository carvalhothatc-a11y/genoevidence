import { handle, json, requireAdmin } from "@/lib/api";
import { listAccounts, toPublic } from "@/lib/auth/store";

export const GET = handle(async () => {
  await requireAdmin();
  return json({ accounts: (await listAccounts()).map(toPublic) });
});
