import { anticodon, complemento, reversoComplemento, type CodigoGenetico } from "./sequencias";

/**
 * Roteiros de replicação, transcrição e tradução, CALCULADOS a partir da sequência.
 *
 * A animação na tela só desenha o estado que estas funções devolvem para um instante `t`. Assim o
 * que se vê está sempre sincronizado com o resultado das operações sobre a sequência — e o fim de
 * cada animação é idêntico ao que a aba Sequências calcula.
 *
 * São MECANISMOS ESQUEMÁTICOS, não simulação física: não há tempo real, energia, difusão nem
 * cinética. Simplificações estão escritas em `SIMPLIFICACOES` e aparecem na tela.
 */

// ---------------------------------------------------------------- replicação

export type EstadoReplicacao = {
  /** Quantos pares a forquilha já abriu (da esquerda para a direita). */
  aberto: number;
  /** Fita nova sobre o molde 2 (contínua, "líder"): posições já sintetizadas. */
  lider: boolean[];
  /** Fita nova sobre o molde 1 (descontínua, "atrasada"): posições já sintetizadas. */
  atrasada: boolean[];
  /** Fragmento de Okazaki de cada posição da fita atrasada (−1 = ainda não começou). */
  fragmento: number[];
  /** Posição em que cada polimerase está agora (−1 = parada). */
  polLider: number;
  polAtrasada: number;
  /** Fragmentos já unidos pela ligase (no fim). */
  ligados: boolean;
};

/**
 * Fita 1 = a dada (5'→3' da esquerda para a direita); fita 2 = a complementar (3'→5').
 * A forquilha abre da esquerda para a direita. A fita nova sobre o molde 2 cresce 5'→3' no mesmo
 * sentido da forquilha: contínua. A nova sobre o molde 1 precisa crescer 5'→3' no sentido OPOSTO:
 * sai em fragmentos, cada um começando quando a forquilha já abriu espaço à frente.
 *
 * `t` vai de 0 a `duracaoReplicacao(n, F)`.
 */
export function estadoReplicacao(n: number, t: number, F = 8): EstadoReplicacao {
  const aberto = Math.max(0, Math.min(n, Math.floor(t)));
  // fita líder: a polimerase vai um passo atrás da forquilha; termina 1 passo depois de abrir tudo
  const feitosLider = Math.max(0, Math.min(n, Math.floor(t) - 1));
  const lider = Array.from({ length: n }, (_, i) => i < feitosLider);

  const atrasada = new Array<boolean>(n).fill(false);
  const fragmento = new Array<number>(n).fill(-1);
  let polAtrasada = -1;
  const nFrag = Math.ceil(n / F);
  for (let j = 0; j < nFrag; j++) {
    const ini = j * F;
    const fim = Math.min(n, (j + 1) * F) - 1;
    // o fragmento j começa quando a forquilha passou do fim dele (ou quando abriu tudo)
    const comeca = fim + 1 === n ? n : fim + 1;
    const feitos = Math.max(0, Math.min(fim - ini + 1, Math.floor(t) - comeca));
    for (let k = 0; k < feitos; k++) {
      const pos = fim - k; // de trás para a frente: 5'→3' na fita nova
      atrasada[pos] = true;
      fragmento[pos] = j;
    }
    if (feitos > 0 && feitos < fim - ini + 1) polAtrasada = fim - feitos;
  }
  const total = duracaoReplicacao(n, F);
  return {
    aberto,
    lider,
    atrasada,
    fragmento,
    polLider: feitosLider < n ? feitosLider : -1,
    polAtrasada,
    ligados: t >= total,
  };
}

/** Instante em que tudo terminou (inclui um passo para a ligase). */
export function duracaoReplicacao(n: number, F = 8): number {
  const ultimoFragmento = Math.ceil(n / F) - 1;
  const fimUltimo = n; // começa quando a forquilha abriu tudo
  const tamanhoUltimo = n - ultimoFragmento * F;
  // o penúltimo fragmento pode terminar depois do último, conforme F; pegamos o máximo
  let fimAtrasada = fimUltimo + tamanhoUltimo;
  for (let j = 0; j < ultimoFragmento; j++) fimAtrasada = Math.max(fimAtrasada, (j + 1) * F + F);
  return Math.max(n + 1, fimAtrasada) + 1;
}

/** As duas moléculas-filhas ao final: cada uma com uma fita velha e uma nova (semiconservativa). */
export function resultadoReplicacao(fita1: string): { filha1: { velha: string; nova: string }; filha2: { velha: string; nova: string } } {
  const fita2 = complemento(fita1, "dna"); // 3'→5' sob a fita 1
  return {
    // molde 1 (5'→3') + nova complementar (lida 3'→5' sob ela)
    filha1: { velha: fita1, nova: fita2 },
    // molde 2 (3'→5') + nova com a mesma sequência da fita 1
    filha2: { velha: fita2, nova: fita1 },
  };
}

// ---------------------------------------------------------------- transcrição

export type EstadoTranscricao = {
  /** Posição da RNA polimerase sobre o DNA (em pares, da esquerda para a direita). */
  pos: number;
  /** Trecho do DNA aberto agora (bolha de transcrição), [ini, fim). */
  bolha: [number, number];
  /** RNA já sintetizado, 5'→3'. */
  rna: string;
  /** Quantos nucleotídeos do RNA ainda estão pareados com a fita molde (híbrido RNA-DNA). */
  hibrido: number;
  terminou: boolean;
};

/**
 * Transcrição do DNA (dado como fita codificante 5'→3', da esquerda para a direita): a polimerase
 * anda para a direita lendo a fita molde (que corre 3'→5' nesse sentido) e o RNA cresce 5'→3'.
 * `rnaCompleto` é o mRNA calculado por `transcrever` — a animação só revela pedaços dele.
 */
export function estadoTranscricao(rnaCompleto: string, t: number, opcoes = { bolha: 12, hibrido: 8 }): EstadoTranscricao {
  const n = rnaCompleto.length;
  const pos = Math.max(0, Math.min(n, Math.floor(t)));
  const terminou = t >= n + 2;
  const meio = Math.floor(opcoes.bolha / 2);
  const bolha: [number, number] = terminou ? [0, 0] : [Math.max(0, pos - opcoes.bolha + meio), Math.min(n, pos + meio)];
  return { pos, bolha, rna: rnaCompleto.slice(0, pos), hibrido: terminou ? 0 : Math.min(pos, opcoes.hibrido), terminou };
}

export const duracaoTranscricao = (n: number) => n + 2;

// ---------------------------------------------------------------- tradução

export type PassoTraducao = {
  /** Índice (0 = primeira base do mRNA) da primeira base do códon. */
  pos: number;
  codon: string;
  /** Anticódon do tRNA, escrito 5'→3'. Pareia antiparalelo com o códon. */
  anticodon: string;
  aa: string;
};

export type RoteiroTraducao = {
  /** Onde o primeiro AUG foi encontrado (varredura a partir do 5'); −1 = não há AUG. */
  inicio: number;
  passos: PassoTraducao[];
  /** Códon de parada que encerrou, ou null se o mRNA acabou antes. */
  parada: { pos: number; codon: string } | null;
  proteina: string;
};

/**
 * Tradução com o modelo de varredura: o ribossomo parte do 5' e começa no PRIMEIRO AUG; lê de três
 * em três até um códon de parada. O primeiro aminoácido é sempre metionina.
 */
export function roteiroTraducao(mrna: string, codigo: CodigoGenetico, inicioForcado?: number): RoteiroTraducao {
  const rna = mrna.toUpperCase().replace(/T/g, "U");
  const inicio = inicioForcado ?? rna.indexOf("AUG");
  if (inicio < 0) return { inicio: -1, passos: [], parada: null, proteina: "" };
  const passos: PassoTraducao[] = [];
  let parada: RoteiroTraducao["parada"] = null;
  for (let p = inicio; p + 3 <= rna.length; p += 3) {
    const codon = rna.slice(p, p + 3);
    const aa = p === inicio ? "M" : codigo.aminoacido(codon);
    if (aa === "*") {
      parada = { pos: p, codon };
      break;
    }
    passos.push({ pos: p, codon, anticodon: anticodon(codon), aa });
  }
  return { inicio, passos, parada, proteina: passos.map((x) => x.aa).join("") };
}

export const SIMPLIFICACOES = {
  replicacao: [
    "Um único primer por fragmento, e ele não aparece sendo trocado por DNA.",
    "Sem topoisomerase, proteínas de ligação à fita simples (SSB) nem a outra forquilha da bolha de replicação.",
    "Tamanhos fora de escala: fragmentos de Okazaki reais têm cerca de 1.000–2.000 nucleotídeos em bactérias e 100–200 em eucariotos; aqui são de poucos nucleotídeos.",
  ],
  transcricao: [
    "Sem promotor, fatores de transcrição nem sinal de término: a polimerase começa na primeira base e para na última.",
    "Bolha de cerca de 12 pares e híbrido RNA-DNA de cerca de 8 pares, valores médios descritos para a RNA polimerase.",
    "Sem processamento do RNA (capuz 5', cauda poli-A, splicing).",
  ],
  traducao: [
    "Começa no primeiro AUG a partir do 5' (modelo de varredura), sem sequência de Kozak nem de Shine-Dalgarno.",
    "Cada tRNA aparece com o anticódon perfeitamente complementar; na célula, a 3ª posição admite pareamento oscilante (wobble).",
    "Sem fatores de iniciação, alongamento e liberação desenhados; o ribossomo é uma forma esquemática.",
  ],
} as const;

/** A fita molde 5'→3', para escrever na tela. */
export const moldeDe = (codificante: string) => reversoComplemento(codificante, "dna");

// ---------------------------------------------------------------- tradução no tempo

export type FaseTraducao = "varredura" | "inicio" | "alongamento" | "terminacao" | "fim";

export type EstadoTraducao = {
  fase: FaseTraducao;
  /** Passo (índice em `passos`) cujo tRNA está no sítio P; −1 antes de o primeiro chegar. */
  p: number;
  /** Passo cujo tRNA está entrando/no sítio A; −1 quando não há. */
  a: number;
  /** Progresso dentro do passo atual, de 0 a 1. */
  frac: number;
  /** Cadeia polipeptídica já formada (ligações feitas até agora). */
  peptideo: string;
  /** O polipeptídeo foi liberado (depois da parada). */
  liberado: boolean;
};

/**
 * Linha do tempo da tradução: [0,1) varredura até o AUG; [1,2) o tRNA iniciador (Met) entra no
 * sítio P e a subunidade grande se junta; depois, um passo por códon (o tRNA entra no A, a ligação
 * peptídica transfere a cadeia, o ribossomo anda 3 bases); por fim, parada e separação.
 */
export function estadoTraducao(r: RoteiroTraducao, t: number): EstadoTraducao {
  const P = r.passos.length;
  if (r.inicio < 0 || P === 0) return { fase: "fim", p: -1, a: -1, frac: 0, peptideo: "", liberado: false };
  if (t < 1) return { fase: "varredura", p: -1, a: -1, frac: Math.max(0, t), peptideo: "", liberado: false };
  if (t < 2) return { fase: "inicio", p: 0, a: -1, frac: t - 1, peptideo: r.passos[0].aa, liberado: false };
  const k = Math.floor(t - 2) + 1; // passo que está entrando no sítio A
  const frac = t - 2 - (k - 1);
  if (k < P) {
    // a ligação peptídica acontece na primeira metade do passo
    const ligado = frac >= 0.45;
    return { fase: "alongamento", p: ligado && frac >= 0.55 ? k : k - 1, a: ligado && frac >= 0.55 ? -1 : k, frac, peptideo: r.proteina.slice(0, ligado ? k + 1 : k), liberado: false };
  }
  if (k === P) return { fase: "terminacao", p: P - 1, a: -1, frac, peptideo: r.proteina, liberado: frac >= 0.5 };
  return { fase: "fim", p: -1, a: -1, frac: Math.min(1, frac), peptideo: r.proteina, liberado: true };
}

export const duracaoTraducao = (r: RoteiroTraducao) => (r.passos.length ? 2 + r.passos.length + 1 : 0);
