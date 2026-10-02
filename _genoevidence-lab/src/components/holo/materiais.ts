"use client";
import * as THREE from "three";

/**
 * Materiais holográficos do procedimento 3D (cores da marca: azul #4D7CFF, violeta #8F68FF,
 * rosa do símbolo #E679B5, teal #5FD4DD, âmbar #FFB23F). Todos sem iluminação física:
 * brilho por borda (fresnel) e mistura aditiva, para o efeito de holograma sobre a bancada.
 */
export const COR = {
  azul: new THREE.Color("#4d7cff"),
  violeta: new THREE.Color("#8f68ff"),
  rosa: new THREE.Color("#e679b5"),
  teal: new THREE.Color("#5fd4dd"),
  ambar: new THREE.Color("#ffb23f"),
  branco: new THREE.Color("#eef2f9"),
};

const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vP = position;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform vec3 uCor;
uniform vec3 uBorda;
uniform float uOpacidade;
uniform float uTempo;
uniform float uVarredura;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float linhas = 0.5 + 0.5 * sin(vP.y * 38.0 - uTempo * 2.4);
  float scan = mix(1.0, 0.82 + 0.18 * linhas, uVarredura);
  vec3 cor = mix(uCor, uBorda, f);
  float a = uOpacidade * (0.12 + 0.88 * f) * scan;
  gl_FragColor = vec4(cor * (0.55 + 1.6 * f), a);
}`;

/** Vidro/membrana holográfica (borda brilhante, centro transparente). */
export function holograma(cor: THREE.Color, borda: THREE.Color = COR.branco, opacidade = 0.9, varredura = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uCor: { value: cor.clone() }, uBorda: { value: borda.clone() }, uOpacidade: { value: opacidade }, uTempo: { value: 0 }, uVarredura: { value: varredura } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/** Material sólido luminoso (fitas de DNA, primers, colônias). */
export function luz(cor: THREE.Color, opacidade = 1) {
  return new THREE.MeshBasicMaterial({ color: cor, transparent: opacidade < 1, opacity: opacidade, toneMapped: false });
}

/** Halo aditivo (para simular brilho sem pós-processamento). */
export function halo(cor: THREE.Color, opacidade = 0.28) {
  return new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: opacidade, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}

let texturaBrilho: THREE.Texture | null = null;
/** Textura radial para sprites de brilho e partículas. */
export function brilho(): THREE.Texture {
  if (texturaBrilho) return texturaBrilho;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.25, "rgba(255,255,255,0.55)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  texturaBrilho = new THREE.CanvasTexture(c);
  return texturaBrilho;
}
