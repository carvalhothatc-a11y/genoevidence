"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { TecnicaConteudo } from "@/lib/modules/tecnicas/tipos";
import { passoDaEtapa } from "@/lib/modules/tecnicas/cena";
import { Cena, Defs, H, W } from "@/components/visual/Cena";
import { ClaimList, SourceList } from "@/components/sources/SourceList";
import { Calculadora } from "./Calculadoras";
import { useUi } from "@/store/ui";
import { STATUS_LABEL } from "@/lib/modules/registry";

const Holo3D = dynamic(() => import("@/components/holo/Holo3D").then((m) => m.Holo3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-[13px] text-[#a7b2c8]" role="status">
      Carregando a cena 3D…
    </div>
  ),
});

const DUR = 3800;
type Aba = "acontece" | "porque" | "materiais" | "observar";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "acontece", rotulo: "O que acontece" },
  { id: "porque", rotulo: "Por quê" },
  { id: "materiais", rotulo: "Materiais e controles" },
  { id: "observar", rotulo: "O que observar" },
];

const STATUS_CLS: Record<string, string> = {
  implementado: "border-[#3ccf8e]/40 bg-[#3ccf8e]/10 text-[#8de8bf]",
  parcial: "border-[#ffb23f]/50 bg-[#ffb23f]/10 text-[#ffd08a]",
  nao_implementado: "border-white/15 bg-white/5 text-[#a7b2c8]",
};

export function ModuloTecnica({ tecnica }: { tecnica: TecnicaConteudo }) {
  const [i, setI] = useState(0);
  const [aba, setAba] = useState<Aba>("acontece");
  const [t, setT] = useState(0);
  const [tocando, setTocando] = useState(true);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [reduzido, setReduzido] = useState(false);
  const raf = useRef<number | null>(null);
  const pausadoGlobal = useUi((u) => u.paused);
  const etapa = tecnica.etapas[i];
  const passo = useMemo(() => passoDaEtapa(etapa, i + 1), [etapa, i]);

  useEffect(() => {
    setReduzido(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  useEffect(() => setT(reduzido ? 1 : 0), [i, reduzido]);
  useEffect(() => setAba("acontece"), [i]);

  useEffect(() => {
    if (!tocando || pausadoGlobal || reduzido) return;
    let inicio: number | null = null;
    const t0 = t;
    const quadro = (agora: number) => {
      if (inicio === null) inicio = agora;
      const dt = agora - inicio;
      setT(Math.min(1, t0 + dt / DUR));
      if (dt < DUR * (1 - t0) + 1200) raf.current = requestAnimationFrame(quadro);
      else setTocando(false);
    };
    raf.current = requestAnimationFrame(quadro);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [tocando, pausadoGlobal, reduzido, i]); // eslint-disable-line react-hooks/exhaustive-deps

  const svg2d = (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Ilustração: ${etapa.titulo}. ${etapa.cena.legenda}`}>
      <Defs />
      <Cena passo={passo} t={t} />
    </svg>
  );

  const parametros = etapa.parametros ?? [];

  return (
    <div className="mx-auto grid max-w-[1180px] gap-4 px-4 py-6" data-testid="modulo-tecnica" data-tecnica={tecnica.id}>
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/modulos" className="text-[13px] text-[#9db4ff] underline">
            ← Técnicas
          </Link>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLS[tecnica.status]}`}>{STATUS_LABEL[tecnica.status]}</span>
          <span className="rounded-full border border-[#b49cf5]/40 bg-[#7b4de0]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#cdbcff]" title="Representação didática: não é resultado observado nem previsto">
            ✎ módulo educativo
          </span>
        </div>
        <h1 className="ge-display text-3xl text-white sm:text-4xl">{tecnica.titulo}</h1>
        <p className="max-w-3xl text-[15px] text-[#c9d2e3]">{tecnica.resumo}</p>
        <p className="text-[12px] text-[#a7b2c8]">{tecnica.tecnica}</p>
      </header>

      {/* trilha de etapas */}
      <nav aria-label="Etapas da técnica" className="flex flex-wrap gap-1.5">
        {tecnica.etapas.map((e, j) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setI(j)}
            aria-current={j === i ? "step" : undefined}
            className={`ge-press rounded-full border px-3 py-1.5 text-[12px] ${j === i ? "border-[#b49cf5] bg-[#7b4de0]/30 font-semibold text-white" : "border-white/15 text-[#c9d2e3] hover:bg-white/10"}`}
          >
            {j + 1}. {e.titulo}
          </button>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* cena */}
        <div className="grid content-start gap-2">
          <div className="relative h-[min(60vh,440px)] min-h-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(90%_80%_at_50%_40%,rgba(47,91,234,0.16),rgba(6,10,19,0.2)_70%)]" data-modo-cena={webgl ? "3d" : "2d"}>
            {webgl === true ? (
              <Holo3D passo={passo} t={t} pausado={!tocando || pausadoGlobal} reduzido={reduzido} />
            ) : webgl === false ? (
              <div className="grid h-full place-items-center p-4">{svg2d}</div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => (setT(0), setTocando(true))} className="ge-press rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-[#c9d2e3] hover:bg-white/10">
                Reiniciar
              </button>
              <button type="button" onClick={() => (t >= 1 ? (setT(0), setTocando(true)) : setTocando(!tocando))} className="ge-press rounded-full bg-[#7b4de0] px-3 py-1.5 text-[12px] font-semibold text-white">
                {tocando ? "Pausar" : "Reproduzir"}
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="ge-press rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-[#c9d2e3] hover:bg-white/10 disabled:opacity-40">
                Anterior
              </button>
              <button type="button" disabled={i === tecnica.etapas.length - 1} onClick={() => setI(i + 1)} className="ge-press rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-[#c9d2e3] hover:bg-white/10 disabled:opacity-40">
                Próxima
              </button>
            </div>
          </div>
          <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-[#a7b2c8]" data-testid="legenda-cena">
            {etapa.cena.legenda}
          </p>
        </div>

        {/* texto da etapa */}
        <div className="grid content-start gap-3">
          <div>
            <p className="ge-mono text-[12px] text-[#e679b5]">
              etapa {i + 1} de {tecnica.etapas.length}
            </p>
            <h2 className="mt-0.5 text-[20px] font-semibold text-white">{etapa.titulo}</h2>
            <p className="mt-1 text-[14px] text-[#c9d2e3]">{etapa.resumo}</p>
          </div>

          <div role="tablist" aria-label="Seções da etapa" className="flex flex-wrap gap-1.5">
            {ABAS.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={aba === x.id}
                onClick={() => setAba(x.id)}
                className={`ge-press rounded-full border px-3 py-1.5 text-[12px] ${aba === x.id ? "border-[#b49cf5] bg-[#7b4de0]/30 font-semibold text-white" : "border-white/15 text-[#c9d2e3] hover:bg-white/10"}`}
              >
                {x.rotulo}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={`${etapa.id}-${aba}`} initial={reduzido ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-3" role="tabpanel">
              {aba === "acontece" && <ClaimList claims={etapa.acontece} empty="Sem descrição cadastrada para esta etapa." />}
              {aba === "porque" && <ClaimList claims={etapa.porque} empty="Sem explicação cadastrada para esta etapa." />}
              {aba === "materiais" && (
                <>
                  <ul className="grid gap-2">
                    {etapa.materiais.map((m) => (
                      <li key={m.nome} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[14px] font-semibold text-white">{m.nome}</p>
                        <p className="text-[13px] text-[#c9d2e3]">{m.papel}</p>
                        <SourceList refs={m.refs} compact />
                      </li>
                    ))}
                    {!etapa.materiais.length && <li className="text-[13px] text-[#a7b2c8]">Sem materiais cadastrados para esta etapa.</li>}
                  </ul>
                  <div>
                    <h3 className="text-[14px] font-semibold text-white">Controles</h3>
                    <ClaimList claims={etapa.controles} empty="Nenhum controle cadastrado para esta etapa." />
                  </div>
                </>
              )}
              {aba === "observar" && (
                <>
                  <ClaimList claims={etapa.observar} empty="Nada cadastrado para esta etapa." />
                  {etapa.limitacoes.length > 0 && (
                    <div className="rounded-xl border border-[#ffb23f]/40 bg-[#ffb23f]/10 p-3">
                      <h3 className="text-[13px] font-semibold text-[#ffd08a]">Limitações desta etapa</h3>
                      <ul className="mt-1 list-disc pl-5 text-[13px] text-[#ffd08a]">
                        {etapa.limitacoes.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {parametros.length > 0 && (
            <section className="grid gap-3 rounded-2xl border border-white/12 bg-[#0f182b]/70 p-4" aria-label="Explorar parâmetros">
              <h3 className="text-[15px] font-semibold text-white">Explorar</h3>
              {parametros.map((p) => {
                const atual = escolhas[p.id] ?? p.padrao;
                const op = p.opcoes.find((o) => o.valor === atual) ?? p.opcoes[0];
                return (
                  <div key={p.id} className="grid gap-2">
                    <p className="text-[14px] font-semibold text-white">{p.rotulo}</p>
                    <p className="text-[13px] text-[#c9d2e3]">{p.descricao}</p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={p.rotulo}>
                      {p.opcoes.map((o) => (
                        <button
                          key={o.valor}
                          type="button"
                          aria-pressed={o.valor === atual}
                          onClick={() => setEscolhas({ ...escolhas, [p.id]: o.valor })}
                          className={`ge-press rounded-full border px-3 py-1.5 text-[12px] ${o.valor === atual ? "border-[#b49cf5] bg-[#7b4de0]/30 font-semibold text-white" : "border-white/15 text-[#c9d2e3] hover:bg-white/10"}`}
                        >
                          {o.rotulo}
                        </button>
                      ))}
                    </div>
                    <div data-testid={`consequencias-${p.id}`}>
                      <ClaimList claims={op.consequencias} />
                    </div>
                  </div>
                );
              })}
              <p className="text-[12px] text-[#a7b2c8]">Mudar a escolha troca o que as fontes dizem sobre ela. Nada aqui recalcula um resultado nem prevê o que vai acontecer no seu experimento.</p>
            </section>
          )}

          {etapa.calculadora && <Calculadora id={etapa.calculadora} modelos={tecnica.modelos} />}
        </div>
      </div>

      {/* solução de problemas */}
      {tecnica.problemas.length > 0 && (
        <section className="grid gap-2" aria-labelledby="problemas">
          <h2 id="problemas" className="text-[18px] font-semibold text-white">
            Quando dá errado
          </h2>
          <ul className="grid gap-2">
            {tecnica.problemas.map((p) => (
              <li key={p.sintoma} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[14px] font-semibold text-white">{p.sintoma}</p>
                <div className="mt-1">
                  <ClaimList claims={p.causas} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* o que o módulo não faz */}
      <section className="grid gap-2 rounded-2xl border border-[#ffb23f]/40 bg-[#ffb23f]/[0.07] p-4" aria-labelledby="limites">
        <h2 id="limites" className="text-[16px] font-semibold text-[#ffd08a]">
          O que este módulo não faz
        </h2>
        <ul className="list-disc pl-5 text-[13px] text-[#ffd08a]">
          {tecnica.naoFaz.map((x) => (
            <li key={x}>{x}</li>
          ))}
          {tecnica.limitacoes.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2" aria-labelledby="fontes-modulo">
        <h2 id="fontes-modulo" className="text-[18px] font-semibold text-white">
          Fontes deste módulo
        </h2>
        <SourceList refs={tecnica.fontes} />
        <p className="text-[12px] text-[#a7b2c8]">{tecnica.autoria}</p>
      </section>
    </div>
  );
}
