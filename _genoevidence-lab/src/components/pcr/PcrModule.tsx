"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PCR_MODULE } from "@/lib/modules/pcr/content";
import { buildSummary } from "@/lib/modules/pcr/summary";
import type { MolecularPhase } from "@/lib/modules/contract";
import { getLabObject } from "@/lib/lab/objects";
import type { Claim } from "@/lib/sources/catalog";
import { SOURCES, VERIFICATION_LABEL } from "@/lib/sources/catalog";
import { useLab } from "@/store/lab";
import { useUi } from "@/store/ui";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ReferenceStatusBadge, Tag, VisualKindBadge } from "@/components/ui/Badges";
import { ClaimList, ClaimView, SourceList } from "@/components/sources/SourceList";
import { DepthToggle, ObjectInfo } from "@/components/lab3d/ObjectInfo";
import { BottomSheet, FloatingPanel, ProgressDots } from "@/components/immersive/parts";
import { EquipmentControls, type ProjectLinks } from "@/components/lab3d/EquipmentControls";
import { HotspotOverlay } from "@/components/lab3d/HotspotOverlay";
import { useProgramTicker } from "@/components/lab3d/useProgramTicker";
import { MolecularView } from "./MolecularView";
import { GelLanes, ProgramEditor, ReagentOrder, TubeAssignment } from "./interactions";
import { ExpectedGel, IdealizedModel, ProjectGelImages, StrandTable, ThermalProfile } from "./results";
import { STEP_ORDER, usePcr, type Scale } from "./store";
import type { Reference } from "@/lib/domain/schemas";
import { dataCurta } from "@/lib/datas";

const LabCanvas = dynamic(() => import("@/components/lab3d/LabCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-muted" role="status">
      Carregando a bancada 3D…
    </div>
  ),
});

export type PcrProjectContext = {
  links: ProjectLinks;
  references: Pick<Reference, "id" | "title" | "status" | "technique" | "isPrimary">[];
  gelImages: { id: string; name: string; role?: string }[];
} | null;

const PHASES: MolecularPhase[] = ["inicio", "desnaturacao", "anelamento", "extensao", "produtos"];
type PanelTab = "etapa" | "explorar" | "duvidas" | "fontes";

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 767px)");
    setM(q.matches);
    const on = () => setM(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return m;
}

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

function Section({ title, claims, empty }: { title: string; claims: Claim[]; empty?: string }) {
  return (
    <section>
      <h3 className="ge-mono mb-2 text-[11px] uppercase tracking-wide text-muted">{title}</h3>
      <ClaimList claims={claims} empty={empty} />
    </section>
  );
}

export function PcrModule({ project, projects, initial }: { project: PcrProjectContext; projects: { id: string; title: string }[]; initial?: Partial<ReturnType<typeof usePcr.getState>> }) {
  const router = useRouter();
  const s = usePcr();
  const lab = useLab();
  const paused = useUi((u) => u.paused);
  const togglePaused = useUi((u) => u.togglePaused);
  const quality = useUi((u) => u.quality);
  const reduced = useReducedMotion();
  const step = PCR_MODULE.steps.find((x) => x.id === s.stepId)!;
  const idx = STEP_ORDER.indexOf(step.id);
  const [manualPhase, setManualPhase] = useState<MolecularPhase | null>(null);
  const [question, setQuestion] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [saveState, setSaveState] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [depth, setDepth] = useState<"rapido" | "tecnico">("rapido");
  const [panelTab, setPanelTab] = useState<PanelTab>("etapa");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const loaded = useRef(false);

  useEffect(() => {
    useLab.getState().setIntro("concluida");
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  // Carrega etapa/sessão inicial (link "?etapa=" ou sessão reaberta).
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (initial) usePcr.getState().load(initial);
  }, [initial]);

  // Sincroniza a bancada 3D com a etapa atual.
  useEffect(() => {
    const target = step.benchObjects[0];
    const st = useLab.getState();
    st.select(null);
    st.setView(target ?? "geral");
    setManualPhase(null);
  }, [step]);

  const ticker = useProgramTicker(lab.programRunning, paused, s.program);
  const phase: MolecularPhase = lab.programRunning ? ticker.phase : (manualPhase ?? step.molecularPhase ?? "inicio");
  const phaseTemp = lab.programRunning ? ticker.tempC : phase === "desnaturacao" ? s.program.denaturation.tempC : phase === "anelamento" ? s.program.annealing.tempC : phase === "extensao" ? s.program.extension.tempC : undefined;

  const select = (id: string, part?: string | null) => {
    const st = useLab.getState();
    st.select(id, part ?? null);
    st.setView(id);
    if (id === "reagentes" && part) st.setHighlightReagent(part);
  };

  const summary = useMemo(
    () =>
      buildSummary({
        visited: s.visited,
        params: s.params,
        choices: s.choices,
        questions: s.questions,
        tmC: s.tmC,
        ampliconBp: s.ampliconBp,
        polymerase: s.polymerase,
        hasGelImage: Boolean(project?.gelImages.length),
        primaryReferenceTitle: project?.references.find((r) => r.id === s.primaryReferenceId)?.title ?? null,
        projectReferencesNotAnalyzed: project?.references.filter((r) => r.status !== "analisada").length ?? 0,
      }),
    [s.visited, s.params, s.choices, s.questions, s.tmC, s.ampliconBp, s.polymerase, s.primaryReferenceId, project],
  );

  async function save() {
    if (!project?.links) return;
    setSaveState(null);
    const res = await fetch(`/api/projects/${project.links.id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: "pcr",
        mode: s.mode,
        title: `PCR — ${s.mode === "guiado" ? "modo guiado" : "modo exploratório"} (${dataCurta(new Date())})`,
        startedAt: s.startedAt,
        stepsVisited: s.visited,
        choices: s.choices,
        consequences: summary.consequences.map((c) => ({ text: `${c.parameter} → ${c.option}: ${c.text}`, basis: c.basis === "sem_fonte" ? "imprevisivel" : c.basis, sourceIds: c.refs.map((r) => r.id), locator: c.refs.map((r) => r.locator).filter(Boolean).join("; ") || undefined })),
        questions: s.questions,
        primaryReferenceId: s.primaryReferenceId ?? undefined,
        referencesUsed: summary.referencesUsed.map((r) => r.id),
        missingInformation: summary.missingInformation,
        toConfirm: summary.toConfirm,
        state: { params: s.params, program: s.program, tmC: s.tmC, ampliconBp: s.ampliconBp, polymerase: s.polymerase, N0: s.N0, efficiency: s.efficiency, tubes: s.tubes, lanes: s.lanes, reagentsAdded: s.reagentsAdded, stepId: s.stepId },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setSaveState({ tone: "danger", text: data.error ?? "Falha ao salvar." });
    setSaveState({ tone: "ok", text: "Experiência salva no histórico do projeto." });
    setTimeout(() => setSaveState(null), 3200);
    router.refresh();
  }

  const scaleTabs: { id: Scale; label: string }[] = [
    { id: "bancada", label: "Bancada" },
    { id: "molecular", label: "Molecular" },
    { id: "resultados", label: "Resultados" },
  ];

  const stepInteraction =
    step.id === "master_mix" ? (
      <ReagentOrder />
    ) : step.id === "controles" ? (
      <TubeAssignment />
    ) : step.id === "centrifugacao" ? (
      <EquipmentControls id="microcentrifuga" project={project?.links ?? null} />
    ) : step.id === "termociclador" ? (
      <>
        <EquipmentControls id="termociclador" project={project?.links ?? null} />
        <ProgramEditor />
      </>
    ) : step.id === "eletroforese" ? (
      <GelLanes />
    ) : null;

  const stepPanel = (
    <div className="grid gap-4">
      <div>
        <p className="ge-mono text-[11px] text-action">
          etapa {String(step.order).padStart(2, "0")} de {String(PCR_MODULE.steps.length).padStart(2, "0")}
        </p>
        <h2 id="etapa-titulo" className="text-xl font-bold leading-snug">
          {step.title}
        </h2>
        <p className="text-sm text-body">{step.short}</p>
      </div>
      <DepthToggle value={depth} onChange={setDepth} />
      {depth === "rapido" ? (
        <div className="grid gap-4">
          <QuickBlock title="O que acontece" claim={step.whatHappens[0]} />
          {step.why[0] && <QuickBlock title="Por que acontece" claim={step.why[0]} />}
          <section>
            <h3 className="ge-mono mb-1 text-[11px] uppercase tracking-wide text-muted">O que explorar</h3>
            <ul className="grid gap-1 text-sm">
              {step.materials.map((m) => (
                <li key={m.objectId}>
                  <button type="button" className="font-semibold text-accent-ink underline" onClick={() => (s.setScale("bancada"), select(m.objectId))}>
                    {getLabObject(m.objectId)?.name ?? m.objectId}
                  </button>{" "}
                  <span className="text-body">— {m.role}</span>
                </li>
              ))}
              {step.molecularPhase && step.molecularPhase !== "inicio" && (
                <li>
                  <button type="button" className="font-semibold text-accent-ink underline" onClick={() => s.setScale("molecular")}>
                    Ver o processo molecular desta etapa
                  </button>
                </li>
              )}
              {step.resultOutput && (
                <li>
                  <button type="button" className="font-semibold text-accent-ink underline" onClick={() => s.setScale("resultados")}>
                    Consultar os resultados desta etapa
                  </button>
                </li>
              )}
            </ul>
          </section>
        </div>
      ) : (
        <div className="grid gap-5">
          <Section title="O que está acontecendo" claims={step.whatHappens} />
          <Section title="Por que a etapa existe" claims={step.why} />
          <Section title="Papel dos controles" claims={step.controls} empty="Esta etapa não envolve controles específicos." />
          <Section title="O que observar" claims={step.observe} />
          <section>
            <h3 className="ge-mono mb-2 text-[11px] uppercase tracking-wide text-muted">Limitações</h3>
            <ul className="list-disc pl-5 text-sm">
              {step.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
      {stepInteraction}
      {lab.selected && (
        <details className="rounded-xl border border-line p-3" open>
          <summary className="cursor-pointer text-sm font-semibold text-ink">Objeto selecionado na bancada</summary>
          <div className="mt-3">
            <ObjectInfo id={lab.selected} part={lab.selectedPart} projectId={project?.links?.id} headingLevel={3} />
          </div>
        </details>
      )}
    </div>
  );

  const notesPanel = (
    <section className="grid gap-3" aria-labelledby="duvidas">
      <h2 id="duvidas" className="text-base font-bold">
        Dúvidas e anotações
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) {
            s.addQuestion(question.trim());
            setQuestion("");
          }
        }}
        className="grid gap-2"
      >
        <label htmlFor="duvida" className="sr-only">
          Registrar dúvida sobre esta etapa
        </label>
        <textarea id="duvida" value={question} onChange={(e) => setQuestion(e.target.value)} className="min-h-20 rounded-xl border border-line px-3 py-2 text-sm" placeholder={`Dúvida sobre “${step.title}”`} />
        <Button type="submit" variant="secondary" disabled={!question.trim()}>
          Registrar dúvida
        </Button>
      </form>
      {s.questions.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {s.questions.map((qq, i) => (
            <li key={i} className="flex items-start justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
              <span>
                <span className="ge-mono text-[11px] text-muted">{String(PCR_MODULE.steps.find((x) => x.id === qq.stepId)?.order).padStart(2, "0")} </span>
                {qq.text}
              </span>
              <button type="button" className="text-xs underline" onClick={() => s.removeQuestion(i)} aria-label={`Remover dúvida: ${qq.text}`}>
                remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const tabs: { id: PanelTab; label: string; body: React.ReactNode }[] = [
    { id: "etapa", label: "Etapa", body: stepPanel },
    {
      id: "explorar",
      label: "Explorar",
      body:
        s.mode === "exploratorio" ? (
          <Exploratory currentStep={step.id} />
        ) : (
          <div className="grid gap-3 text-sm">
            <p>No modo exploratório você altera parâmetros contemplados pelo módulo e compara cenários. Cada consequência mostra seu fundamento.</p>
            <Button onClick={() => s.setMode("exploratorio")}>Ativar modo exploratório</Button>
          </div>
        ),
    },
    { id: "duvidas", label: `Dúvidas${s.questions.length ? ` (${s.questions.length})` : ""}`, body: notesPanel },
    { id: "fontes", label: "Fontes", body: <ReferencesPanel project={project} /> },
  ];

  const panelBody = (
    <div className="grid gap-4">
      <div role="tablist" aria-label="Conteúdo do painel" className="grid grid-cols-4 gap-1 rounded-full bg-surface-2 p-1 text-xs font-semibold">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={panelTab === t.id}
            onClick={() => setPanelTab(t.id)}
            className={`ge-press truncate rounded-full px-2 py-1.5 ${panelTab === t.id ? "bg-white text-ink shadow-[var(--shadow-1)]" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tabs.find((t) => t.id === panelTab)!.body}</div>
    </div>
  );

  const stageContent =
    s.scale === "molecular" ? (
      <div className="grid gap-3">
        <MolecularView phase={phase} cycle={lab.programRunning ? ticker.cycle : undefined} paused={paused || reduced} tempC={phaseTemp} />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Controle das fases">
          {PHASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setManualPhase(p)}
              disabled={lab.programRunning}
              aria-pressed={phase === p}
              className={`ge-press rounded-full px-3 py-1.5 text-sm disabled:opacity-60 ${phase === p ? "bg-ink text-white" : "border border-line text-ink hover:bg-surface-2"}`}
            >
              {p === "inicio" ? "Antes" : p === "desnaturacao" ? "Desnaturação" : p === "anelamento" ? "Anelamento" : p === "extensao" ? "Extensão" : "Fim do ciclo"}
            </button>
          ))}
          {lab.programRunning && <span className="ge-mono text-xs text-muted">sincronizado com o programa em execução</span>}
        </div>
      </div>
    ) : s.scale === "resultados" ? (
      <div className="grid gap-4">
        <ResultsForStep stepId={step.id} project={project} />
      </div>
    ) : null;

  return (
    <div className="relative h-[calc(100dvh-56px)] min-h-[560px] overflow-hidden bg-[#0b1221] lg:h-dvh">
      {/* Palco: bancada 3D sempre presente ao fundo (continuidade entre escalas) */}
      <div className={`absolute inset-0 transition-[filter,opacity] duration-[400ms] ${s.scale !== "bancada" ? "opacity-60 [filter:saturate(0.6)]" : ""}`}>
        {webgl ? (
          <>
            <LabCanvas
              ambiente="noite"
              quality={quality}
              paused={paused}
              reducedMotion={reduced}
              orbit={!isMobile}
              projectName={project?.links?.title}
              computerLines={project?.links ? [`Projeto: ${project.links.title}`, `Etapa ${step.order}: ${step.title}`] : [`Módulo de PCR`, `Etapa ${step.order}: ${step.title}`]}
              thermoDisplay={
                lab.programRunning
                  ? { title: `Ciclo ${ticker.cycle}/${s.program.cycles}`, line: ticker.label, temp: `${ticker.tempC} °C` }
                  : { title: lab.tubes === "termociclador" ? "Pronto" : "Em espera", line: `${s.program.cycles} ciclos programados` }
              }
              onSelect={select}
            />
            {s.scale === "bancada" && <HotspotOverlay onSelect={select} emphasize={step.benchObjects} />}
          </>
        ) : webgl === false ? (
          <div className="grid h-full place-items-center p-6">
            <Alert tone="warn" title="WebGL indisponível: a bancada 3D não pode ser exibida. Todo o conteúdo da etapa está no painel." />
          </div>
        ) : null}
      </div>

      {/* Barra superior: projeto · modo · escala · salvar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="ge-float flex items-center gap-2 rounded-full py-1 pl-4 pr-1">
            <span className="ge-mono text-[11px] text-muted">{project?.links ? "projeto" : "sem projeto"}</span>
            {project?.links ? (
              <Link href={`/projetos/${project.links.id}`} className="max-w-48 truncate text-sm font-semibold text-ink hover:underline">
                {project.links.title}
              </Link>
            ) : (
              <span className="text-sm text-muted">não será salvo</span>
            )}
            <div className="ml-1 flex rounded-full bg-surface-2 p-0.5 text-xs font-semibold" role="radiogroup" aria-label="Modo">
              {(["guiado", "exploratorio"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={s.mode === m}
                  onClick={() => s.setMode(m)}
                  className={`ge-press rounded-full px-3 py-1.5 ${s.mode === m ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
                >
                  {m === "guiado" ? "Guiado" : "Exploratório"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="ge-float pointer-events-auto flex items-center gap-1 rounded-full p-1" role="tablist" aria-label="Escala">
          {scaleTabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={s.scale === t.id}
              onClick={() => s.setScale(t.id)}
              className={`ge-press rounded-full px-4 py-1.5 text-sm ${s.scale === t.id ? "bg-ink font-semibold text-white" : "text-ink hover:bg-surface-2"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button type="button" onClick={togglePaused} aria-pressed={paused} title={paused ? "Retomar animações" : "Pausar animações"} className="ge-float ge-press grid h-10 w-10 place-items-center rounded-full text-ink">
            <span aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
            <span className="sr-only">{paused ? "Retomar animações" : "Pausar animações"}</span>
          </button>
          {project?.links ? (
            <Button onClick={save} className="shadow-[var(--shadow-3)]">
              Salvar experiência
            </Button>
          ) : (
            <Link href={projects[0] ? `/modulos/pcr?projeto=${projects[0].id}&etapa=${step.id}` : "/projetos/novo"} className="ge-float ge-press rounded-full px-4 py-2 text-sm font-semibold text-ink">
              {projects[0] ? `Usar “${projects[0].title.slice(0, 18)}”` : "Criar projeto para salvar"}
            </Link>
          )}
        </div>
      </div>

      {/* Feedback discreto de salvamento */}
      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center">
        <AnimatePresence>
          {saveState && (
            <motion.p
              key={saveState.text}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`ge-float rounded-full px-4 py-2 text-sm font-semibold ${saveState.tone === "ok" ? "text-ok" : "text-danger"}`}
            >
              {saveState.tone === "ok" ? "✔ " : "✖ "}
              {saveState.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Etapas (esquerda, recolhível) */}
      <FloatingPanel side="left" id="painel-etapas" title="Etapas da PCR" eyebrow="experimento" open={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} width={272}>
        <ol className="grid gap-1">
          {PCR_MODULE.steps.map((st) => (
            <li key={st.id}>
              <button
                type="button"
                onClick={() => s.goTo(st.id)}
                aria-current={st.id === s.stepId ? "step" : undefined}
                className={`ge-press flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm ${st.id === s.stepId ? "bg-ink text-white" : "text-ink hover:bg-surface-2"}`}
              >
                <span className={`ge-mono mt-0.5 text-[11px] ${st.id === s.stepId ? "text-white/70" : "text-action"}`}>{String(st.order).padStart(2, "0")}</span>
                <span className="flex-1">{st.title}</span>
                {s.visited.includes(st.id) && st.id !== s.stepId && (
                  <span className="text-xs text-ok" aria-label="visitada">
                    ✔
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4 border-t border-line pt-4">
          <Button variant="secondary" className="w-full" onClick={() => setShowSummary(true)}>
            Encerrar e ver resumo
          </Button>
        </div>
      </FloatingPanel>

      {/* Painel contextual (direita) */}
      <FloatingPanel side="right" id="painel-etapa" title={step.title} eyebrow={s.mode === "guiado" ? "modo guiado" : "modo exploratório"} open={rightOpen} onToggle={() => setRightOpen(!rightOpen)} width={420}>
        {panelBody}
      </FloatingPanel>

      {/* Escalas molecular e resultados, sobre a bancada */}
      <AnimatePresence mode="wait">
        {stageContent && (
          <motion.section
            key={s.scale}
            aria-label={s.scale === "molecular" ? "Escala molecular" : "Escala de resultados"}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            className="ge-float pointer-events-auto absolute inset-x-2 bottom-[132px] top-16 z-10 overflow-y-auto p-4 md:bottom-20 md:left-[296px] md:right-[444px] md:top-20"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                <span className="ge-mono mr-2 text-[11px] text-action">etapa {String(step.order).padStart(2, "0")}</span>
                {s.scale === "molecular" ? "Processo molecular" : "Resultados"} · {step.title}
              </p>
              <button type="button" className="ge-press rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2" onClick={() => s.setScale("bancada")}>
                ← Voltar à bancada
              </button>
            </div>
            {stageContent}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Progresso (inferior) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center md:bottom-4">
        <div className="ge-float pointer-events-auto flex items-center gap-3 rounded-full px-2 py-1.5">
          <button type="button" onClick={s.prev} disabled={idx === 0} className="ge-press rounded-full px-3 py-1.5 text-sm text-ink hover:bg-surface-2 disabled:opacity-40">
            ← <span className="hidden sm:inline">Voltar</span>
          </button>
          <ProgressDots
            total={PCR_MODULE.steps.length}
            current={idx}
            done={(i) => s.visited.includes(STEP_ORDER[i])}
            label={(i) => `Etapa ${i + 1}: ${PCR_MODULE.steps[i].title}`}
            onGo={(i) => s.goTo(STEP_ORDER[i])}
          />
          <button
            type="button"
            onClick={() => {
              setManualPhase(null);
              if (step.id === "master_mix") s.resetReagents();
              useLab.getState().setView(step.benchObjects[0] ?? "geral");
              useLab.getState().resetCamera();
            }}
            className="ge-press hidden rounded-full px-3 py-1.5 text-sm text-ink hover:bg-surface-2 sm:inline"
          >
            ↺ Repetir
          </button>
          <button type="button" onClick={s.next} disabled={idx === STEP_ORDER.length - 1} className="ge-press rounded-full bg-action px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            Avançar →
          </button>
        </div>
      </div>

      {/* Celular: conteúdo da etapa em painel inferior */}
      <BottomSheet title={`${String(step.order).padStart(2, "0")} · ${step.title}`} open={sheetOpen} onToggle={() => setSheetOpen(!sheetOpen)}>
        {panelBody}
      </BottomSheet>

      {showSummary && (
        <div role="dialog" aria-modal="true" aria-labelledby="resumo-titulo" className="absolute inset-0 z-40 grid place-items-center bg-[rgba(15,23,48,0.35)] p-4">
          <div className="ge-float max-h-[90%] w-full max-w-3xl overflow-y-auto p-6">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="ge-eyebrow">fim da experiência</p>
                <h2 id="resumo-titulo" className="ge-display text-2xl">
                  Resumo da <span className="ge-gradient-text">experiência</span>
                </h2>
              </div>
              <Button variant="ghost" onClick={() => setShowSummary(false)} autoFocus>
                Fechar
              </Button>
            </div>
            <SummaryView summary={summary} />
            {project?.links && (
              <div className="mt-4">
                <Button onClick={save}>Salvar no projeto</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickBlock({ title, claim }: { title: string; claim: Claim }) {
  return (
    <section>
      <h3 className="ge-mono mb-1 text-[11px] uppercase tracking-wide text-muted">{title}</h3>
      <ClaimView claim={claim} />
    </section>
  );
}

function ResultsForStep({ stepId, project }: { stepId: string; project: PcrProjectContext }) {
  const s = usePcr();
  if (stepId === "termociclador") return <ThermalProfile program={s.program} />;
  if (stepId === "ciclo_molecular")
    return (
      <>
        <StrandTable />
        <div className="flex flex-wrap gap-3 text-sm" role="group" aria-label="Parâmetros do modelo">
          <label className="grid gap-1 text-xs">
            N₀ (moléculas-molde iniciais)
            <input type="number" min={1} className="w-36 rounded border border-line px-2 py-1 text-sm" value={s.N0} onChange={(e) => s.setInputs({ N0: Number(e.target.value) })} />
          </label>
          <label className="grid gap-1 text-xs">
            Eficiência por ciclo (0–1)
            <input type="number" min={0} max={1} step={0.05} className="w-28 rounded border border-line px-2 py-1 text-sm" value={s.efficiency} onChange={(e) => s.setInputs({ efficiency: Number(e.target.value) })} />
          </label>
        </div>
        <IdealizedModel N0={s.N0} E={s.efficiency} cycles={s.program.cycles} />
      </>
    );
  if (stepId === "eletroforese" || stepId === "interpretacao")
    return (
      <>
        <ExpectedGel lanes={s.lanes} ampliconBp={s.ampliconBp} />
        <h3 className="text-sm font-semibold">Resultados do projeto</h3>
        {project?.links ? <ProjectGelImages projectId={project.links.id} images={project.gelImages} /> : <Alert tone="info" title="Abra o módulo a partir de um projeto para ver os resultados enviados." />}
      </>
    );
  return (
    <div className="grid gap-2 text-sm">
      <p>Esta etapa não produz saídas próprias. Saídas disponíveis no módulo:</p>
      <ul className="grid gap-1">
        {PCR_MODULE.outputs.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-2">
            <VisualKindBadge kind={o.kind} /> {o.label} <span className="text-xs text-muted">(requer: {o.requires})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Exploratory({ currentStep }: { currentStep: string }) {
  const s = usePcr();
  const [name, setName] = useState("");
  const params = [...PCR_MODULE.parameters].sort((a, b) => Number(b.stepId === currentStep) - Number(a.stepId === currentStep));
  return (
    <section className="grid gap-3 rounded-xl border border-line bg-surface p-4" aria-labelledby="explorar">
      <h2 id="explorar" className="text-sm font-semibold">
        Explorar cenários
      </h2>
      <p className="text-xs text-muted">Somente parâmetros contemplados pelo módulo. Cada consequência mostra seu fundamento.</p>
      {params.map((p) => {
        const opt = p.options.find((o) => o.value === s.params[p.id]) ?? p.options[0];
        return (
          <fieldset key={p.id} className="grid gap-2 rounded-lg border border-line p-3">
            <legend className="px-1 text-sm font-medium">{p.label}</legend>
            <p className="text-xs text-muted">{p.description}</p>
            <div className="grid gap-1">
              {p.options.map((o) => (
                <label key={o.value} className="flex items-start gap-2 text-sm">
                  <input type="radio" name={p.id} className="mt-1" checked={s.params[p.id] === o.value} onChange={() => s.choose(p.stepId, p.id, o.value, `${p.label}: ${o.label}`)} />
                  {o.label}
                </label>
              ))}
            </div>
            <div className="grid gap-2 border-t border-line pt-2">
              {opt.consequences.map((c, i) => (
                <ClaimView key={i} claim={c} />
              ))}
            </div>
          </fieldset>
        );
      })}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          s.saveScenario(name.trim() || `Cenário ${s.scenarios.length + 1}`);
          setName("");
        }}
      >
        <label htmlFor="cenario" className="sr-only">
          Nome do cenário
        </label>
        <input id="cenario" className="min-w-0 flex-1 rounded border border-line px-2 py-1 text-sm" placeholder="Nome do cenário" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="secondary">
          Guardar para comparar
        </Button>
      </form>
      {s.scenarios.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="mb-1 text-left font-semibold">Comparação de cenários</caption>
            <thead>
              <tr>
                <th scope="col" className="py-1 pr-2">Parâmetro</th>
                {s.scenarios.map((sc) => (
                  <th scope="col" key={sc.name} className="py-1 pr-2">
                    {sc.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PCR_MODULE.parameters.map((p) => (
                <tr key={p.id} className="border-t border-line align-top">
                  <th scope="row" className="py-1 pr-2 font-normal">{p.label}</th>
                  {s.scenarios.map((sc) => {
                    const o = p.options.find((x) => x.value === sc.params[p.id]);
                    const bases = [...new Set(o?.consequences.map((c) => c.basis) ?? [])];
                    return (
                      <td key={sc.name} className="py-1 pr-2">
                        {o?.label}
                        <span className="block text-muted">fundamento: {bases.join(", ")}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="ghost" onClick={s.clearScenarios}>
            Limpar comparação
          </Button>
        </div>
      )}
    </section>
  );
}

function ReferencesPanel({ project }: { project: PcrProjectContext }) {
  const s = usePcr();
  const catalog = ["lorenz2012", "lee2012", "saiki1988", "chien1976", "kwok1989", "mullis1987"].map((id) => SOURCES[id]);
  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-labelledby="refs">
      <h2 id="refs" className="mb-2 text-sm font-semibold">
        Referências
      </h2>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Base do módulo (catálogo verificado)</h3>
      <ul className="mt-1 grid gap-2 text-sm">
        {catalog.map((src) => (
          <li key={src.id}>
            <a href={src.url} className="underline" target="_blank" rel="noreferrer noopener">
              {src.shortCitation}
            </a>{" "}
            <Tag>{VERIFICATION_LABEL[src.verification]}</Tag>
            <span className="block text-xs text-muted">{src.scope}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{PCR_MODULE.authorship}</p>
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Referências do projeto</h3>
      {!project?.links ? (
        <p className="text-sm text-muted">Nenhum projeto aberto.</p>
      ) : project.references.length === 0 ? (
        <p className="text-sm text-muted">
          O projeto não tem referências. <Link className="underline" href={`/projetos/${project.links.id}#referencias`}>Adicionar</Link>
        </p>
      ) : (
        <ul className="mt-1 grid gap-2 text-sm">
          {project.references.map((r) => (
            <li key={r.id} className="grid gap-1">
              <Link href={`/projetos/${project.links!.id}/referencias/${r.id}`} className="underline">
                {r.title}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <ReferenceStatusBadge status={r.status} />
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" name="principal" checked={s.primaryReferenceId === r.id} onChange={() => s.setPrimaryReference(r.id)} disabled={r.status === "cadastrada"} />
                  Principal nesta experiência
                </label>
              </div>
              {r.status === "cadastrada" && <span className="text-xs text-muted">Conteúdo não lido: não pode servir de base.</span>}
            </li>
          ))}
        </ul>
      )}
      {project?.links && project.references.length > 1 && (
        <p className="mt-2 text-xs">
          Procedimentos diferentes entre fontes são preservados e comparados, sem fusão automática:{" "}
          <Link className="underline" href={`/projetos/${project.links.id}/referencias/comparar`}>
            comparar
          </Link>
          .
        </p>
      )}
    </section>
  );
}

function SummaryView({ summary }: { summary: ReturnType<typeof buildSummary> }) {
  return (
    <div className="grid gap-4 text-sm">
      <section>
        <h3 className="font-semibold">Referências utilizadas</h3>
        <ul className="mt-1 grid gap-1">
          {summary.referencesUsed.map((r) => (
            <li key={r.id}>
              {r.citation} <span className="text-xs text-muted">({VERIFICATION_LABEL[r.verification as keyof typeof VERIFICATION_LABEL]}; {r.locators.join("; ") || "—"})</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-semibold">Etapas exploradas</h3>
        <p>{summary.stepsExplored.map((s) => s.title).join(" · ") || "—"}</p>
      </section>
      <section>
        <h3 className="font-semibold">Escolhas realizadas</h3>
        {summary.choices.length ? (
          <ul className="list-disc pl-5">
            {summary.choices.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nenhuma escolha registrada.</p>
        )}
      </section>
      <section>
        <h3 className="font-semibold">Consequências e fundamentação</h3>
        {summary.consequences.length ? (
          <ul className="grid gap-2">
            {summary.consequences.map((c, i) => (
              <li key={i} className="border-l-2 border-line pl-2">
                <p className="text-xs text-muted">
                  {c.parameter} → {c.option}
                </p>
                <ClaimView claim={c} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nenhum parâmetro explorado no modo exploratório.</p>
        )}
      </section>
      <section>
        <h3 className="font-semibold">Informações ausentes</h3>
        <ul className="list-disc pl-5">
          {summary.missingInformation.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-semibold">Questões a confirmar antes da prática</h3>
        <ul className="list-disc pl-5">
          {summary.toConfirm.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
