"use client";
import * as THREE from "three";
import { OBJECT_POS, ZONE_OF_OBJECT, type Vec3 } from "@/lib/lab/layout";
import type { ZoneId } from "@/lib/lab/objects";

/**
 * Registro de pontos de interesse. Os botões são elementos DOM comuns (fora do canvas),
 * posicionados a cada quadro renderizado pela projeção da câmera.
 */
type Entry = { el: HTMLElement; pos: THREE.Vector3 };
export const hotspotRegistry = new Map<string, Entry>();
let invalidateFn: (() => void) | null = null;

export function setHotspotInvalidator(fn: (() => void) | null) {
  invalidateFn = fn;
}

export function registerHotspot(key: string, el: HTMLElement | null, pos: Vec3) {
  if (el) hotspotRegistry.set(key, { el, pos: new THREE.Vector3(...pos) });
  else hotspotRegistry.delete(key);
  invalidateFn?.();
}

const v = new THREE.Vector3();
export function projectHotspots(camera: THREE.Camera, width: number, height: number) {
  for (const { el, pos } of hotspotRegistry.values()) {
    v.copy(pos).project(camera);
    const visible = v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
    const x = (v.x * 0.5 + 0.5) * width;
    const y = (-v.y * 0.5 + 0.5) * height;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    el.style.visibility = visible ? "visible" : "hidden";
  }
}

export const ZONE_ANCHOR: Record<ZoneId, Vec3> = {
  pre: [-3.4, 1.45, -3.35],
  amp: [1.1, 1.45, -3.35],
  pos: [5.65, 1.45, -0.9],
  analise: [-5.75, 1.55, -0.5],
};

/** Objetos sem ponto de interesse próprio (acessíveis pela lista 2D ou por um objeto vizinho). */
export const HIDDEN_HOTSPOTS = new Set(["placa-zona-pre", "placa-zona-pos", "bancada-pre-pcr", "rack-pcr", "rack-microtubos"]);

/** Deslocamento do rótulo em relação à base do objeto, para evitar sobreposição. */
const HOTSPOT_OFFSET: Record<string, Vec3> = {
  computador: [0, 0.62, 0],
  micropipetas: [0, 0.42, 0],
  "micropipeta-pos": [0, 0.42, 0],
  termociclador: [0, 0.3, 0],
  ponteiras: [0, 0.16, 0],
  "balde-gelo": [0.09, 0.2, 0.05],
  reagentes: [-0.06, 0.09, 0],
  "tubos-pcr": [0.09, 0.07, 0.05],
  "tubo-master-mix": [0, 0.13, 0],
  microcentrifuga: [0, 0.17, 0],
  "cuba-eletroforese": [0, 0.17, 0],
  "fonte-eletroforese": [0, 0.19, 0],
};

export function hotspotPosition(id: string): Vec3 {
  const p = OBJECT_POS[id];
  const o = HOTSPOT_OFFSET[id] ?? [0, 0.17, 0];
  return [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
}

/** Itens internos que só ganham rótulo quando o objeto que os contém está em foco. */
const NESTED: Record<string, string[]> = { "balde-gelo": ["reagentes", "tubos-pcr"] };
const NESTED_IDS = new Set(Object.values(NESTED).flat());

export function objectsOfZone(zone: ZoneId, view: string): string[] {
  const parent = Object.keys(NESTED).find((k) => k === view || NESTED[k].includes(view));
  return Object.keys(ZONE_OF_OBJECT).filter(
    (id) => ZONE_OF_OBJECT[id] === zone && !HIDDEN_HOTSPOTS.has(id) && (!NESTED_IDS.has(id) || (parent && NESTED[parent].includes(id))),
  );
}
