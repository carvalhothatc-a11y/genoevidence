import * as THREE from "three";

/**
 * Materiais compartilhados (criados uma única vez e reutilizados por todos os objetos).
 * Valores escolhidos para aparência sóbria: sem brilho excessivo nem emissivos fortes.
 */
function std(color: string, roughness: number, metalness = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

export const M = {
  floor: std("#ffffff", 0.82),
  wall: std("#e7e9ee", 0.95),
  baseboard: std("#5c6273", 0.7),
  benchTop: std("#2e3432", 0.42),
  benchTopEdge: std("#262b29", 0.5),
  cabinet: std("#d9dde4", 0.6),
  cabinetDoor: std("#e3e6ec", 0.52),
  kick: std("#3c403e", 0.8),
  steel: std("#b9bdbf", 0.32, 0.85),
  steelDark: std("#7d8285", 0.38, 0.8),
  shelf: std("#f2f2ef", 0.6),
  whitePlastic: std("#f3f3ef", 0.42),
  greyPlastic: std("#9aa09d", 0.5),
  darkPlastic: std("#2b2f31", 0.48),
  charcoal: std("#1e2224", 0.55),
  bluePlastic: std("#2d64b5", 0.45),
  aluminum: std("#c7cbcd", 0.35, 0.75),
  screen: std("#0e1a1f", 0.25, 0.1),
  rubberRed: std("#b3261e", 0.6),
  rubberBlack: std("#1c1c1c", 0.6),
  ice: std("#e8f3f7", 0.18, 0, { transparent: true, opacity: 0.92 }),
  styrofoam: std("#f6f7f8", 0.95),
  agarose: new THREE.MeshPhysicalMaterial({ color: "#dfe9ee", roughness: 0.35, transparent: true, opacity: 0.75 }),
  buffer: new THREE.MeshPhysicalMaterial({ color: "#cfe3ea", roughness: 0.08, transparent: true, opacity: 0.28 }),
  acrylic: new THREE.MeshPhysicalMaterial({ color: "#e9f3f6", roughness: 0.06, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
  tubePlastic: new THREE.MeshPhysicalMaterial({ color: "#f4f1e6", roughness: 0.3, transparent: true, opacity: 0.62 }),
  liquid: std("#d9e8ee", 0.15, 0, { transparent: true, opacity: 0.8 }),
  tipClear: new THREE.MeshPhysicalMaterial({ color: "#eef0ea", roughness: 0.35, transparent: true, opacity: 0.8 }),
  tipYellow: std("#e9c33b", 0.45),
  tipBlue: std("#3f7fd0", 0.45),
  /* Seleção em azul da marca; hover em violeta translúcido (Geno Evidence) */
  selection: new THREE.MeshBasicMaterial({ color: "#2f5bea", transparent: true, opacity: 0.85, depthWrite: false }),
  hover: new THREE.MeshBasicMaterial({ color: "#7b4de0", transparent: true, opacity: 0.45, depthWrite: false }),
  wood: std("#a07a52", 0.7),
  fabric: std("#3a4a55", 0.9),
};

/** Cores de tampas de reagentes (apenas identificação visual; não seguem convenção oficial). */
export const CAP_COLORS: Record<string, string> = {
  agua: "#f4f4f2",
  tampao: "#2f7ed8",
  dntps: "#e0a422",
  mgcl2: "#7a8a96",
  "primer-f": "#3aa36b",
  "primer-r": "#2f8f5c",
  molde: "#c4473f",
  polimerase: "#8a5cc2",
};

const capCache = new Map<string, THREE.MeshStandardMaterial>();
export function capMaterial(color: string) {
  if (!capCache.has(color)) capCache.set(color, std(color, 0.45));
  return capCache.get(color)!;
}

/** Textura discreta de piso vinílico em placas de 60 cm (canvas, sem download). */
let floorTex: THREE.CanvasTexture | null = null;
export function floorTexture(): THREE.CanvasTexture {
  if (floorTex) return floorTex;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c3c8cf";
  g.fillRect(0, 0, 512, 512);
  // variação sutil entre placas
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)";
      g.fillRect(i * 256, j * 256, 256, 256);
    }
  g.strokeStyle = "rgba(60,66,80,0.22)";
  g.lineWidth = 2;
  for (let k = 0; k <= 512; k += 256) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, k);
    g.lineTo(512, k);
    g.stroke();
  }
  floorTex = new THREE.CanvasTexture(c);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(12.6 / 1.2, 9 / 1.2);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.anisotropy = 8;
  return floorTex;
}
