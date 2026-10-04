import type { FileKind, FileRecord, HistoryEntry, Project, ProjectFields } from "@/lib/domain/schemas";

export type NewFileInput = {
  name: string;
  mimeType: string;
  kind: FileKind;
  bytes: Uint8Array;
  role?: string;
  externalSource?: FileRecord["externalSource"];
};

export type DerivedKind = "datasets" | "references" | "ideias" | "evidencias" | "experimentos";

/** Quem executa a alteração (registrado no histórico). */
export type Actor = { id: string; name: string };

/** Entrada de histórico sem id/data (preenchidos pelo repositório). */
export type HistoryDraft = Omit<HistoryEntry, "id" | "at" | "actorId" | "actorName">;

export type Principal = { type: "usuario" | "equipe"; id: string };

/**
 * Persistência SEM decisão de acesso. Toda chamada deve ser precedida por
 * authorizeProject() (src/lib/authz.ts), que verifica sessão, estado da conta,
 * papel no projeto e a ação pedida.
 */
export interface Repository {
  readonly backend: "local" | "supabase";
  createProject(owner: Actor, fields: ProjectFields, opts?: { synthetic?: boolean }): Promise<Project>;
  getProject(projectId: string): Promise<Project | null>;
  mutateProject(projectId: string, actor: Actor, fn: (draft: Project) => HistoryDraft[] | Promise<HistoryDraft[]>): Promise<Project | null>;
  deleteProject(projectId: string): Promise<boolean>;
  listOwnedIds(userId: string): Promise<string[]>;
  listSharedIds(principal: Principal): Promise<string[]>;
  setShareIndex(principal: Principal, projectId: string, present: boolean): Promise<void>;

  putFile(projectId: string, actor: Actor, input: NewFileInput): Promise<FileRecord | null>;
  readFile(projectId: string, fileId: string): Promise<{ record: FileRecord; bytes: Uint8Array } | null>;
  deleteFile(projectId: string, actor: Actor, fileId: string): Promise<boolean>;

  putDerived(projectId: string, kind: DerivedKind, id: string, data: unknown): Promise<boolean>;
  getDerived<T>(projectId: string, kind: DerivedKind, id: string): Promise<T | null>;
  deleteDerived(projectId: string, kind: DerivedKind, id: string): Promise<void>;
}
