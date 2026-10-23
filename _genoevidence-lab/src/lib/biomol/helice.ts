/**
 * Geometria ESQUEMÁTICA de uma hélice de ácido nucleico, para desenhar uma sequência digitada.
 *
 * Não é estrutura medida: usa as medidas MÉDIAS da forma B do DNA (Watson & Crick 1953; Arnott,
 * difração de fibras): ~3,4 Å de subida por par, ~10,5 pares por volta, fosfatos a ~9 Å do eixo
 * (diâmetro ~20 Å). Uma sequência real se desvia disso — a estrutura de verdade de uma sequência só
 * se conhece medindo (cristalografia, RMN, crio-ME). A tela diz isso sempre que mostra o esquema.
 *
 * Unidades em Å; eixo da hélice em z. A fita 1 é a sequência dada (5'→3' subindo em z); a fita 2
 * é a complementar, antiparalela (5'→3' descendo).
 */

export const FORMA_B = {
  subida: 3.38,
  paresPorVolta: 10.5,
  raio: 8.9,
  /** Separação angular entre as duas fitas de um par, vista do eixo (lado do sulco menor). */
  sulcoMenor: 140,
} as const;

/** RNA de fita simples: só para mostrar a fita; o dobramento real NÃO é calculado. */
export const FITA_SIMPLES = { subida: 2.8, paresPorVolta: 11, raio: 9.5 } as const;

export type P3 = [number, number, number];

export type NtEsquema = {
  /** Posição na sequência dada (0 = primeira letra). */
  indice: number;
  fita: 1 | 2;
  base: string;
  /** Ponto do esqueleto (fosfato/açúcar) desta base. */
  esqueleto: P3;
  /** Ponta da base (para onde ela aponta: o centro do par ou o eixo). */
  ponta: P3;
};

function ponto(raio: number, anguloGraus: number, z: number): P3 {
  const a = (anguloGraus * Math.PI) / 180;
  return [raio * Math.cos(a), raio * Math.sin(a), z];
}

/**
 * Dupla-hélice: `seq` (fita 1, 5'→3') e `complementar` lida 3'→5' (mesmo índice = par).
 * Devolve os nucleotídeos das duas fitas, centralizados em z.
 */
export function heliceDupla(seq: string, complementar: string, p = FORMA_B): { fita1: NtEsquema[]; fita2: NtEsquema[] } {
  const n = Math.min(seq.length, complementar.length);
  const giro = 360 / p.paresPorVolta;
  const z0 = -((n - 1) * p.subida) / 2;
  const fita1: NtEsquema[] = [];
  const fita2: NtEsquema[] = [];
  for (let i = 0; i < n; i++) {
    const z = z0 + i * p.subida;
    const a = i * giro;
    const e1 = ponto(p.raio, a, z);
    const e2 = ponto(p.raio, a + p.sulcoMenor, z);
    // o par se encontra no meio do segmento entre os dois esqueletos (com uma folga visível)
    const meio: P3 = [(e1[0] + e2[0]) / 2, (e1[1] + e2[1]) / 2, z];
    const ate = (de: P3, k: number): P3 => [de[0] + (meio[0] - de[0]) * k, de[1] + (meio[1] - de[1]) * k, z];
    fita1.push({ indice: i, fita: 1, base: seq[i], esqueleto: e1, ponta: ate(e1, 0.94) });
    fita2.push({ indice: i, fita: 2, base: complementar[i], esqueleto: e2, ponta: ate(e2, 0.94) });
  }
  return { fita1, fita2 };
}

/** Fita simples (RNA): bases apontando para o eixo, sem par. */
export function heliceSimples(seq: string, p = FITA_SIMPLES): NtEsquema[] {
  const giro = 360 / p.paresPorVolta;
  const z0 = -((seq.length - 1) * p.subida) / 2;
  return [...seq].map((base, i) => {
    const z = z0 + i * p.subida;
    const e = ponto(p.raio, i * giro, z);
    return { indice: i, fita: 1 as const, base, esqueleto: e, ponta: [e[0] * 0.35, e[1] * 0.35, z] as P3 };
  });
}
