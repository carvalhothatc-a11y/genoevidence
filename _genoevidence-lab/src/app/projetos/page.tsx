import Link from "next/link";
import type { Metadata } from "next";
import { getRepository } from "@/lib/repo";
import { requirePageUser } from "@/lib/projects/server";
import { formatDate } from "@/lib/projects/server";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { SyntheticBadge, Tag } from "@/components/ui/Badges";
import { Alert } from "@/components/ui/Alert";
import { CreateExampleButton } from "@/components/projects/CreateExampleButton";
import type { ProjectSummary } from "@/lib/domain/schemas";

export const metadata: Metadata = { title: "Projetos" };

function ProjectList({ items, empty }: { items: ProjectSummary[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((p) => (
        <li key={p.id}>
          <Link href={`/projetos/${p.id}`} className="block h-full rounded-xl border border-line bg-surface p-4 hover:border-accent">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{p.title}</h3>
              {p.synthetic && <SyntheticBadge />}
            </div>
            <p className="mt-1 text-sm text-muted">
              {[p.technique, p.organism].filter(Boolean).join(" · ") || "Técnica e organismo não informados"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Tag>{p.counts.datasets} conjunto(s) de dados</Tag>
              <Tag>{p.counts.references} referência(s)</Tag>
              <Tag>{p.counts.structures} estrutura(s)</Tag>
              <Tag>{p.counts.sessions} experiência(s)</Tag>
            </div>
            <p className="mt-2 text-xs text-muted">Atualizado em {formatDate(p.updatedAt)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ProjectsPage(props: PageProps<"/projetos">) {
  const sp = await props.searchParams;
  const migrated = Number(sp.associados) || 0;
  const user = await requirePageUser("/projetos");
  const projects = await getRepository().listProjects(user.id);
  const real = projects.filter((p) => !p.synthetic);
  const examples = projects.filter((p) => p.synthetic);
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <PageHeader
        eyebrow="Pesquisa"
        title="Projetos"
        description="Cada projeto reúne objetivo, condições, arquivos originais, dados interpretados, referências, estruturas e o histórico de alterações. Projetos são privados."
        actions={<ButtonLink href="/projetos/novo">+ Novo projeto</ButtonLink>}
      />
      {migrated > 0 && <Alert tone="ok" className="mb-6" title={`${migrated} projeto(s) criado(s) neste navegador antes do cadastro foram associados à sua conta.`} />}
      <section aria-labelledby="meus" className="mb-10">
        <h2 id="meus" className="mb-3 text-lg font-semibold">Meus projetos</h2>
        <ProjectList items={real} empty="Você ainda não criou projetos. Use “Novo projeto” para começar." />
      </section>
      <section aria-labelledby="exemplos" className="rounded-xl border border-dashed border-warn/60 bg-warn-soft/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="exemplos" className="text-lg font-semibold">Exemplos com dados sintéticos</h2>
          <CreateExampleButton />
        </div>
        <p className="mb-3 text-sm text-muted">
          Projetos de demonstração com valores fictícios, mantidos separados dos projetos reais. Servem para conhecer os fluxos antes de enviar
          seus dados.
        </p>
        <ProjectList items={examples} empty="Nenhum exemplo criado." />
      </section>
    </div>
  );
}
