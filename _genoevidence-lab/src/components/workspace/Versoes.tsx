"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { comporCena } from "@/lib/cena/compor";
import { diferencas } from "@/lib/experimento/interpretar";
import { formatarValor } from "@/lib/experimento/quantidades";
import { dataHora } from "@/lib/datas";
import { useExperimento } from "@/store/experimento";
import { Cena, Defs, H, W } from "@/components/visual/Cena";

const DUR = 3600;

/** Versões preservadas e comparação de duas versões com reprodução sincronizada (ilustração 2D). */
export function Versoes({ onVer }: { onVer: () => void }) {
  const s = useExperimento();
  const n = s.versoes.length;
  const [a, setA] = useState(Math.max(0, n - 2));
  const [b, setB] = useState(n - 1);
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(1);
  const [tocando, setTocando] = useState(false);
  const raf = useRef<number | null>(null);
  const va = s.versoes[a];
  const vb = s.versoes[b];
  const ca = useMemo(() => (va ? comporCena(va) : null), [va]);
  const cb = useMemo(() => (vb ? comporCena(vb) : null), [vb]);
  const difs = useMemo(() => (va && vb ? diferencas(va, vb) : []), [va, vb]);
  const total = Math.max(ca?.etapas.length ?? 0, cb?.etapas.length ?? 0);

  useEffect(() => {
    if (!tocando) return;
    let ini: number | null = null;
    const passo = (agora: number) => {
      if (ini === null) ini = agora;
      const k = Math.min(1, (agora - ini) / DUR);
      setT(k);
      if (k < 1) raf.current = requestAnimationFrame(passo);
      else if (idx < total - 1) {
        setIdx(idx + 1);
        setT(0);
      } else setTocando(false);
    };
    raf.current = requestAnimationFrame(passo);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [tocando, idx, total]);

  if (n === 0) return <p className="text-[14px] text-[#a7b2c8]">Nenhuma versão ainda.</p>;

  const Lado = ({ titulo, c, v }: { titulo: string; c: typeof ca; v: typeof va }) => {
    const e = c?.etapas[idx];
    return (
      <figure className="grid gap-1.5 rounded-xl border border-white/10 bg-black/20 p-2">
        <figcaption className="text-[12px] text-[#a7b2c8]">
          <span className="font-semibold text-white">{titulo}</span> · versão {v?.versao}
        </figcaption>
        <div className="aspect-[16/9] rounded-lg bg-[#060a13]">
          {e ? (
            <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`${titulo}, etapa ${idx + 1}: ${e.titulo}`}>
              <Defs />
              <Cena passo={e.passo} t={t} />
            </svg>
          ) : (
            <p className="grid h-full place-items-center text-[12px] text-[#7d8aa3]">sem etapa {idx + 1}</p>
          )}
        </div>
        {e && (
          <div className="text-[12px]">
            <p className="font-semibold text-white">{e.titulo}</p>
            <ul className="text-[#a7b2c8]">
              {e.parametros.map((p) => (
                <li key={p.id}>
                  {p.nome}: <span className="ge-mono text-white">{formatarValor(p.valor, p.unidade)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </figure>
    );
  };

  return (
    <div className="grid gap-5 text-[14px] text-[#c9d2e3]" data-testid="versoes">
      <section aria-labelledby="lista-versoes" className="grid gap-2">
        <h3 id="lista-versoes" className="font-semibold text-white">
          Versões preservadas
        </h3>
        <ol className="grid gap-1.5">
          {s.versoes.map((v, i) => (
            <li key={v.versao} className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${i === s.atual ? "border-[#e679b5]/50 bg-[#7b4de0]/10" : "border-white/10"}`}>
              <span className="ge-mono text-[#e679b5]">v{v.versao}</span>
              <span className="text-[12px] text-[#a7b2c8]">{dataHora(v.criadoEm)}</span>
              <span className="text-[12px]">{v.acoes.length} etapa(s){v.mudancas.length ? ` · ${v.mudancas.length} mudança(s)` : ""}</span>
              <button type="button" onClick={() => (s.irVersao(i), onVer())} className="ml-auto text-[12px] text-[#9db4ff] underline">
                {i === s.atual ? "em exibição" : "ver esta versão"}
              </button>
            </li>
          ))}
        </ol>
      </section>

      {n > 1 && (
        <section aria-labelledby="comparar-versoes" className="grid gap-3">
          <h3 id="comparar-versoes" className="font-semibold text-white">
            Comparar com reprodução sincronizada
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <label className="flex items-center gap-1">
              A
              <select value={a} onChange={(e) => (setA(Number(e.target.value)), setIdx(0))} className="rounded border border-white/15 bg-[#0b1221] px-2 py-1 text-white">
                {s.versoes.map((v, i) => (
                  <option key={v.versao} value={i}>
                    versão {v.versao}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              B
              <select value={b} onChange={(e) => (setB(Number(e.target.value)), setIdx(0))} className="rounded border border-white/15 bg-[#0b1221] px-2 py-1 text-white">
                {s.versoes.map((v, i) => (
                  <option key={v.versao} value={i}>
                    versão {v.versao}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => (idx >= total - 1 && t >= 1 ? (setIdx(0), setT(0), setTocando(true)) : setTocando(!tocando))} className="ge-press rounded-full bg-[#7b4de0] px-3 py-1.5 text-[12px] font-semibold text-white">
              {tocando ? "Pausar as duas" : "Reproduzir as duas"}
            </button>
            <span className="text-[12px] text-[#a7b2c8]">
              etapa {Math.min(idx + 1, total)} de {total}
            </span>
            <button type="button" disabled={idx === 0} onClick={() => (setTocando(false), setIdx(idx - 1), setT(1))} className="rounded-full border border-white/15 px-2 py-1 text-[12px] disabled:opacity-40">
              ‹
            </button>
            <button type="button" disabled={idx >= total - 1} onClick={() => (setTocando(false), setIdx(idx + 1), setT(1))} className="rounded-full border border-white/15 px-2 py-1 text-[12px] disabled:opacity-40">
              ›
            </button>
          </div>
          <div className="rounded-lg border border-[#7b4de0]/40 bg-[#7b4de0]/10 p-2 text-[12px]">
            <p className="font-semibold text-white">Diferenças de A para B</p>
            {difs.length ? (
              <ul className="mt-1 list-disc pl-4 text-[#cdbcff]">
                {difs.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[#a7b2c8]">Nenhuma diferença na descrição estruturada.</p>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Lado titulo="A" c={ca} v={va} />
            <Lado titulo="B" c={cb} v={vb} />
          </div>
          <p className="text-[11px] text-[#7d8aa3]">Ilustrações 2D sincronizadas por etapa. Diferenças de parâmetros não mudam a animação para “parecer” um resultado: os valores aparecem ao lado.</p>
        </section>
      )}
    </div>
  );
}
