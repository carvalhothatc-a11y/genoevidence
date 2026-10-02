import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRepository } from "@/lib/repo";
import { loadProjectFor, formatDate } from "@/lib/projects/server";
import type { StoredDataset } from "@/lib/expression/importService";
import { parseCsv } from "@/lib/expression/csv";
import { VALUE_TYPES } from "@/lib/expression/valueTypes";
import { ExpressionExplorer } from "@/components/expression/ExpressionExplorer";
import { DeleteButton } from "@/components/projects/DeleteButton";
import { Card } from "@/components/ui/Card";
import { SyntheticBadge, VisualKindBadge } from "@/components/ui/Badges";
import { Alert } from "@/components/ui/Alert";
import { SourceList } from "@/components/sources/SourceList";

export const metadata: Metadata = { title: "Dados de expressão" };

const PAGE = 50;

export default async function DatasetPage(props: PageProps<"/projetos/[id]/dados/[datasetId]">) {
  const { id, datasetId } = await props.params;
  const sp = await props.searchParams;
  const { project } = await loadProjectFor(id, "ler");
  const repo = getRepository();
  if (!project.datasets.some((d) => d.id === datasetId)) notFound();
  const stored = await repo.getDerived<StoredDataset>(id, "datasets", datasetId);
  if (!stored) notFound();
  const { meta, rows, issues } = stored;
  const info = VALUE_TYPES[meta.valueType];
  const file = project.files.find((f) => f.id === meta.fileId);

  // Tabela ORIGINAL: relida do arquivo preservado, paginada.
  const original = await repo.readFile(id, meta.fileId);
  const parsed = original ? parseCsv(original.bytes) : null;
  const totalPages = parsed ? Math.max(1, Math.ceil(parsed.rows.length / PAGE)) : 1;
  const page = Math.min(totalPages, Math.max(1, Number(sp.pagina) || 1));
  const statusByRow = new Map(rows.map((r) => [r.sourceRow, r.status]));
  const pageRows = parsed ? parsed.rows.slice((page - 1) * PAGE, page * PAGE) : [];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <nav aria-label="Trilha" className="mb-3 text-sm text-muted">
        <Link href="/projetos" className="underline">Projetos</Link> /{" "}
        <Link href={`/projetos/${project.id}`} className="underline">{project.title}</Link> / <span aria-current="page">{meta.name}</span>
      </nav>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{meta.name}</h1>
            <VisualKindBadge kind="dados" />
            {meta.synthetic && <SyntheticBadge />}
          </div>
          <p className="mt-1 text-sm text-muted">
            {info.label}
            {meta.valueTypeNote ? ` — ${meta.valueTypeNote}` : ""} · unidade(s): {meta.units.join(", ")} · interpretação confirmada em {formatDate(meta.confirmedAt)}
          </p>
        </div>
        <DeleteButton
          url={`/api/projects/${project.id}/datasets/${meta.id}`}
          confirmText="excluir"
          label="Excluir interpretação"
          redirectTo={`/projetos/${project.id}`}
          description="Remove a interpretação (mapeamento e valores lidos). O arquivo CSV original permanece no projeto."
        />
      </header>

      {meta.synthetic && <Alert tone="warn" className="mb-4" title="Dados sintéticos — valores fictícios para demonstração." />}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <ExpressionExplorer meta={meta} rows={rows} />
        </div>
        <aside className="grid content-start gap-4">
          <Card title="Sobre este tipo de valor">
            <p className="text-sm">{info.description}</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {info.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <div className="mt-2">
              <SourceList refs={info.refs} compact />
            </div>
          </Card>
          <Card title="Origem e transformações">
            <p className="text-sm">
              Arquivo original:{" "}
              {file ? (
                <a className="underline" href={`/api/projects/${project.id}/files/${file.id}`}>
                  {file.name}
                </a>
              ) : (
                "removido"
              )}
            </p>
            {file && <p className="break-all font-mono text-xs text-muted">SHA-256 {file.sha256}</p>}
            <ol className="mt-3 grid gap-2 text-sm">
              {meta.transformations.map((t, i) => (
                <li key={i} className="border-l-2 border-line pl-2">
                  <strong>{t.step}</strong> <span className="text-xs text-muted">({t.affectedRows} linha(s))</span>
                  <p className="text-xs">{t.detail}</p>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Validação registrada">
            <ul className="grid gap-1 text-sm">
              {issues.length === 0 && <li>Nenhum problema encontrado.</li>}
              {issues.map((i, k) => (
                <li key={k}>
                  <span aria-hidden="true">{i.level === "erro" ? "✖ " : i.level === "aviso" ? "⚠ " : "ℹ "}</span>
                  <span className="sr-only">{i.level}: </span>
                  {i.message}
                  {i.count !== undefined ? ` (${i.count})` : ""}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      <section aria-labelledby="original" className="mt-8">
        <h2 id="original" className="mb-2 text-lg font-semibold">
          Tabela original
        </h2>
        <p className="mb-3 text-sm text-muted">
          Valores como estão no arquivo enviado. A coluna “Situação” mostra como cada linha foi interpretada.
        </p>
        {parsed ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Tabela original, página {page} de {totalPages}
                </caption>
                <thead className="bg-surface-2 text-xs">
                  <tr>
                    <th scope="col" className="px-2 py-1.5">Linha</th>
                    {parsed.header.map((h) => (
                      <th scope="col" key={h} className="px-2 py-1.5">
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="px-2 py-1.5">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => {
                    const n = (page - 1) * PAGE + i + 1;
                    const st = statusByRow.get(n);
                    return (
                      <tr key={n} className={`border-t border-line ${st === "invalido" ? "bg-danger-soft" : st === "ausente" ? "bg-warn-soft" : ""}`}>
                        <td className="tabular px-2 py-1 text-muted">{n}</td>
                        {parsed.header.map((h) => (
                          <td key={h} className="px-2 py-1">
                            {r[h]}
                          </td>
                        ))}
                        <td className="px-2 py-1">{st === "ok" ? "válido" : st === "ausente" ? "⚠ ausente" : st === "invalido" ? "✖ inválido" : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <nav aria-label="Paginação da tabela original" className="mt-2 flex items-center gap-3 text-sm">
              {page > 1 && (
                <Link className="underline" href={`?pagina=${page - 1}#original`}>
                  ← Anterior
                </Link>
              )}
              <span>
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <Link className="underline" href={`?pagina=${page + 1}#original`}>
                  Próxima →
                </Link>
              )}
            </nav>
          </>
        ) : (
          <Alert tone="warn" title="O arquivo original não está mais disponível." />
        )}
      </section>
    </div>
  );
}
