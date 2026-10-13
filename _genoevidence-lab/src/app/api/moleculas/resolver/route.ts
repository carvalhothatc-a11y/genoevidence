import { ApiError, handle, json, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { buscarComposto, buscarProteina, detalharEstrutura, estruturasDaProteina } from "@/lib/assistant/ferramentas/moleculas";

export const dynamic = "force-dynamic";

/**
 * Resolve um termo citado numa etapa na molécula REAL correspondente.
 *
 * Só roda quando a pessoa clica: é uma saída de dados do GenoLab. O que sai daqui é apenas o termo
 * (nome do gene, da proteína ou do composto) — nunca o texto do experimento, arquivos ou dados.
 *
 * Gene, proteína e composto são tipos diferentes e nunca se substituem. Sem resultado, devolvemos
 * o motivo; nada é inventado nem trocado por algo parecido.
 */
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  try {
    rateLimit(`mol-resolver:${user.id}`, 30, 10 * 60_000);
  } catch (e) {
    if (e instanceof AuthError) throw new ApiError(429, "Muitas buscas em pouco tempo. Aguarde alguns minutos.");
    throw e;
  }
  const url = new URL(req.url);
  const termo = (url.searchParams.get("termo") ?? "").trim().slice(0, 120);
  const tipo = url.searchParams.get("tipo") ?? "";
  if (!termo) throw new ApiError(400, "Informe o termo a buscar.");
  if (!/^[\p{L}\p{N}\s().,'·-]+$/u.test(termo)) throw new ApiError(400, "Termo com caracteres não aceitos.");

  if (tipo === "composto") {
    const r = await buscarComposto(termo);
    if (!r.encontrado) return json({ encontrado: false, tipo, motivo: r.motivo });
    return json({ encontrado: true, tipo, composto: r.itens[0] });
  }

  if (tipo === "proteina" || tipo === "gene") {
    const organismo = url.searchParams.get("organismo");
    const taxon = organismo && /^\d{1,7}$/.test(organismo) ? Number(organismo) : undefined;
    const p = await buscarProteina(termo, taxon);
    if (!p.encontrado) return json({ encontrado: false, tipo, motivo: p.motivo });
    const proteina = p.itens[0];
    // Estruturas são da PROTEÍNA, e procuradas pelo ACESSO UniProt: busca por texto traria
    // estruturas que apenas mencionam o nome (ex.: ASPP2 aparece ao procurar "p53").
    const e = await estruturasDaProteina(proteina.acesso, 5);
    return json({
      encontrado: true,
      tipo,
      proteina,
      alternativas: p.itens.slice(1, 3),
      estruturas: e.encontrado ? e.itens : [],
      motivoEstruturas: e.encontrado ? undefined : e.motivo,
    });
  }

  if (tipo === "pdb") {
    const e = await detalharEstrutura(termo);
    if (!e) return json({ encontrado: false, tipo, motivo: `A estrutura ${termo.toUpperCase()} não existe no RCSB PDB.` });
    return json({ encontrado: true, tipo, estrutura: e });
  }

  throw new ApiError(400, "Tipo inválido (use gene, proteina, composto ou pdb).");
});
