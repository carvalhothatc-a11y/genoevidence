import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/Card";
import { listVisibleProjects } from "@/lib/authz";
import { requirePageUser } from "@/lib/projects/server";
import { listarRegistros } from "@/lib/caderno/store";
import { Caderno } from "@/components/caderno/Caderno";

export const metadata: Metadata = { title: "Caderno" };

export default async function CadernoPage() {
  const user = await requirePageUser("/caderno");
  const registros = await listarRegistros(user.id);
  // Só para o vínculo opcional. O caderno funciona sem nenhum projeto.
  const projetos = (await listVisibleProjects(user)).map((p) => ({ id: p.id, titulo: p.title }));

  return (
    <div className="mx-auto max-w-[920px] px-4 py-8">
      <PageHeader
        eyebrow="Registro"
        title="Caderno de laboratório"
        description="O que você fez, no dia em que fez. Fica registrado e ninguém reescreve sem deixar rastro."
      />
      <Caderno iniciais={registros} projetos={projetos} />
    </div>
  );
}
