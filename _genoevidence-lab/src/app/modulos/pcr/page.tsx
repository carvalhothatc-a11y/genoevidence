import type { Metadata } from "next";
import { getRepository } from "@/lib/repo";
import { requirePageUser } from "@/lib/projects/server";
import { PCR_MODULE } from "@/lib/modules/pcr/content";
import { PcrModule, type PcrProjectContext } from "@/components/pcr/PcrModule";

export const metadata: Metadata = { title: "Módulo de PCR" };

const STEP_ORDER = PCR_MODULE.steps.map((s) => s.id);

export default async function PcrPage(props: PageProps<"/modulos/pcr">) {
  const sp = await props.searchParams;
  const user = await requirePageUser("/modulos/pcr");
  const repo = getRepository();
  const projectId = typeof sp.projeto === "string" ? sp.projeto : undefined;
  const sessionId = typeof sp.sessao === "string" ? sp.sessao : undefined;
  const stepParam = typeof sp.etapa === "string" && STEP_ORDER.includes(sp.etapa) ? sp.etapa : undefined;

  const p = user && projectId ? await repo.getProject(user.id, projectId) : null;
  const project: PcrProjectContext = p
    ? {
        links: {
          id: p.id,
          title: p.title,
          datasets: p.datasets.map((d) => ({ id: d.id, name: d.name })),
          structures: p.structures.map((s) => ({ id: s.id, label: s.summary.idCode ?? "estrutura" })),
          references: p.references.length,
        },
        references: p.references.map((r) => ({ id: r.id, title: r.title, status: r.status, technique: r.technique, isPrimary: r.isPrimary })),
        gelImages: p.files.filter((f) => f.kind === "imagem").map((f) => ({ id: f.id, name: f.name, role: f.role })),
      }
    : null;
  const projects = user && !p ? (await repo.listProjects(user.id)).filter((x) => !x.synthetic).slice(0, 5).map((x) => ({ id: x.id, title: x.title })) : [];

  const saved = p && sessionId ? p.sessions.find((s) => s.id === sessionId) : undefined;
  const st = (saved?.state ?? {}) as Record<string, unknown>;
  const initial = saved
    ? {
        mode: saved.mode,
        visited: saved.stepsVisited,
        choices: saved.choices.map((c) => ({ ...c })),
        questions: saved.questions,
        primaryReferenceId: saved.primaryReferenceId ?? null,
        stepId: typeof st.stepId === "string" ? st.stepId : STEP_ORDER[0],
        ...(st.params ? { params: st.params as Record<string, string> } : {}),
        ...(st.program ? { program: st.program as never } : {}),
        ...(st.lanes ? { lanes: st.lanes as never } : {}),
        ...(st.tubes ? { tubes: st.tubes as never } : {}),
        ...(st.reagentsAdded ? { reagentsAdded: st.reagentsAdded as string[] } : {}),
        tmC: (st.tmC as number | null) ?? null,
        ampliconBp: (st.ampliconBp as number | null) ?? null,
        ...(st.polymerase ? { polymerase: st.polymerase as never } : {}),
      }
    : stepParam
      ? { stepId: stepParam, visited: [STEP_ORDER[0], stepParam] }
      : undefined;

  return (
    <div>
      <h1 className="sr-only">
        {PCR_MODULE.title}
        {p ? ` — projeto ${p.title}` : ""}
        {saved ? ` — experiência reaberta: ${saved.title}` : ""}
      </h1>
      <PcrModule project={project} projects={projects} initial={initial} />
    </div>
  );
}
