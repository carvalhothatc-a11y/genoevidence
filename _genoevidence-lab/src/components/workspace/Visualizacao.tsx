"use client";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { OBJETOS, type ObjetoId, type Papel } from "@/lib/cena/biblioteca";
import { elementoDoObjeto, type EtapaCena } from "@/lib/cena/compor";
import { formatarValor } from "@/lib/experimento/quantidades";
import { SOURCES } from "@/lib/sources/catalog";
import { useUi } from "@/store/ui";
import { useExperimento, type Velocidade } from "@/store/experimento";
import { Cena, Defs, H, W } from "@/components/visual/Cena";
import { reiniciarVisaoHolo, zoomHolo } from "@/components/holo/Holo3D";
import { IC, Icone, ORIGEM_NOME, OrigemChip } from "./ui";
import { GeninhoCorpo } from "@/components/assistant/GeninhoAvatar";
import { EXEMPLOS_AREA } from "./Entrada";

const Holo3D = dynamic(() => import("@/components/holo/Holo3D").then((m) => m.Holo3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center" role="status">
      <p className="ge-mono text-sm text-[#a7b2c8]">carregando a cena 3D…</p>
    </div>
  ),
});

class Limite3D extends Component<{ children: ReactNode; onErro: () => void }, { falhou: boolean }> {
  state = { falhou: false };
  static getDerivedStateFromError() {
    return { falhou: true };
  }
  componentDidCatch() {
    this.props.onErro();
  }
  render() {
    return this.state.falhou ? null : this.props.children;
  }
}

const DUR = 4200; // ms por etapa a 1×
const PAUSA = 900;

const PAPEL_TEXTO: Record<Papel, string> = {
  origem: "material de partida desta ação",
  destino: "recebe o material nesta ação",
  equipamento: "equipamento usado nesta ação",
  recipiente: "recipiente onde a ação acontece",
  material: "participa desta ação",
  agente: "realiza a transformação nesta ação",
};

function useReduzido() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return r;
}

/** Painel do elemento selecionado: nome, função, relação com a ação, parâmetros, fonte e explicação. */
function PainelElemento({ etapa, objeto, onFechar, onPerguntar }: { etapa: EtapaCena; objeto: ObjetoId; onFechar: () => void; onPerguntar: (q: string) => void }) {
  const materiais = useExperimento((s) => s.materiais);
  const lib = OBJETOS[objeto];
  const el = elementoDoObjeto(etapa, objeto);
  const nomeMaterial = (id?: string) => {
    const m = materiais.find((x) => x.id === id);
    return m ? (m.tipo === "referencia" ? m.titulo : m.nome) : undefined;
  };
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="absolute bottom-3 right-3 top-3 z-30 flex w-[min(320px,calc(100%-24px))] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0b1221] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)]"
      aria-label={`Elemento selecionado: ${el?.rotulo ?? lib.nome}`}
      data-testid="painel-elemento"
      data-objeto={objeto}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#7d8aa3]">{lib.categoria === "equipamento" ? "Equipamento" : lib.categoria === "recipiente" ? "Recipiente" : lib.categoria === "celula" ? "Célula" : lib.categoria === "amostra" ? "Amostra" : "Material"}</p>
          <h3 className="text-[17px] font-semibold text-white">{el?.rotulo ?? lib.nome}</h3>
          {el && el.rotulo !== lib.nome && <p className="text-[12px] text-[#a7b2c8]">{lib.nome}</p>}
        </div>
        <button type="button" onClick={onFechar} className="ge-press rounded-full p-1.5 text-[#c9d2e3] hover:bg-white/10" aria-label="Fechar painel do elemento">
          <Icone d={IC.fechar} size={16} />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-4 py-3 text-[13px] text-[#c9d2e3]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7d8aa3]">Função</p>
          <p className="text-white">{lib.funcao}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7d8aa3]">Relação com a ação</p>
          <p>{el ? `${PAPEL_TEXTO[el.papel]} (“${etapa.titulo}”).` : `Faz parte da ilustração de “${etapa.titulo}”; não foi citado nos seus materiais.`}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7d8aa3]">Parâmetros desta etapa</p>
          {etapa.parametros.length ? (
            <ul className="grid gap-0.5">
              {etapa.parametros.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span>{p.nome}</span>
                  <span className="ge-mono text-white">{formatarValor(p.valor, p.unidade)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#a7b2c8]">Nenhum valor informado para esta etapa.</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7d8aa3]">Fonte</p>
          {el ? (
            el.inferido ? (
              <p className="text-[#a7b2c8]">Representação padrão da ação na biblioteca do GenoLab (não citada nos seus materiais).</p>
            ) : (
              <ul className="grid gap-1.5">
                {el.origens.slice(0, 4).map((o, i) => (
                  <li key={i} className="grid gap-0.5">
                    <OrigemChip o={o} nomeMaterial={nomeMaterial(o.materialId)} />
                    {o.trecho && <span className="text-[12px] italic text-[#a7b2c8]">“{o.trecho.slice(0, 160)}”</span>}
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-[#a7b2c8]">Ilustração da ação.</p>
          )}
          {lib.refs?.length ? (
            <p className="mt-1 text-[11px] text-[#a7b2c8]">
              Explicação baseada em:{" "}
              {lib.refs.map((r) => (
                <span key={r.id + r.locator}>
                  {SOURCES[r.id]?.shortCitation ?? r.id} ({r.locator}){" "}
                </span>
              ))}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7d8aa3]">Explicação</p>
          <p>{lib.explicacao}</p>
          {!lib.forma3d && <p className="mt-1 text-[11px] text-[#ffd08a]">Sem forma 3D na biblioteca: aparece como rótulo.</p>}
        </div>
        <button type="button" onClick={() => onPerguntar(`Na etapa “${etapa.titulo}”, qual é o papel de ${el?.rotulo ?? lib.nome}?`)} className="ge-press justify-self-start rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white hover:bg-white/10">
          Perguntar ao Geninho sobre isto
        </button>
      </div>
    </motion.aside>
  );
}

export function Visualizacao({ onPerguntar }: { onPerguntar: (q: string) => void }) {
  const s = useExperimento();
  const pausadoGlobal = useUi((u) => u.paused);
  const reduzido = useReduzido();
  const [t, setT] = useState(0);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [falhou3d, setFalhou3d] = useState(false);
  const [modo2d, setModo2d] = useState(false);
  const raf = useRef<number | null>(null);
  const cena = s.cena;
  const etapa = cena?.etapas[s.idx];

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  useEffect(() => setT(reduzido ? 1 : 0), [s.idx, s.reinicio, cena, reduzido]);

  // relógio da animação: a velocidade muda só a ilustração, nunca o tempo experimental
  useEffect(() => {
    if (!s.tocando || pausadoGlobal || !etapa) return;
    let inicio: number | null = null;
    const t0 = reduzido ? 1 : t;
    const dur = DUR / s.velocidade;
    const passo = (agora: number) => {
      if (inicio === null) inicio = agora;
      const dt = agora - inicio;
      setT(reduzido ? 1 : Math.min(1, t0 + dt / dur));
      if (dt < dur * (1 - t0) + PAUSA + (reduzido ? 2500 : 0)) raf.current = requestAnimationFrame(passo);
      else if (s.idx < (cena?.etapas.length ?? 1) - 1) s.setIdx(s.idx + 1);
      else s.setTocando(false);
    };
    raf.current = requestAnimationFrame(passo);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [s.tocando, pausadoGlobal, s.idx, s.velocidade, s.reinicio, cena]); // eslint-disable-line react-hooks/exhaustive-deps

  const origemDe = useCallback(
    (o: ObjetoId) => {
      const el = elementoDoObjeto(etapa, o);
      if (!el) return null;
      if (el.inferido) return "representação padrão";
      const tipos = [...new Set(el.origens.map((x) => ORIGEM_NOME[x.tipo]))];
      return tipos.slice(0, 2).join(" + ");
    },
    [etapa],
  );

  const usar3d = webgl === true && !falhou3d && !modo2d;
  const svg2d = useMemo(() => (etapa ? <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Ilustração 2D: ${etapa.titulo}. ${etapa.mostra}`}><Defs /><Cena passo={etapa.passo} t={t} /></svg> : null), [etapa, t]);

  if (!cena || !etapa) return <BoasVindasGeninho />;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2" data-testid="palco-experimento" data-etapa={etapa.id} data-acao={etapa.acao}>
      {/* legenda da etapa */}
      <div className="flex flex-wrap items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="ge-mono text-[12px] text-[#e679b5]">
            etapa {s.idx + 1} de {cena.etapas.length} · {etapa.titulo}
            {etapa.passo.confianca === "conferir" && <span className="ml-2 rounded-full border border-[#ffb23f]/50 px-1.5 text-[10px] text-[#ffd08a]">interpretação a conferir</span>}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold text-white">“{etapa.texto}”</p>
        </div>
        <span className="shrink-0 rounded-full border border-[#b49cf5]/40 bg-[#7b4de0]/20 px-2 py-0.5 text-[11px] font-semibold text-[#cdbcff]" title="Representação didática da ação: não é resultado observado nem previsto">
          ✎ processo ilustrado
        </span>
      </div>

      {/* cena */}
      <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(90%_80%_at_50%_40%,rgba(47,91,234,0.16),rgba(6,10,19,0.2)_70%)]" data-modo-cena={usar3d ? "3d" : "2d"}>
        {usar3d ? (
          <Limite3D onErro={() => setFalhou3d(true)}>
            <Holo3D passo={etapa.passo} t={t} pausado={!s.tocando || pausadoGlobal} reduzido={reduzido} onSelecionar={(o) => s.selecionar(s.selecao === o ? null : o)} selecionado={s.selecao} origemDe={origemDe} />
          </Limite3D>
        ) : webgl !== null ? (
          <div className="grid h-full place-items-center p-4">
            {(webgl === false || falhou3d) && <p className="absolute left-3 top-3 rounded-lg border border-[#ffb23f]/40 bg-[#ffb23f]/10 px-2 py-1 text-[12px] text-[#ffd08a]">3D indisponível neste navegador: mostrando a ilustração 2D.</p>}
            {svg2d}
          </div>
        ) : null}
        <AnimatePresence>{s.selecao && <PainelElemento key={s.selecao} etapa={etapa} objeto={s.selecao} onFechar={() => s.selecionar(null)} onPerguntar={onPerguntar} />}</AnimatePresence>
        {usar3d && !s.selecao && <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-[#a7b2c8]">Clique num rótulo para ver o elemento · arraste para girar</p>}
      </div>

      {/* controles */}
      <div className="flex flex-wrap items-center justify-between gap-2" role="toolbar" aria-label="Controles da visualização">
        <div className="flex items-center gap-1">
          <Controle rotulo="Reiniciar" icone={IC.reiniciar} onClick={s.reiniciar} />
          <Controle rotulo={s.tocando ? "Pausar" : "Reproduzir"} icone={s.tocando ? IC.pausa : IC.play} onClick={() => (!s.tocando && s.idx === cena.etapas.length - 1 && t >= 1 ? s.reiniciar() : s.setTocando(!s.tocando))} destaque />
          <label className="ml-1 flex items-center gap-1 text-[12px] text-[#a7b2c8]">
            <span>Velocidade</span>
            <select aria-label="Velocidade da animação" value={s.velocidade} onChange={(e) => s.setVelocidade(Number(e.target.value) as Velocidade)} className="rounded-full border border-white/15 bg-[#0b1221] px-2 py-1 text-[12px] text-white">
              <option value={0.5}>0,5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-1">
          <Controle rotulo="Aproximar" icone={IC.mais} onClick={() => zoomHolo(0.8)} disabled={!usar3d} />
          <Controle rotulo="Afastar" icone={IC.menos} onClick={() => zoomHolo(1.25)} disabled={!usar3d} />
          <Controle rotulo="Reiniciar visão" icone={IC.visao} onClick={() => reiniciarVisaoHolo()} disabled={!usar3d} />
          {webgl && (
            <button type="button" onClick={() => setModo2d((v) => !v)} aria-pressed={modo2d} className="ge-press rounded-full border border-white/15 px-2.5 py-1 text-[12px] text-[#c9d2e3] hover:bg-white/10">
              {modo2d ? "Voltar ao 3D" : "Ver em 2D"}
            </button>
          )}
        </div>
      </div>
      <p className="px-1 text-[11px] text-[#7d8aa3]" data-testid="tempo-experimental">
        {etapa.tempoExperimental ? `Tempo experimental informado: ${etapa.tempoExperimental}. ` : ""}A animação dura {(DUR / s.velocidade / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s por etapa e não representa a duração real.
      </p>

      {/* etapas */}
      <ol className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Etapas da visualização">
        {cena.etapas.map((e, i) => (
          <li key={e.id} className="shrink-0">
            <button
              type="button"
              onClick={() => (s.setTocando(false), s.setIdx(i))}
              aria-current={i === s.idx ? "step" : undefined}
              data-passo={e.acao}
              className={`ge-press flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] ${i === s.idx ? "border-[#e679b5]/70 bg-[#7b4de0]/30 font-semibold text-white" : i < s.idx ? "border-[#7b4de0]/40 text-[#cdbcff]" : "border-white/12 text-[#a7b2c8] hover:text-white"}`}
            >
              <span className="ge-mono">{String(i + 1).padStart(2, "0")}</span>
              {e.titulo}
            </button>
          </li>
        ))}
      </ol>
      {etapa.limitacoes.length > 0 && (
        <ul className="px-1 text-[11px] text-[#ffd08a]">
          {etapa.limitacoes.map((l) => (
            <li key={l}>⚠ {l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Controle({ rotulo, icone, onClick, disabled, destaque }: { rotulo: string; icone: string; onClick: () => void; disabled?: boolean; destaque?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={rotulo} className={`ge-press inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold disabled:opacity-35 ${destaque ? "bg-[#7b4de0] text-white hover:bg-[#8a5ef0]" : "border border-white/15 text-[#c9d2e3] hover:bg-white/10 hover:text-white"}`}>
      <Icone d={icone} size={16} />
      <span className={destaque ? "" : "sr-only"}>{rotulo}</span>
    </button>
  );
}

const CHAVE_BOAS_VINDAS = "genolab:boas-vindas:v1";

/** Tela inicial: o Geninho explica como começar (texto fixo, sem IA). Some depois da primeira cena. */
function BoasVindasGeninho() {
  const setTexto = useExperimento((s) => s.setTexto);
  const vazio = useExperimento((s) => !s.texto.trim() && !s.materiais.length);
  const [recolhida, setRecolhida] = useState(false);
  useEffect(() => {
    try {
      setRecolhida(localStorage.getItem(CHAVE_BOAS_VINDAS) === "1");
    } catch {
      /* sem armazenamento: mostra completo */
    }
  }, []);
  const recolher = (v: boolean) => {
    setRecolhida(v);
    try {
      localStorage.setItem(CHAVE_BOAS_VINDAS, v ? "1" : "0");
    } catch {
      /* ignora */
    }
  };
  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(80%_70%_at_50%_45%,rgba(123,77,224,0.18),transparent_70%)] p-3 sm:min-h-[320px] sm:p-6 sm:pb-20 lg:h-full" data-testid="visual-vazio">
      <svg aria-hidden="true" viewBox="0 0 400 220" className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto hidden w-[min(520px,90%)] opacity-50 sm:block">
        <defs>
          <radialGradient id="plat" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#7b4de0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#2f5bea" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="170" rx="170" ry="34" fill="url(#plat)" />
        <ellipse cx="200" cy="170" rx="150" ry="28" fill="none" stroke="#9db4ff" strokeOpacity="0.5" />
        <ellipse cx="200" cy="170" rx="110" ry="20" fill="none" stroke="#e679b5" strokeOpacity="0.4" strokeDasharray="4 6" />
      </svg>
      <section aria-labelledby="geninho-boas-vindas" className="relative flex w-full max-w-[640px] flex-row items-start gap-4" data-testid="geninho-boas-vindas">
        <div className="hidden shrink-0 rounded-[28px] p-[3px] shadow-[0_10px_40px_-12px_rgba(123,77,224,0.8)] sm:block" style={{ background: "var(--ge-gradient)" }}>
          <GeninhoCorpo className={`rounded-[25px] bg-white object-cover ${recolhida ? "h-20 w-20" : "h-40 w-40"}`} />
        </div>
        <div className="relative min-w-0 flex-1 rounded-2xl border border-white/12 bg-[#0f182b]/90 p-3 text-[14px] leading-relaxed text-[#c9d2e3] backdrop-blur sm:rounded-tl-md sm:p-4">
          <div className="flex items-center gap-3">
            {/* no celular a imagem fica pequena, ao lado do título, e o texto usa a largura toda */}
            <div className="shrink-0 rounded-[16px] p-[2px] shadow-[0_8px_28px_-10px_rgba(123,77,224,0.8)] sm:hidden" style={{ background: "var(--ge-gradient)" }}>
              <GeninhoCorpo className="h-14 w-14 rounded-[14px] bg-white object-cover" />
            </div>
            <h2 id="geninho-boas-vindas" className="text-[17px] font-semibold text-white">
              Olá! Eu sou o Geninho.
            </h2>
          </div>
          {recolhida ? (
            <p className="mt-1">
              Descreva no campo de descrição o que você quer fazer e clique em <strong className="text-white">Criar visualização</strong>.{" "}
              <button type="button" onClick={() => recolher(false)} className="text-[#9db4ff] underline">
                Ver as instruções
              </button>
            </p>
          ) : (
            <>
              <p className="mt-1">Vou ajudar você a transformar o seu trabalho numa visualização. Para começar:</p>
              <ol className="mt-2 grid list-decimal gap-1.5 pl-5 marker:font-semibold marker:text-[#e679b5]">
                <li>
                  <strong className="text-white">Explique</strong>, no campo de descrição, o que você quer fazer — escrevendo ou gravando um áudio. Pode ser um procedimento inteiro ou uma única ação.
                </li>
                <li>
                  Se quiser, <strong className="text-white">adicione materiais</strong>: fotos, tabelas, relatórios ou referências.
                </li>
                <li>
                  <strong className="text-white">Confira</strong> os termos, valores e unidades que eu reconhecer.
                </li>
                <li>
                  Clique em <strong className="text-white">Criar visualização</strong>: a cena mostra só o que você descreveu, sem acrescentar um protocolo inteiro.
                </li>
                <li>
                  Na cena, <strong className="text-white">clique nos elementos</strong> para ver de onde veio cada informação. Corrija o que precisar e salve num projeto quando quiser.
                </li>
              </ol>
              <p className="mt-2 text-[12px] text-[#a7b2c8]">Não é preciso criar um projeto antes. Se tiver dúvidas, me chame no botão “Geninho”, no topo.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {vazio && (
                  <button type="button" onClick={() => setTexto(EXEMPLOS_AREA[1].texto, "texto")} className="ge-press rounded-full bg-[#7b4de0] px-3 py-1.5 text-[12px] font-semibold text-white">
                    Ver com um exemplo
                  </button>
                )}
                <button type="button" onClick={() => recolher(true)} className="ge-press rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-[#c9d2e3] hover:bg-white/10">
                  Entendi
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
