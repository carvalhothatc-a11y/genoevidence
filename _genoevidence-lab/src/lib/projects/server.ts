import "server-only";
import { notFound, redirect } from "next/navigation";
import { getRepository } from "@/lib/repo";
import { getSessionUser } from "@/lib/session";

/** Exige sessão válida nas páginas; sem ela, leva ao login. */
export async function requirePageUser(returnTo = "/laboratorio") {
  const user = await getSessionUser();
  if (!user) redirect(`/entrar?voltar=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Carrega um projeto do usuário atual ou responde 404 (sem revelar se existe para outro usuário). */
export async function loadOwnProject(id: string) {
  const user = await requirePageUser(`/projetos/${id}`);
  const project = await getRepository().getProject(user.id, id);
  if (!project) notFound();
  return { user, project };
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
