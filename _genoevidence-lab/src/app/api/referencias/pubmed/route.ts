import { ApiError, handle, json, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { TERMOS_PUBMED, type Acao } from "@/lib/visual/roteiro";

export const dynamic = "force-dynamic";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

/**
 * Busca opcional no PubMed (NCBI E-utilities). Envia SOMENTE termos fixos em inglês da ação
 * escolhida (+ nome de gene validado), nunca o texto do pesquisador. Resultados são “encontrados”:
 * o conteúdo não é lido nem verificado pela plataforma.
 */
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  try {
    rateLimit(`pubmed:${user.id}`, 20, 10 * 60_000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(429, "Muitas buscas em pouco tempo. Aguarde alguns minutos.");
    throw e;
  }
  const url = new URL(req.url);
  const acao = url.searchParams.get("acao") ?? "";
  if (!(acao in TERMOS_PUBMED)) throw new ApiError(400, "Ação inválida.");
  const gene = url.searchParams.get("gene");
  const geneOk = gene && /^[A-Za-z0-9-]{2,15}$/.test(gene) ? gene : null;
  const termos = `${TERMOS_PUBMED[acao as Acao]}${geneOk ? ` ${geneOk}` : ""}`;

  const sinal = AbortSignal.timeout(9000);
  try {
    const busca = await fetch(`${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=5&sort=relevance&tool=genolab&term=${encodeURIComponent(termos)}`, { signal: sinal, cache: "no-store" });
    if (!busca.ok) throw new Error("esearch");
    const ids = ((await busca.json()) as { esearchresult?: { idlist?: string[] } }).esearchresult?.idlist?.filter((x) => /^\d{1,10}$/.test(x)) ?? [];
    if (!ids.length) return json({ termos, itens: [] });
    const resumo = await fetch(`${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&tool=genolab&id=${ids.join(",")}`, { signal: sinal, cache: "no-store" });
    if (!resumo.ok) throw new Error("esummary");
    const dados = (await resumo.json()) as { result?: Record<string, { title?: string; fulljournalname?: string; source?: string; pubdate?: string; articleids?: { idtype: string; value: string }[] }> };
    const itens = ids
      .map((id) => {
        const r = dados.result?.[id];
        if (!r?.title) return null;
        const doi = r.articleids?.find((a) => a.idtype === "doi")?.value;
        return { pmid: id, title: r.title.slice(0, 300), journal: (r.source ?? r.fulljournalname ?? "").slice(0, 120), year: (r.pubdate ?? "").slice(0, 4), doi: doi && /^10\.\S{3,200}$/.test(doi) ? doi : undefined };
      })
      .filter(Boolean);
    return json({ termos, itens });
  } catch {
    throw new ApiError(502, "O PubMed não respondeu agora. Tente novamente mais tarde.");
  }
});
