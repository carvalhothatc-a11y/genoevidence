"use client";
import * as THREE from "three";

/**
 * Rótulos do procedimento 3D: âncoras (Object3D) dentro da cena e caixas DOM com linha de chamada,
 * projetadas a cada quadro. Mantém o texto nítido e acessível (fora do WebGL).
 */
type Entrada = { obj: THREE.Object3D; caixa: HTMLElement | null; linha: SVGLineElement | null; ponto: SVGCircleElement | null; dx: number; dy: number };
const registro = new Map<string, Entrada>();
const v = new THREE.Vector3();

export function registrarAncora(chave: string, obj: THREE.Object3D | null, dx: number, dy: number) {
  const e = registro.get(chave);
  if (!obj) {
    if (e) e.obj = new THREE.Object3D();
    return;
  }
  if (e) Object.assign(e, { obj, dx, dy });
  else registro.set(chave, { obj, caixa: null, linha: null, ponto: null, dx, dy });
}

export function registrarCaixa(chave: string, caixa: HTMLElement | null, linha: SVGLineElement | null, ponto: SVGCircleElement | null) {
  const e = registro.get(chave);
  if (e) Object.assign(e, { caixa, linha, ponto });
  else registro.set(chave, { obj: new THREE.Object3D(), caixa, linha, ponto, dx: 0, dy: 0 });
}

export function removerRotulo(chave: string) {
  registro.delete(chave);
}

/** Posiciona caixas e linhas conforme a câmera (chamado no useFrame do canvas do holograma). */
export function projetarRotulos(camera: THREE.Camera, w: number, h: number) {
  for (const e of registro.values()) {
    if (!e.caixa) continue;
    e.obj.getWorldPosition(v);
    v.project(camera);
    const visivel = v.z > -1 && v.z < 1 && e.obj.parent !== null;
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    const larg = e.caixa.offsetWidth || 160;
    // mantém a caixa inteira dentro do quadro (à esquerda: alinhada pela direita)
    const bx = e.dx < 0 ? Math.max(8 + larg, Math.min(w - 8, x + e.dx)) : Math.max(8, Math.min(w - 8 - larg, x + e.dx));
    const by = Math.max(8, Math.min(h - 8, y + e.dy));
    e.caixa.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) translate(${e.dx < 0 ? "-100%" : "0"}, -50%)`;
    e.caixa.style.visibility = visivel ? "visible" : "hidden";
    if (e.linha) {
      e.linha.setAttribute("x1", x.toFixed(1));
      e.linha.setAttribute("y1", y.toFixed(1));
      e.linha.setAttribute("x2", (bx + (e.dx < 0 ? 4 : -4)).toFixed(1));
      e.linha.setAttribute("y2", by.toFixed(1));
      e.linha.style.visibility = visivel ? "visible" : "hidden";
    }
    if (e.ponto) {
      e.ponto.setAttribute("cx", x.toFixed(1));
      e.ponto.setAttribute("cy", y.toFixed(1));
      e.ponto.style.visibility = visivel ? "visible" : "hidden";
    }
  }
}

/** Posições atuais dos rótulos visíveis (para compor a imagem exportada). */
export function rotulosVisiveis(): { texto: string; sub?: string; ax: number; ay: number; bx: number; by: number; esquerda: boolean }[] {
  const out: { texto: string; sub?: string; ax: number; ay: number; bx: number; by: number; esquerda: boolean }[] = [];
  for (const e of registro.values()) {
    if (!e.caixa || !e.linha || e.caixa.style.visibility === "hidden") continue;
    out.push({
      texto: e.caixa.dataset.texto ?? "",
      sub: e.caixa.dataset.sub || undefined,
      ax: Number(e.linha.getAttribute("x1")),
      ay: Number(e.linha.getAttribute("y1")),
      bx: Number(e.linha.getAttribute("x2")),
      by: Number(e.linha.getAttribute("y2")),
      esquerda: e.dx < 0,
    });
  }
  return out;
}
