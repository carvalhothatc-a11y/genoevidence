import "server-only";
import { geninhoClient, geninhoErrorMessage } from "@/lib/assistant/geninho";
import { assistantStatus } from "@/lib/assistant/status";
import { z } from "@/lib/zod";
import { gerarDocx, type Bloco } from "@/lib/docx/gerar";
import { diaPorExtenso, type Registro } from "./tipos";

/**
 * O registro do dia virando documento de relatório em Word.
 *
 * A escolha foi da responsável: reescrever em linguagem formal. O risco disso é conhecido e é por
 * isso que existem as travas abaixo — ao formalizar, um modelo tende a endurecer dúvida em
 * afirmação ("provavelmente contaminou" vira "houve contaminação") e a preencher o que falta.
 *
 * Três travas:
 *
 * 1. **O original vai junto**, como anexo no fim do documento. Nada do que foi ditado se perde, e
 *    dá para conferir se a reescrita mudou o sentido.
 * 2. **O documento diz, em destaque, que foi reescrito** — ninguém o confunde com o registro.
 * 3. **Nada de número novo.** Se um valor aparece no texto formal e não estava no original, a
 *    reescrita é recusada e o documento sai como cópia fiel, avisando.
 */

export const LIMITES_RELATORIO = { maxTokens: 2000, maxTexto: 12_000 } as const;

const Saida = z.object({
  titulo: z.string().max(140),
  secoes: z
    .array(z.object({ titulo: z.string().max(80), paragrafos: z.array(z.string()).max(12) }))
    .max(8),
});

const INSTRUCOES = `Você transforma a anotação de bancada de um pesquisador em texto de relatório, em português do Brasil.

O que fazer:
- Organizar em seções curtas (ex.: Objetivo, Procedimento, Observações, Pendências) — só as que o texto sustentar.
- Escrever em linguagem de relatório: impessoal, frases completas, sem gíria e sem marcas de fala ("é", "então", "tipo assim", "aí").
- Corrigir pontuação e concordância.

O que NÃO fazer, nunca:
- Não acrescente nenhum dado que não esteja no texto: nenhum número, temperatura, volume, tempo, concentração ou nome que a pessoa não tenha escrito.
- Não transforme dúvida em certeza. "Provavelmente contaminou" pode virar "possivelmente houve contaminação", mas NUNCA "houve contaminação". Se o texto hesita, o relatório hesita.
- Não conclua nada que a pessoa não concluiu. Não acrescente interpretação, causa ou recomendação.
- Não invente o que foi feito antes ou depois. Se o registro é parcial, o relatório é parcial.

Responda em JSON, sem cercas de código:
{"titulo": "...", "secoes": [{"titulo": "...", "paragrafos": ["...", "..."]}]}`;

/** Números citados num texto, normalizados (vírgula e ponto são o mesmo separador aqui). */
function numeros(texto: string): Set<string> {
  return new Set((texto.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", ".")));
}

/**
 * Números que aparecem na reescrita e NÃO estavam no original.
 *
 * É a trava mais importante do recurso: ao formalizar, um modelo pode completar o que falta com um
 * valor plausível — e num registro de laboratório um número inventado é pior que texto feio.
 */
export function numerosInventados(original: string, reescrito: string): string[] {
  const doOriginal = numeros(original);
  return [...numeros(reescrito)].filter((n) => !doOriginal.has(n));
}

export type Reescrita =
  | { estado: "reescrito"; titulo: string; secoes: { titulo: string; paragrafos: string[] }[] }
  | { estado: "fiel"; motivo: string };

export async function reescreverComoRelatorio(registro: Registro): Promise<Reescrita> {
  const client = geninhoClient();
  if (!client) return { estado: "fiel", motivo: assistantStatus().reason ?? "O assistente não está configurado neste servidor." };
  const texto = registro.texto.slice(0, LIMITES_RELATORIO.maxTexto);
  if (texto.trim().length < 40) return { estado: "fiel", motivo: "O registro é curto demais para virar relatório; foi mantido como está." };

  let bruto = "";
  try {
    const r = await client.messages.create({
      model: assistantStatus().model,
      max_tokens: LIMITES_RELATORIO.maxTokens,
      system: INSTRUCOES,
      messages: [{ role: "user", content: `Dia: ${diaPorExtenso(registro.dia)}\n\nANOTAÇÃO:\n${texto}` }],
    });
    bruto = r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  } catch (e) {
    return { estado: "fiel", motivo: geninhoErrorMessage(e) };
  }

  let objeto: unknown;
  try {
    objeto = JSON.parse(bruto.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "") || "{}");
  } catch {
    return { estado: "fiel", motivo: "A reescrita veio num formato ilegível; o registro foi mantido como está." };
  }
  const p = Saida.safeParse(objeto);
  if (!p.success || !p.data.secoes.length) return { estado: "fiel", motivo: "A reescrita não veio utilizável; o registro foi mantido como está." };

  // Trava: nenhum número que não estivesse no original.
  const inventados = numerosInventados(texto, p.data.secoes.flatMap((s) => s.paragrafos).join(" "));
  if (inventados.length)
    return { estado: "fiel", motivo: `A reescrita trouxe número que não estava no seu texto (${inventados.slice(0, 3).join(", ")}); por segurança o registro foi mantido como está.` };

  return { estado: "reescrito", titulo: p.data.titulo, secoes: p.data.secoes };
}

/** Monta o .docx do dia, com o original sempre no fim. */
export function documentoDoDia(registro: Registro, reescrita: Reescrita, opcoes: { autor?: string; projeto?: string } = {}): Uint8Array {
  const blocos: Bloco[] = [];
  const dia = diaPorExtenso(registro.dia);
  const titulo = reescrita.estado === "reescrito" ? reescrita.titulo : "Registro de laboratório";

  blocos.push({ tipo: "titulo", texto: titulo });
  blocos.push({ tipo: "subtitulo", texto: [dia, opcoes.projeto ? `Projeto: ${opcoes.projeto}` : "", opcoes.autor ?? ""].filter(Boolean).join(" · ") });

  if (reescrita.estado === "reescrito") {
    blocos.push({
      tipo: "aviso",
      texto:
        "Este texto foi reescrito automaticamente a partir da sua anotação, para linguagem de relatório. " +
        "A anotação original está no fim do documento, sem alteração — confira se a reescrita manteve o que você quis dizer.",
    });
    for (const s of reescrita.secoes) {
      blocos.push({ tipo: "secao", texto: s.titulo });
      for (const par of s.paragrafos) blocos.push({ tipo: "paragrafo", texto: par });
    }
  } else {
    blocos.push({ tipo: "aviso", texto: `Texto mantido exatamente como você escreveu. ${reescrita.motivo}` });
    blocos.push({ tipo: "paragrafo", texto: registro.texto });
  }

  if (registro.arquivos.length) {
    blocos.push({ tipo: "secao", texto: "Arquivos do dia" });
    for (const a of registro.arquivos) blocos.push({ tipo: "item", texto: `${a.nome}${a.legenda ? ` — ${a.legenda}` : ""}` });
    blocos.push({ tipo: "paragrafo", texto: "Os arquivos não vão neste documento: ficam guardados no seu caderno, no GenoLab." });
  }

  if (reescrita.estado === "reescrito") {
    blocos.push({ tipo: "separador" });
    blocos.push({ tipo: "secao", texto: "Anexo — a anotação como você escreveu" });
    blocos.push({ tipo: "paragrafo", texto: registro.texto });
  }

  if (registro.versoes.length)
    blocos.push({ tipo: "paragrafo", texto: `Este registro foi editado ${registro.versoes.length === 1 ? "1 vez" : `${registro.versoes.length} vezes`}; as versões anteriores estão guardadas no GenoLab.` });

  return gerarDocx({ titulo: `${titulo} — ${dia}`, autor: opcoes.autor, blocos });
}

export const nomeDoArquivo = (r: Registro) => `registro-${r.dia}.docx`;
