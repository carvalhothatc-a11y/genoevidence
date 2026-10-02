import type { ZoneId } from "./objects";

export type Vec3 = [number, number, number];
export type CameraView = { position: Vec3; target: Vec3 };

/** Altura do tampo das bancadas (m). Mesa de análise é mais baixa. */
export const BENCH_TOP = 0.9;
export const DESK_TOP = 0.75;

/**
 * Disposição do laboratório (metros, y para cima). Bancadas de preparo e amplificação na parede
 * do fundo (z = −4), eletroforese na parede direita, análise na parede esquerda.
 */
export const BENCHES = {
  pre: { center: [-3.4, 0, -3.62] as Vec3, length: 4.4, depth: 0.75, rotationY: 0 },
  amp: { center: [1.1, 0, -3.62] as Vec3, length: 2.8, depth: 0.75, rotationY: 0 },
  pos: { center: [5.9, 0, -0.9] as Vec3, length: 3.2, depth: 0.75, rotationY: -Math.PI / 2 },
  analise: { center: [-5.9, 0, -0.5] as Vec3, length: 2.0, depth: 0.75, rotationY: Math.PI / 2 },
};

/** Posição (centro da base) de cada objeto clicável. */
export const OBJECT_POS: Record<string, Vec3> = {
  "placa-zona-pre": [-3.4, 2.15, -3.98],
  micropipetas: [-5.25, BENCH_TOP, -3.72],
  ponteiras: [-4.55, BENCH_TOP, -3.6],
  "balde-gelo": [-3.55, BENCH_TOP, -3.55],
  reagentes: [-3.62, BENCH_TOP + 0.09, -3.58],
  "tubos-pcr": [-3.42, BENCH_TOP + 0.09, -3.52],
  "rack-pcr": [-3.42, BENCH_TOP + 0.08, -3.52],
  "rack-microtubos": [-2.75, BENCH_TOP, -3.55],
  "tubo-master-mix": [-2.75, BENCH_TOP + 0.03, -3.55],
  microcentrifuga: [-1.95, BENCH_TOP, -3.58],
  "bancada-pre-pcr": [-3.4, BENCH_TOP, -3.62],
  termociclador: [0.85, BENCH_TOP, -3.62],
  "placa-zona-pos": [6.28, 2.15, -0.9],
  "cuba-eletroforese": [5.82, BENCH_TOP, -1.2],
  "fonte-eletroforese": [5.98, BENCH_TOP, -0.3],
  "micropipeta-pos": [6.02, BENCH_TOP, -2.0],
  computador: [-6.0, DESK_TOP, -0.5],
};

export const ZONE_OF_OBJECT: Record<string, ZoneId> = {
  "placa-zona-pre": "pre",
  micropipetas: "pre",
  ponteiras: "pre",
  "balde-gelo": "pre",
  reagentes: "pre",
  "tubos-pcr": "pre",
  "rack-pcr": "pre",
  "rack-microtubos": "pre",
  "tubo-master-mix": "pre",
  microcentrifuga: "pre",
  "bancada-pre-pcr": "pre",
  termociclador: "amp",
  "placa-zona-pos": "pos",
  "cuba-eletroforese": "pos",
  "fonte-eletroforese": "pos",
  "micropipeta-pos": "pos",
  computador: "analise",
};

export const VIEWS: Record<string, CameraView> = {
  /** Ponto de partida da entrada (alto e afastado). */
  intro: { position: [0, 10.5, 15], target: [0, 0.5, -1.3] },
  geral: { position: [0, 6.0, 8.2], target: [0, 0.5, -1.3] },
  pre: { position: [-3.4, 1.85, -1.15], target: [-3.4, 0.98, -3.6] },
  amp: { position: [1.1, 1.75, -1.5], target: [1.1, 1.0, -3.6] },
  pos: { position: [3.8, 1.8, -0.9], target: [5.9, 0.98, -0.9] },
  analise: { position: [-3.95, 1.45, -0.5], target: [-6.0, 1.0, -0.5] },
};

/** Enquadramentos predefinidos para telas em retrato (celular). */
export const PORTRAIT_VIEWS: Record<string, CameraView> = {
  intro: { position: [0, 9, 12], target: [0, 0.9, -2.6] },
  geral: { position: [-1.4, 6.2, 8.6], target: [-1.4, 0.9, -3.0] },
};

/** Direção "para fora" da bancada (de onde o usuário olha). */
const FACING: Record<ZoneId, Vec3> = { pre: [0, 0, 1], amp: [0, 0, 1], pos: [-1, 0, 0], analise: [1, 0, 0] };

/** Enquadramento de um objeto: câmera à frente e um pouco acima. */
export function objectView(id: string): CameraView | null {
  const p = OBJECT_POS[id];
  const zone = ZONE_OF_OBJECT[id];
  if (!p || !zone) return null;
  const f = FACING[zone];
  const isSign = id.startsWith("placa-");
  const dist = id === "computador" ? 0.95 : id === "termociclador" ? 0.85 : isSign ? 1.8 : id === "bancada-pre-pcr" ? 2.4 : 0.62;
  const lift = isSign ? 0 : id === "computador" ? 0.3 : 0.38;
  const ty = isSign ? p[1] : p[1] + (id === "computador" ? 0.25 : 0.08);
  return {
    target: [p[0], ty, p[2]],
    position: [p[0] + f[0] * dist, ty + lift, p[2] + f[2] * dist],
  };
}

export function viewFor(id: string): CameraView {
  return VIEWS[id] ?? objectView(id) ?? VIEWS.geral;
}
