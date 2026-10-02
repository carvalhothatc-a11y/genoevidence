import type { Metadata } from "next";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Card, PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Novo projeto" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader eyebrow="Projetos" title="Novo projeto" description="Comece pelos campos que já conhece. Tudo pode ser editado depois, e cada mudança fica no histórico." />
      <Card>
        <ProjectForm />
      </Card>
    </div>
  );
}
