import type { Trecho } from "./trechos";

/**
 * Busca dos trechos relevantes para uma pergunta — BM25, inteiramente DENTRO do servidor.
 *
 * Por que não vetores: embeddings exigiriam um serviço externo pago, e mandariam o conteúdo dos
 * documentos para fora. Para um conjunto de dezenas de artigos, a busca por palavra é suficiente e
 * tem uma vantagem que importa aqui: dá para explicar por que um trecho foi escolhido (as palavras
 * que bateram), o que um vetor não dá.
 *
 * O que sai deste módulo é a MATÉRIA-PRIMA da resposta. Quem decide o que dizer é o modelo, e quem
 * confere se a citação existe é `verificar.ts`.
 */

/** Palavras que aparecem em quase toda frase e não ajudam a distinguir um trecho do outro. */
const VAZIAS = new Set(
  ("a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre entre e ou mas que se " +
    "ao aos à às pelo pela pelos pelas este esta estes estas esse essa esses essas aquele aquela isso isto aquilo " +
    "seu sua seus suas meu minha nosso nossa qual quais quando onde como porque pois então também já não sim " +
    "ser sou é são foi foram era eram será serão sendo sido estar está estão estava estavam ter tem têm tinha " +
    "havia há haver fazer faz feito pode podem podia deve devem mais menos muito pouco todo toda todos todas " +
    "outro outra outros outras mesmo mesma assim ainda apenas após antes durante the of and in to for with on at is are be").split(
    /\s+/,
  ),
);

/** Minúsculas, sem acento, só letras e números. Mantém números: “58 °C” e “p53” importam. */
export function termos(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !VAZIAS.has(t));
}

export type Indice = {
  trechos: Trecho[];
  /** Por trecho: quantas vezes cada termo aparece. */
  frequencias: Map<string, number>[];
  /** Por termo: em quantos trechos ele aparece. */
  documentos: Map<string, number>;
  tamanhos: number[];
  tamanhoMedio: number;
};

export function indexar(trechos: Trecho[]): Indice {
  const frequencias: Map<string, number>[] = [];
  const documentos = new Map<string, number>();
  const tamanhos: number[] = [];

  for (const t of trechos) {
    const ts = termos(t.texto);
    const f = new Map<string, number>();
    for (const x of ts) f.set(x, (f.get(x) ?? 0) + 1);
    for (const x of f.keys()) documentos.set(x, (documentos.get(x) ?? 0) + 1);
    frequencias.push(f);
    tamanhos.push(ts.length);
  }
  const tamanhoMedio = tamanhos.length ? tamanhos.reduce((a, b) => a + b, 0) / tamanhos.length : 0;
  return { trechos, frequencias, documentos, tamanhos, tamanhoMedio };
}

const K1 = 1.2;
const B = 0.75;

export type Achado = {
  trecho: Trecho;
  pontos: number;
  /** Palavras da pergunta que realmente apareceram neste trecho — é o “por que este”. */
  casaram: string[];
};

/**
 * Trechos mais relevantes para a pergunta, do melhor para o pior.
 *
 * Devolve lista vazia quando nenhuma palavra da pergunta aparece em lugar nenhum. Vazio é uma
 * resposta legítima e significa “não está nos seus documentos” — nunca devolvemos o trecho menos
 * ruim só para ter o que mostrar.
 */
export function procurar(indice: Indice, pergunta: string, limite = 8): Achado[] {
  const consulta = [...new Set(termos(pergunta))];
  if (!consulta.length || !indice.trechos.length) return [];
  const N = indice.trechos.length;

  const achados: Achado[] = [];
  for (let i = 0; i < N; i++) {
    let pontos = 0;
    const casaram: string[] = [];
    for (const termo of consulta) {
      const f = indice.frequencias[i].get(termo);
      if (!f) continue;
      const n = indice.documentos.get(termo) ?? 0;
      // IDF do BM25 (variante com +0.5), limitado a zero para termo presente em quase tudo.
      const idf = Math.max(0, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
      const norma = 1 - B + (B * indice.tamanhos[i]) / (indice.tamanhoMedio || 1);
      pontos += (idf * (f * (K1 + 1))) / (f + K1 * norma);
      casaram.push(termo);
    }
    if (pontos > 0) achados.push({ trecho: indice.trechos[i], pontos, casaram });
  }

  achados.sort((a, b) => b.pontos - a.pontos || a.trecho.ordem - b.trecho.ordem);
  return achados.slice(0, limite);
}

/**
 * Espalha os achados entre documentos diferentes.
 *
 * Sem isto, um artigo que repete o assunto toma todas as vagas e a resposta sai apoiada numa fonte
 * só — o que é exatamente o risco de “juntar detalhes que estavam em partes diferentes”, agravado
 * por não mostrar que existem outras fontes.
 */
export function equilibrarPorDocumento(achados: Achado[], porDocumento = 3): Achado[] {
  const contagem = new Map<string, number>();
  const out: Achado[] = [];
  for (const a of achados) {
    const n = contagem.get(a.trecho.arquivoId) ?? 0;
    if (n >= porDocumento) continue;
    contagem.set(a.trecho.arquivoId, n + 1);
    out.push(a);
  }
  return out;
}
