import { randomBytes } from "node:crypto";

/** Identificador curto, aleatório e seguro para URLs (base64url, 16 bytes = 128 bits). */
export function newId(prefix = ""): string {
  return prefix + randomBytes(16).toString("base64url").replace(/[^a-zA-Z0-9_-]/g, "");
}

export function nowIso(): string {
  return new Date().toISOString();
}
