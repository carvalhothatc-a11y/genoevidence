import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { buscarPubmed } from "./ferramentas/pubmed";
import { buscarComposto, buscarEstruturas, buscarProteina, detalharEstrutura } from "./ferramentas/moleculas";

/**
 * Ciclo de execução do Geninho: compreender → escolher ferramentas → executar → conferir os
 * retornos → apresentar. Cada passo emite um evento com o estado REAL — nenhum "pesquisa
 * concluída" é enviado sem o retorno da ferramenta.
 *
 * Limites para o ciclo não se estender sem fim: número de voltas, tempo de parede e teto de
 * chamadas por ferramenta. Ao bater um limite, o agente é avisado e encerra com o que tem.
 */
export const LIMITES_AGENTE = {
  voltas: 8,
  /** Tempo total do ciclo, em milissegundos. */
  tempoMs: 120_000,
  /** Teto por ferramenta, numa mesma pergunta. */
  porFerramenta: 4,
  /** Buscas na web por pergunta (cada uma é cobrada pela Anthropic). */
  buscasWeb: 5,
  maxTokens: 12_000,
} as const;

export type EventoAgente =
  | { t: "texto"; v: string }
  | { t: "pensando" }
  | { t: "ferramenta"; nome: string; rotulo: string; estado: "iniciou" | "ok" | "vazio" | "falhou"; detalhe?: string }
  | { t: "molecula"; payload: MoleculaExibida }
  | { t: "fontes"; itens: FonteCitada[] }
  | { t: "fim"; motivo: string; voltas: number }
  | { t: "erro"; v: string };

/** Molécula pronta para a interface mostrar (Mol* para estrutura, imagem para composto). */
export type MoleculaExibida =
  | { tipo: "estrutura"; pdbId: string; titulo: string; metodo?: string; resolucao?: number; url: string; arquivo: string }
  | { tipo: "composto"; cid: number; nome: string; formula?: string; massa?: string; imagem2d: string; sdf3d: string; url: string }
  | { tipo: "proteina"; acesso: string; nome: string; genes: string[]; organismo: string; url: string };

export type FonteCitada = { titulo: string; url: string; origem: string; leitura: "encontrada" | "resumo" | "lida" };

type Ctx = {
  usos: Record<string, number>;
  moleculas: MoleculaExibida[];
  fontes: FonteCitada[];
  emitir: (e: EventoAgente) => void;
};

// ---------------------------------------------------------------- ferramentas do aplicativo

const ROTULOS: Record<string, string> = {
  buscar_artigos: "Buscando artigos no PubMed",
  identificar_proteina: "Identificando a proteína no UniProt",
  buscar_estrutura: "Buscando a estrutura no RCSB PDB",
  identificar_composto: "Identificando o composto no PubChem",
  web_search: "Pesquisando na internet",
  web_fetch: "Lendo a página",
};

export const FERRAMENTAS_APP = [
  {
    name: "buscar_artigos",
    description:
      "Busca artigos científicos no PubMed. Devolve título, revista, ano, PMID e DOI do que foi ENCONTRADO — o conteúdo não é lido, a menos que com_resumo seja verdadeiro, e então só o resumo (abstract). Use termos em inglês. Nunca invente artigos: só cite o que esta ferramenta devolver.",
    input_schema: {
      type: "object" as const,
      properties: {
        termos: { type: "string", description: "Consulta em inglês, como se digitasse no PubMed." },
        limite: { type: "integer", description: "Quantos artigos (1 a 10). Padrão 5." },
        com_resumo: { type: "boolean", description: "Trazer também o resumo (abstract) de cada artigo." },
      },
      required: ["termos"],
    },
  },
  {
    name: "identificar_proteina",
    description:
      "Procura no UniProt a proteína revisada de um gene ou nome de proteína, e devolve o acesso, o nome oficial, os genes e o organismo. Use isto ANTES de buscar estrutura quando a pessoa citar um gene: gene e proteína são objetos diferentes.",
    input_schema: {
      type: "object" as const,
      properties: {
        nome: { type: "string", description: "Símbolo do gene (ex.: TP53) ou nome da proteína." },
        organismo_id: { type: "integer", description: "Taxon NCBI para limitar a espécie (9606 = humano). Omita se a pessoa não disse a espécie." },
      },
      required: ["nome"],
    },
  },
  {
    name: "buscar_estrutura",
    description:
      "Busca estruturas tridimensionais no RCSB PDB por texto livre, ou traz os metadados de um código PDB exato. Serve para proteínas e ácidos nucleicos. A estrutura devolvida é mostrada no visualizador Mol*. Nunca troque a molécula pedida por outra parecida sem dizer claramente que é outra.",
    input_schema: {
      type: "object" as const,
      properties: {
        texto: { type: "string", description: "Nome da proteína, do complexo ou do gene." },
        pdb_id: { type: "string", description: "Código PDB exato de 4 caracteres (ex.: 1TUP), quando já souber." },
        limite: { type: "integer", description: "Quantas estruturas (1 a 10). Padrão 5." },
      },
    },
  },
  {
    name: "identificar_composto",
    description:
      "Procura um composto químico no PubChem pelo nome e devolve CID, fórmula, massa, SMILES, o desenho 2D e, quando existir, as coordenadas 3D. Use para reagentes e moléculas pequenas (ex.: tiossulfato de sódio, etídio).",
    input_schema: {
      type: "object" as const,
      properties: { nome: { type: "string", description: "Nome do composto, em português ou inglês." } },
      required: ["nome"],
    },
  },
];

/** Executa uma ferramenta do aplicativo e devolve o texto que volta ao modelo. */
async function executar(nome: string, entrada: Record<string, unknown>, ctx: Ctx): Promise<string> {
  const usos = (ctx.usos[nome] = (ctx.usos[nome] ?? 0) + 1);
  const rotulo = ROTULOS[nome] ?? nome;
  if (usos > LIMITES_AGENTE.porFerramenta) {
    ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "falhou", detalhe: "limite de usos" });
    return `Limite de ${LIMITES_AGENTE.porFerramenta} usos desta ferramenta atingido nesta pergunta. Responda com o que já tem e diga o que ficou sem conferir.`;
  }
  ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "iniciou" });

  try {
    if (nome === "buscar_artigos") {
      const r = await buscarPubmed(String(entrada.termos ?? ""), Number(entrada.limite ?? 5), Boolean(entrada.com_resumo));
      if ("erro" in r) {
        ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "falhou", detalhe: r.erro });
        return `Falha: ${r.erro}`;
      }
      if (!r.itens.length) {
        ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "vazio", detalhe: `nenhum artigo para “${r.termos}”` });
        return `Nenhum artigo encontrado para "${r.termos}". Não invente referências: diga que a busca não achou nada e sugira outros termos.`;
      }
      for (const a of r.itens) ctx.fontes.push({ titulo: a.titulo, url: a.url, origem: `PubMed · ${a.revista} ${a.ano}`.trim(), leitura: a.leitura });
      ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "ok", detalhe: `${r.itens.length} de ${r.total} artigos` });
      return JSON.stringify({ total: r.total, artigos: r.itens });
    }

    if (nome === "identificar_proteina") {
      const r = await buscarProteina(String(entrada.nome ?? ""), entrada.organismo_id ? Number(entrada.organismo_id) : undefined);
      if (!r.encontrado) {
        ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "vazio", detalhe: r.motivo });
        return `Não encontrado: ${r.motivo}`;
      }
      for (const p of r.itens) ctx.fontes.push({ titulo: `${p.nome} (${p.acesso})`, url: p.url, origem: "UniProt", leitura: "lida" });
      const principal = r.itens[0];
      ctx.moleculas.push(principal);
      ctx.emitir({ t: "molecula", payload: principal });
      ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "ok", detalhe: `${principal.acesso} · ${principal.organismo}` });
      return JSON.stringify(r.itens);
    }

    if (nome === "buscar_estrutura") {
      const pdbId = typeof entrada.pdb_id === "string" ? entrada.pdb_id : "";
      if (pdbId) {
        const e = await detalharEstrutura(pdbId);
        if (!e) {
          ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "vazio", detalhe: `${pdbId} não existe no RCSB` });
          return `O código PDB "${pdbId}" não foi encontrado. Não substitua por outro sem avisar.`;
        }
        ctx.moleculas.push({ tipo: "estrutura", ...e });
        ctx.fontes.push({ titulo: `${e.pdbId} — ${e.titulo}`, url: e.url, origem: "RCSB PDB", leitura: "lida" });
        ctx.emitir({ t: "molecula", payload: { tipo: "estrutura", ...e } });
        ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "ok", detalhe: `${e.pdbId} · ${e.metodo ?? "método não informado"}` });
        return JSON.stringify(e);
      }
      const r = await buscarEstruturas(String(entrada.texto ?? ""), Number(entrada.limite ?? 5));
      if (!r.encontrado) {
        ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "vazio", detalhe: r.motivo });
        return `Não encontrado: ${r.motivo}`;
      }
      // Lista de candidatos: nenhum cartão é fixado aqui. O cartão só aparece quando o agente
      // escolher um código e pedir buscar_estrutura com pdb_id — assim a interface nunca mostra
      // uma estrutura que a resposta vai descartar.
      ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "ok", detalhe: `${r.itens.length} candidata(s): ${r.itens.map((e) => e.pdbId).join(", ")}` });
      return JSON.stringify({
        candidatas: r.itens,
        aviso: "Estes são candidatos de uma busca por texto e podem não ser a molécula pedida. Confira o título de cada um e chame buscar_estrutura de novo com pdb_id para a que escolher. Se nenhuma servir, diga isso.",
      });
    }

    if (nome === "identificar_composto") {
      const r = await buscarComposto(String(entrada.nome ?? ""));
      if (!r.encontrado) {
        ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "vazio", detalhe: r.motivo });
        return `Não encontrado: ${r.motivo}`;
      }
      const c = r.itens[0];
      ctx.moleculas.push(c);
      ctx.fontes.push({ titulo: `${c.nome} (CID ${c.cid})`, url: c.url, origem: "PubChem", leitura: "lida" });
      ctx.emitir({ t: "molecula", payload: c });
      ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "ok", detalhe: `CID ${c.cid}${c.formula ? ` · ${c.formula}` : ""}` });
      return JSON.stringify(c);
    }

    ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "falhou", detalhe: "ferramenta desconhecida" });
    return `Ferramenta "${nome}" não existe.`;
  } catch (e) {
    const detalhe = e instanceof Error ? e.name : "falha";
    ctx.emitir({ t: "ferramenta", nome, rotulo, estado: "falhou", detalhe });
    return `A ferramenta falhou (${detalhe}). Diga que não foi possível conferir isso agora.`;
  }
}

// ---------------------------------------------------------------- ciclo

export type OpcoesAgente = {
  client: Anthropic;
  model: string;
  system: string;
  messages: Anthropic.MessageParam[];
  /** Busca na internet ligada para esta pergunta. */
  web: boolean;
  signal: AbortSignal;
  emitir: (e: EventoAgente) => void;
};

/** Roda o ciclo até a resposta final, emitindo os estados reais de cada ferramenta. */
export async function rodarAgente(o: OpcoesAgente): Promise<void> {
  const ctx: Ctx = { usos: {}, moleculas: [], fontes: [], emitir: o.emitir };
  const messages: Anthropic.MessageParam[] = [...o.messages];
  const inicio = Date.now();

  const ferramentas = [
    ...FERRAMENTAS_APP,
    ...(o.web
      ? [
          { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: LIMITES_AGENTE.buscasWeb },
          { type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: LIMITES_AGENTE.buscasWeb },
        ]
      : []),
  ];

  let voltas = 0;
  let motivo = "end_turn";
  let houveTexto = false;

  while (voltas < LIMITES_AGENTE.voltas) {
    voltas++;
    if (Date.now() - inicio > LIMITES_AGENTE.tempoMs) {
      motivo = "tempo_esgotado";
      o.emitir({ t: "texto", v: "\n\n_(Parei aqui: a investigação passou do tempo limite. Posso continuar se você pedir.)_" });
      break;
    }

    const s = o.client.messages.stream(
      {
        model: o.model,
        max_tokens: LIMITES_AGENTE.maxTokens,
        thinking: { type: "adaptive" },
        system: o.system,
        tools: ferramentas,
        messages,
      },
      { signal: o.signal },
    );

    // Ferramentas do servidor: guardamos o id de cada chamada para casar com o resultado.
    const pendentes = new Map<string, string>();
    let primeiroTextoDaVolta = true;
    for await (const ev of s) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        // Entre um turno e outro o texto não pode colar: senão "...síntese." + "## Título" vira
        // "síntese.## Título" e o markdown não é reconhecido.
        if (primeiroTextoDaVolta && houveTexto) o.emitir({ t: "texto", v: "\n\n" });
        primeiroTextoDaVolta = false;
        houveTexto = true;
        o.emitir({ t: "texto", v: ev.delta.text });
      }
      if (ev.type === "content_block_start" && ev.content_block.type === "server_tool_use") {
        const nome = ev.content_block.name;
        // O filtro de resultados (code_execution) roda por dentro da busca: não é um passo da pessoa.
        if (nome === "code_execution") continue;
        pendentes.set(ev.content_block.id, nome);
        o.emitir({ t: "ferramenta", nome, rotulo: ROTULOS[nome] ?? nome, estado: "iniciou" });
      }
    }
    const resposta = await s.finalMessage();
    messages.push({ role: "assistant", content: resposta.content });

    // resultados das ferramentas do servidor (busca e leitura na web) vêm já resolvidos
    for (const bloco of resposta.content) {
      if (bloco.type === "web_search_tool_result") {
        pendentes.delete(bloco.tool_use_id);
        const r = bloco.content;
        if (Array.isArray(r)) {
          for (const item of r.slice(0, 8)) if ("url" in item && "title" in item) ctx.fontes.push({ titulo: String(item.title).slice(0, 300), url: String(item.url), origem: "Internet", leitura: "encontrada" });
          o.emitir({ t: "ferramenta", nome: "web_search", rotulo: ROTULOS.web_search, estado: r.length ? "ok" : "vazio", detalhe: `${r.length} resultado(s)` });
        } else {
          o.emitir({ t: "ferramenta", nome: "web_search", rotulo: ROTULOS.web_search, estado: "falhou", detalhe: "erro" in r ? String(r.error_code) : "a busca falhou" });
        }
      }
      if (bloco.type === "web_fetch_tool_result") {
        pendentes.delete(bloco.tool_use_id);
        const ok = "content" in bloco && bloco.content && !("error_code" in bloco.content);
        const motivo = !ok && bloco.content && "error_code" in bloco.content ? String(bloco.content.error_code) : undefined;
        o.emitir({ t: "ferramenta", nome: "web_fetch", rotulo: ROTULOS.web_fetch, estado: ok ? "ok" : "falhou", detalhe: ok ? undefined : (motivo ?? "a página não pôde ser lida") });
        if (ok && "url" in bloco.content) ctx.fontes.push({ titulo: String(bloco.content.url).slice(0, 300), url: String(bloco.content.url), origem: "Internet", leitura: "lida" });
      }
      if (bloco.type === "code_execution_tool_result") pendentes.delete(bloco.tool_use_id);
    }
    // O que começou e não voltou resultado nesta volta: não dizemos que deu certo.
    for (const [, nome] of pendentes) o.emitir({ t: "ferramenta", nome, rotulo: ROTULOS[nome] ?? nome, estado: "falhou", detalhe: "sem resultado" });

    if (resposta.stop_reason === "pause_turn") continue; // ferramenta do servidor ainda trabalhando
    const pedidos = resposta.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!pedidos.length) {
      motivo = resposta.stop_reason ?? "end_turn";
      break;
    }

    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const p of pedidos) {
      const saida = await executar(p.name, (p.input ?? {}) as Record<string, unknown>, ctx);
      resultados.push({ type: "tool_result", tool_use_id: p.id, content: saida.slice(0, 20_000) });
    }
    messages.push({ role: "user", content: resultados });

    if (voltas === LIMITES_AGENTE.voltas) {
      motivo = "limite_de_voltas";
      o.emitir({ t: "texto", v: "\n\n_(Parei aqui: atingi o limite de passos desta investigação.)_" });
    }
  }

  if (ctx.fontes.length) o.emitir({ t: "fontes", itens: dedup(ctx.fontes).slice(0, 20) });
  o.emitir({ t: "fim", motivo, voltas });
}

function dedup(fs: FonteCitada[]): FonteCitada[] {
  const vistas = new Set<string>();
  return fs.filter((f) => (vistas.has(f.url) ? false : (vistas.add(f.url), true)));
}
