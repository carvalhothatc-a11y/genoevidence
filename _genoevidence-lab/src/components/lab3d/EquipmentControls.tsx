"use client";
import Link from "next/link";
import { useEffect } from "react";
import { isRotorBalanced, useLab } from "@/store/lab";
import { useUi } from "@/store/ui";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ClaimBasisBadge } from "@/components/sources/SourceList";

export type ProjectLinks = { id: string; title: string; datasets: { id: string; name: string }[]; structures: { id: string; label: string }[]; references: number } | null;

/** Interações com valor educativo, específicas de cada equipamento. */
export function EquipmentControls({ id, project }: { id: string; project: ProjectLinks }) {
  const s = useLab();
  const paused = useUi((u) => u.paused);
  const q = project ? `&projeto=${project.id}` : "";

  // centrifugação: ~2 s de giro (pausável); encerra sozinha
  useEffect(() => {
    if (!s.spinning || paused) return;
    const t = setTimeout(() => useLab.getState().setSpinning(false), 2200);
    return () => clearTimeout(t);
  }, [s.spinning, paused]);

  if (id === "termociclador") {
    return (
      <section className="grid gap-2 rounded-lg border border-line p-3" aria-label="Interações com o termociclador">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Interação</h4>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => s.setThermocyclerOpen(!s.thermocyclerOpen)}>
            {s.thermocyclerOpen ? "Fechar tampa" : "Abrir tampa"}
          </Button>
          <Button
            variant="secondary"
            disabled={!s.thermocyclerOpen || s.tubes === "termociclador"}
            onClick={() => s.setTubes("termociclador")}
            title={!s.thermocyclerOpen ? "Abra a tampa primeiro" : undefined}
          >
            Posicionar tubos no bloco
          </Button>
          <Button disabled={s.thermocyclerOpen || s.tubes !== "termociclador"} onClick={() => s.setProgramRunning(!s.programRunning)}>
            {s.programRunning ? "Interromper programa" : "Iniciar programa"}
          </Button>
        </div>
        {s.tubes !== "termociclador" && <p className="text-xs text-muted">Os tubos estão {s.tubes === "gelo" ? "no gelo (zona 1)" : "na microcentrífuga"}.</p>}
        {s.thermocyclerOpen && s.tubes === "termociclador" && <p className="text-xs text-muted">Feche a tampa aquecida antes de iniciar o programa.</p>}
        <p className="text-sm">
          <Link className="underline" href={`/modulos/pcr?etapa=termociclador${q}`}>
            Abrir o programa e a escala molecular sincronizada
          </Link>
        </p>
      </section>
    );
  }

  if (id === "microcentrifuga") {
    const balanced = isRotorBalanced(s.rotorSlots);
    return (
      <section className="grid gap-3 rounded-lg border border-line p-3" aria-label="Interações com a microcentrífuga">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Interação: balancear o rotor</h4>
          <ClaimBasisBadge basis="sem_fonte" />
        </div>
        <p className="text-sm">Escolha as posições dos tubos. Cada tubo deve ter um tubo na posição oposta.</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative h-36 w-36 shrink-0 rounded-full border-2 border-line bg-surface-2" role="group" aria-label="Posições do rotor">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
              const on = s.rotorSlots.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Posição ${i + 1}${on ? ", ocupada" : ", vazia"}`}
                  onClick={() => {
                    s.setTubes("centrifuga");
                    s.setCentrifugeOpen(true);
                    s.toggleRotorSlot(i);
                  }}
                  className={`absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-xs font-semibold ${
                    on ? "border-accent bg-accent text-white" : "border-line bg-surface"
                  }`}
                  style={{ left: `${50 + Math.cos(a) * 36}%`, top: `${50 + Math.sin(a) * 36}%` }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="grid gap-2 text-sm">
            <p>
              {s.rotorSlots.length === 0
                ? "Nenhum tubo no rotor."
                : balanced
                  ? "✔ Balanceado: posições opostas ocupadas."
                  : "⚠ Desbalanceado: há posições ocupadas sem par oposto."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!balanced || s.spinning}
                onClick={() => {
                  s.setCentrifugeOpen(false);
                  s.setSpinning(true);
                }}
              >
                {s.spinning ? "Centrifugando…" : "Centrifugar brevemente"}
              </Button>
              <Button variant="ghost" onClick={() => s.setCentrifugeOpen(!s.centrifugeOpen)}>
                {s.centrifugeOpen ? "Fechar tampa" : "Abrir tampa"}
              </Button>
            </div>
          </div>
        </div>
        <Alert tone="warn">
          Sem fonte cadastrada neste módulo: a centrifugação breve e o balanceamento são práticas comuns. Confira o manual do equipamento. O
          balanceamento aqui é apenas geométrico; massa e volume não são simulados.
        </Alert>
      </section>
    );
  }

  if (id === "computador") {
    return (
      <section className="grid gap-2 rounded-lg border border-line p-3" aria-label="Acesso aos dados do projeto">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Dados, estruturas e fontes</h4>
        {project ? (
          <ul className="grid gap-1 text-sm">
            <li>
              <Link className="underline" href={`/projetos/${project.id}`}>
                Projeto: {project.title}
              </Link>
            </li>
            {project.datasets.map((d) => (
              <li key={d.id}>
                <Link className="underline" href={`/projetos/${project.id}/dados/${d.id}`}>
                  Gráficos: {d.name}
                </Link>
              </li>
            ))}
            {project.structures.map((st) => (
              <li key={st.id}>
                <Link className="underline" href={`/projetos/${project.id}/estruturas/${st.id}`}>
                  Estrutura: {st.label}
                </Link>
              </li>
            ))}
            <li>
              <Link className="underline" href={`/projetos/${project.id}#referencias`}>
                Referências ({project.references})
              </Link>
            </li>
          </ul>
        ) : (
          <p className="text-sm">
            Nenhum projeto aberto no laboratório. <Link className="underline" href="/projetos">Escolha um projeto</Link> e use “Abrir no laboratório”.
          </p>
        )}
      </section>
    );
  }

  if (id === "cuba-eletroforese" || id === "fonte-eletroforese") {
    return (
      <p className="text-sm">
        <Link className="underline" href={`/modulos/pcr?etapa=eletroforese${q}`}>
          Abrir a etapa de eletroforese no módulo de PCR
        </Link>
      </p>
    );
  }
  return null;
}
