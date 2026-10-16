import type { Trecho } from "./trechos";

/**
 * Conferência das citações ANTES de mostrar a resposta.
 *
 * O risco real destas ferramentas não é inventar um artigo inteiro: é citar um trecho que quase
 * existe — com uma palavra trocada, uma ressalva removida, ou costurando duas frases que estavam
 * em lugares diferentes. Quem lê não tem como perceber, porque a citação parece plausível.
 *
 * Então nada é exibido como citação sem passar por aqui. O que não bate com o documento não vira
 * citação: vira aviso.
 */

/** Minúsculas, sem acento, espaços colapsados — para comparar conteúdo, não formatação. */
function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[“”"'`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Citação curta demais não prova nada: “a proteína” casaria com qualquer documento. */
export const MINIMO_CITACAO = 25;

export type Conferencia =
  | { ok: true; trecho: Trecho; citacao: string }
  | { ok: false; motivo: "trecho_inexistente" | "nao_encontrada" | "curta_demais"; citacao: string; trechoId: string };

/**
 * A citação aparece literalmente no trecho indicado?
 *
 * Comparação por conteúdo (sem acento, sem maiúscula, espaço colapsado), porque o modelo pode
 * reescrever aspas ou quebras de linha sem mudar o que foi dito. Qualquer troca de PALAVRA reprova.
 */
export function conferirCitacao(trechos: Trecho[], trechoId: string, citacao: string): Conferencia {
  const limpa = citacao.trim();
  if (normalizar(limpa).length < MINIMO_CITACAO) return { ok: false, motivo: "curta_demais", citacao: limpa, trechoId };
  const trecho = trechos.find((t) => t.id === trechoId);
  if (!trecho) return { ok: false, motivo: "trecho_inexistente", citacao: limpa, trechoId };
  if (!normalizar(trecho.texto).includes(normalizar(limpa))) return { ok: false, motivo: "nao_encontrada", citacao: limpa, trechoId };
  return { ok: true, trecho, citacao: limpa };
}

export const MOTIVO: Record<Exclude<Conferencia, { ok: true }>["motivo"], string> = {
  trecho_inexistente: "A resposta apontou um trecho que não existe entre os consultados.",
  nao_encontrada: "A citação não aparece literalmente no trecho indicado — pode ter sido reescrita ou juntada de partes diferentes.",
  curta_demais: "A citação é curta demais para ser conferida contra o documento.",
};

/** Separa o que passou do que não passou, preservando a ordem em que a resposta citou. */
export function conferirTodas(trechos: Trecho[], citacoes: { trechoId: string; citacao: string }[]) {
  const conferidas = citacoes.map((c) => conferirCitacao(trechos, c.trechoId, c.citacao));
  return {
    validas: conferidas.filter((c): c is Extract<Conferencia, { ok: true }> => c.ok),
    recusadas: conferidas.filter((c): c is Extract<Conferencia, { ok: false }> => !c.ok),
  };
}
