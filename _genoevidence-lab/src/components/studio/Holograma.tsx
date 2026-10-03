"use client";
import { useEffect, useRef } from "react";
import type { MolecularPhase } from "@/lib/modules/contract";
import { hotspotPosition, registerHotspot } from "@/components/lab3d/hotspots";
import type { Vec3 } from "@/lib/lab/layout";

const LEGENDA: Record<MolecularPhase, { titulo: string; texto: string; rotulos: string[] }> = {
  inicio: { titulo: "Antes da ciclagem", texto: "Molde de fita dupla com primers, dNTPs, Mg²⁺ e polimerase no tubo.", rotulos: ["Fita dupla (molde)"] },
  desnaturacao: { titulo: "Desnaturação", texto: "Temperatura alta: as fitas do molde se separam.", rotulos: ["Fita molde", "Fita molde"] },
  anelamento: { titulo: "Anelamento", texto: "Cada primer pareia com a sequência complementar de uma fita.", rotulos: ["Fita molde", "Primers"] },
  extensao: { titulo: "Extensão", texto: "A polimerase estende cada primer copiando a fita-molde.", rotulos: ["Nova fita", "Polimerase"] },
  produtos: { titulo: "Fim do ciclo (idealizado)", texto: "Duas moléculas de fita dupla onde havia uma.", rotulos: ["2 × fita dupla"] },
};

/** Pontos de uma senoide ao longo da diagonal do círculo (coordenadas do viewBox 0–200). */
function fita(fase: number, deslocY: number, amp: number) {
  const pts: string[] = [];
  for (let x = -10; x <= 210; x += 5) {
    const y = 100 + deslocY + amp * Math.sin(x / 15 + fase);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

/**
 * Holograma molecular — ILUSTRAÇÃO DIDÁTICA de um ciclo de PCR, ancorada no equipamento em foco.
 * Escala, forma, número de moléculas e velocidade não são reais.
 */
export function Holograma({ fase, ancora, pausado, temperatura }: { fase: MolecularPhase; ancora: string; pausado: boolean; temperatura?: number | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const p = hotspotPosition(ancora);
    const pos: Vec3 = [p[0], p[1] - 0.05, p[2]];
    registerHotspot("holograma", ref.current, pos);
    return () => registerHotspot("holograma", null, pos);
  }, [ancora]);

  const sep = fase === "inicio" || fase === "produtos" ? 0 : 1;
  const primers = fase === "anelamento" || fase === "extensao" || fase === "produtos";
  const estende = fase === "extensao" || fase === "produtos";
  const leg = LEGENDA[fase];
  const anim = pausado ? "" : "ge-helix-drift";

  return (
    <div ref={ref} className="pointer-events-none absolute left-0 top-0 z-10" style={{ visibility: "hidden" }} data-holograma={fase}>
      {/* conector do objeto até o holograma (à esquerda do objeto, para não cobrir o painel) */}
      <svg className="absolute left-0 top-0 h-[1px] w-[1px] overflow-visible" aria-hidden="true">
        <path d="M0 0 C -50 4, -110 10, -150 10" stroke="url(#holoLinha)" strokeWidth="1.5" fill="none" strokeDasharray="3 4" />
        <circle cx="0" cy="0" r="3.5" fill="#e679b5" />
      </svg>
      <div className="absolute left-0 top-0" style={{ transform: "translate(-380px, -150px)" }}>
        <svg className="hidden" aria-hidden="true">
          <defs>
            <linearGradient id="holoLinha" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#b49cf5" stopOpacity="0.1" />
              <stop offset="1" stopColor="#e679b5" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
        <figure className="pointer-events-auto relative grid w-[230px] gap-2" aria-label={`Ilustração didática: ${leg.titulo}. ${leg.texto}`}>
          <div className={`ge-holo ${pausado ? "" : "ge-holo-anim"} relative h-[200px] w-[200px] overflow-hidden`}>
            <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
              <defs>
                <linearGradient id="fitaA" x1="0" x2="1">
                  <stop offset="0" stopColor="#4d7cff" />
                  <stop offset="1" stopColor="#8f68ff" />
                </linearGradient>
                <linearGradient id="fitaB" x1="0" x2="1">
                  <stop offset="0" stopColor="#e679b5" />
                  <stop offset="1" stopColor="#b49cf5" />
                </linearGradient>
                <filter id="brilho" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g transform="rotate(-28 100 100)" filter="url(#brilho)">
                <g className={anim}>
                  {/* pontes (pares de bases) — somem quando as fitas se separam */}
                  <g stroke="#c9d2ff" strokeWidth="1.6" style={{ opacity: sep ? 0 : 0.55, transition: "opacity 700ms ease" }}>
                    {Array.from({ length: 14 }, (_, i) => {
                      const x = 4 + i * 15;
                      const ya = 100 + 18 * Math.sin(x / 15);
                      const yb = 100 + 18 * Math.sin(x / 15 + Math.PI);
                      return <line key={i} x1={x} x2={x} y1={ya} y2={yb} />;
                    })}
                  </g>
                  <g style={{ transform: `translateY(${sep ? -34 : 0}px)`, transition: "transform 900ms cubic-bezier(.2,.8,.2,1)" }}>
                    <polyline points={fita(0, 0, sep ? 7 : 18)} fill="none" stroke="url(#fitaA)" strokeWidth="5" strokeLinecap="round" />
                    {primers && <rect x="128" y="104" width="34" height="6" rx="3" fill="#5fd4dd" style={{ transition: "opacity 500ms" }} />}
                    {estende && <rect x="20" y="104" width="108" height="6" rx="3" fill="#b49cf5" opacity="0.85" className={pausado ? "" : "ge-grow-l"} />}
                  </g>
                  <g style={{ transform: `translateY(${sep ? 34 : 0}px)`, transition: "transform 900ms cubic-bezier(.2,.8,.2,1)" }}>
                    <polyline points={fita(Math.PI, 0, sep ? 7 : 18)} fill="none" stroke="url(#fitaB)" strokeWidth="5" strokeLinecap="round" />
                    {primers && <rect x="38" y="90" width="34" height="6" rx="3" fill="#5fd4dd" />}
                    {estende && <rect x="72" y="90" width="108" height="6" rx="3" fill="#b49cf5" opacity="0.85" className={pausado ? "" : "ge-grow-r"} />}
                  </g>
                  {fase === "extensao" && (
                    <g>
                      <circle cx="128" cy="73" r="9" fill="#ffb23f" opacity="0.9" />
                      <circle cx="72" cy="127" r="9" fill="#ffb23f" opacity="0.9" />
                    </g>
                  )}
                </g>
              </g>
            </svg>
            {temperatura !== undefined && temperatura !== null && (
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2 py-0.5 font-mono text-[11px] text-white">{temperatura} °C</span>
            )}
          </div>
          <div className="rounded-xl bg-black/45 px-3 py-2 text-[12px] leading-snug text-[#c9d2e3] backdrop-blur">
            <p className="font-semibold text-white">{leg.titulo}</p>
            <p>{leg.texto}</p>
            <p className="mt-1 flex flex-wrap gap-1">
              {leg.rotulos.map((r, i) => (
                <span key={i} className="rounded-full border border-white/15 px-1.5 text-[10px]">
                  {r}
                </span>
              ))}
            </p>
            <p className="mt-1 text-[10px] text-[#b49cf5]">✎ Ilustração didática · escala e número de moléculas não são reais</p>
          </div>
        </figure>
      </div>
    </div>
  );
}
