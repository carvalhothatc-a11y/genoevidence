import { BLOSUM62, LETRAS } from "./blosum62";

/**
 * Alinhamento de pares de sequências.
 *
 *  - global: Needleman & Wunsch (J Mol Biol 1970;48:443-53) — as duas sequências inteiras;
 *  - local: Smith & Waterman (J Mol Biol 1981;147:195-7) — o melhor trecho em comum.
 *
 * As lacunas são afins, pelo método de Gotoh (J Mol Biol 1982;162:705-8): abrir uma lacuna custa
 * `abertura` e cada posição a mais custa `extensao`. Uma lacuna de comprimento L custa
 * abertura + (L − 1) × extensão — a mesma convenção do EMBOSS needle/water. No alinhamento global,
 * lacunas nas pontas também são cobradas (Needleman–Wunsch clássico).
 *
 * Dois cuidados que os testes conferem: a pontuação devolvida é sempre recalculável a partir do
 * próprio alinhamento, e para sequências curtas ela é igual à melhor entre TODAS as possibilidades.
 */

export type Esquema =
  | { tipo: "nucleotideo"; acerto: number; erro: number; abertura: number; extensao: number }
  | { tipo: "blosum62"; abertura: number; extensao: number };

/** Padrões do EMBOSS needle: +5/−4 (valores de A, C, G e T no EDNAFULL) ou BLOSUM62, abertura 10, extensão 0,5. */
export const ESQUEMA_DNA: Esquema = { tipo: "nucleotideo", acerto: 5, erro: -4, abertura: 10, extensao: 0.5 };
export const ESQUEMA_PROTEINA: Esquema = { tipo: "blosum62", abertura: 10, extensao: 0.5 };

/** Limite de células (comprimento A × comprimento B) para caber na memória do navegador. */
export const MAX_CELULAS = 4_000_000;

const INDICE = new Map([...LETRAS].map((l, i) => [l, i]));
const X = INDICE.get("X")!;

/** Pontuação de substituição entre duas letras. */
export function substituicao(a: string, b: string, e: Esquema): number {
  if (e.tipo === "nucleotideo") return a === b && "ACGTU".includes(a) ? e.acerto : e.erro;
  // J, U e O não estão na BLOSUM62: contam como X.
  return BLOSUM62[INDICE.get(a) ?? X][INDICE.get(b) ?? X];
}

export type ResultadoAlinhamento = {
  modo: "global" | "local";
  pontuacao: number;
  /** As duas linhas alinhadas, com "-" nas lacunas. */
  a: string;
  b: string;
  /** "|" idêntico, ":" pontuação positiva (parecido), " " o resto. */
  marcas: string;
  /** Trecho de cada sequência que entrou no alinhamento (1 = primeira letra). Vazio: inicio > fim. */
  inicioA: number;
  fimA: number;
  inicioB: number;
  fimB: number;
  comprimento: number;
  identicos: number;
  similares: number;
  /** Colunas com lacuna. */
  lacunas: number;
  /** Porcentagens sobre o comprimento do alinhamento (como no EMBOSS). */
  identidade: number;
  similaridade: number;
};

const M = 0;
const GA = 1; // letra de A contra lacuna (lacuna em B)
const GB = 2; // letra de B contra lacuna (lacuna em A)
const INICIO = 3;
const NEG = -Infinity;

export function alinhar(seqA: string, seqB: string, modo: "global" | "local", e: Esquema): ResultadoAlinhamento {
  const n = seqA.length;
  const m = seqB.length;
  if ((n + 1) * (m + 1) > MAX_CELULAS)
    throw new Error(`Sequências grandes demais para alinhar no navegador (${n} × ${m}). O limite é de ${MAX_CELULAS.toLocaleString("pt-BR")} combinações.`);
  if (!(e.abertura >= 0 && e.extensao >= 0)) throw new Error("Abertura e extensão de lacuna são custos: use valores positivos ou zero.");

  const local = modo === "local";
  const ab = e.abertura;
  const ex = e.extensao;
  const pont = tabelaDePontuacao(seqA, seqB, e);
  const largura = m + 1;
  // Ponteiros: bits 0-1 → de onde veio M; 2-3 → de onde veio GA; 4-5 → de onde veio GB.
  const ptr = new Uint8Array((n + 1) * largura);
  let mAnt = new Float64Array(largura).fill(NEG);
  let aAnt = new Float64Array(largura).fill(NEG);
  let bAnt = new Float64Array(largura).fill(NEG);
  let mCur = new Float64Array(largura);
  let aCur = new Float64Array(largura);
  let bCur = new Float64Array(largura);

  // linha 0: no global, só lacunas em A a partir do canto
  if (!local) {
    mAnt[0] = 0;
    for (let j = 1; j <= m; j++) {
      bAnt[j] = -(ab + (j - 1) * ex);
      ptr[j] = (j === 1 ? M : GB) << 4;
    }
  }

  let melhorLocal = 0;
  let fimI = 0;
  let fimJ = 0;

  for (let i = 1; i <= n; i++) {
    const base = i * largura;
    const linha = (i - 1) * m;
    mCur[0] = NEG;
    bCur[0] = NEG;
    if (local) aCur[0] = NEG;
    else {
      aCur[0] = -(ab + (i - 1) * ex);
      ptr[base] = (i === 1 ? M : GA) << 2;
    }
    for (let j = 1; j <= m; j++) {
      // M: letra contra letra. Empates: M, depois GA, depois GB.
      let d = mAnt[j - 1];
      let deD = M;
      if (aAnt[j - 1] > d) {
        d = aAnt[j - 1];
        deD = GA;
      }
      if (bAnt[j - 1] > d) {
        d = bAnt[j - 1];
        deD = GB;
      }
      const s = pont[linha + j - 1];
      let vm: number;
      if (local && !(d > 0)) {
        vm = s;
        deD = INICIO;
      } else vm = d + s;
      mCur[j] = vm;

      // GA: lacuna em B (vem de cima)
      let va = mAnt[j] - ab;
      let deA = M;
      if (aAnt[j] - ex > va) {
        va = aAnt[j] - ex;
        deA = GA;
      }
      if (bAnt[j] - ab > va) {
        va = bAnt[j] - ab;
        deA = GB;
      }
      aCur[j] = va;

      // GB: lacuna em A (vem da esquerda)
      let vb = mCur[j - 1] - ab;
      let deB = M;
      if (aCur[j - 1] - ab > vb) {
        vb = aCur[j - 1] - ab;
        deB = GA;
      }
      if (bCur[j - 1] - ex > vb) {
        vb = bCur[j - 1] - ex;
        deB = GB;
      }
      bCur[j] = vb;

      ptr[base + j] = deD | (deA << 2) | (deB << 4);
      if (local && vm > melhorLocal) {
        melhorLocal = vm;
        fimI = i;
        fimJ = j;
      }
    }
    [mAnt, mCur] = [mCur, mAnt];
    [aAnt, aCur] = [aCur, aAnt];
    [bAnt, bCur] = [bCur, bAnt];
  }

  let pontuacao: number;
  let estado: number;
  let i: number;
  let j: number;
  if (local) {
    pontuacao = melhorLocal;
    estado = M;
    i = fimI;
    j = fimJ;
  } else {
    // depois da última troca, as linhas "Ant" guardam a linha n
    pontuacao = mAnt[m];
    estado = M;
    if (aAnt[m] > pontuacao) {
      pontuacao = aAnt[m];
      estado = GA;
    }
    if (bAnt[m] > pontuacao) {
      pontuacao = bAnt[m];
      estado = GB;
    }
    i = n;
    j = m;
  }

  const colA: string[] = [];
  const colB: string[] = [];
  if (!local || pontuacao > 0) {
    while (i > 0 || j > 0) {
      const p = ptr[i * largura + j];
      if (estado === M) {
        colA.push(seqA[i - 1]);
        colB.push(seqB[j - 1]);
        const de = p & 3;
        i--;
        j--;
        if (de === INICIO) break;
        estado = de;
      } else if (estado === GA) {
        colA.push(seqA[i - 1]);
        colB.push("-");
        estado = (p >> 2) & 3;
        i--;
      } else {
        colA.push("-");
        colB.push(seqB[j - 1]);
        estado = (p >> 4) & 3;
        j--;
      }
    }
  }
  const a = colA.reverse().join("");
  const b = colB.reverse().join("");
  const vazio = local && !(pontuacao > 0);
  return {
    modo,
    pontuacao,
    a,
    b,
    inicioA: local ? (vazio ? 1 : i + 1) : 1,
    fimA: local ? (vazio ? 0 : fimI) : n,
    inicioB: local ? (vazio ? 1 : j + 1) : 1,
    fimB: local ? (vazio ? 0 : fimJ) : m,
    ...estatisticas(a, b, e),
  };
}

/** Pontuação de cada par (letra de A, letra de B), calculada uma vez só. */
function tabelaDePontuacao(seqA: string, seqB: string, e: Esquema): Float64Array {
  const n = seqA.length;
  const m = seqB.length;
  const t = new Float64Array(n * m);
  if (e.tipo === "nucleotideo") {
    for (let i = 0; i < n; i++) {
      const a = seqA[i];
      const firme = "ACGTU".includes(a);
      for (let j = 0; j < m; j++) t[i * m + j] = firme && seqB[j] === a ? e.acerto : e.erro;
    }
    return t;
  }
  const ib = Int32Array.from(seqB, (c) => INDICE.get(c) ?? X);
  for (let i = 0; i < n; i++) {
    const linha = BLOSUM62[INDICE.get(seqA[i]) ?? X];
    for (let j = 0; j < m; j++) t[i * m + j] = linha[ib[j]];
  }
  return t;
}

function estatisticas(a: string, b: string, e: Esquema) {
  let identicos = 0;
  let similares = 0;
  let lacunas = 0;
  let marcas = "";
  for (let k = 0; k < a.length; k++) {
    if (a[k] === "-" || b[k] === "-") {
      lacunas++;
      marcas += " ";
    } else if (a[k] === b[k]) {
      identicos++;
      similares++;
      marcas += "|";
    } else if (substituicao(a[k], b[k], e) > 0) {
      similares++;
      marcas += ":";
    } else marcas += " ";
  }
  const comprimento = a.length;
  const pct = (x: number) => (comprimento ? (100 * x) / comprimento : 0);
  return { marcas, comprimento, identicos, similares, lacunas, identidade: pct(identicos), similaridade: pct(similares) };
}

/**
 * Pontuação de um alinhamento já pronto, recalculada coluna a coluna. Cada sequência contínua de "-"
 * numa linha é UMA lacuna. Serve para conferir o resultado de `alinhar`.
 */
export function pontuarAlinhamento(a: string, b: string, e: Esquema): number {
  if (a.length !== b.length) throw new Error("As duas linhas do alinhamento têm comprimentos diferentes.");
  let total = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] === "-" && b[k] === "-") throw new Error("Coluna só de lacunas.");
    if (a[k] === "-") total -= k > 0 && a[k - 1] === "-" ? e.extensao : e.abertura;
    else if (b[k] === "-") total -= k > 0 && b[k - 1] === "-" ? e.extensao : e.abertura;
    else total += substituicao(a[k], b[k], e);
  }
  return total;
}

/** Texto no formato de blocos (60 colunas), com a posição de cada linha — para ler e para exportar. */
export function emBlocos(r: ResultadoAlinhamento, nomes: [string, string], largura = 60): string {
  const w = Math.max(nomes[0].length, nomes[1].length, 4);
  const linhas: string[] = [];
  let pa = r.inicioA;
  let pb = r.inicioB;
  for (let k = 0; k < r.comprimento; k += largura) {
    const ta = r.a.slice(k, k + largura);
    const tb = r.b.slice(k, k + largura);
    const na = ta.replace(/-/g, "").length;
    const nb = tb.replace(/-/g, "").length;
    const fa = na ? pa + na - 1 : pa - 1;
    const fb = nb ? pb + nb - 1 : pb - 1;
    linhas.push(`${nomes[0].padEnd(w)} ${String(pa).padStart(6)} ${ta} ${fa}`);
    linhas.push(`${"".padEnd(w)} ${"".padStart(6)} ${r.marcas.slice(k, k + largura)}`);
    linhas.push(`${nomes[1].padEnd(w)} ${String(pb).padStart(6)} ${tb} ${fb}`);
    linhas.push("");
    pa = fa + 1;
    pb = fb + 1;
  }
  return linhas.join("\n");
}
