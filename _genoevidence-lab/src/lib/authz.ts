import "server-only";
import type { Project, ProjectSummary, ShareRole } from "@/lib/domain/schemas";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getRepository } from "@/lib/repo";
import type { Actor } from "@/lib/repo/types";
import type { SessionUser } from "@/lib/session";
import { teamsOf } from "@/lib/teams/store";

/**
 * AUTORIZAÇÃO — ponto único de decisão para dados de projetos.
 * Regras:
 *  - só contas AUTORIZADAS chegam aqui (requireUser / requireAuthorizedPage);
 *  - o papel no projeto vem de: dono, compartilhamento direto ou compartilhamento com equipe;
 *  - sem papel → 404 (não revela que o projeto existe); papel sem a ação → 403;
 *  - nada é herdado por instituição: isolamento só é rompido por compartilhamento explícito;
 *  - a permissão é recalculada em CADA requisição (mudanças valem imediatamente).
 */
export type ProjectRole = "dono" | ShareRole;

export type ProjectAction =
  | "ler" // ver projeto, dados interpretados, gráficos, notas, referências
  | "visualizar_arquivo" // exibir estrutura/imagem dentro do app (o navegador recebe o conteúdo)
  | "baixar" // baixar o arquivo original como anexo
  | "anotar" // criar notas e observações
  | "editar" // alterar campos, importar, enviar, salvar experiências
  | "excluir_item" // excluir arquivos, dados, estruturas, referências
  | "compartilhar" // gerenciar compartilhamentos
  | "exportar" // exportar o projeto completo
  | "excluir_projeto";

const LEITOR: ProjectAction[] = ["ler", "visualizar_arquivo"];
const EDITOR: ProjectAction[] = [...LEITOR, "baixar", "anotar", "editar", "excluir_item"];
const GESTOR: ProjectAction[] = [...EDITOR, "compartilhar", "exportar"];
const DONO: ProjectAction[] = [...GESTOR, "excluir_projeto"];

export const PERMISSIONS: Record<ProjectRole, readonly ProjectAction[]> = { leitor: LEITOR, editor: EDITOR, gestor: GESTOR, dono: DONO };
const RANK: Record<ProjectRole, number> = { leitor: 1, editor: 2, gestor: 3, dono: 4 };

export function can(role: ProjectRole | null, action: ProjectAction): boolean {
  return Boolean(role && PERMISSIONS[role].includes(action));
}

/** Papel efetivo (o mais alto entre dono, compartilhamento direto e equipes). */
export function effectiveRole(project: Project, userId: string, teamIds: string[]): ProjectRole | null {
  if (project.ownerId === userId) return "dono";
  let best: ProjectRole | null = null;
  for (const s of project.shares) {
    const match = (s.principal.type === "usuario" && s.principal.id === userId) || (s.principal.type === "equipe" && teamIds.includes(s.principal.id));
    if (match && (!best || RANK[s.role] > RANK[best])) best = s.role;
  }
  return best;
}

export function actorOf(user: SessionUser): Actor {
  return { id: user.id, name: user.name };
}

export async function authorizeProject(user: SessionUser, projectId: string, action: ProjectAction): Promise<{ project: Project; role: ProjectRole }> {
  if (user.status !== "autorizado") throw new ApiError(403, "Seu acesso ao GenoLab ainda não foi autorizado.");
  const project = await getRepository().getProject(projectId);
  const teams = (await teamsOf(user.id)).map((t) => t.id);
  const role = project ? effectiveRole(project, user.id, teams) : null;
  if (!project || !role) {
    await audit("acesso_negado", { userId: user.id, projectId: /^[A-Za-z0-9_-]{6,64}$/.test(projectId) ? projectId : "invalido", action, result: "negado" });
    throw new ApiError(404, "Projeto não encontrado (ou sem permissão de acesso).");
  }
  if (!can(role, action)) {
    await audit("acesso_negado", { userId: user.id, projectId, action, result: "negado", detail: `papel ${role}` });
    throw new ApiError(403, `Seu papel neste projeto (${role}) não permite esta ação.`);
  }
  return { project, role };
}

/** Projetos visíveis ao usuário (próprios + compartilhados), com o papel de cada um. */
export async function listVisibleProjects(user: SessionUser): Promise<ProjectSummary[]> {
  const repo = getRepository();
  const teams = (await teamsOf(user.id)).map((t) => t.id);
  const ids = new Set<string>([...(await repo.listOwnedIds(user.id)), ...(await repo.listSharedIds({ type: "usuario", id: user.id }))]);
  for (const t of teams) for (const id of await repo.listSharedIds({ type: "equipe", id: t })) ids.add(id);
  const out: ProjectSummary[] = [];
  for (const id of ids) {
    const p = await repo.getProject(id);
    if (!p) continue;
    const role = effectiveRole(p, user.id, teams); // o índice é só um atalho; a regra é recalculada aqui
    if (!role) continue;
    out.push({
      id: p.id,
      title: p.title,
      technique: p.technique,
      organism: p.organism,
      synthetic: p.synthetic,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      counts: { files: p.files.length, references: p.references.length, datasets: p.datasets.length, structures: p.structures.length, sessions: p.sessions.length },
      role,
    });
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
