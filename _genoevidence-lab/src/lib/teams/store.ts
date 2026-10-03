import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { dataRoot } from "@/lib/repo";

export const TeamRole = z.enum(["gestor", "membro"]);
export const Team = z.object({
  id: z.string().regex(/^t_[A-Za-z0-9_-]{8,64}$/),
  name: z.string().trim().min(2).max(120),
  description: z.string().max(500).default(""),
  members: z.array(z.object({ userId: z.string(), role: TeamRole, addedAt: z.string(), addedBy: z.string() })),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type Team = z.infer<typeof Team>;

const dir = () => path.join(dataRoot(), "teams");
const file = (id: string) => {
  if (!/^t_[A-Za-z0-9_-]{8,64}$/.test(id)) throw new Error("Equipe inválida.");
  return path.join(dir(), `${id}.json`);
};

async function readTeam(id: string): Promise<Team | null> {
  try {
    return Team.parse(JSON.parse(await readFile(file(id), "utf8")));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    if (e instanceof Error && e.message === "Equipe inválida.") return null;
    throw e;
  }
}

async function writeTeam(t: Team) {
  await mkdir(dir(), { recursive: true });
  const tmp = `${file(t.id)}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(Team.parse(t), null, 2), { mode: 0o600 });
  await rename(tmp, file(t.id));
}

export async function getTeam(id: string) {
  return readTeam(id);
}

export async function listAllTeams(): Promise<Team[]> {
  let files: string[] = [];
  try {
    files = await readdir(dir());
  } catch {
    return [];
  }
  const out: Team[] = [];
  for (const f of files) if (f.endsWith(".json")) {
    const t = await readTeam(f.slice(0, -5));
    if (t) out.push(t);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Equipes de que o usuário participa (calculado a cada requisição; mudanças valem na hora). */
export async function teamsOf(userId: string): Promise<Team[]> {
  return (await listAllTeams()).filter((t) => t.members.some((m) => m.userId === userId));
}

export async function createTeam(name: string, description: string, creatorId: string): Promise<Team> {
  const now = new Date().toISOString();
  const t: Team = { id: "t_" + randomBytes(12).toString("base64url"), name, description, members: [{ userId: creatorId, role: "gestor", addedAt: now, addedBy: creatorId }], createdBy: creatorId, createdAt: now };
  await writeTeam(t);
  return t;
}

export async function saveTeam(t: Team) {
  await writeTeam(t);
}

export async function deleteTeam(id: string) {
  await rm(file(id), { force: true });
}

export function isTeamManager(t: Team, userId: string) {
  return t.members.some((m) => m.userId === userId && m.role === "gestor");
}
