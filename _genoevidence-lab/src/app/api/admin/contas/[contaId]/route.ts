import { z } from "zod";
import { ApiError, handle, json, notFound, readJsonBody, requireAdmin } from "@/lib/api";
import { getAccount, listAccounts, revokeAllSessions, saveAccount } from "@/lib/auth/store";
import { audit } from "@/lib/audit";

const Body = z.object({ status: z.enum(["autorizado", "suspenso", "pendente"]).optional(), role: z.enum(["admin", "pesquisador"]).optional() });

/** Aprovar, suspender ou mudar papel. Não permite alterar a própria conta nem remover o último administrador. */
export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/admin/contas/[contaId]">) => {
  const admin = await requireAdmin();
  const { contaId } = await ctx.params;
  const body = Body.parse(await readJsonBody(req, 2_000));
  if (contaId === admin.id) throw new ApiError(409, "Não é possível alterar a própria conta por aqui.");
  const target = await getAccount(contaId);
  if (!target) notFound("Conta");
  if (target.role === "admin" && (body.role === "pesquisador" || (body.status && body.status !== "autorizado"))) {
    const admins = (await listAccounts()).filter((a) => a.role === "admin" && a.status === "autorizado");
    if (admins.length <= 1) throw new ApiError(409, "É preciso manter ao menos um administrador autorizado.");
  }
  const now = new Date().toISOString();
  const next = { ...target };
  if (body.status && body.status !== target.status) {
    next.status = body.status;
    next.statusChangedAt = now;
    next.statusChangedBy = admin.id;
  }
  if (body.role && body.role !== target.role) next.role = body.role;
  await saveAccount(next);
  if (next.status !== "autorizado") await revokeAllSessions(target.id);
  if (body.status) await audit("conta_status", { userId: admin.id, target: target.id, result: "ok", detail: `${target.status} → ${next.status}` });
  if (body.role) await audit("conta_papel", { userId: admin.id, target: target.id, result: "ok", detail: `${target.role} → ${next.role}` });
  return json({ ok: true });
});
