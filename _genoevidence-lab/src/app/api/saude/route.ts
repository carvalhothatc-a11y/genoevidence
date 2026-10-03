/** Verificação de saúde para o servidor (Docker/Caddy). Não expõe dados nem configuração. */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
