/**
 * Modelos explícitos do módulo de PCR. Cada função corresponde a um "cartão de modelo"
 * em lib/modules/pcr/content.ts, com pressupostos, domínio de validade e limitações.
 * Nenhuma função aqui prevê rendimento real ou sucesso de uma reação.
 */

// ---------------------------------------------------------------- Modelo exponencial idealizado

export type CopyPoint = { cycle: number; copies: number };

/** N(n) = N0·(1+E)^n. E e N0 são escolhidos pelo usuário; o modelo não os estima. */
export function idealizedCopies(N0: number, E: number, cycles: number): CopyPoint[] {
  if (!Number.isFinite(N0) || N0 < 1) throw new RangeError("N₀ deve ser ≥ 1.");
  if (!Number.isFinite(E) || E < 0 || E > 1) throw new RangeError("E deve estar entre 0 e 1.");
  if (!Number.isInteger(cycles) || cycles < 0 || cycles > 45) throw new RangeError("Ciclos devem estar entre 0 e 45.");
  const out: CopyPoint[] = [];
  for (let n = 0; n <= cycles; n++) out.push({ cycle: n, copies: N0 * Math.pow(1 + E, n) });
  return out;
}

// ---------------------------------------------------------------- Contagem idealizada de fitas

export type StrandCount = {
  cycle: number;
  /** Fitas do molde original (sempre 2 por molécula-molde de fita dupla). */
  original: number;
  /** Fitas com uma extremidade definida pelo primer e outra indefinida. */
  long: number;
  /** Fitas com as duas extremidades definidas pelos primers (tamanho exato). */
  short: number;
  /** Duplexes formados apenas por fitas de tamanho exato. */
  exactDuplexes: number;
  totalDuplexes: number;
};

/**
 * Simulação discreta por tipo de fita, eficiência 100%, por molécula-molde de fita dupla.
 * Regras: molde original → gera fita longa; fita longa → gera fita curta; fita curta → gera fita curta.
 * Resultado conhecido: duplexes de tamanho exato = 2^n − 2n (verificado nos testes).
 */
export function strandCounts(maxCycle: number): StrandCount[] {
  if (!Number.isInteger(maxCycle) || maxCycle < 0 || maxCycle > 45) throw new RangeError("Ciclo deve estar entre 0 e 45.");
  const out: StrandCount[] = [];
  let original = 2;
  let long = 0;
  let short = 0;
  // Duplexes: cada fita nova pareia com seu molde. Duplex exato = fita curta pareada com fita curta.
  let exactDuplexes = 0;
  out.push({ cycle: 0, original, long, short, exactDuplexes, totalDuplexes: 1 });
  for (let n = 1; n <= maxCycle; n++) {
    const newLongFromOriginal = original; // cada fita original gera uma longa
    const newShortFromLong = long; // cada longa gera uma curta (duplex longa:curta)
    const newShortFromShort = short; // cada curta gera uma curta (duplex curta:curta)
    long += newLongFromOriginal;
    short += newShortFromLong + newShortFromShort;
    exactDuplexes = newShortFromShort;
    out.push({ cycle: n, original, long, short, exactDuplexes, totalDuplexes: Math.pow(2, n) });
  }
  return out;
}

// ---------------------------------------------------------------- Perfil térmico

export type CyclingProgram = {
  initialDenaturation: { tempC: number; seconds: number };
  cycles: number;
  denaturation: { tempC: number; seconds: number };
  annealing: { tempC: number; seconds: number };
  extension: { tempC: number; seconds: number };
  finalExtension: { tempC: number; seconds: number };
  holdC: number;
};

export type ProfileSegment = { label: string; tempC: number; startSec: number; seconds: number; cycle?: number };

/** Padrão da Tabela 2 de Lorenz (2012), com valores dentro das faixas citadas. */
export const DEFAULT_PROGRAM: CyclingProgram = {
  initialDenaturation: { tempC: 94, seconds: 60 },
  cycles: 30,
  denaturation: { tempC: 94, seconds: 30 },
  annealing: { tempC: 55, seconds: 30 },
  extension: { tempC: 72, seconds: 60 },
  finalExtension: { tempC: 72, seconds: 300 },
  holdC: 4,
};

export function validateProgram(p: CyclingProgram): string[] {
  const errors: string[] = [];
  const steps: [string, { tempC: number; seconds: number }][] = [
    ["Desnaturação inicial", p.initialDenaturation],
    ["Desnaturação", p.denaturation],
    ["Anelamento", p.annealing],
    ["Extensão", p.extension],
    ["Extensão final", p.finalExtension],
  ];
  for (const [label, s] of steps) {
    if (!Number.isFinite(s.tempC) || s.tempC < 4 || s.tempC > 99) errors.push(`${label}: temperatura fora de 4–99 °C.`);
    if (!Number.isFinite(s.seconds) || s.seconds <= 0 || s.seconds > 3600) errors.push(`${label}: tempo deve estar entre 1 s e 60 min.`);
  }
  if (!Number.isInteger(p.cycles) || p.cycles < 1 || p.cycles > 60) errors.push("Número de ciclos deve ser inteiro entre 1 e 60.");
  if (p.annealing.tempC >= p.denaturation.tempC) errors.push("Anelamento deve ser mais frio que a desnaturação.");
  return errors;
}

/** Aritmética do programa (rampas excluídas). Não é medição do equipamento. */
export function thermalProfile(p: CyclingProgram, maxDetailedCycles = 3): { segments: ProfileSegment[]; totalSeconds: number } {
  const segments: ProfileSegment[] = [];
  let t = 0;
  const push = (label: string, s: { tempC: number; seconds: number }, cycle?: number) => {
    segments.push({ label, tempC: s.tempC, startSec: t, seconds: s.seconds, cycle });
    t += s.seconds;
  };
  push("Desnaturação inicial", p.initialDenaturation);
  for (let c = 1; c <= p.cycles; c++) {
    const detailed = c <= maxDetailedCycles || c === p.cycles;
    if (detailed) {
      push("Desnaturação", p.denaturation, c);
      push("Anelamento", p.annealing, c);
      push("Extensão", p.extension, c);
    } else {
      t += p.denaturation.seconds + p.annealing.seconds + p.extension.seconds;
    }
  }
  push("Extensão final", p.finalExtension);
  return { segments, totalSeconds: t };
}

// ---------------------------------------------------------------- Regra de tempo de extensão (Lorenz 2012, §6)

export type Polymerase = "taq" | "pfu" | "outra";

export function extensionRule(ampliconBp: number, polymerase: Polymerase): { seconds: number | null; text: string; locator: string } {
  if (!Number.isFinite(ampliconBp) || ampliconBp < 20) return { seconds: null, text: "Informe o tamanho do amplicon (≥ 20 pb).", locator: "" };
  if (polymerase === "taq") {
    const extraKb = Math.max(0, Math.ceil((ampliconBp - 2000) / 1000));
    return {
      seconds: 60 + 60 * extraKb,
      text: "Taq: cerca de 1 min para os primeiros 2 kb e 1 min adicional por kb.",
      locator: "§6",
    };
  }
  if (polymerase === "pfu") {
    return { seconds: 120 * Math.max(1, Math.ceil(ampliconBp / 1000)), text: "Pfu: cerca de 2 min por kb.", locator: "§6" };
  }
  return { seconds: null, text: "Para outras polimerases, use a recomendação do fabricante. O sistema não estima este valor.", locator: "§6" };
}

// ---------------------------------------------------------------- Posição de banda (ilustração)

/** Marcador ILUSTRATIVO (genérico), não corresponde a um produto comercial. */
export const ILLUSTRATIVE_LADDER_BP = [3000, 2000, 1500, 1000, 700, 500, 400, 300, 200, 100];

const TOP = 0.1;
const BOTTOM = 0.9;

/**
 * Posição relativa (0 = poço, 1 = fim do gel) assumindo distância linear em log10(tamanho)
 * dentro da faixa do marcador (Lee et al., 2012). Fora da faixa: null.
 */
export function bandPosition(sizeBp: number, ladder = ILLUSTRATIVE_LADDER_BP): number | null {
  const max = Math.max(...ladder);
  const min = Math.min(...ladder);
  if (!Number.isFinite(sizeBp) || sizeBp < min || sizeBp > max) return null;
  const f = (Math.log10(max) - Math.log10(sizeBp)) / (Math.log10(max) - Math.log10(min));
  return TOP + f * (BOTTOM - TOP);
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  return [h ? `${h} h` : "", m ? `${m} min` : "", s || (!h && !m) ? `${s} s` : ""].filter(Boolean).join(" ");
}
