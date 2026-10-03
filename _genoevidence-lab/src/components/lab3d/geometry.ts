import * as THREE from "three";

/** Geometrias compartilhadas (perfis de revolução para tubos, ponteiras e pipetas). */
function lathe(points: [number, number][], segments = 20) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

export const G = {
  /** Microtubo de 1,5–2 mL (~10,8 mm de diâmetro, ~39 mm de altura), fundo cônico. */
  microTube: lathe([
    [0, 0],
    [0.0012, 0.0005],
    [0.0035, 0.008],
    [0.0052, 0.018],
    [0.0054, 0.039],
    [0.0062, 0.039],
    [0.0062, 0.0405],
    [0.0, 0.0405],
  ]),
  microTubeLiquid: lathe([
    [0, 0.0006],
    [0.0032, 0.008],
    [0.0048, 0.017],
    [0.0049, 0.022],
    [0, 0.022],
  ]),
  /** Tubo de PCR de 0,2 mL (~6 mm na boca, ~20 mm de altura). */
  pcrTube: lathe([
    [0, 0],
    [0.0008, 0.0004],
    [0.0024, 0.009],
    [0.0031, 0.016],
    [0.0032, 0.0205],
    [0.0038, 0.0205],
    [0.0038, 0.0215],
    [0, 0.0215],
  ]),
  /** Ponteira genérica (escalada por tipo). */
  tip: lathe(
    [
      [0, 0],
      [0.0007, 0.0004],
      [0.0016, 0.03],
      [0.0032, 0.05],
      [0.0036, 0.058],
      [0.0, 0.058],
    ],
    10,
  ),
  /** Cone de acoplamento da micropipeta. */
  pipetteShaft: lathe(
    [
      [0.0, 0],
      [0.0022, 0.0],
      [0.0036, 0.035],
      [0.0058, 0.07],
      [0.0072, 0.085],
      [0, 0.085],
    ],
    16,
  ),
  wellCylinder: new THREE.CylinderGeometry(0.0028, 0.0024, 0.004, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 24),
  cylinderLow: new THREE.CylinderGeometry(1, 1, 1, 12),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  ring: new THREE.RingGeometry(0.955, 1, 64),
};
