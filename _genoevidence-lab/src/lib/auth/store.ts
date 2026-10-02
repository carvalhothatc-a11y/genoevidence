import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { dataRoot } from "@/lib/repo";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Sessão: expiração absoluta e por inatividade. */
export const SESSION_ABSOLUTE_MS = 14 * 24 * 3600 * 1000;
export const SESSION_IDLE_MS = 12 * 3600 * 1000;
const TOUCH_EVERY_MS = 5 * 60 * 1000;

export type AccountStatus = "pendente" | "autorizado" | "suspenso";
export type AccountRole = "admin" | "pesquisador";

export type Account = {
  id: string;
  name: string;
  email: string;
  institution?: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  status: AccountStatus;
  role: AccountRole;
  statusChangedAt?: string;
  statusChangedBy?: string;
  passwordChangedAt?: string;
};
export type PublicAccount = Pick<Account, "id" | "name" | "email" | "institution" | "createdAt" | "status" | "role" | "statusChangedAt">;

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const authDir = () => path.join(dataRoot(), "auth");
const userFile = (id: string) => path.join(authDir(), "users", `${id}.json`);
const emailFile = (email: string) => path.join(authDir(), "emails", `${sha(email)}.json`);
const sessionFile = (hash: string) => path.join(authDir(), "sessions", `${hash}.json`);
const userSessionsFile = (id: string) => path.join(authDir(), "user-sessions", `${id}.json`);
const VALID_USER = /^u_[A-Za-z0-9_-]{8,64}$/;
const VALID_TOKEN = /^[A-Za-z0-9_-]{40,128}$/;

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
async function writeJson(file: string, data: unknown, exclusive = false) {
  await mkdir(path.dirname(file), { recursive: true });
  if (exclusive) {
    await writeFile(file, JSON.stringify(data), { flag: "wx", mode: 0o600 });
    return;
  }
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(tmp, file);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** E-mails de administração inicial (variável de ambiente; nenhum e-mail fica no código). */
export function bootstrapAdmins(): Set<string> {
  return new Set(
    (process.env.GENO_LAB_ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => normalizeEmail(e))
      .filter(Boolean),
  );
}

async function hashPassword(password: string, salt: Buffer) {
  return (await scrypt(password, salt, 64, SCRYPT)).toString("base64");
}

export function toPublic(a: Account): PublicAccount {
  return { id: a.id, name: a.name, email: a.email, institution: a.institution, createdAt: a.createdAt, status: a.status, role: a.role, statusChangedAt: a.statusChangedAt };
}

/** Contas antigas sem status/papel são tratadas como pendentes (menor privilégio). */
function withDefaults(a: Account): Account {
  return { ...a, status: a.status ?? "pendente", role: a.role ?? "pesquisador" };
}

/**
 * Cadastro. Não revela se o e-mail já existe: o resultado visível é sempre o mesmo e o custo
 * de cálculo do hash é executado nos dois casos.
 */
export async function registerAccount(input: { name: string; email: string; password: string; institution?: string }): Promise<{ created: boolean; account?: Account }> {
  const email = normalizeEmail(input.email);
  const salt = randomBytes(16);
  const passwordHash = await hashPassword(input.password, salt);
  if (await readJson(emailFile(email))) return { created: false };
  const admin = bootstrapAdmins().has(email);
  const now = new Date().toISOString();
  const account: Account = {
    id: "u_" + randomBytes(16).toString("base64url"),
    name: input.name.trim(),
    email,
    institution: input.institution?.trim() || undefined,
    passwordHash,
    salt: salt.toString("base64"),
    createdAt: now,
    status: admin ? "autorizado" : "pendente",
    role: admin ? "admin" : "pesquisador",
    statusChangedAt: admin ? now : undefined,
    statusChangedBy: admin ? "configuracao" : undefined,
  };
  try {
    await writeJson(emailFile(email), { userId: account.id }, true);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") return { created: false };
    throw e;
  }
  await writeJson(userFile(account.id), account);
  return { created: true, account };
}

export async function getAccount(userId: string): Promise<Account | null> {
  if (!VALID_USER.test(userId)) return null;
  const a = await readJson<Account>(userFile(userId));
  return a ? withDefaults(a) : null;
}

export async function saveAccount(a: Account) {
  await writeJson(userFile(a.id), a);
}

export async function findAccountByEmail(emailRaw: string): Promise<Account | null> {
  const ref = await readJson<{ userId: string }>(emailFile(normalizeEmail(emailRaw)));
  return ref ? getAccount(ref.userId) : null;
}

export async function listAccounts(): Promise<Account[]> {
  let files: string[] = [];
  try {
    files = await readdir(path.join(authDir(), "users"));
  } catch {
    return [];
  }
  const out: Account[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const a = await getAccount(f.slice(0, -5));
    if (a) out.push(a);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Confere credenciais em tempo aproximadamente constante (mesmo se o e-mail não existir). */
export async function verifyCredentials(emailRaw: string, password: string): Promise<Account | null> {
  const account = await findAccountByEmail(emailRaw);
  const salt = account ? Buffer.from(account.salt, "base64") : randomBytes(16);
  const candidate = Buffer.from(await hashPassword(password, salt), "base64");
  if (!account) return null;
  const stored = Buffer.from(account.passwordHash, "base64");
  return stored.length === candidate.length && timingSafeEqual(stored, candidate) ? account : null;
}

/** Promove a administração inicial configurada (útil quando a variável é definida depois do cadastro). */
export async function applyBootstrap(a: Account): Promise<Account> {
  if (!bootstrapAdmins().has(a.email) || (a.role === "admin" && a.status === "autorizado")) return a;
  const next = { ...a, role: "admin" as const, status: "autorizado" as const, statusChangedAt: new Date().toISOString(), statusChangedBy: "configuracao" };
  await saveAccount(next);
  return next;
}

export async function changePassword(userId: string, current: string, next: string): Promise<boolean> {
  const a = await getAccount(userId);
  if (!a) return false;
  const ok = await verifyCredentials(a.email, current);
  if (!ok) return false;
  const salt = randomBytes(16);
  await saveAccount({ ...a, passwordHash: await hashPassword(next, salt), salt: salt.toString("base64"), passwordChangedAt: new Date().toISOString() });
  return true;
}

export async function deleteAccountRecords(userId: string) {
  const a = await getAccount(userId);
  if (!a) return;
  await revokeAllSessions(userId);
  await rm(emailFile(a.email), { force: true });
  await rm(userFile(userId), { force: true });
  await rm(userSessionsFile(userId), { force: true });
}

// ---------------------------------------------------------------- sessões

type SessionRecord = { userId: string; createdAt: string; lastSeenAt: string; expiresAt: string };

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_ABSOLUTE_MS);
  const hash = sha(token);
  await writeJson(sessionFile(hash), { userId, createdAt: new Date(now).toISOString(), lastSeenAt: new Date(now).toISOString(), expiresAt: expiresAt.toISOString() } satisfies SessionRecord);
  const list = (await readJson<string[]>(userSessionsFile(userId))) ?? [];
  await writeJson(userSessionsFile(userId), [...list, hash]);
  return { token, expiresAt };
}

export async function getSession(token: string): Promise<{ userId: string; hash: string } | null> {
  if (!VALID_TOKEN.test(token)) return null;
  const hash = sha(token);
  const s = await readJson<SessionRecord>(sessionFile(hash));
  if (!s) return null;
  const now = Date.now();
  if (new Date(s.expiresAt).getTime() < now || new Date(s.lastSeenAt).getTime() + SESSION_IDLE_MS < now) {
    await rm(sessionFile(hash), { force: true });
    return null;
  }
  if (now - new Date(s.lastSeenAt).getTime() > TOUCH_EVERY_MS) await writeJson(sessionFile(hash), { ...s, lastSeenAt: new Date(now).toISOString() });
  return { userId: s.userId, hash };
}

export async function deleteSession(token: string) {
  if (!VALID_TOKEN.test(token)) return;
  await rm(sessionFile(sha(token)), { force: true });
}

export async function listSessions(userId: string): Promise<(SessionRecord & { hash: string })[]> {
  const list = (await readJson<string[]>(userSessionsFile(userId))) ?? [];
  const out: (SessionRecord & { hash: string })[] = [];
  const alive: string[] = [];
  for (const h of list) {
    const s = await readJson<SessionRecord>(sessionFile(h));
    if (!s || new Date(s.expiresAt).getTime() < Date.now()) continue;
    alive.push(h);
    out.push({ ...s, hash: h });
  }
  if (alive.length !== list.length) await writeJson(userSessionsFile(userId), alive);
  return out;
}

/** Encerra todas as sessões do usuário (opcionalmente mantendo a atual). */
export async function revokeAllSessions(userId: string, exceptHash?: string) {
  const list = (await readJson<string[]>(userSessionsFile(userId))) ?? [];
  for (const h of list) if (h !== exceptHash) await rm(sessionFile(h), { force: true });
  await writeJson(userSessionsFile(userId), exceptHash && list.includes(exceptHash) ? [exceptHash] : []);
}

// ---------------------------------------------------------------- limite de requisições (memória do processo)
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new AuthError(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 20000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
}
