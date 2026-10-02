"use client";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useRoteiro } from "@/store/roteiro";
import { useUi } from "@/store/ui";
import type { PassoVisual } from "@/lib/visual/roteiro";
import { Cena, Defs, H, W } from "./Cena";

const DUR = 3800; // ms por etapa
const PAUSA_FINAL = 900;

function useReduced() {
  const [r, setR] = useState(false);
  useEffect(() => setR(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return r;
}

/** Palco holográfico: anima a etapa atual e mostra todas as etapas em miniatura. */
export function Palco() {
  const { passos, idx, tocando, setIdx, setTocando, texto } = useRoteiro();
  const pausadoGlobal = useUi((u) => u.paused);
  const reduced = useReduced();
  const [t, setT] = useState(0);
  const [baixando, setBaixando] = useState(false);
  const raf = useRef<number | null>(null);
  const passo = passos[idx];

  // reinicia a animação ao trocar de etapa
  useEffect(() => setT(reduced ? 1 : 0), [idx, passos, reduced]);

  // relógio da animação (requestAnimationFrame); com movimento reduzido mostra o estado final
  useEffect(() => {
    if (!tocando || pausadoGlobal || !passo) return;
    let inicio: number | null = null;
    const t0 = reduced ? 1 : t;
    const passoFn = (agora: number) => {
      if (inicio === null) inicio = agora;
      const dt = agora - inicio;
      const nt = Math.min(1, t0 + dt / DUR);
      setT(reduced ? 1 : nt);
      if (dt < DUR * (1 - t0) + PAUSA_FINAL + (reduced ? 2600 : 0)) raf.current = requestAnimationFrame(passoFn);
      else if (idx < passos.length - 1) setIdx(idx + 1);
      else setTocando(false);
    };
    raf.current = requestAnimationFrame(passoFn);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [tocando, pausadoGlobal, idx, passos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const baixar = useCallback(async () => {
    setBaixando(true);
    try {
      const url = await exportarRoteiro(passos, texto);
      const a = document.createElement("a");
      a.href = url;
      a.download = `genolab-processo-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.png`;
      a.click();
    } finally {
      setBaixando(false);
    }
  }, [passos, texto]);

  if (!passo) return null;
  const fim = idx === passos.length - 1 && t >= 1;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3" data-testid="palco" data-etapa-visual={passo.id} data-acao={passo.acao}>
      {/* legenda da etapa */}
      <AnimatePresence mode="wait">
        <motion.div key={passo.id} initial={reduced ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-[760px] text-center">
          <p className="ge-mono text-[12px] text-[#e679b5]">
            etapa {idx + 1} de {passos.length} · {passo.titulo}
            {passo.confianca === "conferir" && <span className="ml-2 rounded-full border border-[#ffb23f]/50 px-1.5 text-[10px] text-[#ffb23f]">interpretação a conferir</span>}
          </p>
          <p className="mt-1 text-[17px] font-semibold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">“{passo.texto}”</p>
        </motion.div>
      </AnimatePresence>

      {/* cena */}
      <div className="relative min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Ilustração da etapa ${idx + 1}: ${passo.titulo}. ${passo.mostra}`} preserveAspectRatio="xMidYMid meet">
          <Defs />
          <Cena passo={passo} t={t} />
        </svg>
      </div>

      <div className="mx-auto w-full max-w-[860px]">
        <p className="text-center text-[13px] text-[#c9d2e3] [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">{passo.mostra}</p>
        <p className="mt-0.5 text-center text-[10.5px] text-[#b49cf5]">✎ Ilustração didática gerada da sua descrição · formas, escala e quantidades não são reais · não é resultado</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5" role="toolbar" aria-label="Controles da visualização">
          <Botao onClick={() => (fim ? (setIdx(0), setT(0), setTocando(true)) : setTocando(!tocando))} destaque rotulo={tocando ? "Pausar" : fim ? "Repetir" : t > 0 || idx > 0 ? "Continuar" : "Iniciar"} icone={tocando ? "❚❚" : "▶"} />
          <Botao onClick={() => (setTocando(false), setIdx(idx - 1))} rotulo="Voltar" icone="◀" disabled={idx === 0} />
          <Botao onClick={() => (setTocando(false), setIdx(idx + 1))} rotulo="Avançar" icone="▶▶" disabled={idx === passos.length - 1} />
          <Botao onClick={() => (setIdx(0), setT(0), setTocando(true))} rotulo="Repetir tudo" icone="↺" />
          <Botao onClick={() => void baixar()} rotulo={baixando ? "Gerando…" : "Baixar imagem"} icone="⤓" disabled={baixando} />
        </div>

        {/* miniaturas: o processo inteiro */}
        <ol className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Todas as etapas">
          {passos.map((p, i) => (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => (setTocando(false), setIdx(i))}
                aria-current={i === idx ? "step" : undefined}
                className={`ge-press block w-[132px] rounded-xl border p-1 text-left ${i === idx ? "border-[#e679b5] bg-[#7b4de0]/25 shadow-[0_0_18px_-4px_rgba(224,56,90,0.7)]" : "border-white/10 bg-black/30 hover:border-white/30"}`}
              >
                <svg viewBox={`0 0 ${W} ${H}`} className="h-[64px] w-full" aria-hidden="true">
                  <Defs />
                  <Cena passo={p} t={1} />
                </svg>
                <span className="block truncate px-1 text-[11px] text-[#c9d2e3]">
                  {i + 1}. {p.titulo}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Botao({ onClick, rotulo, icone, destaque, disabled }: { onClick: () => void; rotulo: string; icone: string; destaque?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`ge-press inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold disabled:opacity-40 ${destaque ? "text-white" : "bg-black/40 text-[#eef2f9] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] hover:bg-white/10"}`}
      style={destaque ? { background: "var(--ge-gradient)" } : undefined}
    >
      <span aria-hidden="true" className="text-[11px]">
        {icone}
      </span>
      {rotulo}
    </button>
  );
}

/** Exporta todas as etapas (estado final de cada cena) em uma única imagem PNG. */
export async function exportarRoteiro(passos: PassoVisual[], texto: string): Promise<string> {
  const cols = passos.length > 1 ? 2 : 1;
  const linhas = Math.ceil(passos.length / cols);
  const cw = W;
  const ch = H + 70;
  const topo = 110;
  const largura = cols * cw + (cols + 1) * 24;
  const altura = topo + linhas * (ch + 24) + 60;
  const titulo = texto.length > 120 ? texto.slice(0, 117) + "…" : texto;
  const svg = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} fontFamily="IBM Plex Sans, Helvetica, Arial, sans-serif">
      <Defs />
      <rect width="100%" height="100%" fill="#0b1221" />
      <rect x={0} y={0} width={largura} height={5} fill="url(#vgB)" />
      <text x={24} y={44} fontSize={24} fontWeight={700} fill="#ffffff">
        GenoLab · processo descrito
      </text>
      <text x={24} y={72} fontSize={13} fill="#c9d2e3">
        {titulo}
      </text>
      <text x={24} y={94} fontSize={11} fill="#b49cf5">
        {`Ilustração didática gerada da descrição · não é resultado experimental nem previsão · ${new Date().toLocaleString("pt-BR")}`}
      </text>
      {passos.map((p, i) => {
        const x = 24 + (i % cols) * (cw + 24);
        const y = topo + Math.floor(i / cols) * (ch + 24);
        return (
          <g key={p.id} transform={`translate(${x} ${y})`}>
            <rect width={cw} height={ch} rx={18} fill="#0f182b" stroke="rgba(123,77,224,0.45)" />
            <Cena passo={p} t={1} />
            <text x={18} y={H + 26} fontSize={15} fontWeight={700} fill="#eef2f9">
              {`${i + 1}. ${p.titulo}`}
            </text>
            <text x={18} y={H + 48} fontSize={12} fill="#a7b2c8">
              {`“${p.texto.length > 90 ? p.texto.slice(0, 87) + "…" : p.texto}”`}
            </text>
          </g>
        );
      })}
    </svg>,
  );
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = largura * 1.5;
  c.height = altura * 1.5;
  const ctx = c.getContext("2d")!;
  ctx.scale(1.5, 1.5);
  ctx.drawImage(img, 0, 0);
  return c.toDataURL("image/png");
}
