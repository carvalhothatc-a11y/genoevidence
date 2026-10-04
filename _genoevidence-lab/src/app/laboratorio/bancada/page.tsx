import type { Metadata } from "next";
import { Suspense } from "react";
import { authorizeProject, listVisibleProjects } from "@/lib/authz";
import { requirePageUser } from "@/lib/projects/server";
import { assistantStatus } from "@/lib/assistant/status";
import { LabStudio } from "@/components/studio/LabStudio";
import type { ProjectLinks } from "@/components/lab3d/EquipmentControls";

export const metadata: Metadata = { title: "Bancada 3D" };

export default async function BancadaPage(props: PageProps<"/laboratorio/bancada">) {
  const sp = await props.searchParams;
  const projectId = typeof sp.projeto === "string" ? sp.projeto : undefined;
  let project: ProjectLinks = null;
  let gelImages: { id: string; name: string; role?: string }[] = [];
  const user = await requirePageUser("/laboratorio/bancada");
  if (projectId) {
    const p = await authorizeProject(user, projectId, "ler").then((r) => r.project).catch(() => null);
    if (p) {
      project = {
        id: p.id,
        title: p.title,
        datasets: p.datasets.map((d) => ({ id: d.id, name: d.name })),
        structures: p.structures.map((s) => ({ id: s.id, label: `${s.summary.idCode ?? "estrutura"}${s.summary.title ? ` — ${s.summary.title.slice(0, 40)}` : ""}` })),
        references: p.references.length,
      };
      gelImages = p.files.filter((f) => f.kind === "imagem").map((f) => ({ id: f.id, name: f.name, role: f.role }));
    }
  }
  const projetos = (await listVisibleProjects(user)).map((p) => ({ id: p.id, title: p.title, role: p.role }));
  return (
    <>
      <h1 className="sr-only">Bancada 3D do laboratório virtual</h1>
      <Suspense fallback={<p className="p-6 text-sm text-muted">Carregando o laboratório…</p>}>
        <LabStudio user={{ name: user.name, email: user.email, role: user.role }} project={project} gelImages={gelImages} projetos={projetos} geninho={{ configured: assistantStatus().configured, motivo: assistantStatus().reason }} />
      </Suspense>
    </>
  );
}
