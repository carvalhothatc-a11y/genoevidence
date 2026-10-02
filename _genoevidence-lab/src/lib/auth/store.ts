import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { dataRoot } from "@/lib/repo";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SESSION_DAYS = 30;

export type Account = {
  id: string;
  name: string;
  email: string;
  institution?: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};
export type PublicAccount = Pick<Account, "id" | "name" | "email" | "institution" | "createdAt">;

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const authDir = () => path.join(dataRoot(), "auth");

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
    await writeFile(file, JSON.stringify(data), { flag: "wx" });
    return;
  }
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, file);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string, salt: Buffer) {
  return (await scrypt(password, salt, 64, SCRYPT)).toString("base64");
}

export function toPublic(a: Account): PublicAccount {
  return { id: a.id, name: a.name, email: a.email, institution: a.institution, createdAt: a.createdAt };
}

export async function createAccount(input: { name: string; email: string; password: string; institution?: string }): Promise<Account> {
  const email = normalizeEmail(input.email);
  const emailFile = path.join(authDir(), "emails", `${sha(email)}.json`);
  if (await readJson(emailFile)) throw new AuthError(409, "Já existe uma conta com este e-mail.");
  const salt = randomBytes(16);
  const account: Account = {
    id: "u_" + randomBytes(16).toString("base64url"),
    name: input.name.trim(),
    email,
    institution: input.institution?.trim() || undefined,
    passwordHash: await hashPassword(input.password, salt),
    salt: salt.toString("base64"),
    createdAt: new Date().toISOString(),
  };
  try {
    await writeJson(emailFile, { userId: account.id }, true);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new AuthError(409, "Já existe uma conta com este e-mail.");
    throw e;
  }
  await writeJson(path.join(authDir(), "users", `${account.id}.json`), account);
  return account;
}

export async function getAccount(userId: string): Promise<Account | null> {
  if (!/^u_[A-Za-z0-9_-]{8,64}$/.test(userId)) return null;
  return readJson<Account>(path.join(authDir(), "users", `${userId}.json`));
}

/** Confere credenciais em tempo aproximadamente constante (mesmo se o e-mail não existir). */
export async function verifyCredentials(emailRaw: string, password: string): Promise<Account | null> {
  const email = normalizeEmail(emailRaw);
  const ref = await readJson<{ userId: string }>(path.join(authDir(), "emails", `${sha(email)}.json`));
  const account = ref ? await getAccount(ref.userId) : null;
  const salt = account ? Buffer.from(account.salt, "base64") : randomBytes(16);
  const candidate = Buffer.from(await hashPassword(password, salt), "base64");
  if (!account) return null;
  const stored = Buffer.from(account.passwordHash, "base64");
  return stored.length === candidate.length && timingSafeEqual(stored, candidate) ? account : null;
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await writeJson(path.join(authDir(), "sessions", `${sha(token)}.json`), { userId, createdAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() });
  return { token, expiresAt };
}

export async function getSession(token: string): Promise<{ userId: string } | null> {
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(token)) return null;
  const file = path.join(authDir(), "sessions", `${sha(token)}.json`);
  const s = await readJson<{ userId: string; expiresAt: string }>(file);
  if (!s) return null;
  if (new Date(s.expiresAt).getTime() < Date.now()) {
    await rm(file, { force: true });
    return null;
  }
  return { userId: s.userId };
}

export async function deleteSession(token: string) {
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(token)) return;
  await rm(path.join(authDir(), "sessions", `${sha(token)}.json`), { force: true });
}

// ---------------------------------------------------------------- limite de tentativas (memória do processo)
const attempts = new Map<string, number[]>();
export function rateLimit(key: string, max = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const list = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new AuthError(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  list.push(now);
  attempts.set(key, list);
}
