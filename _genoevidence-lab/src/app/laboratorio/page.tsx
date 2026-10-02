import type { Metadata } from "next";
import { Suspense } from "react";
import { getRepository } from "@/lib/repo";
import { requirePageUser } from "@/lib/projects/server";
import { LabExperience } from "@/components/lab3d/LabExperience";
import type { ProjectLinks } from "@/components/lab3d/EquipmentControls";

export const metadata: Metadata = { title: "Laboratório" };

export default async function LabPage(props: PageProps<"/laboratorio">) {
  const sp = await props.searchParams;
  const projectId = typeof sp.projeto === "string" ? sp.projeto : undefined;
  let project: ProjectLinks = null;
  let gelImages: { id: string; name: string; role?: string }[] = [];
  const user = await requirePageUser("/laboratorio");
  if (projectId) {
    const p = await getRepository().getProject(user.id, projectId);
    if (p)
      project = {
        id: p.id,
        title: p.title,
        datasets: p.datasets.map((d) => ({ id: d.id, name: d.name })),
        structures: p.structures.map((s) => ({ id: s.id, label: `${s.summary.idCode ?? "estrutura"}${s.summary.title ? ` — ${s.summary.title.slice(0, 40)}` : ""}` })),
        references: p.references.length,
      };
    if (p) gelImages = p.files.filter((f) => f.kind === "imagem").map((f) => ({ id: f.id, name: f.name, role: f.role }));
  }
  return (
    <>
      <h1 className="sr-only">Laboratório virtual de biologia molecular</h1>
      <Suspense fallback={<p className="p-6 text-sm text-muted">Carregando o laboratório…</p>}>
        <LabExperience project={project} gelImages={gelImages} />
      </Suspense>
    </>
  );
}
