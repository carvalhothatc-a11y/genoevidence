import type { Metadata } from "next";
import { Suspense } from "react";
import { listVisibleProjects } from "@/lib/authz";
import { requirePageUser } from "@/lib/projects/server";
import { assistantStatus } from "@/lib/assistant/status";
import { AreaTrabalho } from "@/components/workspace/AreaTrabalho";

export const metadata: Metadata = { title: "Área de trabalho" };

const ID = /^[A-Za-z0-9_-]{4,64}$/;

/** Entrada direta na área de trabalho: descrever, enviar materiais, conferir e visualizar. */
export default async function AreaTrabalhoPage(props: PageProps<"/laboratorio">) {
  const sp = await props.searchParams;
  const user = await requirePageUser("/laboratorio");
  const projetos = (await listVisibleProjects(user)).map((p) => ({ id: p.id, title: p.title, role: p.role }));
  const projetoId = typeof sp.projeto === "string" && ID.test(sp.projeto) && projetos.some((p) => p.id === sp.projeto) ? sp.projeto : null;
  const experimentoId = typeof sp.experimento === "string" && ID.test(sp.experimento) ? sp.experimento : null;
  const st = assistantStatus();
  return (
    <>
      <h1 className="sr-only">Área de trabalho do GenoLab</h1>
      <Suspense fallback={<p className="p-6 text-sm text-muted">Carregando a área de trabalho…</p>}>
        <AreaTrabalho user={{ name: user.name, email: user.email, role: user.role }} projetos={projetos} geninho={{ configured: st.configured, motivo: st.reason }} abrir={{ projetoId, experimentoId: projetoId ? experimentoId : null }} />
      </Suspense>
    </>
  );
}
