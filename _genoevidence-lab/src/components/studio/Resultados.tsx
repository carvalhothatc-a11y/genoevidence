"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { bandPosition, formatDuration, ILLUSTRATIVE_LADDER_BP, thermalProfile } from "@/lib/models/pcr";
import { programaCompleto } from "@/lib/ideia/procedimento";
import type { Cenario } from "@/lib/ideia/schema";

function Cartao({ titulo, selo, children, testid }: { titulo: string; selo: ReactNode; children: ReactNode; testid?: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3" data-testid={testid} aria-label={titulo}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-white">{titulo}</h4>
        {selo}
      </div>
      {children}
    </section>
  );
}

export const SeloSimulacao = () => <span className="shrink-0 rounded-full border border-[#ffb23f]/40 bg-[#ffb23f]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#ffb23f]">ƒ simulação</span>;
export const SeloIlustracao = () => <span className="shrink-0 rounded-full border border-[#b49cf5]/40 bg-[#7b4de0]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#b49cf5]">✎ ilustração</span>;
export const SeloDados = () => <span className="shrink-0 rounded-full border border-[#7d9dff]/40 bg-[#4d7cff]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#9db4ff]">▦ dados</span>;

/** Perfil térmico do programa informado (modelo: soma de patamares; rampas excluídas). */
export function PerfilTermicoMini({ cenario }: { cenario: Cenario }) {
  const prog = programaCompleto(cenario);
  if (!prog)
    return (
      <Cartao titulo="Perfil do programa" selo={<SeloSimulacao />} testid="perfil-termico">
        <p className="text-xs text-[#a7b2c8]">Não calculado: o programa está incompleto (faltam temperaturas, tempos ou o número de ciclos).</p>
      </Cartao>
    );
  const { segments, totalSeconds } = thermalProfile(prog, 3);
  const det = segments.filter((s) => !s.cycle || s.cycle <= 3);
  const totalDet = det.reduce((a, s) => a + s.seconds, 0);
  const W = 300;
  const H = 96;
  const y = (t: number) => H - 8 - ((t - 0) / 100) * (H - 20);
  let x = 0;
  const pts: string[] = [];
  for (const s of det) {
    const w = (s.seconds / totalDet) * W;
    pts.push(`${x.toFixed(1)},${y(s.tempC).toFixed(1)}`, `${(x + w).toFixed(1)},${y(s.tempC).toFixed(1)}`);
    x += w;
  }
  return (
    <Cartao titulo="Perfil do programa" selo={<SeloSimulacao />} testid="perfil-termico">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img" aria-label={`Perfil térmico: desnaturação inicial e os três primeiros de ${prog.cycles} ciclos. Duração total calculada ${formatDuration(totalSeconds)}.`}>
        <defs>
          <linearGradient id="perfilGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#4d7cff" />
            <stop offset="0.55" stopColor="#8f68ff" />
            <stop offset="1" stopColor="#e679b5" />
          </linearGradient>
          <filter id="perfilBrilho">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1="0" x2={W} y1={y(t)} y2={y(t)} stroke="rgba(167,178,200,0.12)" />
            <text x="2" y={y(t) - 2} fontSize="8" fill="#7d8aa3">
              {t} °C
            </text>
          </g>
        ))}
        <polyline points={pts.join(" ")} fill="none" stroke="url(#perfilGrad)" strokeWidth="2.2" strokeLinejoin="round" filter="url(#perfilBrilho)" />
      </svg>
      <p className="mt-1 text-[11px] text-[#a7b2c8]">
        Desnaturação inicial + 3 de {prog.cycles} ciclos · duração total calculada: <span className="font-semibold text-white">{formatDuration(totalSeconds)}</span> (sem rampas; não é medição do equipamento).
      </p>
    </Cartao>
  );
}

/** Posição ESPERADA de uma banda, condicionada à existência de produto do tamanho informado. */
export function GelIlustrativo({ ampliconPb }: { ampliconPb: number | null }) {
  const pos = ampliconPb !== null ? bandPosition(ampliconPb) : null;
  const H = 120;
  return (
    <Cartao titulo="Gel: posição esperada" selo={<SeloIlustracao />} testid="gel-ilustrativo">
      <div className="flex gap-3">
        <svg viewBox={`0 0 120 ${H}`} className="h-28 w-28 shrink-0 rounded-lg bg-[#060a13]" aria-hidden="true">
          {[22, 52, 82].map((xl) => (
            <rect key={xl} x={xl - 10} y="6" width="20" height="5" rx="1" fill="rgba(167,178,200,0.25)" />
          ))}
          {ILLUSTRATIVE_LADDER_BP.map((bp) => {
            const p = bandPosition(bp);
            return p === null ? null : <rect key={bp} x="13" y={p * H - 1.5} width="18" height="3" rx="1.5" fill="#4d7cff" opacity="0.85" />;
          })}
          {pos !== null && (
            <rect x="72" y={pos * H - 3} width="20" height="6" rx="2" fill="none" stroke="#e679b5" strokeWidth="1.5" strokeDasharray="3 2" />
          )}
          <text x="22" y={H - 3} fontSize="7" fill="#7d8aa3" textAnchor="middle">
            marc.
          </text>
          <text x="82" y={H - 3} fontSize="7" fill="#7d8aa3" textAnchor="middle">
            amostra
          </text>
        </svg>
        <p className="text-[11px] leading-snug text-[#a7b2c8]">
          {ampliconPb === null
            ? "Informe o tamanho do amplicon para ilustrar a posição esperada."
            : pos === null
              ? `${ampliconPb} pb está fora da faixa do marcador ilustrativo.`
              : `Contorno tracejado: onde uma banda de ${ampliconPb} pb migraria SE houver produto desse tamanho (relação semi-log, Lee et al., 2012).`}{" "}
          Não prevê presença, intensidade nem especificidade. Marcador genérico.
        </p>
      </div>
    </Cartao>
  );
}

export function ResultadoNaoPrevisto({ onAvaliar }: { onAvaliar?: () => void }) {
  return (
    <Cartao titulo="Resultado do experimento" selo={<span className="shrink-0 rounded-full border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#a7b2c8]">∅ não previsto</span>}>
      <p className="text-[11px] text-[#a7b2c8]">Não há modelo validado para prever bandas ou rendimento. A previsão quantitativa fica suspensa; veja frequências publicadas e a avaliação fundamentada.</p>
      {onAvaliar && (
        <button type="button" onClick={onAvaliar} className="mt-1.5 text-[12px] font-semibold text-[#9db4ff] underline">
          Abrir avaliação
        </button>
      )}
    </Cartao>
  );
}

export function CenaGerada({ imagem, titulo, idCena }: { imagem: string; titulo: string; idCena: string }) {
  return (
    <Cartao titulo={`Cena: ${titulo}`} selo={<SeloIlustracao />} testid="cena-gerada">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada no navegador (data URL) */}
      <img src={imagem} alt={`Cena gerada no laboratório virtual: ${titulo}`} className="w-full rounded-lg border border-white/10" />
      <a href={imagem} download={`genolab-cena-${idCena}.png`} className="mt-1.5 inline-block text-[12px] font-semibold text-[#9db4ff] underline">
        Baixar imagem
      </a>
    </Cartao>
  );
}

/** Gaveta sobreposta (vidro escuro) para conteúdo denso: plano, avaliação, comparação, Geninho. */
export function Gaveta({ aberta, titulo, onFechar, children, id }: { aberta: boolean; titulo: string; onFechar: () => void; children: ReactNode; id: string }) {
  useEffect(() => {
    if (!aberta) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberta, onFechar]);
  return (
    <AnimatePresence>
      {aberta && (
        <motion.div key={id} className="absolute inset-0 z-40 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-[#060a13]/55 backdrop-blur-[2px]" onClick={onFechar} />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-titulo`}
            id={id}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="ge-glass relative m-3 flex w-[min(100%-1.5rem,1040px)] flex-col overflow-hidden"
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
              <h2 id={`${id}-titulo`} className="text-lg font-bold text-white">
                {titulo}
              </h2>
              <button type="button" onClick={onFechar} className="ge-press rounded-full border border-white/15 px-3 py-1 text-sm text-[#c9d2e3] hover:bg-white/10">
                Fechar ✕
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
