import "server-only";
import { geninhoClient, geninhoErrorMessage } from "@/lib/assistant/geninho";
import { assistantStatus } from "@/lib/assistant/status";
import { z } from "@/lib/zod";
import { equilibrarPorDocumento, indexar, procurar, type Achado } from "./busca";
import { enderecoDoTrecho, type Trecho } from "./trechos";
import { conferirTodas, MOTIVO } from "./verificar";

/**
 * Resposta presa aos documentos da pessoa.
 *
 * O desenho inteiro parte de uma ideia: **a resposta é um ponteiro para os trechos, não um
 * substituto para lê-los.** O modelo só enxerga os trechos recuperados, precisa indicar de qual
 * trecho veio cada afirmação, e copiar a frase que a sustenta. Depois disso, `verificar.ts` confere
 * se a frase está mesmo lá — e o que não passa não vira citação.
 *
 * O risco que isso ataca não é inventar um artigo: é citar algo que *quase* existe — com uma
 * ressalva removida ou duas frases costuradas. Quem lê não perceberia.
 */

export const LIMITES = { trechos: 8, porDocumento: 3, maxTokens: 2000, pergunta: 500 } as const;

const Saida = z.object({
  resposta: z.string(),
  /** Vazio quando os trechos não respondem — é uma saída legítima. */
  citacoes: z.array(z.object({ trechoId: z.string(), citacao: z.string() })).default([]),
  /** O modelo diz se os trechos bastaram. A interface mostra isso. */
  suficiente: z.boolean(),
});

const INSTRUCOES = `Você responde SOMENTE com base nos trechos numerados que receber dos documentos da pessoa.

Regras, em ordem de importância:

1. Nunca use conhecimento próprio. Se os trechos não respondem, diga isso e marque suficiente=false. Não complete a lacuna com o que você sabe.
2. Toda afirmação da resposta precisa vir de um trecho, e você precisa copiar a frase LITERAL que a sustenta, sem reescrever, resumir ou juntar pedaços de frases diferentes. A citação é conferida contra o documento depois: reescrita é recusada.
3. Não junte informações de documentos diferentes numa afirmação só. Se dois documentos dizem coisas diferentes, apresente as duas e diga que divergem.
4. Preserve ressalvas. Se o trecho diz "em geral", "pode", "em nossas condições", isso faz parte do que foi dito e não pode sumir da sua resposta.
5. Escreva em português claro, direto, sem floreio. Não repita a pergunta.

Responda em JSON, sem cercas de código:
{"resposta": "...", "citacoes": [{"trechoId": "<id exato do trecho>", "citacao": "<frase copiada literalmente>"}], "suficiente": true|false}`;

export type CitacaoMostrada = { trechoId: string; citacao: string; arquivo: string; pagina: number | null; endereco: string; textoDoTrecho: string };

export type RespostaFontes = {
  resposta: string;
  suficiente: boolean;
  citacoes: CitacaoMostrada[];
  /** Citações que NÃO bateram com o documento, com o motivo. Aparecem como aviso, nunca como fonte. */
  recusadas: { citacao: string; motivo: string }[];
  /** Os trechos que foram consultados, para a pessoa poder ler além do citado. */
  consultados: { trechoId: string; endereco: string; texto: string; casaram: string[] }[];
};

export type FalhaFontes = { erro: string };

export async function responderComFontes(pergunta: string, trechos: Trecho[]): Promise<RespostaFontes | FalhaFontes> {
  const client = geninhoClient();
  if (!client) return { erro: assistantStatus().reason ?? "O assistente não está configurado neste servidor." };
  if (!trechos.length) return { erro: "Este projeto ainda não tem documento com texto para consultar." };

  const achados: Achado[] = equilibrarPorDocumento(procurar(indexar(trechos), pergunta, LIMITES.trechos * 3), LIMITES.porDocumento).slice(0, LIMITES.trechos);

  // Nenhuma palavra da pergunta aparece em lugar nenhum: isso é uma resposta, não um erro.
  if (!achados.length)
    return {
      resposta: "Nenhum trecho dos seus documentos fala sobre isso. Não vou responder por fora deles.",
      suficiente: false,
      citacoes: [],
      recusadas: [],
      consultados: [],
    };

  const contexto = achados
    .map((a) => `[${a.trecho.id}] (${enderecoDoTrecho(a.trecho)})\n${a.trecho.texto}`)
    .join("\n\n---\n\n");

  let bruto = "";
  try {
    const r = await client.messages.create({
      model: assistantStatus().model,
      max_tokens: LIMITES.maxTokens,
      system: INSTRUCOES,
      messages: [{ role: "user", content: `TRECHOS DOS DOCUMENTOS:\n\n${contexto}\n\n---\n\nPERGUNTA: ${pergunta.slice(0, LIMITES.pergunta)}` }],
    });
    bruto = r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  } catch (e) {
    return { erro: geninhoErrorMessage(e) };
  }

  const json = bruto.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let objeto: unknown;
  try {
    objeto = JSON.parse(json || "{}");
  } catch {
    return { erro: "A resposta veio num formato que não consegui ler. Tente perguntar de novo." };
  }
  const parsed = Saida.safeParse(objeto);
  if (!parsed.success) return { erro: "A resposta veio num formato que não consegui ler. Tente perguntar de novo." };

  const { validas, recusadas } = conferirTodas(
    achados.map((a) => a.trecho),
    parsed.data.citacoes,
  );

  return {
    resposta: parsed.data.resposta,
    suficiente: parsed.data.suficiente && validas.length > 0,
    citacoes: validas.map((v) => ({
      trechoId: v.trecho.id,
      citacao: v.citacao,
      arquivo: v.trecho.arquivo,
      pagina: v.trecho.pagina,
      endereco: enderecoDoTrecho(v.trecho),
      textoDoTrecho: v.trecho.texto,
    })),
    recusadas: recusadas.map((r) => ({ citacao: r.citacao, motivo: MOTIVO[r.motivo] })),
    consultados: achados.map((a) => ({ trechoId: a.trecho.id, endereco: enderecoDoTrecho(a.trecho), texto: a.trecho.texto, casaram: a.casaram })),
  };
}
