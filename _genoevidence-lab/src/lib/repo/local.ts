import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Project, type FileRecord, type ProjectFields } from "@/lib/domain/schemas";
import { newId, nowIso } from "@/lib/ids";
import { LIMITS } from "@/lib/config";
import type { Actor, DerivedKind, HistoryDraft, NewFileInput, Principal, Repository } from "./types";

const SAFE_ID = /^[a-zA-Z0-9_-]{6,64}$/;

/** Fila por chave: serializa escritas no mesmo projeto/índice dentro do processo. */
class KeyedMutex {
  private tails = new Map<string, Promise<unknown>>();
  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(key) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.tails.set(
      key,
      next.catch(() => undefined),
    );
    return next;
  }
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Escrita atômica; arquivos legíveis só pelo usuário do processo (0600). */
async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(tmp, file);
}

/**
 * Persistência local em arquivos (sem decisão de acesso — ver src/lib/authz.ts). Estrutura:
 *   <raiz>/index/<userId>.json                         projetos de que o usuário é dono
 *   <raiz>/index/compartilhados/<tipo>_<id>.json       projetos compartilhados com pessoa/equipe
 *   <raiz>/projects/<id>/project.json                  documento do projeto (validado por Zod)
 *   <raiz>/projects/<id>/files/<fileId>                bytes ORIGINAIS, nunca modificados
 *   <raiz>/projects/<id>/derived/<tipo>/<id>.json      dados interpretados/extraídos
 */
export class LocalRepository implements Repository {
  readonly backend = "local" as const;
  private mutex = new KeyedMutex();

  constructor(private root: string) {}

  private projectDir(projectId: string) {
    if (!SAFE_ID.test(projectId)) throw new Error("Identificador de projeto inválido.");
    return path.join(this.root, "projects", projectId);
  }
  private indexFile(userId: string) {
    if (!/^u_[A-Za-z0-9_-]{8,64}$/.test(userId)) throw new Error("Usuário inválido.");
    return path.join(this.root, "index", `${userId}.json`);
  }
  private shareIndexFile(p: Principal) {
    if (!SAFE_ID.test(p.id)) throw new Error("Destinatário inválido.");
    return path.join(this.root, "index", "compartilhados", `${p.type}_${p.id}.json`);
  }

  async listOwnedIds(userId: string) {
    return (await readJson<string[]>(this.indexFile(userId))) ?? [];
  }

  async listSharedIds(principal: Principal) {
    return (await readJson<string[]>(this.shareIndexFile(principal))) ?? [];
  }

  async setShareIndex(principal: Principal, projectId: string, present: boolean) {
    const file = this.shareIndexFile(principal);
    await this.mutex.run(`share:${file}`, async () => {
      const ids = (await readJson<string[]>(file)) ?? [];
      const next = present ? [...new Set([...ids, projectId])] : ids.filter((x) => x !== projectId);
      if (next.length) await writeJsonAtomic(file, next);
      else await rm(file, { force: true });
    });
  }

  async createProject(owner: Actor, fields: ProjectFields, opts: { synthetic?: boolean } = {}): Promise<Project> {
    const now = nowIso();
    const project = Project.parse({
      ...fields,
      id: newId("p_"),
      ownerId: owner.id,
      synthetic: Boolean(opts.synthetic),
      visibility: "privado",
      aiConsent: { claudeApi: false },
      files: [],
      references: [],
      datasets: [],
      structures: [],
      sessions: [],
      experiments: [],
      shares: [],
      notes: [],
      history: [
        {
          id: newId("h_"),
          at: now,
          actor: "pesquisador",
          actorId: owner.id,
          actorName: owner.name,
          action: "projeto_criado",
          detail: opts.synthetic ? `Projeto de exemplo criado com DADOS SINTÉTICOS: "${fields.title}".` : `Projeto criado: "${fields.title}".`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
    await this.mutex.run(`index:${owner.id}`, async () => {
      const ids = await this.listOwnedIds(owner.id);
      if (ids.length >= LIMITS.maxProjectsPerUser) throw new Error("Limite de projetos atingido.");
      await writeJsonAtomic(path.join(this.projectDir(project.id), "project.json"), project);
      await writeJsonAtomic(this.indexFile(owner.id), [...ids, project.id]);
    });
    return project;
  }

  async getProject(projectId: string): Promise<Project | null> {
    if (!SAFE_ID.test(projectId)) return null;
    const raw = await readJson<unknown>(path.join(this.projectDir(projectId), "project.json"));
    return raw ? Project.parse(raw) : null;
  }

  async mutateProject(projectId: string, actor: Actor, fn: (draft: Project) => HistoryDraft[] | Promise<HistoryDraft[]>): Promise<Project | null> {
    if (!SAFE_ID.test(projectId)) return null;
    return this.mutex.run(`project:${projectId}`, async () => {
      const current = await this.getProject(projectId);
      if (!current) return null;
      const draft = structuredClone(current);
      const entries = await fn(draft);
      // Campos protegidos não podem ser alterados por mutações.
      draft.id = current.id;
      draft.ownerId = current.ownerId;
      draft.createdAt = current.createdAt;
      draft.visibility = "privado";
      const now = nowIso();
      draft.updatedAt = now;
      draft.history = [...current.history, ...entries.map((e) => ({ ...e, id: newId("h_"), at: now, actorId: actor.id, actorName: actor.name }))];
      const valid = Project.parse(draft);
      await writeJsonAtomic(path.join(this.projectDir(projectId), "project.json"), valid);
      return valid;
    });
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const p = await this.getProject(projectId);
    if (!p) return false;
    for (const s of p.shares) await this.setShareIndex(s.principal, projectId, false);
    await this.mutex.run(`index:${p.ownerId}`, async () => {
      const ids = await this.listOwnedIds(p.ownerId);
      await writeJsonAtomic(
        this.indexFile(p.ownerId),
        ids.filter((x) => x !== projectId),
      );
      await rm(this.projectDir(projectId), { recursive: true, force: true });
    });
    return true;
  }

  async putFile(projectId: string, actor: Actor, input: NewFileInput): Promise<FileRecord | null> {
    if (input.bytes.byteLength > LIMITS.maxUploadBytes) throw new Error("Arquivo acima do limite de tamanho.");
    if (!(await this.getProject(projectId))) return null;
    const record: FileRecord = {
      id: newId("f_"),
      // Nome exibido saneado (sem caminhos, controles ou separadores); no disco o arquivo usa só o id aleatório.
      name: input.name.replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, "_").replace(/^\.+/, "_").slice(0, 255) || "arquivo",
      mimeType: input.mimeType.slice(0, 120) || "application/octet-stream",
      size: input.bytes.byteLength,
      sha256: createHash("sha256").update(input.bytes).digest("hex"),
      kind: input.kind,
      uploadedAt: nowIso(),
      role: input.role,
      externalSource: input.externalSource,
    };
    const file = path.join(this.projectDir(projectId), "files", record.id);
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, input.bytes, { flag: "wx", mode: 0o600 });
    const updated = await this.mutateProject(projectId, actor, (draft) => {
      draft.files.push(record);
      return [
        {
          actor: "pesquisador",
          action: "arquivo_enviado",
          detail: `Arquivo original preservado: ${record.name} (${record.size} bytes, SHA-256 ${record.sha256.slice(0, 12)}…).`,
          entity: { type: "arquivo", id: record.id },
        },
      ];
    });
    return updated ? record : null;
  }

  async readFile(projectId: string, fileId: string) {
    if (!SAFE_ID.test(fileId)) return null;
    const p = await this.getProject(projectId);
    const record = p?.files.find((f) => f.id === fileId);
    if (!p || !record) return null;
    const bytes = new Uint8Array(await readFile(path.join(this.projectDir(projectId), "files", fileId)));
    return { record, bytes };
  }

  async deleteFile(projectId: string, actor: Actor, fileId: string): Promise<boolean> {
    if (!SAFE_ID.test(fileId)) return false;
    let found = false;
    const updated = await this.mutateProject(projectId, actor, (draft) => {
      const f = draft.files.find((x) => x.id === fileId);
      if (!f) return [];
      found = true;
      draft.files = draft.files.filter((x) => x.id !== fileId);
      return [{ actor: "pesquisador", action: "arquivo_excluido", detail: `Arquivo excluído: ${f.name}.`, entity: { type: "arquivo", id: fileId } }];
    });
    if (!updated || !found) return false;
    await rm(path.join(this.projectDir(projectId), "files", fileId), { force: true });
    return true;
  }

  private derivedFile(projectId: string, kind: DerivedKind, id: string) {
    if (!SAFE_ID.test(id)) throw new Error("Identificador inválido.");
    return path.join(this.projectDir(projectId), "derived", kind, `${id}.json`);
  }

  async putDerived(projectId: string, kind: DerivedKind, id: string, data: unknown) {
    if (!(await this.getProject(projectId))) return false;
    await writeJsonAtomic(this.derivedFile(projectId, kind, id), data);
    return true;
  }

  async getDerived<T>(projectId: string, kind: DerivedKind, id: string): Promise<T | null> {
    if (!SAFE_ID.test(id) || !SAFE_ID.test(projectId)) return null;
    return readJson<T>(this.derivedFile(projectId, kind, id));
  }

  async deleteDerived(projectId: string, kind: DerivedKind, id: string) {
    if (!SAFE_ID.test(id) || !SAFE_ID.test(projectId)) return;
    await rm(this.derivedFile(projectId, kind, id), { force: true });
  }
}
