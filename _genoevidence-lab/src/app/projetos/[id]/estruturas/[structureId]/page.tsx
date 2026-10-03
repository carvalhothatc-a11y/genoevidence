import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadProjectFor } from "@/lib/projects/server";
import { StructureWorkbench } from "@/components/structures/StructureWorkbench";
import { SyntheticBadge } from "@/components/ui/Badges";
import { SourceList } from "@/components/sources/SourceList";

export const metadata: Metadata = { title: "Estrutura molecular" };

export default async function StructurePage(props: PageProps<"/projetos/[id]/estruturas/[structureId]">) {
  const { id, structureId } = await props.params;
  const { project } = await loadProjectFor(id, "ler");
  const structure = project.structures.find((s) => s.id === structureId);
  if (!structure) notFound();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <nav aria-label="Trilha" className="mb-3 text-sm text-muted">
        <Link href="/projetos" className="underline">Projetos</Link> / <Link href={`/projetos/${project.id}`} className="underline">{project.title}</Link> /{" "}
        <span aria-current="page">Estrutura</span>
      </nav>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ge-eyebrow mb-1">estrutura molecular</p>
          <h1 className="ge-display text-3xl">
            {structure.summary.idCode ?? "Estrutura"} <span className="ge-gradient-text">em 3D</span>
          </h1>
          {structure.summary.title && <p className="mt-1 max-w-3xl text-sm text-body">{structure.summary.title}</p>}
        </div>
        {project.synthetic && (
          <div className="grid justify-items-end gap-1 text-right">
            <SyntheticBadge />
            <p className="max-w-xs text-xs text-muted">Projeto de exemplo: os dados de expressão são sintéticos; esta estrutura é um arquivo real do PDB.</p>
          </div>
        )}
      </header>
      <StructureWorkbench projectId={project.id} structure={structure} />
      <div className="mt-6 text-xs text-muted">
        Visualização com Mol* e dados do Protein Data Bank:
        <SourceList refs={[{ id: "sehnal2021" }, { id: "berman2000" }]} compact />
      </div>
    </div>
  );
}
