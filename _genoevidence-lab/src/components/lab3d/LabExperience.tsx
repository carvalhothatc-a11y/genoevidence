"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LAB_OBJECTS, ZONES, getLabObject, type ZoneId } from "@/lib/lab/objects";
import { ZONE_OF_OBJECT } from "@/lib/lab/layout";
import { DEFAULT_PROGRAM } from "@/lib/models/pcr";
import type { MolecularPhase } from "@/lib/modules/contract";
import { useLab } from "@/store/lab";
import { markIntroSeen, readIntroSeen, useUi, type Quality } from "@/store/ui";
import { Alert } from "@/components/ui/Alert";
import { VisualKindBadge } from "@/components/ui/Badges";
import { BottomSheet, FloatingPanel, HintChip, IntroOverlay, Trail } from "@/components/immersive/parts";
import { ScaleOverlay } from "@/components/immersive/ScaleOverlay";
import { MolecularView } from "@/components/pcr/MolecularView";
import { ProjectGelImages, ThermalProfile } from "@/components/pcr/results";
import { ObjectInfo } from "./ObjectInfo";
import { EquipmentControls, type ProjectLinks } from "./EquipmentControls";
import { useProgramTicker } from "./useProgramTicker";
import { HotspotOverlay } from "./HotspotOverlay";

const LabCanvas = dynamic(() => import("./LabCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center" role="status">
      <p className="ge-mono text-sm text-muted">carregando o ambiente 3D…</p>
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

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    setMatch(m.matches);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

const ZONE_IDS: ZoneId[] = ["pre", "amp", "pos", "analise"];
const PHASES: { id: MolecularPhase; label: string }[] = [
  { id: "inicio", label: "Antes" },
  { id: "desnaturacao", label: "Desnaturação" },
  { id: "anelamento", label: "Anelamento" },
  { id: "extensao", label: "Extensão" },
  { id: "produtos", label: "Fim do ciclo" },
];

type GelImages = { id: string; name: string; role?: string }[];

export function LabExperience({ project, gelImages = [] }: { project: ProjectLinks; gelImages?: GelImages }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const lab = useLab();
  const paused = useUi((s) => s.paused);
  const togglePaused = useUi((s) => s.togglePaused);
  const quality = useUi((s) => s.quality);
  const setQuality = useUi((s) => s.setQuality);
  const hints = useUi((s) => s.hints);
  const setHints = useUi((s) => s.setHints);
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const isMobile = useMedia("(max-width: 767px)");
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [manualPhase, setManualPhase] = useState<MolecularPhase>("desnaturacao");
  const mode2d = search.get("modo") === "2d";

  useEffect(() => {
    setWebgl(detectWebGL());
    // Entrada: só na primeira visita (ou nunca, com movimento reduzido).
    const st = useLab.getState();
    if (st.intro === "pendente" && (readIntroSeen() || window.matchMedia("(prefers-reduced-motion: reduce)").matches)) st.setIntro("concluida");
  }, []);

  const setMode = useCallback(
    (m: "3d" | "2d") => {
      const p = new URLSearchParams(search.toString());
      if (m === "2d") p.set("modo", "2d");
      else p.delete("modo");
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, search],
  );

  const show3d = !mode2d && webgl === true && !canvasFailed;
  const ticker = useProgramTicker(lab.programRunning, paused, DEFAULT_PROGRAM);

  const select = useCallback((id: string, part?: string | null) => {
    const st = useLab.getState();
    st.select(id, part ?? null);
    st.setView(id);
    st.setOverlay(null);
    if (id === "reagentes" && part) st.setHighlightReagent(part);
    setRightOpen(true);
    setSheetOpen(true);
  }, []);

  const finishIntro = useCallback(() => {
    markIntroSeen();
    useLab.getState().setIntro("concluida");
  }, []);

  const currentZone: ZoneId | null = ZONE_IDS.find((z) => z === lab.view) ?? ZONE_OF_OBJECT[lab.view] ?? null;
  const goOverview = () => {
    lab.select(null);
    lab.setOverlay(null);
    lab.setView("geral");
  };
  const goZone = (z: ZoneId) => {
    lab.select(null);
    lab.setOverlay(null);
    lab.setView(z);
    setRightOpen(true);
  };

  const trail = [
    { id: "geral", label: "Laboratório", onClick: goOverview },
    ...(currentZone ? [{ id: currentZone, label: ZONES[currentZone].short, onClick: () => goZone(currentZone) }] : []),
    ...(lab.selected ? [{ id: lab.selected, label: getLabObject(lab.selected)?.name.split(" (")[0] ?? lab.selected, onClick: () => lab.setOverlay(null) }] : []),
    ...(lab.overlay === "molecular" ? [{ id: "mol", label: "Processo molecular", tag: "ilustração" }] : []),
    ...(lab.overlay === "resultados" ? [{ id: "res", label: "Resultados" }] : []),
  ];

  const computerLines = useMemo(
    () =>
      project
        ? [`Projeto: ${project.title}`, `${project.datasets.length} conjunto(s) de dados`, `${project.structures.length} estrutura(s)`, `${project.references} referência(s)`]
        : ["Nenhum projeto aberto", "Abra um projeto em “Projetos”", "e use “Abrir no laboratório”."],
    [project],
  );

  const thermoDisplay = lab.programRunning
    ? { title: `Ciclo ${ticker.cycle}/${DEFAULT_PROGRAM.cycles}`, line: ticker.label + (paused ? " (pausado)" : ""), temp: `${ticker.tempC} °C` }
    : lab.tubes === "termociclador"
      ? { title: "Pronto", line: "Programa padrão de 3 etapas", temp: lab.thermocyclerOpen ? "tampa aberta" : "" }
      : { title: "Em espera", line: "Sem tubos no bloco" };

  const hint =
    lab.intro !== "concluida"
      ? null
      : lab.overlay
        ? null
        : !currentZone
          ? "Escolha uma bancada para aproximar a câmera."
          : !lab.selected
            ? "Selecione um equipamento pelo rótulo ou pela lista."
            : lab.selected === "termociclador"
              ? "Abra a tampa, posicione os tubos e veja o processo molecular."
              : "Use o painel para entender o equipamento e interagir.";

  const phase: MolecularPhase = lab.programRunning ? ticker.phase : manualPhase;
  const q = project ? `&projeto=${project.id}` : "";

  // ---------------------------------------------------------------- conteúdo do painel contextual
  const contextTitle = lab.selected ? (getLabObject(lab.selected)?.name.split(" (")[0] ?? "Equipamento") : currentZone ? ZONES[currentZone].short : "Bancadas";
  const contextEyebrow = lab.selected ? "equipamento" : currentZone ? "bancada" : "laboratório";
  const contextBody = lab.selected ? (
    <ObjectInfo
      id={lab.selected}
      part={lab.selectedPart}
      projectId={project?.id}
      actions={
        lab.selected === "termociclador" ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => lab.setOverlay("molecular")} className="ge-press min-h-11 rounded-full bg-action px-3 text-sm font-semibold text-white hover:bg-[#a82340]">
              Processo molecular
            </button>
            <button type="button" onClick={() => lab.setOverlay("resultados")} className="ge-press min-h-11 rounded-full border-[1.5px] border-ink/80 px-3 text-sm font-semibold text-ink hover:bg-surface-2">
              Resultados
            </button>
          </div>
        ) : null
      }
      interactions={<EquipmentControls id={lab.selected} project={project} />}
    />
  ) : currentZone ? (
    <div className="grid gap-4">
      <p className="text-sm">{ZONES[currentZone].description}</p>
      <ul className="grid gap-2">
        {LAB_OBJECTS.filter((o) => o.zone === currentZone && !o.id.startsWith("placa-") && o.id !== "bancada-pre-pcr").map((o) => (
          <li key={o.id}>
            <button type="button" onClick={() => select(o.id)} className="ge-press group w-full rounded-xl border border-line bg-white px-3 py-2.5 text-left hover:border-accent hover:shadow-[var(--shadow-1)]">
              <span className="block text-sm font-semibold text-ink group-hover:text-accent-ink">{o.name}</span>
              <span className="block text-xs text-muted">{o.function}</span>
            </button>
          </li>
        ))}
      </ul>
      <Link href={`/modulos/pcr?etapa=${currentZone === "pre" ? "preparo" : currentZone === "amp" ? "termociclador" : currentZone === "pos" ? "eletroforese" : "interpretacao"}${q}`} className="text-sm font-semibold text-accent-ink underline">
        Percorrer esta bancada no módulo guiado de PCR
      </Link>
    </div>
  ) : (
    <BenchList onGo={goZone} />
  );

  return (
    <div className="relative h-[calc(100dvh-56px)] min-h-[520px] overflow-hidden bg-[#d9dde4]">
      {/* Camada 3D */}
      {show3d && (
        <div className="absolute inset-0">
          <CanvasBoundary onError={() => setCanvasFailed(true)}>
            <LabCanvas
              quality={quality}
              paused={paused}
              reducedMotion={reduced}
              orbit={!isMobile}
              projectName={project?.title}
              computerLines={computerLines}
              thermoDisplay={thermoDisplay}
              onSelect={select}
            />
            {lab.intro === "concluida" && <HotspotOverlay onSelect={select} />}
          </CanvasBoundary>
        </div>
      )}

      {/* Alternativa 2D (sem WebGL, falha ou escolha do usuário) */}
      {!show3d && webgl !== null && (
        <div className="absolute inset-0 overflow-y-auto bg-white">
          <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-24 pt-20 md:grid-cols-[1fr_380px]">
            <div>
              {webgl === false && <Alert tone="warn" title="WebGL indisponível neste navegador. As mesmas informações estão no painel 2D." className="mb-4" />}
              {canvasFailed && <Alert tone="warn" title="O ambiente 3D falhou ao carregar. Continue pelo painel 2D; seus dados não são afetados." className="mb-4" />}
              <Lab2DList current={currentZone} onSelect={select} />
            </div>
            <div className="ge-card p-4">{lab.selected ? contextBody : <p className="text-sm text-muted">Selecione um item da lista para ver função, relação com as etapas, explicação e fontes.</p>}</div>
          </div>
        </div>
      )}

      {/* Barra superior flutuante: trilha + ferramentas */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Trail items={trail} />
          {project && (
            <Link href={`/projetos/${project.id}`} className="ge-float ge-press hidden rounded-full px-3 py-2 text-xs font-semibold text-ink sm:inline-flex">
              <span className="ge-mono mr-1.5 text-muted">projeto</span> {project.title}
            </Link>
          )}
        </div>
        <div role="toolbar" aria-label="Controles do laboratório" className="ge-float pointer-events-auto flex flex-wrap items-center gap-1 rounded-full p-1">
          <ToolButton onClick={goOverview} label="Visão geral" icon="⌂" />
          <ToolButton onClick={lab.resetCamera} label="Reiniciar câmera" icon="↺" disabled={!show3d} />
          <ToolButton onClick={togglePaused} label={paused ? "Retomar animações" : "Pausar animações"} icon={paused ? "▶" : "❚❚"} pressed={paused} />
          <ToolButton onClick={() => setMode(mode2d ? "3d" : "2d")} label={mode2d ? "Voltar ao 3D" : "Painel 2D"} icon="▤" pressed={mode2d} />
          <ToolButton onClick={() => setHelpOpen(!helpOpen)} label="Ajuda" icon="?" pressed={helpOpen} />
          <label className="flex items-center gap-1 px-2 text-xs text-muted">
            <span className="ge-mono hidden text-[11px] lg:inline">3D</span>
            <select aria-label="Qualidade 3D" className="rounded-full border border-line bg-white px-2 py-1 text-xs text-ink" value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <ToolButton onClick={() => setHints(!hints)} label={hints ? "Dicas ligadas" : "Dicas desligadas"} icon="✦" pressed={hints} />
        </div>
      </div>

      {helpOpen && (
        <div id="lab-ajuda" className="ge-float pointer-events-auto absolute right-3 top-20 z-30 w-[min(92vw,420px)] p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Ajuda do laboratório</h2>
            <button type="button" className="text-xs underline" onClick={() => setHelpOpen(false)}>
              Fechar
            </button>
          </div>
          <ul className="grid gap-1.5">
            <li>Clique em uma bancada ou rótulo para aproximar a câmera. Tudo também está nas listas dos painéis.</li>
            <li>Arraste para girar, role para aproximar, botão direito para deslocar (desativado no celular).</li>
            <li>“Visão geral” volta ao início; “Reiniciar câmera” refaz o enquadramento atual.</li>
            <li>Os rótulos são botões: Tab para percorrer, Enter para selecionar, Esc fecha painéis de escala.</li>
            <li>Selos: ▦ dados do pesquisador · ✎ ilustração didática · ƒ simulação por modelo · ! sem fonte cadastrada.</li>
          </ul>
        </div>
      )}

      {/* Painel contextual direito */}
      {show3d && lab.intro === "concluida" && (currentZone || lab.selected) && (
        <FloatingPanel side="right" id="painel-contexto" title={contextTitle} eyebrow={contextEyebrow} open={rightOpen} onToggle={() => setRightOpen(!rightOpen)}>
          {contextBody}
        </FloatingPanel>
      )}

      {/* Celular: painel inferior com área de toque ampla */}
      {show3d && lab.intro === "concluida" && (
        <BottomSheet title={contextTitle} open={sheetOpen} onToggle={() => setSheetOpen(!sheetOpen)}>
          {!lab.selected && !currentZone ? (
            <BenchList onGo={goZone} />
          ) : (
            contextBody
          )}
        </BottomSheet>
      )}

      {/* Dica + seletor de bancadas (inferior) */}
      {show3d && lab.intro === "concluida" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 hidden flex-col items-center gap-2 md:flex">
          <HintChip text={hint} />
          <div className="ge-float pointer-events-auto flex gap-1 rounded-full p-1" role="group" aria-label="Escolher bancada">
            {ZONE_IDS.map((z, i) => (
              <button
                key={z}
                type="button"
                onClick={() => goZone(z)}
                aria-pressed={currentZone === z}
                className={`ge-press rounded-full px-3.5 py-1.5 text-sm ${currentZone === z ? "bg-ink font-semibold text-white" : "text-ink hover:bg-surface-2"}`}
              >
                <span className="ge-mono mr-1 text-[11px] opacity-70">0{i + 1}</span>
                {ZONES[z].short}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Escalas: processo molecular e resultados, abertos a partir do equipamento */}
      <ScaleOverlay
        open={lab.overlay === "molecular"}
        anchorId={lab.selected}
        title="Processo molecular no termociclador"
        tag={<VisualKindBadge kind="ilustracao" />}
        onClose={() => lab.setOverlay(null)}
        footer={
          <span className="text-muted">
            Ilustração didática vinculada à etapa, não é observação do interior do equipamento. Percorra todas as fases no{" "}
            <Link className="font-semibold text-accent-ink underline" href={`/modulos/pcr?etapa=ciclo_molecular${q}`}>
              módulo guiado
            </Link>
            .
          </span>
        }
      >
        <div className="grid gap-3">
          <MolecularView phase={phase} cycle={lab.programRunning ? ticker.cycle : undefined} paused={paused || reduced} tempC={lab.programRunning ? ticker.tempC : undefined} />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Fases do ciclo">
            {PHASES.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={lab.programRunning}
                aria-pressed={phase === p.id}
                onClick={() => setManualPhase(p.id)}
                className={`ge-press rounded-full px-3 py-1.5 text-sm ${phase === p.id ? "bg-ink text-white" : "border border-line text-ink hover:bg-surface-2"} disabled:opacity-60`}
              >
                {p.label}
              </button>
            ))}
            {lab.programRunning && <span className="ge-mono text-xs text-muted">sincronizado com o programa em execução</span>}
          </div>
        </div>
      </ScaleOverlay>

      <ScaleOverlay
        open={lab.overlay === "resultados"}
        anchorId={lab.selected}
        title="Resultados ligados ao termociclador"
        tag={<span className="ge-mono text-xs text-muted">saídas do modelo e dados do projeto</span>}
        onClose={() => lab.setOverlay(null)}
        footer={
          <Link className="font-semibold text-accent-ink underline" href={`/modulos/pcr?etapa=termociclador${q}`}>
            Ajustar o programa e conferir com a referência no módulo de PCR
          </Link>
        }
      >
        <div className="grid gap-4">
          <ThermalProfile program={DEFAULT_PROGRAM} />
          <h3 className="text-sm font-bold">Resultados experimentais do projeto</h3>
          {project ? <ProjectGelImages projectId={project.id} images={gelImages} /> : <Alert tone="info" title="Abra o laboratório a partir de um projeto para ver os resultados enviados." />}
        </div>
      </ScaleOverlay>

      {/* Entrada */}
      {show3d && (
        <IntroOverlay
          visible={lab.intro === "pendente"}
          onEnter={finishIntro}
          onSkip={finishIntro}
          resume={project ? { label: `Retomar “${project.title.slice(0, 28)}”`, onClick: () => (finishIntro(), select("computador")) } : undefined}
        />
      )}
    </div>
  );
}

function ToolButton({ onClick, label, icon, pressed, disabled }: { onClick: () => void; label: string; icon: string; pressed?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      title={label}
      className={`ge-press inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-sm disabled:opacity-40 ${pressed ? "bg-ink text-white" : "text-ink hover:bg-surface-2"}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

function BenchList({ onGo, current, compact = false }: { onGo: (z: ZoneId) => void; current?: ZoneId | null; compact?: boolean }) {
  return (
    <ol className="grid gap-2">
      {ZONE_IDS.map((z, i) => (
        <li key={z}>
          <button
            type="button"
            onClick={() => onGo(z)}
            aria-current={current === z ? "location" : undefined}
            className={`ge-press w-full rounded-xl border px-3 py-2.5 text-left ${current === z ? "border-accent bg-accent-soft/60" : "border-line bg-white hover:border-accent"}`}
          >
            <span className="ge-mono text-[11px] text-action">0{i + 1}</span>
            <span className="block text-sm font-bold text-ink">{ZONES[z].label.replace(/^Zona \d · /, "")}</span>
            {!compact && <span className="block text-xs text-muted">{ZONES[z].description}</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Painel 2D equivalente: todas as zonas e objetos, com as mesmas informações do 3D. */
function Lab2DList({ current, onSelect }: { current: ZoneId | null; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-5">
      <div>
        <p className="ge-eyebrow mb-1">painel 2D</p>
        <h1 className="ge-display text-3xl">
          Laboratório de <span className="ge-gradient-text">biologia molecular</span>
        </h1>
        <p className="mt-2 text-sm">Quatro zonas organizadas pela função. Selecione um item para ver função, relação com as etapas, explicação e fontes.</p>
      </div>
      {ZONE_IDS.map((z, i) => (
        <section key={z} aria-labelledby={`zona-${z}`} className={`ge-card p-4 ${current === z ? "ring-2 ring-accent" : ""}`}>
          <p className="ge-mono text-[11px] text-action">0{i + 1}</p>
          <h2 id={`zona-${z}`} className="font-bold">
            {ZONES[z].label}
          </h2>
          <p className="mb-2 text-sm text-muted">{ZONES[z].description}</p>
          <ul className="grid gap-1">
            {LAB_OBJECTS.filter((o) => o.zone === z).map((o) => (
              <li key={o.id}>
                <button type="button" className="ge-press w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2" onClick={() => onSelect(o.id)}>
                  <span className="font-semibold text-ink">{o.name}</span>
                  <span className="block text-xs text-muted">{o.function}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
