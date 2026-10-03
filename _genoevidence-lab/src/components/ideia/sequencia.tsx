"use client";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLab } from "@/store/lab";
import { useUi } from "@/store/ui";
import { atual, useIdeia } from "@/store/ideia";
import { avaliarCenario, type EtapaId } from "@/lib/ideia/avaliar";
import { montarProcedimento, type EtapaProcedimento } from "@/lib/ideia/procedimento";
import { compararCenarios } from "@/lib/ideia/comparar";
import { ClaimList, SourceList } from "@/components/sources/SourceList";
import { VisualKindBadge } from "@/components/ui/Badges";
import { EstadoChip, NivelBadge } from "./parts";

const DUR_ETAPA = 5200;
const DUR_SUB = 1900;

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(mq.matches);
    const on = () => setR(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return r;
}

/**
 * Motor da sequência visual: etapa/subetapa atual, reprodução, e aplicação da cena no laboratório
 * (useLab). Texto e cena leem o MESMO estado, o que garante a sincronização.
 */
export function useSequencia(ativo: boolean) {
  const s = useIdeia();
  const cv = s.cenarios.find((c) => c.id === s.ativo) ?? s.cenarios[0];
  const cen = cv ? atual(cv) : null;
  const etapas = useMemo(() => (cen ? montarProcedimento(cen) : []), [cen]);
  const avaliacao = useMemo(() => (cen ? avaliarCenario(cen) : null), [cen]);
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState(0);
  const [tocando, setTocando] = useState(false);
  const pausadoGlobal = useUi((u) => u.paused);

  const mudanca = s.ultimaMudanca && cv && s.ultimaMudanca.cenarioId === cv.id ? s.ultimaMudanca : null;
  const diff = useMemo(() => {
    if (!mudanca || !cv) return null;
    const de = cv.versoes.find((v) => v.versao === mudanca.de);
    const para = cv.versoes.find((v) => v.versao === mudanca.para);
    return de && para ? compararCenarios(de, para) : null;
  }, [mudanca, cv]);

  const etapa: EtapaProcedimento | undefined = etapas[Math.min(idx, Math.max(0, etapas.length - 1))];
  const subp = etapa?.subpassos[sub];

  // cena da etapa/subetapa atual
  useEffect(() => {
    if (!ativo || !etapa) return;
    const st = useLab.getState();
    st.setOverlay(null);
    const e = etapa.estado;
    if (e.tubes) st.setTubes(e.tubes);
    if (e.thermocyclerOpen !== undefined) st.setThermocyclerOpen(e.thermocyclerOpen);
    if (e.programRunning !== undefined) st.setProgramRunning(e.programRunning);
    if (e.centrifugeOpen !== undefined) st.setCentrifugeOpen(e.centrifugeOpen);
    if (e.rotorSlots) st.setRotorSlots(e.rotorSlots);
    if (e.spinning !== undefined) st.setSpinning(e.spinning);
    if ("highlightReagent" in e) st.setHighlightReagent(e.highlightReagent ?? null);
    if (subp && "destaque" in subp) st.setHighlightReagent(subp.destaque ?? null);
    const alvo = subp?.foco ?? etapa.foco;
    st.select(alvo, subp?.part ?? null);
    st.setView(alvo);
  }, [ativo, etapa, subp]);

  const spinning = useLab((l) => l.spinning);
  useEffect(() => {
    if (!spinning || pausadoGlobal) return;
    const t = setTimeout(() => useLab.getState().setSpinning(false), 2200);
    return () => clearTimeout(t);
  }, [spinning, pausadoGlobal]);

  const avancar = useCallback(() => {
    if (!etapa) return;
    if (sub < etapa.subpassos.length - 1) return setSub(sub + 1);
    if (idx < etapas.length - 1) {
      setIdx(idx + 1);
      setSub(0);
    } else setTocando(false);
  }, [etapa, sub, idx, etapas.length]);
  const voltar = () => {
    if (sub > 0) return setSub(sub - 1);
    if (idx > 0) {
      setIdx(idx - 1);
      setSub(0);
    }
  };
  const repetir = () => {
    setIdx(0);
    setSub(0);
    setTocando(true);
  };
  const irPara = (i: number) => {
    setIdx(i);
    setSub(0);
  };

  useEffect(() => {
    if (!ativo || !tocando || pausadoGlobal || !etapa) return;
    const t = setTimeout(avancar, etapa.subpassos.length ? DUR_SUB : DUR_ETAPA);
    return () => clearTimeout(t);
  }, [ativo, tocando, pausadoGlobal, etapa, avancar, idx, sub]);

  // nova versão → primeira etapa afetada
  useEffect(() => {
    if (!diff?.etapasAfetadas.length) return;
    const i = etapas.findIndex((e) => diff.etapasAfetadas.includes(e.id));
    if (i >= 0) {
      setIdx(i);
      setSub(0);
      setTocando(false);
    }
  }, [diff, etapas]);

  // novo cenário confirmado → recomeça
  useEffect(() => {
    setIdx(0);
    setSub(0);
    setTocando(false);
  }, [cv?.id]);

  const fase = subp?.fase ?? etapa?.fase;
  const tempAtual = cen ? (subp?.fase === "desnaturacao" ? cen.programa.desnat.tempC : subp?.fase === "anelamento" ? cen.programa.anel.tempC : subp?.fase === "extensao" ? cen.programa.ext.tempC : null) : null;
  const thermo =
    etapa?.id === "ciclagem" && cen
      ? { title: `Ciclo 1/${cen.programa.ciclos ?? "?"}`, line: subp?.rotulo.split(" · ")[0] ?? "Ciclagem", temp: tempAtual !== null ? `${tempAtual} °C` : "" }
      : etapa?.id === "desnat_inicial" && cen
        ? { title: "Desnaturação inicial", line: cen.programa.desnatInicial.tempC !== null ? `${cen.programa.desnatInicial.tempC} °C` : "temperatura não informada" }
        : etapa?.id === "ext_final"
          ? { title: "Extensão final", line: "depois: manutenção" }
          : null;

  return { cv, cen, etapas, avaliacao, idx, sub, etapa, subp, tocando, setTocando, avancar, voltar, repetir, irPara, fase, tempAtual, thermo, diff, mudanca, pausadoGlobal };
}

export type Sequencia = ReturnType<typeof useSequencia>;

// ---------------------------------------------------------------- peças de interface

export function ControlesSequencia({ seq }: { seq: Sequencia }) {
  const fim = seq.idx === seq.etapas.length - 1 && (!seq.etapa || seq.sub >= seq.etapa.subpassos.length - 1);
  return (
    <div role="toolbar" aria-label="Controles da sequência" className="flex flex-wrap gap-1.5">
      <Ctrl onClick={() => seq.setTocando(!seq.tocando)} pressed={seq.tocando} rotulo={seq.tocando ? "Pausar" : seq.idx === 0 && seq.sub === 0 ? "Iniciar" : "Continuar"} icone={seq.tocando ? "❚❚" : "▶"} destaque />
      <Ctrl onClick={seq.voltar} rotulo="Voltar" icone="◀" disabled={seq.idx === 0 && seq.sub === 0} />
      <Ctrl onClick={seq.avancar} rotulo="Avançar" icone="▶▶" disabled={fim} />
      <Ctrl onClick={seq.repetir} rotulo="Repetir" icone="↺" />
    </div>
  );
}

function Ctrl({ onClick, rotulo, icone, pressed, disabled, destaque }: { onClick: () => void; rotulo: string; icone: string; pressed?: boolean; disabled?: boolean; destaque?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={`ge-press inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold disabled:opacity-40 ${
        destaque ? "bg-action text-white hover:opacity-90" : "bg-white/5 text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-white/10"
      }`}
    >
      <span aria-hidden="true" className="text-[11px]">
        {icone}
      </span>
      {rotulo}
    </button>
  );
}

/** Lista de etapas no estilo “Processo”: concluída (✓), atual (anel com brilho), pendente (círculo). */
export function ProcessoEtapas({ seq }: { seq: Sequencia }) {
  const afetadas = new Set<EtapaId>(seq.diff?.etapasAfetadas ?? []);
  const reduced = useReducedMotion();
  return (
    <ol className="relative grid gap-0.5" aria-label="Etapas do procedimento">
      {seq.etapas.map((e, i) => {
        const estado = i < seq.idx ? "feita" : i === seq.idx ? "atual" : "pendente";
        const problema = seq.avaliacao?.itens.some((x) => x.etapa === e.id && x.estado === "possivel_problema");
        return (
          <li key={e.id} className="relative">
            {i < seq.etapas.length - 1 && <span aria-hidden="true" className={`absolute left-[17px] top-8 h-[calc(100%-14px)] w-px ${i < seq.idx ? "bg-[#7b4de0]" : "bg-white/15"}`} />}
            <button
              type="button"
              onClick={() => seq.irPara(i)}
              aria-current={estado === "atual" ? "step" : undefined}
              data-etapa={e.id}
              className={`ge-press relative flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left text-[14px] ${estado === "atual" ? "bg-white/[0.06] font-semibold text-white" : estado === "feita" ? "text-[#c9d2e3] hover:bg-white/5" : "text-[#a7b2c8] hover:bg-white/5"}`}
            >
              <span aria-hidden="true" className="relative grid h-[22px] w-[22px] shrink-0 place-items-center">
                {estado === "feita" ? (
                  <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#7b4de0] text-[12px] text-white">✓</span>
                ) : estado === "atual" ? (
                  <motion.span
                    className="block h-[22px] w-[22px] rounded-full border-2 border-[#e679b5] bg-[#7b4de0]/40 shadow-[0_0_14px_rgba(224,56,90,0.7)]"
                    animate={reduced ? undefined : { scale: [1, 1.12, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                ) : (
                  <span className="block h-[20px] w-[20px] rounded-full border-2 border-white/35" />
                )}
              </span>
              <span className="min-w-0 flex-1">{e.titulo}</span>
              {afetadas.has(e.id) && <span className="rounded-full bg-[#4d7cff]/25 px-1.5 py-0.5 text-[10px] font-semibold text-[#9db4ff]">alterada</span>}
              {problema && (
                <span className="text-[12px] font-bold text-[#ff5470]" title="Possível problema identificado nesta etapa" aria-label="possível problema">
                  !
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function MudancaVersao({ seq }: { seq: Sequencia }) {
  const reduced = useReducedMotion();
  if (!seq.diff || !seq.mudanca) return null;
  return (
    <motion.section initial={reduced ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[#4d7cff]/40 bg-[#4d7cff]/10 p-3 text-sm" aria-labelledby="o-que-mudou" data-testid="o-que-mudou">
      <h3 id="o-que-mudou" className="text-[13px] font-bold text-white">
        O que mudou da versão {seq.mudanca.de} para a {seq.mudanca.para}
      </h3>
      <ul className="mt-1 grid gap-0.5 text-[13px]">
        {seq.diff.alterados.map((d) => (
          <li key={d.campo}>
            <span className="font-semibold">{d.rotulo}:</span> {d.antes} → <span className="font-semibold text-[#9db4ff]">{d.depois}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted">Etapas afetadas: {seq.diff.etapasAfetadas.map((e) => seq.etapas.find((x) => x.id === e)?.titulo ?? e).join(", ") || "nenhuma etapa animada"}.</p>
      {seq.diff.consequencias.length > 0 && (
        <ul className="mt-1.5 grid gap-1 text-xs">
          {seq.diff.consequencias.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold">{m.titulo}:</span>
              {m.antes ? <EstadoChip estado={m.antes.estado} curto /> : <span>não avaliado</span>} →{m.depois ? <EstadoChip estado={m.depois.estado} curto /> : <span>não avaliado</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[11px] text-muted">A versão {seq.mudanca.de} continua guardada para comparação.</p>
    </motion.section>
  );
}

/** Cenários possíveis na análise (ilustração com fonte, sem probabilidade). */
export const CENARIOS_POSSIVEIS = [
  { titulo: "Banda única do tamanho esperado", fonte: [{ id: "lee2012", locator: "Discussão" }], nota: "Tamanho estimado pelo marcador." },
  { titulo: "Bandas adicionais, escada ou arraste", fonte: [{ id: "lorenz2012", locator: "§7 Troubleshooting" }], nota: "Produtos inespecíficos." },
  { titulo: "Banda pequena (< 100 pb) perto da base", fonte: [{ id: "lorenz2012", locator: "§7 Troubleshooting" }], nota: "Dímeros de primers." },
  { titulo: "Ausência de banda", fonte: [{ id: "lorenz2012", locator: "§7 Troubleshooting" }], nota: "Condições estringentes demais ou reagente faltando." },
  { titulo: "Banda no controle negativo", fonte: [{ id: "lorenz2012", locator: "§4, Notas" }], nota: "Sugere contaminação." },
];

export function DetalheEtapa({ seq }: { seq: Sequencia }) {
  const reduced = useReducedMotion();
  const etapa = seq.etapa;
  if (!etapa) return null;
  const itens = seq.avaliacao?.itens.filter((i) => i.etapa === etapa.id) ?? [];
  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={etapa.id}
        initial={reduced ? false : { opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduced ? undefined : { opacity: 0, x: -8 }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
        className="grid gap-3"
        aria-live="polite"
        aria-labelledby="etapa-titulo"
      >
        <div>
          <h3 id="etapa-titulo" className="text-base font-bold text-white">
            {etapa.titulo}
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <NivelBadge nivel="procedimento" />
            {etapa.calculo && <NivelBadge nivel="simulacao" />}
            {seq.fase && <VisualKindBadge kind="ilustracao" />}
            {itens.length > 0 && <NivelBadge nivel="avaliacao" />}
          </div>
          <p className="mt-2 text-[13px]">{etapa.resumo}</p>
        </div>
        {etapa.subpassos.length > 0 && (
          <ol className="grid gap-0.5" aria-label="Subetapas">
            {etapa.subpassos.map((x, i) => (
              <li key={i} aria-current={i === seq.sub ? "true" : undefined} className={`rounded-md px-2 py-1 text-[13px] transition-colors ${i === seq.sub ? "bg-[#7b4de0]/30 font-semibold text-white" : i < seq.sub ? "text-muted" : ""}`}>
                {x.rotulo}
              </li>
            ))}
          </ol>
        )}
        {etapa.parametros.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-white/[0.04] p-2.5 text-xs">
            {etapa.parametros.map((p) => (
              <div key={p.rotulo} className="contents">
                <dt className="text-muted">{p.rotulo}</dt>
                <dd className={p.valor === "não informado" ? "text-warn" : "font-semibold text-white"}>{p.valor}</dd>
              </div>
            ))}
          </dl>
        )}
        {etapa.calculo && (
          <div className="rounded-lg border border-[#ffb23f]/30 bg-[#ffb23f]/10 p-2.5 text-xs">
            <p className="font-semibold text-white">
              {etapa.calculo.titulo}: <span className="text-sm">{etapa.calculo.valor}</span>
            </p>
            <p className="mt-0.5">{etapa.calculo.modelo}</p>
            <ul className="mt-0.5 list-disc pl-4 text-muted">
              {etapa.calculo.pressupostos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="text-[13px]">
          <ClaimList claims={etapa.explicacao} />
        </div>
        {itens.length > 0 && (
          <div className="grid gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Avaliação desta etapa</p>
            {itens.map((it) => (
              <div key={it.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs" data-item={it.id}>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold text-white">{it.titulo}</span>
                  <EstadoChip estado={it.estado} curto />
                </div>
                <p className="mt-0.5">{it.condicao}</p>
                <p className="mt-0.5 text-muted">{it.consequencia}</p>
              </div>
            ))}
          </div>
        )}
        {etapa.id === "analise" && (
          <div className="grid gap-1.5" data-testid="cenarios-possiveis">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Cenários possíveis no gel (ilustração, sem probabilidade)</p>
            {CENARIOS_POSSIVEIS.map((cp, i) => (
              <motion.div
                key={cp.titulo}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : i * 0.12 }}
                className="rounded-lg border border-dashed border-white/15 p-2 text-xs"
              >
                <p className="font-semibold text-white">{cp.titulo}</p>
                <p className="text-muted">{cp.nota} Probabilidade: não estimada.</p>
                <SourceList refs={cp.fonte} compact />
              </motion.div>
            ))}
            <p className="text-[11px] text-muted">Nenhum destes cenários é apresentado como o resultado do seu experimento.</p>
          </div>
        )}
      </motion.section>
    </AnimatePresence>
  );
}
