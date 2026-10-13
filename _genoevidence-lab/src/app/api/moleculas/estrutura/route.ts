import { ApiError, handle, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

/**
 * Arquivo mmCIF de uma estrutura do RCSB PDB, servido pelo próprio GenoLab.
 *
 * O visualizador Mol* roda no navegador, e a política de segurança só autoriza buscar dados do
 * próprio servidor (connect-src 'self'). Além de permitir o carregamento, isso evita que o
 * navegador de quem usa fale direto com o RCSB — só o código da estrutura sai daqui.
 *
 * Nada é guardado: o arquivo é repassado no mesmo pedido.
 */
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  try {
    rateLimit(`mol-estrutura:${user.id}`, 30, 10 * 60_000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(429, "Muitas estruturas em pouco tempo. Aguarde alguns minutos.");
    throw e;
  }
  const pdb = (new URL(req.url).searchParams.get("pdb") ?? "").trim().toUpperCase();
  if (!/^[0-9][A-Z0-9]{3}$/.test(pdb)) throw new ApiError(400, "Identificador PDB inválido (4 caracteres, ex.: 1TUP).");

  let res: Response;
  try {
    res = await fetch(`https://files.rcsb.org/download/${pdb}.cif`, {
      signal: AbortSignal.timeout(25_000),
      headers: { "User-Agent": "GenoLab/0.1 (https://genoevidence.com; laboratorio virtual educativo)" },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(502, "O RCSB PDB não respondeu agora.");
  }
  if (res.status === 404) throw new ApiError(404, `A estrutura ${pdb} não foi encontrada no RCSB PDB.`);
  if (!res.ok) throw new ApiError(502, `O RCSB PDB respondeu com erro (${res.status}).`);

  return new Response(await res.arrayBuffer(), {
    headers: {
      "Content-Type": "chemical/x-mmcif; charset=utf-8",
      // Uma estrutura publicada não muda; um dia de cache no navegador basta.
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
