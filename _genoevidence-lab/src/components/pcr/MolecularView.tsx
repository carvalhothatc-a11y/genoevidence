"use client";
import type { MolecularPhase } from "@/lib/modules/contract";
import { VisualKindBadge } from "@/components/ui/Badges";

const CAPTION: Record<MolecularPhase, { title: string; text: string }> = {
  inicio: {
    title: "Antes da ciclagem",
    text: "Molde de fita dupla, primers, dNTPs, Mg²⁺ e polimerase misturados no tubo.",
  },
  desnaturacao: {
    title: "Desnaturação",
    text: "Temperatura alta: as duas fitas do molde se separam.",
  },
  anelamento: {
    title: "Anelamento",
    text: "Temperatura mais baixa: cada primer pareia com a sequência complementar em uma das fitas (F na fita de baixo, R na de cima).",
  },
  extensao: {
    title: "Extensão",
    text: "A polimerase acrescenta nucleotídeos à extremidade 3' de cada primer, copiando a fita-molde.",
  },
  produtos: {
    title: "Fim de um ciclo (idealizado)",
    text: "Cada fita original agora está pareada com uma fita nova: duas moléculas onde havia uma.",
  },
};

const X0 = 70;
const X1 = 570;
const F = [130, 200] as const; // sítio do primer F (na fita de baixo)
const R = [440, 510] as const; // sítio do primer R (na fita de cima)

function Ticks({ y1, y2, from, to }: { y1: number; y2: number; from: number; to: number }) {
  const xs = [];
  for (let x = from + 8; x < to; x += 14) xs.push(x);
  return (
    <g stroke="#8a948f" strokeWidth={1.4}>
      {xs.map((x) => (
        <line key={x} x1={x} x2={x} y1={y1 + 4} y2={y2 - 4} />
      ))}
    </g>
  );
}

/**
 * ILUSTRAÇÃO DIDÁTICA de um ciclo de PCR. Escala, forma, número de moléculas e velocidade
 * não correspondem a valores reais. Sincronizada com a etapa/fase atual.
 */
export function MolecularView({ phase, cycle, paused, compact = false, tempC }: { phase: MolecularPhase; cycle?: number; paused: boolean; compact?: boolean; tempC?: number }) {
  const separated = phase !== "inicio";
  const primed = phase === "anelamento" || phase === "extensao" || phase === "produtos";
  const extended = phase === "extensao" || phase === "produtos";
  const topY = separated ? 70 : 112;
  const botY = separated ? 190 : 148;
  const tr = paused ? "none" : "transform 700ms ease, opacity 500ms ease, width 900ms ease";
  const c = CAPTION[phase];

  return (
    <figure className="grid gap-2 rounded-xl border border-line bg-surface p-3" aria-labelledby="mol-cap">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id="mol-cap" className="text-sm font-semibold">
          {c.title}
          {cycle ? ` · ciclo ${cycle}` : ""}
          {tempC !== undefined ? ` · ${tempC} °C programados` : ""}
        </p>
        <VisualKindBadge kind="ilustracao" />
      </div>
      <svg viewBox="0 0 640 260" className={`w-full ${compact ? "max-h-48" : "max-h-80"}`} role="img" aria-label={`Ilustração: ${c.title}. ${c.text}`}>
        <defs>
          <marker id="arrowF" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#1b6e3a" />
          </marker>
        </defs>
        {/* fita de cima (5'→3') */}
        <g style={{ transform: `translateY(${topY - 112}px)`, transition: tr }}>
          <rect x={X0} y={108} width={X1 - X0} height={8} rx={4} fill="#2a78d6" />
          <text x={X0 - 8} y={116} textAnchor="end" fontSize="13" fill="#17201c">5′</text>
          <text x={X1 + 8} y={116} fontSize="13" fill="#17201c">3′</text>
        </g>
        {/* fita de baixo (3'←5') */}
        <g style={{ transform: `translateY(${botY - 148}px)`, transition: tr }}>
          <rect x={X0} y={144} width={X1 - X0} height={8} rx={4} fill="#eb6834" />
          <text x={X0 - 8} y={152} textAnchor="end" fontSize="13" fill="#17201c">3′</text>
          <text x={X1 + 8} y={152} fontSize="13" fill="#17201c">5′</text>
        </g>
        {!separated && <Ticks y1={116} y2={144} from={X0} to={X1} />}

        {/* primers */}
        <g style={{ opacity: primed ? 1 : 0, transition: tr }}>
          {/* F: pareia com a fita de baixo, cresce para a direita */}
          <rect x={F[0]} y={botY - 14} width={F[1] - F[0]} height={8} rx={2} fill="#1b6e3a" />
          <text x={F[0]} y={botY - 20} fontSize="12" fill="#17201c" fontWeight={600}>
            primer F
          </text>
          {/* R: pareia com a fita de cima, cresce para a esquerda */}
          <rect x={R[0]} y={topY + 14} width={R[1] - R[0]} height={8} rx={2} fill="#7a3d8a" />
          <text x={R[1]} y={topY + 40} textAnchor="end" fontSize="12" fill="#17201c" fontWeight={600}>
            primer R
          </text>
        </g>
        {!primed && (
          <g fontSize="12" fill="#4a5650">
            <text x={F[0]} y={235}>primers livres (F e R)</text>
            <rect x={F[0] + 140} y={226} width={40} height={7} rx={2} fill="#1b6e3a" />
            <rect x={F[0] + 190} y={226} width={40} height={7} rx={2} fill="#7a3d8a" />
          </g>
        )}

        {/* fitas novas (extensão a partir da extremidade 3' de cada primer) */}
        <g style={{ opacity: extended ? 1 : 0, transition: tr }}>
          <rect x={F[1]} y={botY - 14} width={extended ? X1 - F[1] : 0} height={8} rx={2} fill="#1b6e3a" fillOpacity={0.45} stroke="#1b6e3a" strokeDasharray="4 3" style={{ transition: tr }} />
          <rect x={X0} y={topY + 14} width={extended ? R[0] - X0 : 0} height={8} rx={2} fill="#7a3d8a" fillOpacity={0.45} stroke="#7a3d8a" strokeDasharray="4 3" style={{ transition: tr }} />
          {phase === "extensao" && (
            <>
              <ellipse cx={X1 - 30} cy={botY - 10} rx={22} ry={15} fill="#e6d3a3" stroke="#8a6d2a" />
              <text x={X1 - 30} y={botY - 6} textAnchor="middle" fontSize="11" fill="#17201c">pol.</text>
              <ellipse cx={X0 + 30} cy={topY + 18} rx={22} ry={15} fill="#e6d3a3" stroke="#8a6d2a" />
              <text x={X0 + 30} y={topY + 22} textAnchor="middle" fontSize="11" fill="#17201c">pol.</text>
            </>
          )}
          {phase === "produtos" && (
            <>
              <Ticks y1={topY + 4} y2={topY + 18} from={X0} to={R[1]} />
              <Ticks y1={botY - 18} y2={botY - 4} from={F[0]} to={X1} />
            </>
          )}
        </g>

        {/* rótulos da região-alvo */}
        <g fontSize="11" fill="#4a5650">
          <line x1={F[0]} x2={F[0]} y1={20} y2={36} stroke="#4a5650" />
          <line x1={R[1]} x2={R[1]} y1={20} y2={36} stroke="#4a5650" />
          <line x1={F[0]} x2={R[1]} y1={28} y2={28} stroke="#4a5650" strokeDasharray="3 3" />
          <text x={(F[0] + R[1]) / 2} y={18} textAnchor="middle">
            região-alvo (delimitada pelos primers)
          </text>
        </g>
      </svg>
      <figcaption className="text-xs text-muted">
        {c.text} Ilustração simplificada: escala, formas e velocidade não são reais e não demonstram o mecanismo.
      </figcaption>
      {!compact && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legenda">
          <li>
            <span className="mr-1 inline-block h-2 w-5 rounded bg-[#2a78d6] align-middle" aria-hidden="true" /> fita molde de cima (5′→3′)
          </li>
          <li>
            <span className="mr-1 inline-block h-2 w-5 rounded bg-[#eb6834] align-middle" aria-hidden="true" /> fita molde de baixo
          </li>
          <li>
            <span className="mr-1 inline-block h-2 w-5 rounded bg-[#1b6e3a] align-middle" aria-hidden="true" /> primer F e fita nova (tracejada)
          </li>
          <li>
            <span className="mr-1 inline-block h-2 w-5 rounded bg-[#7a3d8a] align-middle" aria-hidden="true" /> primer R e fita nova (tracejada)
          </li>
        </ul>
      )}
    </figure>
  );
}
