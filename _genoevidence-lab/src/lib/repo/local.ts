import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Project, type FileRecord, type ProjectFields, type ProjectSummary } from "@/lib/domain/schemas";
import { newId, nowIso } from "@/lib/ids";
import { LIMITS } from "@/lib/config";
import type { DerivedKind, HistoryDraft, NewFileInput, Repository } from "./types";

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

async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, file);
}

/**
 * Persistência local em arquivos. Estrutura:
 *   <raiz>/index/<userId>.json                 lista de projetos do usuário
 *   <raiz>/projects/<id>/project.json          documento do projeto (validado por Zod)
 *   <raiz>/projects/<id>/files/<fileId>        bytes ORIGINAIS, nunca modificados
 *   <raiz>/projects/<id>/derived/<tipo>/<id>.json  dados interpretados/extraídos
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

  private async loadOwned(userId: string, projectId: string): Promise<Project | null> {
    if (!SAFE_ID.test(projectId)) return null;
    const raw = await readJson<unknown>(path.join(this.projectDir(projectId), "project.json"));
    if (!raw) return null;
    const project = Project.parse(raw);
    return project.ownerId === userId ? project : null;
  }

  async listProjects(userId: string): Promise<ProjectSummary[]> {
    const ids = (await readJson<string[]>(this.indexFile(userId))) ?? [];
    const out: ProjectSummary[] = [];
    for (const pid of ids) {
      const p = await this.loadOwned(userId, pid);
      if (!p) continue;
      out.push({
        id: p.id,
        title: p.title,
        technique: p.technique,
        organism: p.organism,
        synthetic: p.synthetic,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        counts: {
          files: p.files.length,
          references: p.references.length,
          datasets: p.datasets.length,
          structures: p.structures.length,
          sessions: p.sessions.length,
        },
      });
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createProject(userId: string, fields: ProjectFields, opts: { synthetic?: boolean } = {}): Promise<Project> {
    const now = nowIso();
    const project = Project.parse({
      ...fields,
      id: newId("p_"),
      ownerId: userId,
      synthetic: Boolean(opts.synthetic),
      visibility: "privado",
      aiConsent: { claudeApi: false },
      files: [],
      references: [],
      datasets: [],
      structures: [],
      sessions: [],
      history: [
        {
          id: newId("h_"),
          at: now,
          actor: "pesquisador",
          action: "projeto_criado",
          detail: opts.synthetic
            ? `Projeto de exemplo criado com DADOS SINTÉTICOS: "${fields.title}".`
            : `Projeto criado: "${fields.title}".`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
    await this.mutex.run(`index:${userId}`, async () => {
      const ids = (await readJson<string[]>(this.indexFile(userId))) ?? [];
      if (ids.length >= LIMITS.maxProjectsPerUser) throw new Error("Limite de projetos atingido.");
      await writeJsonAtomic(path.join(this.projectDir(project.id), "project.json"), project);
      await writeJsonAtomic(this.indexFile(userId), [...ids, project.id]);
    });
    return project;
  }

  async getProject(userId: string, projectId: string): Promise<Project | null> {
    return this.loadOwned(userId, projectId);
  }

  async mutateProject(
    userId: string,
    projectId: string,
    fn: (draft: Project) => HistoryDraft[] | Promise<HistoryDraft[]>,
  ): Promise<Project | null> {
    if (!SAFE_ID.test(projectId)) return null;
    return this.mutex.run(`project:${projectId}`, async () => {
      const current = await this.loadOwned(userId, projectId);
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
      draft.history = [...current.history, ...entries.map((e) => ({ ...e, id: newId("h_"), at: now }))];
      const valid = Project.parse(draft);
      await writeJsonAtomic(path.join(this.projectDir(projectId), "project.json"), valid);
      return valid;
    });
  }

  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const p = await this.loadOwned(userId, projectId);
    if (!p) return false;
    await this.mutex.run(`index:${userId}`, async () => {
      const ids = (await readJson<string[]>(this.indexFile(userId))) ?? [];
      await writeJsonAtomic(
        this.indexFile(userId),
        ids.filter((x) => x !== projectId),
      );
      await rm(this.projectDir(projectId), { recursive: true, force: true });
    });
    return true;
  }

  async transferProjects(fromUserId: string, toUserId: string): Promise<number> {
    const ids = (await readJson<string[]>(this.indexFile(fromUserId))) ?? [];
    if (!ids.length) return 0;
    let moved = 0;
    for (const pid of ids) {
      const ok = await this.mutex.run(`project:${pid}`, async () => {
        const file = path.join(this.projectDir(pid), "project.json");
        const raw = await readJson<unknown>(file);
        if (!raw) return false;
        const p = Project.parse(raw);
        if (p.ownerId !== fromUserId) return false;
        const now = nowIso();
        p.ownerId = toUserId;
        p.updatedAt = now;
        p.history.push({ id: newId("h_"), at: now, actor: "sistema", action: "projeto_associado_a_conta", detail: "Projeto criado neste navegador antes do cadastro foi associado à conta." });
        await writeJsonAtomic(file, Project.parse(p));
        return true;
      });
      if (ok) moved++;
    }
    await this.mutex.run(`index:${toUserId}`, async () => {
      const mine = (await readJson<string[]>(this.indexFile(toUserId))) ?? [];
      await writeJsonAtomic(this.indexFile(toUserId), [...new Set([...mine, ...ids])]);
    });
    await rm(this.indexFile(fromUserId), { force: true });
    return moved;
  }

  async putFile(userId: string, projectId: string, input: NewFileInput): Promise<FileRecord | null> {
    if (input.bytes.byteLength > LIMITS.maxUploadBytes) throw new Error("Arquivo acima do limite de tamanho.");
    const owned = await this.loadOwned(userId, projectId);
    if (!owned) return null;
    const record: FileRecord = {
      id: newId("f_"),
      name: input.name.replace(/[\u0000-\u001f/\\]/g, "_").slice(0, 255) || "arquivo",
      mimeType: input.mimeType.slice(0, 120) || "application/octet-stream",
      size: input.bytes.byteLength,
      sha256: createHash("sha256").update(input.bytes).digest("hex"),
      kind: input.kind,
      uploadedAt: nowIso(),
      role: input.role,
      externalSource: input.externalSource,
    };
    const file = path.join(this.projectDir(projectId), "files", record.id);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, input.bytes, { flag: "wx" });
    const updated = await this.mutateProject(userId, projectId, (draft) => {
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

  async readFile(userId: string, projectId: string, fileId: string) {
    const p = await this.loadOwned(userId, projectId);
    const record = p?.files.find((f) => f.id === fileId);
    if (!p || !record || !SAFE_ID.test(fileId)) return null;
    const bytes = new Uint8Array(await readFile(path.join(this.projectDir(projectId), "files", fileId)));
    return { record, bytes };
  }

  async deleteFile(userId: string, projectId: string, fileId: string): Promise<boolean> {
    if (!SAFE_ID.test(fileId)) return false;
    const updated = await this.mutateProject(userId, projectId, (draft) => {
      const f = draft.files.find((x) => x.id === fileId);
      if (!f) throw new Error("Arquivo não encontrado.");
      draft.files = draft.files.filter((x) => x.id !== fileId);
      return [
        { actor: "pesquisador", action: "arquivo_excluido", detail: `Arquivo excluído: ${f.name}.`, entity: { type: "arquivo", id: fileId } },
      ];
    });
    if (!updated) return false;
    await rm(path.join(this.projectDir(projectId), "files", fileId), { force: true });
    return true;
  }

  private derivedFile(projectId: string, kind: DerivedKind, id: string) {
    if (!SAFE_ID.test(id)) throw new Error("Identificador inválido.");
    return path.join(this.projectDir(projectId), "derived", kind, `${id}.json`);
  }

  async putDerived(userId: string, projectId: string, kind: DerivedKind, id: string, data: unknown) {
    if (!(await this.loadOwned(userId, projectId))) return false;
    await writeJsonAtomic(this.derivedFile(projectId, kind, id), data);
    return true;
  }

  async getDerived<T>(userId: string, projectId: string, kind: DerivedKind, id: string): Promise<T | null> {
    if (!(await this.loadOwned(userId, projectId)) || !SAFE_ID.test(id)) return null;
    return readJson<T>(this.derivedFile(projectId, kind, id));
  }

  async deleteDerived(userId: string, projectId: string, kind: DerivedKind, id: string) {
    if (!(await this.loadOwned(userId, projectId)) || !SAFE_ID.test(id)) return;
    await rm(this.derivedFile(projectId, kind, id), { force: true });
  }
}
