import "server-only";
import { ZodError } from "zod";
import { getSessionUser, type SessionUser } from "@/lib/session";

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

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Sessão ausente. Recarregue a página para iniciar uma sessão local.");
  return user;
}

/** Envolve um handler: converte erros de validação e de acesso em respostas claras em português. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) return json({ error: err.message, details: err.details }, err.status);
      if (err instanceof ZodError) {
        return json(
          { error: "Dados inválidos.", details: err.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })) },
          400,
        );
      }
      console.error("[api] erro inesperado:", err);
      return json({ error: "Erro interno. Nenhuma alteração parcial foi gravada no projeto." }, 500);
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
