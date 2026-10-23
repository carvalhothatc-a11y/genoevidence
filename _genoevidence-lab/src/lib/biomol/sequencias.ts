import { TABELAS_NCBI } from "./tabelas-ncbi";

/**
 * Sequências de DNA, RNA e proteína: leitura, validação e as operações de base.
 *
 * Tudo aqui é cálculo puro, sem rede e sem estado. Roda no navegador: a sequência de quem usa não
 * sai do computador para ser analisada.
 *
 * Duas regras atravessam o arquivo:
 *  - nada é "corrigido" em silêncio. Espaços e números de posição (comuns em GenBank) são tirados e
 *    contados; qualquer outro caractere estranho é apontado pela posição, não apagado;
 *  - a orientação das fitas é sempre explícita. "Complemento" e "reverso-complemento" são coisas
 *    diferentes, e cada função diz em que sentido devolve a fita.
 */

export type TipoSequencia = "dna" | "rna" | "proteina";

export const NOME_TIPO: Record<TipoSequencia, string> = { dna: "DNA", rna: "RNA", proteina: "proteína" };

/** Códigos IUPAC de ambiguidade para ácidos nucleicos (além de A, C, G, T/U). */
export const AMBIGUOS_NT = "RYSWKMBDHVN";
/** Os 20 aminoácidos padrão. */
export const AA_PADRAO = "ACDEFGHIKLMNPQRSTVWY";
/** B (D/N), Z (E/Q), J (I/L), X (qualquer), U (selenocisteína), O (pirrolisina). */
export const AA_EXTRA = "BZJXUO";

// ---------------------------------------------------------------- leitura

export type Registro = { nome: string; descricao?: string; seq: string };

export type Limpeza = { seq: string; espacos: number; digitos: number };

/** Tira espaços e números de posição e passa para maiúsculas. Não toca em mais nada. */
export function limpar(bruto: string): Limpeza {
  let espacos = 0;
  let digitos = 0;
  let seq = "";
  for (const ch of bruto) {
    if (/\s/.test(ch)) espacos++;
    else if (ch >= "0" && ch <= "9") digitos++;
    else seq += ch.toUpperCase();
  }
  return { seq, espacos, digitos };
}

export type LeituraFasta = { registros: Registro[]; avisos: string[] };

/**
 * Lê FASTA (um ou vários registros) ou uma sequência solta, sem cabeçalho.
 * Linhas começadas por ";" são comentários do FASTA antigo e são ignoradas.
 */
export function lerFasta(texto: string): LeituraFasta {
  const avisos: string[] = [];
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");
  const temCabecalho = linhas.some((l) => l.trimStart().startsWith(">"));

  if (!temCabecalho) {
    const { seq } = limpar(linhas.filter((l) => !l.trimStart().startsWith(";")).join(""));
    return { registros: seq ? [{ nome: "Sequência 1", seq }] : [], avisos };
  }

  const registros: Registro[] = [];
  let atual: { nome: string; descricao?: string; partes: string[] } | null = null;
  let antes = false;
  for (const linha of linhas) {
    const l = linha.trim();
    if (!l || l.startsWith(";")) continue;
    if (l.startsWith(">")) {
      if (atual) registros.push(fechar(atual));
      const cab = l.slice(1).trim();
      const espaco = cab.search(/\s/);
      const nome = (espaco === -1 ? cab : cab.slice(0, espaco)) || `Sequência ${registros.length + 1}`;
      const descricao = espaco === -1 ? undefined : cab.slice(espaco + 1).trim() || undefined;
      atual = { nome, descricao, partes: [] };
    } else if (atual) atual.partes.push(l);
    else antes = true;
  }
  if (atual) registros.push(fechar(atual));
  if (antes) avisos.push("Havia texto antes do primeiro cabeçalho “>”. Esse trecho não entrou em nenhuma sequência.");
  const vazios = registros.filter((r) => !r.seq).map((r) => r.nome);
  if (vazios.length) avisos.push(`Registro sem sequência: ${vazios.join(", ")}.`);
  return { registros: registros.filter((r) => r.seq), avisos };
}

function fechar(r: { nome: string; descricao?: string; partes: string[] }): Registro {
  return { nome: r.nome, descricao: r.descricao, seq: limpar(r.partes.join("")).seq };
}

// ---------------------------------------------------------------- tipo e validação

export type Deteccao = { tipo: TipoSequencia; clara: boolean; motivo: string };

/**
 * Sugere o tipo. É sugestão: "ACGT" também é um peptídeo válido (Ala-Cys-Gly-Thr), então sequências
 * curtas ou mistas voltam com `clara: false` e a tela pede para a pessoa confirmar.
 */
export function detectarTipo(seq: string): Deteccao {
  if (!seq) return { tipo: "dna", clara: false, motivo: "Sequência vazia." };
  let nt = 0;
  let t = 0;
  let u = 0;
  for (const ch of seq) {
    if ("ACGTUN".includes(ch)) nt++;
    if (ch === "T") t++;
    if (ch === "U") u++;
  }
  const fracao = nt / seq.length;
  if (fracao >= 0.9) {
    if (t && u) return { tipo: "dna", clara: false, motivo: "Tem T e U ao mesmo tempo — confira se é DNA ou RNA." };
    const tipo: TipoSequencia = u ? "rna" : "dna";
    if (seq.length < 10) return { tipo, clara: false, motivo: "Sequência curta: também poderia ser um peptídeo." };
    if (fracao < 1) return { tipo, clara: false, motivo: `${Math.round((1 - fracao) * 100)}% dos caracteres não são A, C, G, ${u ? "U" : "T"} ou N.` };
    return { tipo, clara: true, motivo: `Só A, C, G, ${u ? "U" : "T"}${seq.includes("N") ? " e N" : ""}.` };
  }
  return { tipo: "proteina", clara: true, motivo: "Tem letras que não são de ácido nucleico." };
}

export type Validacao = {
  valida: boolean;
  /** Até 20 posições (1 = primeira letra) com caractere que não pertence ao tipo escolhido. */
  invalidos: { posicao: number; caractere: string }[];
  totalInvalidos: number;
  /** Códigos de ambiguidade (N, R, Y… ou B, Z, X…): válidos, mas contados à parte. */
  ambiguos: number;
  /** Paradas ("*") no meio de uma proteína. */
  paradasInternas: number;
  mensagem?: string;
};

export function validar(seq: string, tipo: TipoSequencia): Validacao {
  const permitido = tipo === "dna" ? "ACGT" + AMBIGUOS_NT : tipo === "rna" ? "ACGU" + AMBIGUOS_NT : AA_PADRAO + AA_EXTRA + "*";
  const ambiguo = tipo === "proteina" ? "BZJX" : AMBIGUOS_NT;
  const invalidos: { posicao: number; caractere: string }[] = [];
  let totalInvalidos = 0;
  let ambiguos = 0;
  let paradasInternas = 0;
  for (let i = 0; i < seq.length; i++) {
    const ch = seq[i];
    if (!permitido.includes(ch)) {
      totalInvalidos++;
      if (invalidos.length < 20) invalidos.push({ posicao: i + 1, caractere: ch });
    } else if (ambiguo.includes(ch)) ambiguos++;
    else if (ch === "*" && i < seq.length - 1) paradasInternas++;
  }
  let mensagem: string | undefined;
  if (!seq) mensagem = "A sequência está vazia.";
  else if (totalInvalidos) {
    const c = invalidos[0].caractere;
    if (tipo === "dna" && c === "U") mensagem = "Há U na sequência: U é de RNA. Escolha RNA ou troque U por T.";
    else if (tipo === "rna" && c === "T") mensagem = "Há T na sequência: T é de DNA. Escolha DNA ou troque T por U.";
    else if (c === "-" || c === ".") mensagem = "Há lacunas de alinhamento (“-” ou “.”). Elas não fazem parte da sequência; tire-as antes.";
    else mensagem = `${totalInvalidos} caractere${totalInvalidos > 1 ? "s" : ""} não ${totalInvalidos > 1 ? "pertencem" : "pertence"} a ${NOME_TIPO[tipo]}. O primeiro é “${c}”, na posição ${invalidos[0].posicao}.`;
  }
  return { valida: Boolean(seq) && totalInvalidos === 0, invalidos, totalInvalidos, ambiguos, paradasInternas, mensagem };
}

// ---------------------------------------------------------------- composição

export type Composicao = {
  comprimento: number;
  contagem: Record<string, number>;
  /**
   * Conteúdo GC, só para ácido nucleico. Conta G, C e S (S = G ou C) contra A, T/U e W (W = A ou T/U).
   * Os demais códigos ambíguos (N, R, Y, K, M, B, D, H, V) não dizem se a base é GC ou AT e ficam de fora,
   * em `excluidos`. Sem nenhuma base decidida, a porcentagem é `null` — não zero.
   */
  gc?: { porcentagem: number | null; gc: number; at: number; excluidos: number };
};

export function composicao(seq: string, tipo: TipoSequencia): Composicao {
  const contagem: Record<string, number> = {};
  for (const ch of seq) contagem[ch] = (contagem[ch] ?? 0) + 1;
  if (tipo === "proteina") return { comprimento: seq.length, contagem };
  const n = (c: string) => contagem[c] ?? 0;
  const gc = n("G") + n("C") + n("S");
  const at = n("A") + n("T") + n("U") + n("W");
  const excluidos = seq.length - gc - at;
  return { comprimento: seq.length, contagem, gc: { porcentagem: gc + at ? (100 * gc) / (gc + at) : null, gc, at, excluidos } };
}

// ---------------------------------------------------------------- fitas

const PAR_DNA: Record<string, string> = { A: "T", T: "A", G: "C", C: "G", R: "Y", Y: "R", S: "S", W: "W", K: "M", M: "K", B: "V", V: "B", D: "H", H: "D", N: "N" };
const PAR_RNA: Record<string, string> = { ...PAR_DNA, A: "U", U: "A" };

/**
 * Complemento base a base, NA MESMA ORDEM da fita dada. Se a fita dada é 5'→3', o resultado é a
 * fita complementar lida 3'→5' — exatamente como ela fica pareada embaixo da original.
 */
export function complemento(seq: string, tipo: "dna" | "rna"): string {
  const par = tipo === "dna" ? PAR_DNA : PAR_RNA;
  let s = "";
  for (const ch of seq) {
    const c = par[ch];
    if (!c) throw new Error(`“${ch}” não tem complemento em ${NOME_TIPO[tipo]}.`);
    s += c;
  }
  return s;
}

export function reverso(seq: string): string {
  return [...seq].reverse().join("");
}

/** A fita complementar escrita 5'→3' (a forma de escrever qualquer fita por convenção). */
export function reversoComplemento(seq: string, tipo: "dna" | "rna"): string {
  return reverso(complemento(seq, tipo));
}

/** Quantos pares de Watson-Crick (G-C e A-T/U) entre duas fitas antiparalelas alinhadas. */
export function paresWatsonCrick(fita5a3: string, outra3a5: string): { gc: number; at: number; naoPareados: number } {
  let gc = 0;
  let at = 0;
  let naoPareados = 0;
  for (let i = 0; i < Math.min(fita5a3.length, outra3a5.length); i++) {
    const p = fita5a3[i] + outra3a5[i];
    if (p === "GC" || p === "CG") gc++;
    else if (p === "AT" || p === "TA" || p === "AU" || p === "UA") at++;
    else naoPareados++;
  }
  return { gc, at, naoPareados };
}

// ---------------------------------------------------------------- transcrição

/** Qual fita do DNA a pessoa forneceu. As duas são escritas 5'→3'. */
export type FitaFornecida = "codificante" | "molde";

export type Transcricao = {
  /** mRNA 5'→3'. */
  rna: string;
  /** Fita codificante (senso), 5'→3' — mesma sequência do RNA, com T no lugar de U. */
  codificante: string;
  /** Fita molde (antissenso), 5'→3'. A RNA polimerase a lê 3'→5'. */
  molde: string;
};

/**
 * Transcrição: o RNA é sintetizado 5'→3', complementar e antiparalelo à fita molde.
 * Por isso o RNA tem a sequência da fita CODIFICANTE (com U no lugar de T).
 */
export function transcrever(dna: string, fita: FitaFornecida): Transcricao {
  const codificante = fita === "codificante" ? dna : reversoComplemento(dna, "dna");
  const molde = fita === "molde" ? dna : reversoComplemento(dna, "dna");
  return { rna: codificante.replace(/T/g, "U"), codificante, molde };
}

/** RNA → DNA com a mesma sequência (U → T). Útil para traduzir RNA com o mesmo código. */
export function rnaParaDna(rna: string): string {
  return rna.replace(/U/g, "T");
}

// ---------------------------------------------------------------- código genético

const ORDEM = "TCAG";
const EXPANDE: Record<string, string> = {
  A: "A", C: "C", G: "G", T: "T", U: "T",
  R: "AG", Y: "CT", S: "CG", W: "AT", K: "GT", M: "AC", B: "CGT", D: "AGT", H: "ACT", V: "ACG", N: "ACGT",
};

/** Nomes em português das tabelas mais usadas; as demais ficam com o nome do NCBI. */
const NOME_PT: Record<number, string> = {
  1: "Padrão",
  2: "Mitocondrial de vertebrados",
  3: "Mitocondrial de leveduras",
  4: "Mitocondrial de fungos, protozoários e celenterados; Mycoplasma",
  5: "Mitocondrial de invertebrados",
  9: "Mitocondrial de equinodermos e platelmintos",
  11: "Bactérias, arqueias e plastídios",
  12: "Nuclear alternativo de leveduras",
  13: "Mitocondrial de ascídias",
};

export type CodigoGenetico = {
  id: number;
  nome: string;
  nomeNcbi: string;
  /** Aminoácido do códon (DNA, maiúsculo). Códon com ambiguidade que não decide o aminoácido vira "X". */
  aminoacido: (codon: string) => string;
  eParada: (codon: string) => boolean;
  /** Códons de início aceitos por esta tabela (só códons sem ambiguidade). */
  eInicio: (codon: string) => boolean;
  inicios: string[];
  paradas: string[];
  /**
   * Códons que podem ser parada OU aminoácido conforme o contexto (tabelas 27, 28 e 31 do NCBI).
   * A tradução usa o aminoácido; a tela avisa quando eles aparecem.
   */
  paradasAmbiguas: string[];
};

export const TABELAS = TABELAS_NCBI.map((t) => ({ id: t.id, nome: NOME_PT[t.id] ?? t.nome, nomeNcbi: t.nome }));

function indice(codon: string): number {
  const a = ORDEM.indexOf(codon[0]);
  const b = ORDEM.indexOf(codon[1]);
  const c = ORDEM.indexOf(codon[2]);
  return a < 0 || b < 0 || c < 0 ? -1 : a * 16 + b * 4 + c;
}

const TODOS_CODONS = [...ORDEM].flatMap((a) => [...ORDEM].flatMap((b) => [...ORDEM].map((c) => a + b + c)));

const cache = new Map<number, CodigoGenetico>();

export function codigoGenetico(id: number): CodigoGenetico {
  const pronto = cache.get(id);
  if (pronto) return pronto;
  const t = TABELAS_NCBI.find((x) => x.id === id);
  if (!t) throw new Error(`Código genético ${id} não existe na tabela do NCBI.`);
  const aminoacido = (codon: string) => {
    const c = codon.toUpperCase().replace(/U/g, "T");
    if (c.length !== 3) return "X";
    const i = indice(c);
    if (i >= 0) return t.aa[i];
    const e = [...c].map((ch) => EXPANDE[ch]);
    if (e.some((x) => !x)) return "X";
    const possiveis = new Set<string>();
    for (const a of e[0]) for (const b of e[1]) for (const d of e[2]) possiveis.add(t.aa[indice(a + b + d)]);
    return possiveis.size === 1 ? [...possiveis][0] : "X";
  };
  const c: CodigoGenetico = {
    id: t.id,
    nome: NOME_PT[t.id] ?? t.nome,
    nomeNcbi: t.nome,
    aminoacido,
    eParada: (codon) => aminoacido(codon) === "*",
    eInicio: (codon) => {
      const i = indice(codon.toUpperCase().replace(/U/g, "T"));
      return i >= 0 && t.inicios[i] === "M";
    },
    inicios: TODOS_CODONS.filter((x) => t.inicios[indice(x)] === "M"),
    paradas: TODOS_CODONS.filter((x) => t.aa[indice(x)] === "*"),
    paradasAmbiguas: TODOS_CODONS.filter((x) => t.inicios[indice(x)] === "*" && t.aa[indice(x)] !== "*"),
  };
  cache.set(id, c);
  return c;
}

// ---------------------------------------------------------------- tradução

export type Quadro = 1 | 2 | 3 | -1 | -2 | -3;
export const QUADROS: Quadro[] = [1, 2, 3, -1, -2, -3];

export type Codon = {
  /** Posições na fita DADA (1 = primeira base), sempre com inicio ≤ fim. */
  inicio: number;
  fim: number;
  /** O códon lido 5'→3' na fita do quadro (na reversa, já é o reverso-complemento). */
  codon: string;
  aa: string;
};

/**
 * Códons de um quadro de leitura. Convenção do NCBI: +1, +2, +3 começam na 1ª, 2ª e 3ª base da fita
 * dada; −1, −2, −3 começam na 1ª, 2ª e 3ª base do reverso-complemento (ou seja, na última,
 * penúltima e antepenúltima base da fita dada).
 */
export function codonsDoQuadro(seqNt: string, quadro: Quadro, codigo: CodigoGenetico): Codon[] {
  const dna = rnaParaDna(seqNt);
  const n = dna.length;
  const fita = quadro > 0 ? dna : reversoComplemento(dna, "dna");
  const desloc = Math.abs(quadro) - 1;
  const codons: Codon[] = [];
  for (let p = desloc; p + 3 <= n; p += 3) {
    const codon = fita.slice(p, p + 3);
    // p é 0-based na fita do quadro; na reversa, a posição q (1-based) corresponde a n - q + 1 na fita dada
    const inicio = quadro > 0 ? p + 1 : n - (p + 3) + 1;
    codons.push({ inicio, fim: inicio + 2, codon, aa: codigo.aminoacido(codon) });
  }
  return codons;
}

export type TraducaoQuadro = { quadro: Quadro; proteina: string; codons: Codon[]; sobra: number };

/** Tradução completa de um quadro, com as paradas marcadas como "*" (não para no primeiro stop). */
export function traduzirQuadro(seqNt: string, quadro: Quadro, codigo: CodigoGenetico): TraducaoQuadro {
  const codons = codonsDoQuadro(seqNt, quadro, codigo);
  const usadas = Math.abs(quadro) - 1 + codons.length * 3;
  return { quadro, proteina: codons.map((c) => c.aa).join(""), codons, sobra: seqNt.length - usadas };
}

export function seisQuadros(seqNt: string, codigo: CodigoGenetico): TraducaoQuadro[] {
  return QUADROS.map((q) => traduzirQuadro(seqNt, q, codigo));
}

// ---------------------------------------------------------------- ORFs

export type Orf = {
  quadro: Quadro;
  fita: "+" | "-";
  /** Posições na fita dada, inicio ≤ fim. Na fita "-", o códon de início fica em `fim`. */
  inicio: number;
  fim: number;
  /** Nucleotídeos, contando o códon de parada quando houver. */
  nt: number;
  /** Proteína sem o "*" final. O primeiro resíduo é M mesmo com códon de início alternativo (como no NCBI). */
  proteina: string;
  codonInicio: string;
  codonParada?: string;
  /** false = a sequência acabou antes de um códon de parada. */
  completa: boolean;
};

export type OpcoesOrf = {
  /** Comprimento mínimo em nucleotídeos (inclui o códon de parada). O NCBI ORFfinder usa 75 por padrão. */
  minimoNt?: number;
  /** "atg" = só ATG; "tabela" = todos os códons de início da tabela escolhida. */
  inicios?: "atg" | "tabela";
  /** Incluir ORFs que chegam ao fim da sequência sem códon de parada. */
  incluirIncompletas?: boolean;
};

/**
 * ORFs nos seis quadros: do PRIMEIRO códon de início depois de uma parada até a parada seguinte
 * (ORFs aninhadas, que começam num ATG interno da mesma ORF, não são listadas à parte).
 */
export function encontrarOrfs(seqNt: string, codigo: CodigoGenetico, opcoes: OpcoesOrf = {}): Orf[] {
  const minimo = opcoes.minimoNt ?? 75;
  const ehInicio = (c: string) => (opcoes.inicios === "tabela" ? codigo.eInicio(c) : c === "ATG");
  const orfs: Orf[] = [];
  for (const quadro of QUADROS) {
    const codons = codonsDoQuadro(seqNt, quadro, codigo);
    let aberta = -1;
    const fechar = (ate: number, completa: boolean) => {
      const trecho = codons.slice(aberta, completa ? ate + 1 : ate);
      const nt = trecho.length * 3;
      if (nt >= minimo) {
        const semParada = completa ? trecho.slice(0, -1) : trecho;
        const proteina = semParada.map((c, i) => (i === 0 ? "M" : c.aa)).join("");
        const primeiro = trecho[0];
        const ultimo = trecho[trecho.length - 1];
        orfs.push({
          quadro,
          fita: quadro > 0 ? "+" : "-",
          inicio: Math.min(primeiro.inicio, ultimo.inicio),
          fim: Math.max(primeiro.fim, ultimo.fim),
          nt,
          proteina,
          codonInicio: primeiro.codon,
          codonParada: completa ? ultimo.codon : undefined,
          completa,
        });
      }
      aberta = -1;
    };
    for (let i = 0; i < codons.length; i++) {
      if (aberta < 0) {
        if (ehInicio(codons[i].codon)) aberta = i;
      } else if (codons[i].aa === "*") fechar(i, true);
    }
    if (aberta >= 0 && opcoes.incluirIncompletas) fechar(codons.length, false);
  }
  return orfs.sort((a, b) => b.nt - a.nt || a.inicio - b.inicio);
}

// ---------------------------------------------------------------- aminoácidos

/** Nome, sigla de três letras e classe de cada aminoácido (para rótulos e legendas). */
export const AMINOACIDOS: Record<string, { tres: string; nome: string }> = {
  A: { tres: "Ala", nome: "alanina" }, R: { tres: "Arg", nome: "arginina" }, N: { tres: "Asn", nome: "asparagina" },
  D: { tres: "Asp", nome: "aspartato" }, C: { tres: "Cys", nome: "cisteína" }, Q: { tres: "Gln", nome: "glutamina" },
  E: { tres: "Glu", nome: "glutamato" }, G: { tres: "Gly", nome: "glicina" }, H: { tres: "His", nome: "histidina" },
  I: { tres: "Ile", nome: "isoleucina" }, L: { tres: "Leu", nome: "leucina" }, K: { tres: "Lys", nome: "lisina" },
  M: { tres: "Met", nome: "metionina" }, F: { tres: "Phe", nome: "fenilalanina" }, P: { tres: "Pro", nome: "prolina" },
  S: { tres: "Ser", nome: "serina" }, T: { tres: "Thr", nome: "treonina" }, W: { tres: "Trp", nome: "triptofano" },
  Y: { tres: "Tyr", nome: "tirosina" }, V: { tres: "Val", nome: "valina" }, U: { tres: "Sec", nome: "selenocisteína" },
  O: { tres: "Pyl", nome: "pirrolisina" }, B: { tres: "Asx", nome: "asparagina ou aspartato" },
  Z: { tres: "Glx", nome: "glutamina ou glutamato" }, J: { tres: "Xle", nome: "leucina ou isoleucina" },
  X: { tres: "Xaa", nome: "indefinido" }, "*": { tres: "Ter", nome: "parada" },
};

/** Anticódon (5'→3') que pareia com um códon de mRNA — pareamento de Watson-Crick, sem oscilação. */
export function anticodon(codonRna: string): string {
  return reversoComplemento(codonRna.toUpperCase().replace(/T/g, "U"), "rna");
}
