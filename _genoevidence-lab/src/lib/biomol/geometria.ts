/**
 * Geometria de átomos: distância, ângulo, diedro e superposição com RMSD.
 *
 * Tudo calculado a partir das coordenadas DEPOSITADAS (ou das transformadas pela superposição).
 * Os testes comparam com cálculos independentes (numpy) e com o Mol*.
 */

export type Ponto = { x: number; y: number; z: number };
type V = [number, number, number];

const v = (p: Ponto): V => [p.x, p.y, p.z];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a: V) => Math.sqrt(dot(a, a));

/** Distância em Å. */
export function distancia(a: Ponto, b: Ponto): number {
  return norma(sub(v(a), v(b)));
}

/** Ângulo a–b–c em graus (vértice em b), de 0 a 180. */
export function angulo(a: Ponto, b: Ponto, c: Ponto): number {
  const u = sub(v(a), v(b));
  const w = sub(v(c), v(b));
  const cos = dot(u, w) / (norma(u) * norma(w));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/**
 * Ângulo diedro a–b–c–d em graus, de −180 a 180, na convenção da IUPAC: olhando de b para c,
 * positivo quando a ligação c–d está girada no sentido horário em relação a a–b.
 */
export function diedro(a: Ponto, b: Ponto, c: Ponto, d: Ponto): number {
  const b0 = sub(v(a), v(b));
  const b1 = sub(v(c), v(b));
  const b2 = sub(v(d), v(c));
  const n = norma(b1);
  const b1n: V = [b1[0] / n, b1[1] / n, b1[2] / n];
  const proj = (x: V): V => {
    const k = dot(x, b1n);
    return [x[0] - k * b1n[0], x[1] - k * b1n[1], x[2] - k * b1n[2]];
  };
  const p = proj(b0);
  const q = proj(b2);
  return (Math.atan2(dot(cross(b1n, p), q), dot(p, q)) * 180) / Math.PI;
}

// ---------------------------------------------------------------- superposição

export type Superposicao = {
  /** RMSD depois de superpor, em Å, sobre os `n` pares. */
  rmsd: number;
  /** RMSD sem mover nada (como estavam no arquivo). */
  rmsdAntes: number;
  n: number;
  /** Rotação 3×3 (linhas) aplicada aos pontos MÓVEIS. */
  rotacao: [V, V, V];
  translacao: V;
  /** A mesma transformação em matriz 4×4, em colunas (formato do Mol*). */
  matriz: number[];
  /** Distância de cada par depois de superpor, na ordem dada. */
  desvios: number[];
};

/**
 * Melhor superposição rígida dos pontos `moveis` sobre os `fixos` (mesma ordem = mesmos pares),
 * pelo método do quatérnio de Horn (J Opt Soc Am A 1987;4:629), que dá a mesma resposta que o de
 * Kabsch e nunca devolve um espelhamento. O RMSD é recalculado com os pontos já movidos.
 */
export function superpor(fixos: Ponto[], moveis: Ponto[]): Superposicao {
  const n = fixos.length;
  if (n !== moveis.length) throw new Error("As duas listas de átomos precisam ter o mesmo número de pontos (são pares).");
  if (n < 3) throw new Error("São precisos pelo menos 3 pares de átomos para superpor.");
  const ca: V = [0, 0, 0];
  const cb: V = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    ca[0] += fixos[i].x / n;
    ca[1] += fixos[i].y / n;
    ca[2] += fixos[i].z / n;
    cb[0] += moveis[i].x / n;
    cb[1] += moveis[i].y / n;
    cb[2] += moveis[i].z / n;
  }
  // matriz de correlação S = Σ (b − cb)(a − ca)ᵀ
  let Sxx = 0, Sxy = 0, Sxz = 0, Syx = 0, Syy = 0, Syz = 0, Szx = 0, Szy = 0, Szz = 0;
  for (let i = 0; i < n; i++) {
    const bx = moveis[i].x - cb[0], by = moveis[i].y - cb[1], bz = moveis[i].z - cb[2];
    const ax = fixos[i].x - ca[0], ay = fixos[i].y - ca[1], az = fixos[i].z - ca[2];
    Sxx += bx * ax; Sxy += bx * ay; Sxz += bx * az;
    Syx += by * ax; Syy += by * ay; Syz += by * az;
    Szx += bz * ax; Szy += bz * ay; Szz += bz * az;
  }
  const N = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
  ];
  const [q0, q1, q2, q3] = maiorAutovetor(N);
  const R: [V, V, V] = [
    [q0 * q0 + q1 * q1 - q2 * q2 - q3 * q3, 2 * (q1 * q2 - q0 * q3), 2 * (q1 * q3 + q0 * q2)],
    [2 * (q1 * q2 + q0 * q3), q0 * q0 - q1 * q1 + q2 * q2 - q3 * q3, 2 * (q2 * q3 - q0 * q1)],
    [2 * (q1 * q3 - q0 * q2), 2 * (q2 * q3 + q0 * q1), q0 * q0 - q1 * q1 - q2 * q2 + q3 * q3],
  ];
  const Rcb = [dot(R[0], cb), dot(R[1], cb), dot(R[2], cb)];
  const t: V = [ca[0] - Rcb[0], ca[1] - Rcb[1], ca[2] - Rcb[2]];

  const desvios: number[] = [];
  let soma = 0;
  let somaAntes = 0;
  for (let i = 0; i < n; i++) {
    const b: V = v(moveis[i]);
    const m: V = [dot(R[0], b) + t[0], dot(R[1], b) + t[1], dot(R[2], b) + t[2]];
    const d2 = (m[0] - fixos[i].x) ** 2 + (m[1] - fixos[i].y) ** 2 + (m[2] - fixos[i].z) ** 2;
    desvios.push(Math.sqrt(d2));
    soma += d2;
    somaAntes += (b[0] - fixos[i].x) ** 2 + (b[1] - fixos[i].y) ** 2 + (b[2] - fixos[i].z) ** 2;
  }
  const matriz = [R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, t[0], t[1], t[2], 1];
  return { rmsd: Math.sqrt(soma / n), rmsdAntes: Math.sqrt(somaAntes / n), n, rotacao: R, translacao: t, matriz, desvios };
}

/** Aplica a transformação de uma superposição a um ponto. */
export function aplicar(s: Pick<Superposicao, "rotacao" | "translacao">, p: Ponto): Ponto {
  const b: V = v(p);
  return { x: dot(s.rotacao[0], b) + s.translacao[0], y: dot(s.rotacao[1], b) + s.translacao[1], z: dot(s.rotacao[2], b) + s.translacao[2] };
}

/** Autovetor do maior autovalor de uma matriz simétrica 4×4 (método de Jacobi), normalizado. */
function maiorAutovetor(M: number[][]): [number, number, number, number] {
  const a = M.map((l) => [...l]);
  const vet = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  for (let varredura = 0; varredura < 100; varredura++) {
    let fora = 0;
    for (let p = 0; p < 4; p++) for (let q = p + 1; q < 4; q++) fora += a[p][q] * a[p][q];
    if (fora < 1e-30) break;
    for (let p = 0; p < 4; p++) {
      for (let q = p + 1; q < 4; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 4; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 4; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 4; k++) {
          const vkp = vet[k][p];
          const vkq = vet[k][q];
          vet[k][p] = c * vkp - s * vkq;
          vet[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  let melhor = 0;
  for (let i = 1; i < 4; i++) if (a[i][i] > a[melhor][melhor]) melhor = i;
  const q = [vet[0][melhor], vet[1][melhor], vet[2][melhor], vet[3][melhor]];
  const nq = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / nq, q[1] / nq, q[2] / nq, q[3] / nq];
}
