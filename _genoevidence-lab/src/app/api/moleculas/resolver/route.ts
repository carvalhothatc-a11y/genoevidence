import { ApiError, handle, json, requireUser } from "@/lib/api";
import { AuthError, rateLimit } from "@/lib/auth/store";
import { buscarComposto, buscarProteina, compostoPorCid, detalharEstrutura, estruturasDaProteina } from "@/lib/assistant/ferramentas/moleculas";

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

  /**
   * UMA caixa de busca só. Quem chega com pressa não deveria ter de escolher antes se o que
   * digitou é proteína, gene, composto ou código de estrutura — então descobrimos aqui.
   *
   * Quando o mesmo nome existe em mais de uma base, devolvemos TODOS e a interface pergunta.
   * Nunca escolhemos por conta própria entre uma proteína e um composto homônimos.
   */
  if (tipo === "auto") {
    // Código do PDB é inconfundível: 4 caracteres começando por dígito.
    if (/^[0-9][A-Za-z0-9]{3}$/.test(termo)) {
      const e = await detalharEstrutura(termo);
      if (e) return json({ encontrado: true, tipo: "auto", resultados: [{ tipo: "pdb", estrutura: e }] });
      return json({ encontrado: false, tipo: "auto", motivo: `A estrutura ${termo.toUpperCase()} não existe no RCSB PDB.` });
    }

    const [prot, comp] = await Promise.all([buscarProteina(termo), buscarComposto(termo)]);
    const resultados: unknown[] = [];
    if (prot.encontrado) {
      const proteina = prot.itens[0];
      const e = await estruturasDaProteina(proteina.acesso, 5);
      resultados.push({ tipo: "proteina", proteina, estruturas: e.encontrado ? e.itens : [], motivoEstruturas: e.encontrado ? undefined : e.motivo });
    }
    if (comp.encontrado) resultados.push({ tipo: "composto", composto: comp.itens[0] });
    if (!resultados.length) {
      // Serviço ocupado é diferente de não existir: repetimos o motivo real que a base deu.
      const detalhe = !prot.encontrado ? prot.motivo : "";
      return json({ encontrado: false, tipo: "auto", motivo: `Nada encontrado para “${termo}”. ${detalhe}`.trim() });
    }
    return json({ encontrado: true, tipo: "auto", resultados });
  }

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

  // Por CID: as referências da cena já trazem o identificador conferido no PubChem, então não
  // passamos pela busca por nome — o nome escrito no código nunca decide qual molécula aparece.
  if (tipo === "cid") {
    if (!/^\d{1,9}$/.test(termo)) throw new ApiError(400, "CID inválido.");
    const r = await compostoPorCid(Number(termo));
    if (!r.encontrado) return json({ encontrado: false, tipo, motivo: r.motivo });
    return json({ encontrado: true, tipo: "composto", composto: r.itens[0] });
  }

  if (tipo === "pdb") {
    const e = await detalharEstrutura(termo);
    if (!e) return json({ encontrado: false, tipo, motivo: `A estrutura ${termo.toUpperCase()} não existe no RCSB PDB.` });
    return json({ encontrado: true, tipo, estrutura: e });
  }

  throw new ApiError(400, "Tipo inválido (use auto, gene, proteina, composto, cid ou pdb).");
});
