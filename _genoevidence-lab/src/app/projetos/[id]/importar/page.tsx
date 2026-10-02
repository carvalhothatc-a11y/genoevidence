import Link from "next/link";
import type { Metadata } from "next";
import { loadOwnProject } from "@/lib/projects/server";
import { ImportWizard } from "@/components/expression/ImportWizard";
import { Card, PageHeader } from "@/components/ui/Card";
import { SyntheticBadge } from "@/components/ui/Badges";

export const metadata: Metadata = { title: "Importar CSV" };

export default async function ImportPage(props: PageProps<"/projetos/[id]/importar">) {
  const { id } = await props.params;
  const { project } = await loadOwnProject(id);
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8">
      <nav aria-label="Trilha" className="mb-3 text-sm text-muted">
        <Link href="/projetos" className="underline">Projetos</Link> /{" "}
        <Link href={`/projetos/${project.id}`} className="underline">{project.title}</Link> / <span aria-current="page">Importar CSV</span>
      </nav>
      <PageHeader
        eyebrow="Expressão gênica"
        title={<>Importar resultados processados {project.synthetic && <SyntheticBadge />}</>}
        description="Envie uma tabela com gene, amostra, grupo, valor e unidade. Você confere a leitura, mapeia as colunas, revisa a validação e confirma a interpretação. O arquivo original é preservado."
      />
      <Card>
        <ImportWizard projectId={project.id} csvFiles={project.files.filter((f) => f.kind === "csv")} synthetic={project.synthetic} />
      </Card>
    </div>
  );
}
