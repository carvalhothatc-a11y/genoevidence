import "server-only";

/**
 * Busca de artigos no PubMed (NCBI E-utilities), serviço público sem chave.
 *
 * O que volta é o que foi ENCONTRADO: título, revista, ano, PMID e DOI quando existir. O conteúdo
 * do artigo NÃO é lido aqui — quem usa esta função precisa dizer isso ao apresentar o resultado.
 * O resumo (abstract) só vem quando pedido, e então fica marcado como "resumo lido".
 */

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const TEMPO_LIMITE = 12_000;

export type ArtigoPubmed = {
  pmid: string;
  titulo: string;
  revista: string;
  ano: string;
  doi?: string;
  url: string;
  /** Presente só quando `comResumo` foi pedido e o PubMed tinha o resumo. */
  resumo?: string;
  /** O que de fato foi obtido desta referência. */
  leitura: "encontrada" | "resumo";
};

export type BuscaPubmed = { termos: string; total: number; itens: ArtigoPubmed[] } | { termos: string; erro: string };

async function texto(url: string, sinal: AbortSignal): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: sinal, cache: "no-store" });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

/** Busca artigos. `termos` vai em inglês, como a base espera. */
export async function buscarPubmed(termos: string, limite = 5, comResumo = false): Promise<BuscaPubmed> {
  const q = termos.trim().slice(0, 300);
  if (!q) return { termos: q, erro: "Consulta vazia." };
  const sinal = AbortSignal.timeout(TEMPO_LIMITE);
  const n = Math.min(Math.max(limite, 1), 10);

  const bruto = await texto(`${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${n}&sort=relevance&tool=genolab&term=${encodeURIComponent(q)}`, sinal);
  if (!bruto) return { termos: q, erro: "O PubMed não respondeu agora." };
  let ids: string[] = [];
  let total = 0;
  try {
    const d = JSON.parse(bruto) as { esearchresult?: { idlist?: string[]; count?: string } };
    ids = (d.esearchresult?.idlist ?? []).filter((x) => /^\d{1,10}$/.test(x));
    total = Number(d.esearchresult?.count ?? 0) || 0;
  } catch {
    return { termos: q, erro: "O PubMed devolveu uma resposta inesperada." };
  }
  if (!ids.length) return { termos: q, total: 0, itens: [] };

  const resumoBruto = await texto(`${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&tool=genolab&id=${ids.join(",")}`, sinal);
  if (!resumoBruto) return { termos: q, erro: "O PubMed não devolveu os dados dos artigos." };
  let porId: Record<string, { title?: string; source?: string; fulljournalname?: string; pubdate?: string; articleids?: { idtype: string; value: string }[] }> = {};
  try {
    porId = ((JSON.parse(resumoBruto) as { result?: typeof porId }).result ?? {}) as typeof porId;
  } catch {
    return { termos: q, erro: "O PubMed devolveu uma resposta inesperada." };
  }

  const resumos = comResumo ? await abstracts(ids, sinal) : new Map<string, string>();

  const itens: ArtigoPubmed[] = [];
  for (const id of ids) {
    const r = porId[id];
    if (!r?.title) continue;
    const doi = r.articleids?.find((a) => a.idtype === "doi")?.value;
    const abs = resumos.get(id);
    itens.push({
      pmid: id,
      titulo: r.title.slice(0, 400),
      revista: (r.source ?? r.fulljournalname ?? "").slice(0, 160),
      ano: (r.pubdate ?? "").slice(0, 4),
      doi: doi && /^10\.\S{3,200}$/.test(doi) ? doi : undefined,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      ...(abs ? { resumo: abs.slice(0, 2500), leitura: "resumo" as const } : { leitura: "encontrada" as const }),
    });
  }
  return { termos: q, total, itens };
}

/** Resumos (abstracts) em texto puro, por PMID. */
async function abstracts(ids: string[], sinal: AbortSignal): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const t = await texto(`${EUTILS}/efetch.fcgi?db=pubmed&retmode=text&rettype=abstract&tool=genolab&id=${ids.join(",")}`, sinal);
  if (!t) return out;
  // O efetch devolve os resumos em sequência, separados por linha em branco dupla e numerados.
  const blocos = t.split(/\n\n(?=\d+\.\s)/);
  blocos.forEach((bloco, i) => {
    const pmid = /PMID:\s*(\d+)/.exec(bloco)?.[1] ?? ids[i];
    const corpo = bloco
      .split(/\n\n/)
      .filter((p) => p.length > 180 && !/^(Author information|Conflict of interest|DOI:|PMID:|PMCID:)/i.test(p.trim()))
      .join("\n\n")
      .trim();
    if (pmid && corpo) out.set(pmid, corpo);
  });
  return out;
}
