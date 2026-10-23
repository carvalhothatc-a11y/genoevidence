"use client";
import { useEffect, useRef, useState } from "react";
import type { MotorMolecular } from "./motor";

export type Rotulo3D = { id: string; texto: string; x: number; y: number; z: number; tom?: "accent" | "violet" | "warn" | "ok" };

const TOM: Record<NonNullable<Rotulo3D["tom"]>, string> = {
  accent: "var(--accent)",
  violet: "var(--violet)",
  warn: "var(--warn)",
  ok: "var(--ok)",
};

/**
 * Rótulos presos a pontos do 3D: um ponto no átomo e uma linha fina até a etiqueta. A posição é
 * recalculada a cada quadro desenhado pelo Mol*, então acompanha o giro e o zoom.
 */
export function Rotulos3D({ motor, rotulos }: { motor: MotorMolecular | null; rotulos: Rotulo3D[] }) {
  const [pos, setPos] = useState<Record<string, { x: number; y: number } | null>>({});
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const svg = useRef<SVGSVGElement>(null);
  const quadro = useRef(0);
  const lista = useRef(rotulos);
  lista.current = rotulos;

  useEffect(() => {
    if (!motor) return;
    // No máximo uma atualização por quadro. Não cancelamos a pendente: o Mol* redesenha a cada
    // quadro enquanto a câmera se move, e cancelar a cada desenho fazia a atualização nunca rodar.
    let agendado = false;
    const atualizar = () => {
      if (agendado) return;
      agendado = true;
      quadro.current = requestAnimationFrame(() => {
        agendado = false;
        const novo: Record<string, { x: number; y: number } | null> = {};
        for (const r of lista.current) novo[r.id] = motor.projetar(r.x, r.y, r.z);
        setPos(novo);
        const b = svg.current?.getBoundingClientRect();
        if (b && (b.width !== tam.w || b.height !== tam.h)) setTam({ w: b.width, h: b.height });
      });
    };
    const parar = motor.aoDesenhar(atualizar);
    atualizar();
    return () => {
      parar();
      cancelAnimationFrame(quadro.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, rotulos]);

  return (
    <svg ref={svg} className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden" aria-hidden="true">
      {rotulos.map((r, i) => {
        const p = pos[r.id];
        if (!p) return null;
        const cor = TOM[r.tom ?? "accent"];
        const largura = Math.max(40, r.texto.length * 6.6 + 14);
        // perto do topo (onde ficam os botões) a etiqueta desce; perto da borda direita, vai para a esquerda
        const desce = p.y < 110;
        const esquerda = tam.w > 0 && p.x + 34 + largura > tam.w - 8;
        const dx = esquerda ? -(26 + (i % 2) * 8) - largura : 26 + (i % 2) * 8;
        const dy = desce ? 30 + (i % 3) * 10 : -26 - (i % 3) * 10;
        return (
          <g key={r.id}>
            <circle cx={p.x} cy={p.y} r={4} fill="none" stroke={cor} strokeWidth={2} />
            <circle cx={p.x} cy={p.y} r={1.6} fill={cor} />
            <line x1={p.x + (esquerda ? -3 : 3)} y1={p.y + (desce ? 3 : -3)} x2={p.x + dx + (esquerda ? largura : 0)} y2={p.y + dy} stroke={cor} strokeWidth={1} opacity={0.85} />
            <rect x={p.x + dx} y={p.y + dy - 11} width={largura} height={22} rx={6} fill="var(--paper)" fillOpacity={0.85} stroke={cor} strokeOpacity={0.6} />
            <text x={p.x + dx + 7} y={p.y + dy + 4} fontSize={12} fontFamily="var(--font-mono)" fill="var(--ink)">
              {r.texto}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
