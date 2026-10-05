import { ApiError, handle, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

/**
 * Desenho 2D de um composto do PubChem, servido pelo próprio GenoLab.
 *
 * Por que não apontar direto para o PubChem: a política de segurança de conteúdo só autoriza
 * imagens do próprio servidor, e assim o navegador de quem usa não precisa falar com o PubChem
 * (o IP da pessoa não é exposto). Só o número do composto (CID) sai daqui.
 */
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  try {
    rateLimit(`mol-img:${user.id}`, 60, 10 * 60_000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(429, "Muitas imagens em pouco tempo. Aguarde alguns minutos.");
    throw e;
  }
  const cid = new URL(req.url).searchParams.get("cid") ?? "";
  if (!/^\d{1,9}$/.test(cid)) throw new ApiError(400, "Identificador de composto inválido.");

  let res: Response;
  try {
    res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "GenoLab/0.1 (https://genoevidence.com; laboratorio virtual educativo)" },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(502, "O PubChem não respondeu agora.");
  }
  if (res.status === 404) throw new ApiError(404, `O composto ${cid} não existe no PubChem.`);
  if (!res.ok) throw new ApiError(502, `O PubChem respondeu com erro (${res.status}).`);
  const tipo = res.headers.get("content-type") ?? "";
  if (!tipo.startsWith("image/png")) throw new ApiError(502, "O PubChem devolveu algo que não é uma imagem.");

  return new Response(await res.arrayBuffer(), {
    headers: {
      "Content-Type": "image/png",
      // A estrutura de um composto não muda; um dia de cache no navegador basta.
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
