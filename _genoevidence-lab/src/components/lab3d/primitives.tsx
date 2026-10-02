"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { G } from "./geometry";

type V3 = [number, number, number];

/** Caixa com geometria compartilhada (escala no lugar de nova geometria). */
export function Box({
  size,
  position = [0, 0, 0],
  rotation,
  material,
  shadow = false,
}: {
  size: V3;
  position?: V3;
  rotation?: V3;
  material: THREE.Material;
  shadow?: boolean;
}) {
  return <mesh geometry={G.box} material={material} position={position} rotation={rotation} scale={size} castShadow={shadow} receiveShadow={shadow} />;
}

/** Cilindro vertical (raio, altura) com geometria compartilhada. */
export function Cyl({
  r,
  h,
  position = [0, 0, 0],
  rotation,
  material,
  low = false,
  shadow = false,
}: {
  r: number;
  h: number;
  position?: V3;
  rotation?: V3;
  material: THREE.Material;
  low?: boolean;
  shadow?: boolean;
}) {
  return <mesh geometry={low ? G.cylinderLow : G.cylinder} material={material} position={position} rotation={rotation} scale={[r, h, r]} castShadow={shadow} />;
}

/** Textura desenhada em canvas (rótulos, placas, telas). Atualiza quando `key` muda. */
export function useCanvasTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, key: string, w = 512, h = 256) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [w, h]);
  useEffect(() => {
    const ctx = (texture.image as HTMLCanvasElement).getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
    texture.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, texture]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Placa de texto (sinalização, rótulos de equipamentos). */
export function Label({
  lines,
  width,
  height,
  position,
  rotation,
  bg = "#ffffff",
  fg = "#17201c",
  accent,
  font = 44,
}: {
  lines: string[];
  width: number;
  height: number;
  position: V3;
  rotation?: V3;
  bg?: string;
  fg?: string;
  /** Cor da faixa lateral, ou "marca" para o gradiente do Geno Evidence. */
  accent?: string;
  font?: number;
}) {
  const px = 1024;
  const py = Math.round((px * height) / width);
  const tex = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      if (accent) {
        if (accent === "marca") {
          const gr = ctx.createLinearGradient(0, 0, 0, h);
          gr.addColorStop(0, "#2f5bea");
          gr.addColorStop(0.52, "#7b4de0");
          gr.addColorStop(1, "#e0385a");
          ctx.fillStyle = gr;
        } else ctx.fillStyle = accent;
        ctx.fillRect(0, 0, 18, h);
      }
      ctx.fillStyle = fg;
      ctx.textBaseline = "middle";
      const lh = h / (lines.length + 0.6);
      lines.forEach((l, i) => {
        const mono = l.startsWith("§");
        const text = mono ? l.slice(1) : l;
        ctx.fillStyle = mono ? "#6b7590" : fg;
        ctx.font = mono
          ? `500 ${Math.round(font * 0.62)}px ui-monospace, SFMono-Regular, Menlo, monospace`
          : `${i === 0 ? 700 : 400} ${i === 0 ? font : Math.round(font * 0.72)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        l = text;
        ctx.fillText(l, accent ? 44 : 28, lh * (i + 0.8));
      });
    },
    lines.join("|") + bg + fg,
    px,
    py,
  );
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={tex} roughness={0.8} />
    </mesh>
  );
}
