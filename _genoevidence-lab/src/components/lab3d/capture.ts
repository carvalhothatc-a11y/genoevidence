"use client";
import type { LabScene } from "@/lib/lab/scenes";
import { dataHora } from "@/lib/datas";

/**
 * Captura do quadro atual do laboratório 3D. O canvas usa preserveDrawingBuffer=false (desempenho),
 * então a captura renderiza um quadro e lê os pixels na mesma tarefa.
 */
let captureFn: (() => string | null) | null = null;

export function setLabCapture(fn: (() => string | null) | null) {
  captureFn = fn;
}

export function captureLabFrame(): string | null {
  try {
    return captureFn?.() ?? null;
  } catch {
    return null;
  }
}

/** Compõe a imagem final: quadro 3D + faixa com a descrição e a identificação de ilustração didática. */
export async function composeImage(frame: string, scene: LabScene, text: string, at: Date): Promise<string | null> {
  const img = new Image();
  img.src = frame;
  await img.decode().catch(() => undefined);
  if (!img.width) return null;
  const pad = Math.round(img.width * 0.025);
  const band = Math.round(Math.max(150, img.width * 0.12));
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height + band;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  ctx.drawImage(img, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, img.height, c.width, band);
  const grad = ctx.createLinearGradient(0, 0, c.width, 0);
  grad.addColorStop(0, "#2F5BEA");
  grad.addColorStop(0.55, "#7B4DE0");
  grad.addColorStop(1, "#E0385A");
  ctx.fillStyle = grad;
  ctx.fillRect(0, img.height, c.width, Math.max(4, Math.round(band * 0.04)));
  const base = Math.round(band / 7.5);
  ctx.fillStyle = "#0f1730";
  ctx.font = `700 ${Math.round(base * 1.15)}px ${family}`;
  ctx.fillText(scene.title, pad, img.height + base * 2);
  ctx.fillStyle = "#3a4560";
  ctx.font = `400 ${base}px ${family}`;
  const quote = `“${text.length > 140 ? text.slice(0, 137) + "…" : text}”`;
  ctx.fillText(quote, pad, img.height + base * 3.6, c.width - pad * 2);
  ctx.fillStyle = "#6b7590";
  ctx.font = `400 ${Math.round(base * 0.82)}px ${family}`;
  ctx.fillText(
    `Ilustração didática gerada a partir do modelo 3D do GenoLab · não é foto do experimento · ${dataHora(at)}`,
    pad,
    img.height + base * 5.4,
    c.width - pad * 2,
  );
  return c.toDataURL("image/png");
}
