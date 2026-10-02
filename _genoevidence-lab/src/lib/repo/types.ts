import type { FileKind, FileRecord, HistoryEntry, Project, ProjectFields, ProjectSummary } from "@/lib/domain/schemas";

export type NewFileInput = {
  name: string;
  mimeType: string;
  kind: FileKind;
  bytes: Uint8Array;
  role?: string;
  externalSource?: FileRecord["externalSource"];
};

export type DerivedKind = "datasets" | "references";

/** Entrada de histórico sem id/data (preenchidos pelo repositório). */
export type HistoryDraft = Omit<HistoryEntry, "id" | "at">;

/**
 * Interface de persistência. Implementações: LocalRepository (arquivos JSON em disco) e,
 * futuramente, SupabaseRepository (Postgres + RLS + Storage). Toda operação recebe o userId
 * e DEVE recusar acesso a projetos de outro dono, retornando null (sem revelar existência).
 */
export interface Repository {
  readonly backend: "local" | "supabase";
  listProjects(userId: string): Promise<ProjectSummary[]>;
  createProject(userId: string, fields: ProjectFields, opts?: { synthetic?: boolean }): Promise<Project>;
  getProject(userId: string, projectId: string): Promise<Project | null>;
  /**
   * Altera o projeto de forma atômica. `fn` recebe uma cópia, pode alterá-la e devolve
   * as entradas de histórico que descrevem a alteração. O resultado é validado antes de gravar.
   */
  mutateProject(
    userId: string,
    projectId: string,
    fn: (draft: Project) => HistoryDraft[] | Promise<HistoryDraft[]>,
  ): Promise<Project | null>;
  deleteProject(userId: string, projectId: string): Promise<boolean>;
  /** Transfere todos os projetos de um usuário para outro (migração da sessão anônima para a conta). */
  transferProjects(fromUserId: string, toUserId: string): Promise<number>;

  putFile(userId: string, projectId: string, input: NewFileInput): Promise<FileRecord | null>;
  readFile(userId: string, projectId: string, fileId: string): Promise<{ record: FileRecord; bytes: Uint8Array } | null>;
  /** Remove o arquivo original. Não remove dependentes — quem chama decide (ver API). */
  deleteFile(userId: string, projectId: string, fileId: string): Promise<boolean>;

  putDerived(userId: string, projectId: string, kind: DerivedKind, id: string, data: unknown): Promise<boolean>;
  getDerived<T>(userId: string, projectId: string, kind: DerivedKind, id: string): Promise<T | null>;
  deleteDerived(userId: string, projectId: string, kind: DerivedKind, id: string): Promise<void>;
}
