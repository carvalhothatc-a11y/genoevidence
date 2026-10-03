import "server-only";
import { createHash } from "node:crypto";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutating(method: string) {
  return MUTATING.has(method.toUpperCase());
}

/** Origens aceitas: a do próprio app + LAB_ALLOWED_ORIGINS (lista separada por vírgulas). Sem CORS para terceiros. */
function allowedOrigins(req: Request): Set<string> {
  const set = new Set<string>();
  const host = req.headers.get("host");
  if (host) {
    set.add(`http://${host}`);
    set.add(`https://${host}`);
  }
  for (const o of (process.env.LAB_ALLOWED_ORIGINS ?? "").split(",")) if (o.trim()) set.add(o.trim().replace(/\/$/, ""));
  return set;
}

/**
 * Defesa contra CSRF (além do cookie SameSite=Lax): requisições que alteram dados precisam vir
 * da mesma origem. Sem Origin e sem Referer, a requisição é recusada.
 */
export function checkOrigin(req: Request): boolean {
  if (!isMutating(req.method)) return true;
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const allowed = allowedOrigins(req);
  const origin = req.headers.get("origin");
  if (origin) return allowed.has(origin.replace(/\/$/, ""));
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    return allowed.has(new URL(referer).origin);
  } catch {
    return false;
  }
}

/** Recusa corpos grandes ANTES de lê-los (evita esgotar memória com uploads). */
export function contentLengthOk(req: Request, maxBytes: number): "ok" | "ausente" | "grande" {
  const v = req.headers.get("content-length");
  if (!v) return "ausente";
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return "ausente";
  return n > maxBytes ? "grande" : "ok";
}

/**
 * Chave para limitar tentativas por cliente. Só confia em X-Forwarded-For quando
 * LAB_TRUST_PROXY=1 (o app está atrás de um proxy reverso que reescreve esse cabeçalho).
 */
export function clientKey(headers: Headers): string {
  if (process.env.LAB_TRUST_PROXY === "1") {
    const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip) return createHash("sha256").update(ip).digest("hex").slice(0, 16);
  }
  return "direto";
}

export function sessionKey(cookieHeader: string | null): string {
  const m = /(?:^|;\s*)lv_conta=([^;]+)/.exec(cookieHeader ?? "");
  return m ? createHash("sha256").update(m[1]).digest("hex").slice(0, 16) : "anon";
}
