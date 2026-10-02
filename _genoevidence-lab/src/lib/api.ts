import "server-only";
import { ZodError } from "zod";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { audit } from "@/lib/audit";
import { checkOrigin, isMutating, sessionKey } from "@/lib/security";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Exige sessão válida (qualquer estado). Usado só em rotas da própria conta. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Sessão ausente ou expirada. Entre novamente.");
  return user;
}

/** Exige pesquisador AUTORIZADO. Pendentes e suspensos recebem 403 sem acesso a dados. */
export async function requireUser(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.status !== "autorizado") throw new ApiError(403, "Seu acesso ao GenoLab ainda não foi autorizado.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    await audit("acesso_negado", { userId: user.id, action: "admin", result: "negado" });
    throw new ApiError(403, "Ação restrita à administração.");
  }
  return user;
}

/**
 * Envolve um handler de API:
 *  - recusa alterações vindas de outra origem (CSRF);
 *  - limita a taxa de alterações por sessão;
 *  - converte erros em respostas genéricas, sem detalhes internos.
 */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    const req = args[0] instanceof Request ? (args[0] as Request) : null;
    try {
      if (req && !checkOrigin(req)) {
        await audit("origem_recusada", { action: req.method, detail: new URL(req.url).pathname });
        throw new ApiError(403, "Requisição recusada: origem não autorizada.");
      }
      if (req && isMutating(req.method)) {
        try {
          rateLimit(`escrita:${sessionKey(req.headers.get("cookie"))}`, 120, 60_000);
        } catch (e) {
          if (e instanceof AuthError) {
            await audit("limite_excedido", { action: "escrita" });
            throw new ApiError(429, e.message);
          }
          throw e;
        }
      }
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) return json({ error: err.message, details: err.details }, err.status);
      if (err instanceof AuthError) return json({ error: err.message }, err.status);
      if (err instanceof ZodError) {
        return json(
          { error: "Dados inválidos.", details: err.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })) },
          400,
        );
      }
      // Registra apenas o tipo do erro; nenhum dado da requisição vai para o log.
      console.error("[api] erro inesperado:", err instanceof Error ? err.name : "desconhecido");
      return json({ error: "Erro interno. Nenhuma alteração parcial foi gravada." }, 500);
    }
  };
}

export async function readJsonBody(req: Request, maxBytes = 2_000_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "Conteúdo grande demais.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "JSON inválido.");
  }
}

export function notFound(what = "Projeto"): never {
  throw new ApiError(404, `${what} não encontrado (ou sem permissão de acesso).`);
}
