import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { ApiError } from "@/lib/api";
import { authorizeProject, type ProjectAction } from "@/lib/authz";

/**
 * Páginas: exige sessão E conta autorizada. Sem sessão → login; pendente/suspensa → página de estado.
 * Nenhum dado de projeto é carregado antes desta verificação.
 */
export async function requirePageUser(returnTo = "/laboratorio"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/entrar?voltar=${encodeURIComponent(returnTo)}`);
  if (user.status === "pendente") redirect("/acesso/pendente");
  if (user.status === "suspenso") redirect("/acesso/suspenso");
  return user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requirePageUser("/admin");
  if (user.role !== "admin") notFound();
  return user;
}

/** Carrega um projeto para a página, se o usuário tiver a permissão pedida; senão 404. */
export async function loadProjectFor(id: string, action: ProjectAction = "ler") {
  const user = await requirePageUser(`/projetos/${id}`);
  try {
    const { project, role } = await authorizeProject(user, id, action);
    return { user, project, role };
  } catch (e) {
    if (e instanceof ApiError) notFound();
    throw e;
  }
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
