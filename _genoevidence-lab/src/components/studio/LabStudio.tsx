"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LAB_OBJECTS, ZONES, getLabObject, type ZoneId } from "@/lib/lab/objects";
import { ZONE_OF_OBJECT } from "@/lib/lab/layout";
import { interpretarDescricao } from "@/lib/ideia/parse";
import type { MolecularPhase } from "@/lib/modules/contract";
import { useLab } from "@/store/lab";
import { useUi, type Quality } from "@/store/ui";
import { useIdeia } from "@/store/ideia";
import { HotspotOverlay } from "@/components/lab3d/HotspotOverlay";
import { ObjectInfo } from "@/components/lab3d/ObjectInfo";
import { EquipmentControls, type ProjectLinks } from "@/components/lab3d/EquipmentControls";
import { ProjectGelImages } from "@/components/pcr/results";
import { Plano } from "@/components/ideia/Plano";
import { Avaliacao } from "@/components/ideia/Avaliacao";
import { Comparar } from "@/components/ideia/Comparar";
import { EditorCondicoes } from "@/components/ideia/campos";
import { ControlesSequencia, DetalheEtapa, MudancaVersao, ProcessoEtapas, useReducedMotion, useSequencia } from "@/components/ideia/sequencia";
import { Geninho } from "@/components/assistant/Geninho";
import { GeninhoAvatar } from "@/components/assistant/GeninhoAvatar";
import { ReferenceStatusBadge } from "@/components/ui/Badges";
import type { Reference } from "@/lib/domain/schemas";
import { LabSidebar } from "./LabSidebar";
import { PromptBar } from "./PromptBar";
import { Holograma } from "./Holograma";
import { Gaveta, GelIlustrativo, PerfilTermicoMini, ResultadoNaoPrevisto, SeloDados } from "./Resultados";
import { useRoteiro } from "@/store/roteiro";
import { Palco } from "@/components/visual/Palco";
import { DetalheVisual, TabelaPrevisibilidade } from "@/components/visual/Previsibilidade";
import type { FrequenciaPublicada } from "@/lib/ideia/evidencia";

const LabCanvas = dynamic(() => import("@/components/lab3d/LabCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center" role="status">
      <p className="ge-mono text-sm text-[#a7b2c8]">carregando o laboratório 3D…</p>
    </div>
  ),
});

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const ZONE_IDS: ZoneId[] = ["pre", "amp", "pos", "analise"];
type ProjetoOpcao = { id: string; title: string; role: string };
type User = { name: string; email: string; role: string };

export function LabStudio({
  user,
  project,
  gelImages,
  projetos,
  geninho,
}: {
  user: User;
  project: ProjectLinks;
  gelImages: { id: string; name: string; role?: string }[];
  projetos: ProjetoOpcao[];
  geninho: { configured: boolean };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const s = useIdeia();
  const lab = useLab();
  const paused = useUi((u) => u.paused);
  const quality = useUi((u) => u.quality);
  const setQuality = useUi((u) => u.setQuality);
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [larga, setLarga] = useState(true);
  const [gavetaLocal, setGavetaLocal] = useState<null | "geninho" | "editar" | "processo">(null);
  const roteiro = useRoteiro();
  const [modo, setModo] = useState<"visual" | "bancada">("bancada");
  const [freq, setFreq] = useState<FrequenciaPublicada[]>([]);
  const [refsProj, setRefsProj] = useState<{ id: string; title: string }[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [faseManual, setFaseManual] = useState<MolecularPhase | null>(null);
  const [visitadas, setVisitadas] = useState<Set<ZoneId>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const mode2d = search.get("modo") === "2d";
  const show3d = !mode2d && webgl === true && !canvasFailed;

  const temIdeia = s.cenarios.length > 0;
  const temVisual = roteiro.passos.length > 0;
  const visual = modo === "visual" && temVisual;
  const seq = useSequencia(temIdeia && !visual);
  const cen = seq.cen;
  const cenarioPcr = cen ?? (s.rascunho?.tecnica === "pcr" ? s.rascunho : null);

  // frequências publicadas e referências do projeto associado (para a tabela e o detalhe)
  useEffect(() => {
    setFreq([]);
    setRefsProj([]);
    if (!s.projetoId) return;
    let vivo = true;
    fetch(`/api/projects/${s.projetoId}/evidencias`)
      .then((r) => (r.ok ? r.json() : { itens: [] }))
      .then((d: { itens: FrequenciaPublicada[] }) => vivo && setFreq(d.itens))
      .catch(() => undefined);
    fetch(`/api/projects/${s.projetoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { project?: { references: { id: string; title: string }[] } } | null) => vivo && setRefsProj((d?.project?.references ?? []).map((x) => ({ id: x.id, title: x.title }))))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [s.projetoId]);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
    // entrada: a câmera sai do alto e chega à visão geral
    const t = setTimeout(() => useLab.getState().setIntro("concluida"), 250);
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setLarga(mq.matches);
    on();
    mq.addEventListener("change", on);
    if (project?.id && !useIdeia.getState().projetoId) useIdeia.getState().setProjeto(project.id);
    if (search.get("ideia") === "1") document.getElementById("prompt-ideia")?.focus();
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", on);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // zonas visitadas (estado do “Processo” no modo de exploração)
  const zonaAtual: ZoneId | null = ZONE_IDS.find((z) => z === lab.view) ?? ZONE_OF_OBJECT[lab.view] ?? null;
  useEffect(() => {
    if (zonaAtual) setVisitadas((v) => (v.has(zonaAtual) ? v : new Set([...v, zonaAtual])));
  }, [zonaAtual]);

  // gavetas derivadas do passo do fluxo
  const gavetaFluxo = s.passo === "conferir" ? "plano" : s.passo === "avaliar" ? "avaliacao" : s.passo === "comparar" ? "comparar" : null;
  const fecharFluxo = useCallback(() => useIdeia.getState().setPasso(temIdeia ? "visualizar" : "descrever"), [temIdeia]);

  // ao confirmar o plano, começa a sequência (exceto com movimento reduzido)
  const passoAnterior = useRef(s.passo);
  useEffect(() => {
    if (passoAnterior.current === "conferir" && s.passo === "visualizar") {
      setModo("bancada");
      if (!reduced) seq.setTocando(true);
    }
    passoAnterior.current = s.passo;
  }, [s.passo]); // eslint-disable-line react-hooks/exhaustive-deps

  const selecionar = useCallback((id: string, part?: string | null) => {
    const st = useLab.getState();
    st.select(id, part ?? null);
    st.setView(id);
    if (id === "reagentes" && part) st.setHighlightReagent(part);
    setFaseManual(null);
  }, []);
  const irZona = (z: ZoneId) => {
    lab.select(null);
    lab.setView(z);
    setFaseManual(null);
  };
  const visaoGeral = () => {
    lab.select(null);
    lab.setView("geral");
    setFaseManual(null);
  };

  // ---------------------------------------------------------------- descrição → visualização (qualquer técnica)
  const enviar = (texto: string) => {
    setAviso(null);
    useRoteiro.getState().gerar(texto);
    setModo("visual");
    // parâmetros de PCR reconhecidos ficam como plano conferível (avaliação por regras na tabela)
    const plano = interpretarDescricao(texto, { id: "previa", via: s.via });
    const valores = plano.extracoes.filter((x) => x.valor !== null).length;
    if (plano.cenario.tecnica === "pcr" && valores >= 1) useIdeia.getState().interpretarSilencioso();
  };

  const anexar = async (f: File) => {
    setAviso(null);
    const nome = f.name.toLowerCase();
    const proj = projetos.find((p) => p.id === s.projetoId);
    const podeEnviar = proj && ["dono", "gestor", "editor"].includes(proj.role);
    const enviarAoProjeto = async () => {
      if (!s.projetoId) return;
      const fd = new FormData();
      fd.append("file", f);
      fd.append("role", "protocolo");
      const r = await fetch(`/api/projects/${s.projetoId}/files`, { method: "POST", body: fd });
      if (!r.ok) setAviso(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível enviar o arquivo ao projeto.");
    };
    if (/\.(txt|md)$/.test(nome)) {
      if (f.size > 200_000) return setAviso("Arquivo de texto acima de 200 KB.");
      const t = await f.text();
      s.setTexto((s.texto ? s.texto.trim() + "\n\n" : "") + t.slice(0, 7000), "protocolo");
      setAviso(`Texto de “${f.name}” inserido. Revise antes de interpretar.`);
      if (podeEnviar) await enviarAoProjeto();
      return;
    }
    if (nome.endsWith(".pdf")) {
      if (!podeEnviar) return setAviso("Para guardar um PDF, associe um projeto em que você possa editar (no plano). A leitura automática de PDF não acontece aqui: cole o trecho do protocolo.");
      await enviarAoProjeto();
      return setAviso(`“${f.name}” foi guardado no projeto como protocolo. Cole o trecho do protocolo na barra para interpretá-lo.`);
    }
    setAviso("Formato não aceito. Use .txt, .md ou .pdf.");
  };

  const projetoSel = projetos.find((p) => p.id === s.projetoId) ?? null;
  const podeEditarProjeto = Boolean(projetoSel && ["dono", "gestor", "editor"].includes(projetoSel.role));
  const salvar = async () => {
    if (!s.projetoId) return;
    setSalvando(true);
    const r = await fetch(`/api/projects/${s.projetoId}/ideias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.ideiaId, titulo: s.titulo || "Ideia sem título", cenarios: s.cenarios }),
    });
    setSalvando(false);
    if (r.ok) s.marcarSalvo(new Date().toISOString());
    else setAviso(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível salvar.");
  };

  // ---------------------------------------------------------------- holograma
  const holoFase: MolecularPhase | null = temIdeia ? (seq.fase ?? null) : faseManual;
  const holoAncora = temIdeia ? (seq.subp?.foco ?? seq.etapa?.foco ?? "termociclador") : (lab.selected ?? "termociclador");

  const thermo = seq.thermo ?? (lab.tubes === "termociclador" ? { title: "Pronto", line: "Programa padrão de 3 etapas", temp: lab.thermocyclerOpen ? "tampa aberta" : "" } : { title: "Em espera", line: "Sem tubos no bloco" });
  const computerLines = useMemo(
    () => (cen ? [`${cen.nome} · v${cen.versao}`, cen.alvo.gene ? `Alvo: ${cen.alvo.gene}` : "Alvo não informado", `${cen.programa.ciclos ?? "?"} ciclos`, "Resultado: não previsto"] : project ? [`Projeto: ${project.title}`, `${project.datasets.length} conjunto(s) de dados`, `${project.structures.length} estrutura(s)`, `${project.references} referência(s)`] : ["Nenhum projeto aberto", "Descreva uma ideia na barra", "ou abra um projeto."]),
    [cen, project],
  );

  // ---------------------------------------------------------------- painel “Processo / Resultados”
  const painel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-5" data-etapa-atual={temIdeia ? seq.etapa?.id : undefined} data-subpasso={temIdeia ? seq.sub : undefined}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-white">Processo</h2>
          {temIdeia && (
            <span className="mt-1.5 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-[#c9d2e3]">
              {cen?.nome}
              {seq.cv && seq.cv.versoes.length > 1 ? ` · v${cen?.versao}` : ""}
            </span>
          )}
        </div>

        {temIdeia && cen ? (
          cen.tecnica !== "pcr" ? (
            <div className="mt-3 grid gap-2 text-[13px]">
              <p className="text-[#ffb23f]">Animação específica e simulação ainda não disponíveis para esta técnica. O laboratório de PCR não é mostrado como equivalente.</p>
              <ol className="grid gap-1.5">
                {cen.roteiro.map((r, i) => (
                  <li key={i} className="flex gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    <span className="ge-mono text-[#e679b5]">{String(i + 1).padStart(2, "0")}</span>
                    {r}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              <ControlesSequencia seq={seq} />
              <MudancaVersao seq={seq} />
              <ProcessoEtapas seq={seq} />
              <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-3" open>
                <summary className="cursor-pointer text-[13px] font-semibold text-white">Etapa atual: explicação e fontes</summary>
                <div className="mt-3">
                  <DetalheEtapa seq={seq} />
                </div>
              </details>
            </div>
          )
        ) : (
          <ol className="relative mt-4 grid gap-1" aria-label="Bancadas do laboratório">
            {ZONE_IDS.map((z, i) => {
              const estado = zonaAtual === z ? "atual" : visitadas.has(z) ? "feita" : "pendente";
              return (
                <li key={z} className="relative">
                  {i < ZONE_IDS.length - 1 && <span aria-hidden="true" className={`absolute left-[17px] top-8 h-[calc(100%-14px)] w-px ${visitadas.has(z) ? "bg-[#7b4de0]" : "bg-white/15"}`} />}
                  <button
                    type="button"
                    onClick={() => irZona(z)}
                    aria-current={estado === "atual" ? "location" : undefined}
                    className={`ge-press relative flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left text-[15px] ${estado === "atual" ? "bg-white/[0.06] font-semibold text-white" : "text-[#c9d2e3] hover:bg-white/5"}`}
                  >
                    <span aria-hidden="true" className="grid h-[22px] w-[22px] shrink-0 place-items-center">
                      {estado === "feita" ? (
                        <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#7b4de0] text-[12px] text-white">✓</span>
                      ) : estado === "atual" ? (
                        <span className="block h-[22px] w-[22px] rounded-full border-2 border-[#e679b5] bg-[#7b4de0]/40 shadow-[0_0_14px_rgba(224,56,90,0.7)]" />
                      ) : (
                        <span className="block h-[20px] w-[20px] rounded-full border-2 border-white/35" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">{ZONES[z].label.replace(/^Zona \d · /, "")}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {!temIdeia && lab.selected && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[13px]" data-objeto={lab.selected}>
            <ObjectInfo
              id={lab.selected}
              part={lab.selectedPart}
              projectId={project?.id}
              headingLevel={3}
              actions={
                lab.selected === "termociclador" ? (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Escala molecular">
                    {(["desnaturacao", "anelamento", "extensao"] as MolecularPhase[]).map((f) => (
                      <button key={f} type="button" aria-pressed={faseManual === f} onClick={() => setFaseManual(faseManual === f ? null : f)} className={`ge-press rounded-full px-2.5 py-1 text-xs font-semibold ${faseManual === f ? "bg-[#7b4de0] text-white" : "bg-white/5 text-[#c9d2e3] hover:bg-white/10"}`}>
                        {f === "desnaturacao" ? "Desnaturação" : f === "anelamento" ? "Anelamento" : "Extensão"}
                      </button>
                    ))}
                  </div>
                ) : null
              }
              interactions={<EquipmentControls id={lab.selected} project={project} />}
            />
          </div>
        )}
        {!temIdeia && !lab.selected && zonaAtual && (
          <ul className="mt-4 grid gap-1.5">
            {LAB_OBJECTS.filter((o) => o.zone === zonaAtual && !o.id.startsWith("placa-") && o.id !== "bancada-pre-pcr").map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => selecionar(o.id)} className="ge-press w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-[#b49cf5]/60">
                  <span className="block text-[13px] font-semibold text-white">{o.name}</span>
                  <span className="block text-xs text-[#a7b2c8]">{o.function}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="my-5 h-px bg-white/10" />
        <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-white">Resultados</h2>
        <div className="mt-3 grid gap-3">
          {temIdeia && cen?.tecnica === "pcr" && (
            <>
              <PerfilTermicoMini cenario={cen} />
              <GelIlustrativo ampliconPb={cen.alvo.ampliconPb} />
              <ResultadoNaoPrevisto onAvaliar={() => s.setPasso("avaliar")} />
            </>
          )}
          {project && gelImages.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[13px] font-semibold text-white">Imagens de gel do projeto</h4>
                <SeloDados />
              </div>
              <ProjectGelImages projectId={project.id} images={gelImages} />
            </section>
          )}
          {!temIdeia && !(project && gelImages.length) && (
            <p className="text-[13px] text-[#a7b2c8]">Descreva uma ideia ou procedimento na barra abaixo. Aqui aparecem só saídas com fundamento: cálculos de modelos identificados, ilustrações marcadas e dados do seu projeto.</p>
          )}
        </div>
      </div>

      {temIdeia && (
        <div className="grid gap-2 border-t border-white/10 px-5 py-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => s.setPasso("avaliar")} className="ge-press rounded-full bg-action px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90">
              Avaliação completa
            </button>
            <button type="button" onClick={() => s.setPasso("comparar")} className="ge-press rounded-full bg-white/5 px-3 py-2 text-[13px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] hover:bg-white/10">
              Comparar
            </button>
            <button type="button" onClick={() => setGavetaLocal("editar")} className="ge-press rounded-full bg-white/5 px-3 py-2 text-[13px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] hover:bg-white/10">
              Editar condição
            </button>
            <button type="button" onClick={() => (s.reiniciar(), useRoteiro.getState().limpar(), visaoGeral())} className="ge-press rounded-full px-3 py-2 text-[13px] font-semibold text-[#c9d2e3] hover:bg-white/10">
              Nova ideia
            </button>
          </div>
          <p className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#a7b2c8]">
            {projetoSel ? (
              podeEditarProjeto ? (
                <>
                  <span>{s.salvoEm ? `Salvo em “${projetoSel.title}”` : "Alterações não salvas"}</span>
                  <button type="button" onClick={() => void salvar()} disabled={salvando} className="font-semibold text-[#9db4ff] underline disabled:opacity-50">
                    {salvando ? "Salvando…" : "Salvar no projeto"}
                  </button>
                </>
              ) : (
                <span>Seu papel em “{projetoSel.title}” não permite salvar.</span>
              )
            ) : (
              <span>Sem projeto associado: nada é salvo (associe no plano).</span>
            )}
          </p>
        </div>
      )}
      <p className="px-5 pb-3 text-right text-[11px] text-[#7d8aa3]">Ilustrações e simulações marcadas · não são resultados experimentais</p>
    </div>
  );

  const painelVisual = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-5" data-etapa-visual={roteiro.passos[roteiro.idx]?.id}>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-white">Processo</h2>
        <ol className="relative mt-3 grid gap-0.5" aria-label="Etapas descritas">
          {roteiro.passos.map((p, i) => {
            const estado = i < roteiro.idx ? "feita" : i === roteiro.idx ? "atual" : "pendente";
            return (
              <li key={p.id} className="relative">
                {i < roteiro.passos.length - 1 && <span aria-hidden="true" className={`absolute left-[17px] top-8 h-[calc(100%-14px)] w-px ${i < roteiro.idx ? "bg-[#7b4de0]" : "bg-white/15"}`} />}
                <button
                  type="button"
                  onClick={() => (roteiro.setTocando(false), roteiro.setIdx(i))}
                  aria-current={estado === "atual" ? "step" : undefined}
                  data-passo={p.acao}
                  className={`ge-press relative flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left text-[14px] ${estado === "atual" ? "bg-white/[0.06] font-semibold text-white" : estado === "feita" ? "text-[#c9d2e3] hover:bg-white/5" : "text-[#a7b2c8] hover:bg-white/5"}`}
                >
                  <span aria-hidden="true" className="grid h-[22px] w-[22px] shrink-0 place-items-center">
                    {estado === "feita" ? (
                      <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#7b4de0] text-[12px] text-white">✓</span>
                    ) : estado === "atual" ? (
                      <span className="block h-[22px] w-[22px] rounded-full border-2 border-[#e679b5] bg-[#7b4de0]/40 shadow-[0_0_14px_rgba(224,56,90,0.7)]" />
                    ) : (
                      <span className="block h-[20px] w-[20px] rounded-full border-2 border-white/35" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">{p.titulo}</span>
                  {p.atencao.length > 0 && <span className="text-[12px] font-bold text-[#ffb23f]" aria-label="pontos de atenção">!</span>}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="my-5 h-px bg-white/10" />
        <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-white">Previsibilidade</h2>
        <div className="mt-3">
          <TabelaPrevisibilidade cenario={cenarioPcr} frequencias={freq} />
        </div>

        <div className="my-5 h-px bg-white/10" />
        <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-white">Etapa atual</h2>
        <div className="mt-3">
          <DetalheVisual refsProjeto={refsProj} />
        </div>

        {s.rascunho?.tecnica === "pcr" && (
          <div className="mt-5 grid gap-3">
            <div className="h-px bg-white/10" />
            <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-white">Resultados calculáveis</h2>
            <PerfilTermicoMini cenario={cen ?? s.rascunho} />
            <GelIlustrativo ampliconPb={(cen ?? s.rascunho).alvo.ampliconPb} />
            <ResultadoNaoPrevisto onAvaliar={temIdeia ? () => s.setPasso("avaliar") : undefined} />
          </div>
        )}
      </div>
      <div className="grid gap-2 border-t border-white/10 px-5 py-3">
        <div className="grid grid-cols-2 gap-2">
          {s.rascunho?.tecnica === "pcr" && !temIdeia && (
            <button type="button" onClick={() => s.setPasso("conferir")} className="ge-press col-span-2 rounded-full bg-action px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90">
              Conferir parâmetros da PCR ({s.interpretacao?.extracoes.filter((x) => x.valor !== null).length ?? 0} reconhecidos)
            </button>
          )}
          {temIdeia && (
            <>
              <button type="button" onClick={() => setModo("bancada")} className="ge-press rounded-full bg-action px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90">
                Ver a PCR na bancada 3D
              </button>
              <button type="button" onClick={() => s.setPasso("avaliar")} className="ge-press rounded-full bg-white/5 px-3 py-2 text-[13px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] hover:bg-white/10">
                Avaliação completa
              </button>
            </>
          )}
          <button type="button" onClick={() => (useRoteiro.getState().limpar(), s.reiniciar(), setModo("bancada"), visaoGeral())} className="ge-press rounded-full px-3 py-2 text-[13px] font-semibold text-[#c9d2e3] hover:bg-white/10">
            Nova descrição
          </button>
        </div>
      </div>
      <p className="px-5 pb-3 text-right text-[11px] text-[#7d8aa3]">Visualização gerada da sua descrição · ilustração, não resultado</p>
    </div>
  );

  return (
    <div className="ge-dark fixed inset-0 z-30 flex flex-col bg-[#060a13] lg:flex-row">
      <LabSidebar user={user} />
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Cena 3D */}
        {show3d && (
          <div className={`absolute inset-0 transition-[filter,transform] duration-700 ${visual ? "pointer-events-none scale-[1.04] blur-[5px] brightness-[0.42]" : ""}`} data-foco={lab.selected ?? ""} aria-hidden={visual || undefined}>
            <CanvasBoundary onError={() => setCanvasFailed(true)}>
              <LabCanvas
                ambiente="noite"
                quality={quality}
                paused={paused}
                reducedMotion={reduced}
                orbit
                projectName={project?.title}
                computerLines={computerLines}
                thermoDisplay={thermo}
                onSelect={selecionar}
              />
              {!visual && <HotspotOverlay onSelect={selecionar} />}
              {!visual && holoFase && <Holograma fase={holoFase} ancora={holoAncora} pausado={paused || reduced} temperatura={temIdeia ? seq.tempAtual : undefined} />}
            </CanvasBoundary>
            {/* vinheta para leitura dos painéis */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(6,10,19,0.65))]" />
          </div>
        )}
        {!show3d && webgl !== null && (
          <div className="absolute inset-0 overflow-y-auto p-4 pb-40 pt-16 lg:pr-[420px]" data-foco={lab.selected ?? ""}>
            {(webgl === false || canvasFailed) && <p className="mb-3 rounded-xl border border-[#ffb23f]/40 bg-[#ffb23f]/10 p-3 text-sm text-[#ffb23f]">O ambiente 3D não está disponível neste navegador. As mesmas informações estão nos painéis.</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {ZONE_IDS.map((z, i) => (
                <section key={z} className="ge-card p-4" aria-labelledby={`z2d-${z}`}>
                  <p className="ge-mono text-[11px] text-[#e679b5]">0{i + 1}</p>
                  <h2 id={`z2d-${z}`} className="font-bold text-white">
                    {ZONES[z].label}
                  </h2>
                  <ul className="mt-2 grid gap-1">
                    {LAB_OBJECTS.filter((o) => o.zone === z).map((o) => (
                      <li key={o.id}>
                        <button type="button" onClick={() => selecionar(o.id)} className="ge-press w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5">
                          <span className="font-semibold text-white">{o.name}</span>
                          <span className="block text-xs text-[#a7b2c8]">{o.function}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}

        {/* Visualização gerada da descrição */}
        {visual && (
          <div className="absolute bottom-[132px] left-3 right-3 top-16 z-10 lg:right-[560px]">
            <Palco />
          </div>
        )}

        {/* Barra superior: trilha e ferramentas */}
        <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3 ${visual ? "lg:pr-[560px]" : "lg:pr-[420px]"}`}>
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Modo" className="ge-glass flex items-center gap-0.5 rounded-full p-1 text-[13px]">
            <button type="button" role="radio" aria-checked={visual} disabled={!temVisual} onClick={() => setModo("visual")} className={`rounded-full px-3 py-1 font-semibold disabled:opacity-40 ${visual ? "bg-[#7b4de0] text-white" : "text-[#c9d2e3] hover:bg-white/10"}`}>
              Visualização
            </button>
            <button type="button" role="radio" aria-checked={!visual} onClick={() => setModo("bancada")} className={`rounded-full px-3 py-1 font-semibold ${!visual ? "bg-[#7b4de0] text-white" : "text-[#c9d2e3] hover:bg-white/10"}`}>
              Bancada 3D
            </button>
          </div>
          {!visual && (
          <nav aria-label="Você está em" className="ge-glass flex items-center gap-1 rounded-full px-2 py-1 text-[13px]">
            <button type="button" onClick={visaoGeral} className="rounded-full px-2.5 py-1 text-[#c9d2e3] hover:bg-white/10 hover:text-white">
              Laboratório
            </button>
            {zonaAtual && (
              <>
                <span aria-hidden="true" className="text-[#7d8aa3]">›</span>
                <button type="button" onClick={() => irZona(zonaAtual)} className="rounded-full px-2.5 py-1 text-[#c9d2e3] hover:bg-white/10 hover:text-white">
                  {ZONES[zonaAtual].short}
                </button>
              </>
            )}
            {lab.selected && (
              <>
                <span aria-hidden="true" className="text-[#7d8aa3]">›</span>
                <span className="px-2.5 py-1 font-semibold text-white">{getLabObject(lab.selected)?.name.split(" (")[0]}</span>
              </>
            )}
          </nav>
          )}
          <button type="button" onClick={() => setGavetaLocal("geninho")} className="ge-glass ge-press flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-3 text-[13px] font-semibold text-white hover:border-[#e679b5]/60">
            <GeninhoAvatar size={30} />
            Geninho
          </button>
          </div>
          <div role="toolbar" aria-label="Controles do laboratório" className="ge-glass pointer-events-auto flex items-center gap-0.5 rounded-full p-1">
            <Ferramenta onClick={visaoGeral} rotulo="Visão geral" icone="⌂" />
            <Ferramenta onClick={lab.resetCamera} rotulo="Reiniciar câmera" icone="↺" disabled={!show3d} />
            <Ferramenta
              onClick={() => {
                const p = new URLSearchParams(search.toString());
                if (mode2d) p.delete("modo");
                else p.set("modo", "2d");
                router.replace(`${pathname}?${p.toString()}`, { scroll: false });
              }}
              rotulo={mode2d ? "Voltar ao 3D" : "Versão 2D"}
              icone="▤"
              pressed={mode2d}
            />
            <label className="flex items-center px-1.5">
              <span className="sr-only">Qualidade 3D</span>
              <select aria-label="Qualidade 3D" value={quality} onChange={(e) => setQuality(e.target.value as Quality)} className="rounded-full border border-white/15 bg-transparent px-2 py-1 text-xs text-white">
                <option value="baixa">3D baixa</option>
                <option value="media">3D média</option>
                <option value="alta">3D alta</option>
              </select>
            </label>
            {!larga && <Ferramenta onClick={() => setGavetaLocal("processo")} rotulo="Processo e resultados" icone="☰" />}
          </div>
        </div>

        {/* Painel direito */}
        {larga && (
          <aside className={`ge-glass absolute bottom-3 right-3 top-3 z-20 ${visual ? "w-[536px]" : "w-[392px]"}`} aria-label="Processo e resultados">
            {visual ? painelVisual : painel}
          </aside>
        )}

        {/* Barra de comando */}
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 ${visual ? "lg:pr-[560px]" : "lg:pr-[420px]"}`}>
          <div className="w-full max-w-[860px]">
            <AnimatePresence>
              {!temIdeia && !temVisual && !s.texto && (
                <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 text-center text-[13px] text-[#c9d2e3] [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
                  Descreva o que você quer fazer. <span className="ge-gradient-text font-semibold">Vamos explorar no laboratório.</span>
                </motion.p>
              )}
            </AnimatePresence>
            <PromptBar onEnviar={(t) => void enviar(t)} onArquivo={(f) => void anexar(f)} aviso={aviso} />
          </div>
        </div>

        {/* Gavetas */}
        <Gaveta aberta={gavetaFluxo === "plano"} titulo="Conferir o plano" onFechar={() => s.setPasso("descrever")} id="gaveta-plano">
          <AssociarProjeto projetos={projetos} />
          <Plano />
        </Gaveta>
        <Gaveta aberta={gavetaFluxo === "avaliacao"} titulo="Avaliação fundamentada e previsões" onFechar={fecharFluxo} id="gaveta-avaliacao">
          <Avaliacao podeEditar={podeEditarProjeto} />
        </Gaveta>
        <Gaveta aberta={gavetaFluxo === "comparar"} titulo="Comparar cenários e versões" onFechar={fecharFluxo} id="gaveta-comparar">
          <Comparar />
        </Gaveta>
        <Gaveta aberta={gavetaLocal === "editar" && Boolean(cen)} titulo={`Editar condição — ${cen?.nome ?? ""} (versão ${cen?.versao ?? 1})`} onFechar={() => setGavetaLocal(null)} id="gaveta-editar">
          {cen && (
            <EditorCondicoes
              cenario={cen}
              prefixo="ed"
              onAplicar={(m) => {
                if (seq.cv) s.aplicar(seq.cv.id, m);
                setGavetaLocal(null);
              }}
            />
          )}
        </Gaveta>
        <Gaveta aberta={gavetaLocal === "geninho"} titulo="Geninho" onFechar={() => setGavetaLocal(null)} id="gaveta-geninho">
          <Geninho configured={geninho.configured} isAdmin={user.role === "admin"} />
        </Gaveta>
        <Gaveta aberta={gavetaLocal === "processo" && !larga} titulo="Processo e resultados" onFechar={() => setGavetaLocal(null)} id="gaveta-processo">
          {visual ? painelVisual : painel}
        </Gaveta>
      </div>
    </div>
  );
}

function Ferramenta({ onClick, rotulo, icone, pressed, disabled }: { onClick: () => void; rotulo: string; icone: string; pressed?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      title={rotulo}
      className={`ge-press inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm disabled:opacity-40 ${pressed ? "bg-[#7b4de0] text-white" : "text-[#c9d2e3] hover:bg-white/10 hover:text-white"}`}
    >
      <span aria-hidden="true">{icone}</span>
      <span className="sr-only">{rotulo}</span>
    </button>
  );
}

/** Associação do cenário a um projeto (opcional) e às referências desse projeto. */
function AssociarProjeto({ projetos }: { projetos: ProjetoOpcao[] }) {
  const s = useIdeia();
  const [refs, setRefs] = useState<Reference[]>([]);
  useEffect(() => {
    setRefs([]);
    if (!s.projetoId) return;
    let vivo = true;
    fetch(`/api/projects/${s.projetoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { project?: { references: Reference[] } } | null) => vivo && setRefs(d?.project?.references ?? []))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [s.projetoId]);
  const sel = s.rascunho?.referencias ?? [];
  const proj = projetos.find((p) => p.id === s.projetoId);
  return (
    <section className="mb-4 grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm" aria-labelledby="assoc-proj">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="assoc-proj" className="text-sm font-bold text-white">
          Projeto associado
        </h3>
        <select id="ideia-projeto" aria-labelledby="assoc-proj" value={s.projetoId ?? ""} onChange={(e) => s.setProjeto(e.target.value || null)} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white">
          <option value="">Sem projeto (nada é salvo)</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.role})
            </option>
          ))}
        </select>
      </div>
      {proj && !["dono", "gestor", "editor"].includes(proj.role) && <p className="text-xs text-[#ffb23f]">Seu papel neste projeto é {proj.role}: você pode ver, mas não salvar.</p>}
      {refs.length > 0 && (
        <fieldset>
          <legend className="text-xs font-semibold text-white">Referências do projeto para associar</legend>
          <ul className="mt-1 grid gap-1">
            {refs.map((r) => (
              <li key={r.id}>
                <label className="flex items-start gap-2 text-xs">
                  <input type="checkbox" className="mt-0.5" checked={sel.includes(r.id)} onChange={(e) => s.setReferencias(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} />
                  <span>
                    {r.title} <ReferenceStatusBadge status={r.status} />
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-[#a7b2c8]">Referências apenas cadastradas não tiveram o conteúdo lido e não sustentam a avaliação automática.</p>
        </fieldset>
      )}
    </section>
  );
}

