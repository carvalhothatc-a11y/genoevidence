import { ApiError, handle, json, readJsonBody, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { assistantStatus } from "@/lib/assistant/status";
import { GENINHO_LIMITS, GENINHO_SYSTEM, GeninhoRequest, comContexto, geninhoClient, geninhoErrorMessage } from "@/lib/assistant/geninho";
import { rodarAgente, type EventoAgente } from "@/lib/assistant/agente";
import { contentLengthOk } from "@/lib/security";

export const dynamic = "force-dynamic";

/** Estado real do Geninho (sem expor a chave). */
export const GET = handle(async () => {
  await requireUser();
  const s = assistantStatus();
  return json({ configured: s.configured, model: s.configured ? s.model : undefined });
});

/**
 * Pergunta ao Geninho, que roda como AGENTE com ferramentas. Resposta em fluxo NDJSON:
 *   {"t":"texto","v":"..."}                      trecho da resposta
 *   {"t":"ferramenta","nome","rotulo","estado"}  estado REAL de cada ferramenta
 *   {"t":"molecula","payload":{...}}             estrutura ou composto para a interface mostrar
 *   {"t":"fontes","itens":[...]}                 o que foi encontrado, lido ou só localizado
 *   {"t":"fim","motivo":"...","voltas":n}        conclusão
 *   {"t":"erro","v":"..."}                       falha (mensagem genérica)
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const len = contentLengthOk(req, GENINHO_LIMITS.maxBodyBytes);
  if (len === "grande") throw new ApiError(413, "Conversa grande demais. Comece uma nova conversa.");
  try {
    rateLimit(`geninho:${user.id}`, 20, 10 * 60_000);
    rateLimit(`geninho-dia:${user.id}`, 150, 24 * 3600_000);
  } catch (e) {
    if (e instanceof AuthError) {
      await audit("limite_excedido", { userId: user.id, action: "geninho" });
      throw new ApiError(429, "Muitas perguntas em pouco tempo. Aguarde alguns minutos.");
    }
    throw e;
  }
  const body = GeninhoRequest.parse(await readJsonBody(req, GENINHO_LIMITS.maxBodyBytes));
  const client = geninhoClient();
  if (!client) throw new ApiError(503, "O Geninho ainda não está configurado neste servidor.");
  const { model } = assistantStatus();

  await audit("geninho", { userId: user.id, action: "pergunta", detail: `${body.messages.length} mensagens${body.contexto ? " · com síntese do experimento" : ""}` });

  const encoder = new TextEncoder();
  const line = (o: unknown) => encoder.encode(JSON.stringify(o) + "\n");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let aberto = true;
      const emitir = (e: EventoAgente) => {
        if (!aberto) return;
        try {
          controller.enqueue(line(e));
        } catch {
          aberto = false; // o navegador fechou a conexão
        }
      };
      try {
        await rodarAgente({
          client,
          model,
          system: GENINHO_SYSTEM,
          messages: comContexto(body.messages, body.contexto),
          web: Boolean(body.web),
          signal: req.signal,
          emitir,
        });
      } catch (err) {
        if (!req.signal.aborted) {
          console.error("[geninho] falha:", err instanceof Error ? err.name : "desconhecido");
          controller.enqueue(line({ t: "erro", v: geninhoErrorMessage(err) }));
        }
      } finally {
        try {
          controller.close();
        } catch {
          // fluxo já encerrado pelo cliente
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
});
