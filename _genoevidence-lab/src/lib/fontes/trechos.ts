/**
 * Divisão de um documento em TRECHOS com endereço.
 *
 * Um trecho é a menor unidade que a resposta pode citar. Ele guarda de onde veio (arquivo, página,
 * posição), para a interface mostrar o parágrafo e não só o nome do arquivo — a diferença entre
 * “está no artigo X” e “está aqui, leia”.
 *
 * O corte respeita parágrafo. Cortar no meio de uma frase produz citação que não se sustenta: o
 * trecho mostrado não contém a ideia inteira, e quem lê não consegue conferir.
 */

export type Trecho = {
  /** Estável para o mesmo documento: arquivo + ordem. */
  id: string;
  arquivoId: string;
  arquivo: string;
  /** Página do PDF (1 em diante). Null quando o formato não tem páginas (DOCX, TXT). */
  pagina: number | null;
  /** Posição do trecho dentro do documento, de 0 em diante. */
  ordem: number;
  texto: string;
};

/** Tamanho alvo de um trecho, em caracteres. Grande o bastante para ter contexto, pequeno o bastante para a pessoa conferir de relance. */
export const ALVO = 900;
export const MAXIMO = 1600;
/** Abaixo disso um parágrafo solto é juntado ao vizinho, para não gerar trecho sem sentido. */
export const MINIMO = 220;
/** Teto por documento: evita que um PDF de 400 páginas estoure a memória e o índice. */
export const MAX_TRECHOS_POR_DOCUMENTO = 1200;

/** Quebra um texto corrido em parágrafos, preservando a ordem. */
function paragrafos(texto: string): string[] {
  return texto
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Junta parágrafos até chegar perto do alvo. Um parágrafo maior que o máximo é partido em frases;
 * se uma única frase passar do máximo (tabela, lista colada), ela é partida por tamanho, e isso
 * fica registrado para a interface poder avisar.
 */
function agrupar(ps: string[]): string[] {
  const out: string[] = [];
  let atual = "";
  const fechar = () => {
    if (atual.trim()) out.push(atual.trim());
    atual = "";
  };

  for (const p of ps) {
    if (p.length > MAXIMO) {
      fechar();
      // frases: ponto, interrogação ou exclamação seguidos de espaço e maiúscula
      const frases = p.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý“"(])/);
      let bloco = "";
      for (const f of frases) {
        if (f.length > MAXIMO) {
          if (bloco.trim()) out.push(bloco.trim());
          bloco = "";
          for (let i = 0; i < f.length; i += MAXIMO) out.push(f.slice(i, i + MAXIMO).trim());
          continue;
        }
        if (bloco.length + f.length + 1 > ALVO && bloco.length >= MINIMO) {
          out.push(bloco.trim());
          bloco = f;
        } else bloco = bloco ? `${bloco} ${f}` : f;
      }
      if (bloco.trim()) out.push(bloco.trim());
      continue;
    }

    if (atual.length + p.length + 2 > ALVO && atual.length >= MINIMO) fechar();
    atual = atual ? `${atual}\n\n${p}` : p;
    if (atual.length >= ALVO) fechar();
  }
  fechar();
  return out.filter((t) => t.replace(/\s/g, "").length > 0);
}

export type EntradaDocumento = {
  arquivoId: string;
  arquivo: string;
  /** PDF: uma string por página. Outros formatos: o texto inteiro. */
  conteudo: string | string[];
};

/**
 * Divide um documento em trechos endereçados.
 * Para PDF, cada trecho guarda a página de onde saiu; trechos nunca atravessam páginas.
 */
export function dividirEmTrechos({ arquivoId, arquivo, conteudo }: EntradaDocumento): Trecho[] {
  const out: Trecho[] = [];
  const paginas = Array.isArray(conteudo) ? conteudo : [conteudo];
  const temPaginas = Array.isArray(conteudo);

  for (let i = 0; i < paginas.length && out.length < MAX_TRECHOS_POR_DOCUMENTO; i++) {
    for (const texto of agrupar(paragrafos(paginas[i] ?? ""))) {
      if (out.length >= MAX_TRECHOS_POR_DOCUMENTO) break;
      const ordem = out.length;
      out.push({ id: `${arquivoId}:${ordem}`, arquivoId, arquivo, pagina: temPaginas ? i + 1 : null, ordem, texto });
    }
  }
  return out;
}

/** Onde o trecho está, em português, para a interface e para a resposta citar. */
export function enderecoDoTrecho(t: Trecho): string {
  return t.pagina ? `${t.arquivo}, página ${t.pagina}` : t.arquivo;
}
