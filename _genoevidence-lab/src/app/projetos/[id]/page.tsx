import Link from "next/link";
import type { Metadata } from "next";
import { loadProjectFor, formatBytes, formatDate } from "@/lib/projects/server";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { DeleteButton } from "@/components/projects/DeleteButton";
import { FileUploadForm } from "@/components/projects/FileUploadForm";
import { ReferenceAddForm } from "@/components/references/ReferenceAddForm";
import { StructureAddForm } from "@/components/structures/StructureAddForm";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ReferenceStatusBadge, SyntheticBadge, Tag } from "@/components/ui/Badges";
import { Alert } from "@/components/ui/Alert";
import { VALUE_TYPES } from "@/lib/expression/valueTypes";
import { lerExperimentos } from "@/lib/experimento/store";

export async function generateMetadata(props: PageProps<"/projetos/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const { project } = await loadProjectFor(id, "ler");
  return { title: project.title };
}

const SECTIONS = [
  ["resumo", "Resumo"],
  ["dados", "Dados"],
  ["referencias", "Referências"],
  ["estruturas", "Estruturas"],
  ["experiencias", "Experiências"],
  ["arquivos", "Arquivos originais"],
  ["assistente", "Assistente"],
  ["historico", "Histórico"],
] as const;

function FieldView({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm">{value || <span className="text-muted">Não informado</span>}</dd>
    </div>
  );
}

export default async function ProjectPage(props: PageProps<"/projetos/[id]">) {
  const { id } = await props.params;
  const { project, role } = await loadProjectFor(id, "ler");
  const fileById = new Map(project.files.map((f) => [f.id, f]));
  const usedFileIds = new Set([
    ...project.datasets.map((d) => d.fileId),
    ...project.structures.map((s) => s.fileId),
    ...project.references.flatMap((r) => (r.fileId ? [r.fileId] : [])),
  ]);
  const gelImages = project.files.filter((f) => f.kind === "imagem");
  const experimentos = await lerExperimentos(project.id);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <nav aria-label="Trilha" className="mb-3 text-sm text-muted">
        <Link href="/projetos" className="underline">
          Projetos
        </Link>{" "}
        / <span aria-current="page">{project.title}</span>
      </nav>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">{project.title}</h1>
            {project.synthetic && <SyntheticBadge />}
            <Tag>🔒 Privado</Tag>
          </div>
          <p className="mt-1 text-sm text-muted">
            Criado em {formatDate(project.createdAt)} · atualizado em {formatDate(project.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/laboratorio?projeto=${project.id}`}>Abrir na área de trabalho</ButtonLink>
          <ButtonLink href={`/modulos/pcr?projeto=${project.id}`} variant="secondary">
            Módulo de PCR
          </ButtonLink>
        </div>
      </header>

      {project.synthetic && (
        <Alert tone="warn" className="mb-6" title="Este projeto contém dados sintéticos.">
          Os valores foram gerados para demonstração e não representam medições. Não os use como resultado de pesquisa.
        </Alert>
      )}

      <nav aria-label="Seções do projeto" className="sticky top-[57px] z-10 -mx-4 mb-6 overflow-x-auto border-y border-line bg-paper/95 px-4 py-2 backdrop-blur">
        <ul className="flex gap-1 text-sm">
          {SECTIONS.map(([sid, label]) => (
            <li key={sid}>
              <a href={`#${sid}`} className="block whitespace-nowrap rounded px-2.5 py-1 hover:bg-surface-2">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-6">
        <Card title={<span id="resumo">Resumo do projeto</span>}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <FieldView label="Objetivo" value={project.objective} />
            <FieldView label="Organismo ou sistema" value={project.organism} />
            <FieldView label="Técnica" value={project.technique} />
            <FieldView label="Condições" value={project.conditions} />
            <FieldView label="Descrição do experimento" value={project.description} />
            <FieldView label="Unidades e réplicas" value={project.unitsAndReplicates} />
            <FieldView label="Grupos" value={project.groups.map((g) => (g.description ? `${g.name}: ${g.description}` : g.name)).join("\n")} />
            <FieldView label="Limitações" value={project.limitations} />
          </dl>
          <details className="mt-4 rounded-lg border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium">Editar informações</summary>
            <div className="mt-3">
              <ProjectForm project={project} />
            </div>
          </details>
        </Card>

        <Card
          title={<span id="dados">Dados interpretados</span>}
          actions={<ButtonLink href={`/projetos/${project.id}/importar`}>Importar CSV</ButtonLink>}
        >
          {project.datasets.length === 0 ? (
            <p className="text-sm text-muted">Nenhum conjunto de dados. Importe um CSV de expressão gênica já processado.</p>
          ) : (
            <ul className="grid gap-2">
              {project.datasets.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
                  <div className="min-w-0">
                    <Link href={`/projetos/${project.id}/dados/${d.id}`} className="font-medium underline">
                      {d.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {VALUE_TYPES[d.valueType].label} · {d.units.join(", ") || d.declaredUnit} · {d.genes.length} gene(s) · {d.groups.length} grupo(s) ·{" "}
                      {d.samples.length} amostra(s) · {d.missingCount} valor(es) ausente(s)
                    </p>
                  </div>
                  {d.synthetic && <SyntheticBadge />}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={<span id="referencias">Referências</span>}
          actions={
            project.references.length > 1 ? (
              <ButtonLink href={`/projetos/${project.id}/referencias/comparar`} variant="secondary">
                Comparar procedimentos
              </ButtonLink>
            ) : null
          }
        >
          <p className="mb-3 text-sm text-muted">
            Uma referência <strong>cadastrada</strong> tem apenas metadados: o sistema não leu o conteúdo. Envie o PDF ou cole o texto para que ele
            seja extraído e organizado.
          </p>
          {project.references.length > 0 && (
            <ul className="mb-4 grid gap-2">
              {project.references.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
                  <div className="min-w-0">
                    <Link href={`/projetos/${project.id}/referencias/${r.id}`} className="font-medium underline">
                      {r.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {[r.authors, r.year, r.doi ? `DOI ${r.doi}` : null].filter(Boolean).join(" · ")}
                      {r.isPrimary ? " · Referência principal" : ""}
                    </p>
                  </div>
                  <ReferenceStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium">Adicionar referência</summary>
            <div className="mt-3">
              <ReferenceAddForm projectId={project.id} />
            </div>
          </details>
        </Card>

        <Card title={<span id="estruturas">Estruturas moleculares</span>}>
          {project.structures.length > 0 && (
            <ul className="mb-4 grid gap-2">
              {project.structures.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
                  <div className="min-w-0">
                    <Link href={`/projetos/${project.id}/estruturas/${s.id}`} className="font-medium underline">
                      {s.summary.idCode ?? fileById.get(s.fileId)?.name ?? "Estrutura"} — {s.summary.title ?? "sem título no arquivo"}
                    </Link>
                    <p className="text-xs text-muted">
                      {s.format.toUpperCase()} · {s.summary.method ?? "método não informado no arquivo"} ·{" "}
                      {s.summary.classification === "experimental"
                        ? "Estrutura experimental"
                        : s.summary.classification === "computacional"
                          ? "Modelo computacional"
                          : "Origem não identificada"}{" "}
                      · {s.summary.chains.length} cadeia(s)
                    </p>
                  </div>
                  <Tag>{s.source.type === "rcsb" ? `RCSB PDB ${s.source.pdbId}` : s.source.type === "exemplo" ? "Arquivo de exemplo" : "Enviado"}</Tag>
                </li>
              ))}
            </ul>
          )}
          <details className="rounded-lg border border-line p-3" open={project.structures.length === 0}>
            <summary className="cursor-pointer text-sm font-medium">Adicionar estrutura (PDB ou mmCIF)</summary>
            <div className="mt-3">
              <StructureAddForm projectId={project.id} />
            </div>
          </details>
        </Card>

        <Card title={<span id="experimentos">Experimentos da área de trabalho</span>} actions={<ButtonLink href={`/laboratorio?projeto=${project.id}`} variant="secondary">Novo experimento</ButtonLink>}>
          {experimentos.length === 0 ? (
            <p className="text-sm text-muted">Nenhum experimento salvo. Na área de trabalho, descreva o procedimento, crie a visualização e use “Salvar”.</p>
          ) : (
            <ul className="grid gap-2">
              {experimentos.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-semibold">{e.titulo}</span>
                    <span className="text-xs text-muted">
                      {e.versoes.length} versão(ões) · {e.versoes.at(-1)?.acoes.length ?? 0} etapa(s) · {e.entrada.materiais.length} material(is) · atualizado em {formatDate(e.atualizadoEm)}
                    </span>
                  </span>
                  <ButtonLink href={`/laboratorio?projeto=${project.id}&experimento=${e.id}`} variant="secondary">
                    Reabrir
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={<span id="experiencias">Experiências salvas</span>} actions={<ButtonLink href={`/modulos/pcr?projeto=${project.id}`} variant="secondary">Nova experiência de PCR</ButtonLink>}>
          {project.sessions.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma experiência salva. Explore um módulo e use “Salvar no projeto”.</p>
          ) : (
            <ul className="grid gap-2">
              {project.sessions
                .slice()
                .reverse()
                .map((s) => (
                  <li key={s.id} className="rounded-lg border border-line p-3">
                    <details>
                      <summary className="cursor-pointer">
                        <span className="font-medium">{s.title}</span>{" "}
                        <span className="text-xs text-muted">
                          · {s.mode === "guiado" ? "Modo guiado" : "Modo exploratório"} · salva em {formatDate(s.savedAt)}
                        </span>
                      </summary>
                      <div className="mt-2 grid gap-2 text-sm">
                        <p>
                          <strong>Etapas exploradas:</strong> {s.stepsVisited.join(", ") || "—"}
                        </p>
                        {s.choices.length > 0 && (
                          <div>
                            <strong>Escolhas:</strong>
                            <ul className="ml-5 list-disc">
                              {s.choices.map((c, i) => (
                                <li key={i}>{c.label}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {s.questions.length > 0 && (
                          <div>
                            <strong>Dúvidas registradas:</strong>
                            <ul className="ml-5 list-disc">
                              {s.questions.map((q, i) => (
                                <li key={i}>{q.text}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {s.toConfirm.length > 0 && (
                          <div>
                            <strong>Confirmar antes da prática:</strong>
                            <ul className="ml-5 list-disc">
                              {s.toConfirm.map((q, i) => (
                                <li key={i}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <Link className="underline" href={`/modulos/pcr?projeto=${project.id}&sessao=${s.id}`}>
                          Reabrir no módulo
                        </Link>
                      </div>
                    </details>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card title={<span id="arquivos">Arquivos originais</span>}>
          <p className="mb-3 text-sm text-muted">
            Os arquivos são guardados exatamente como enviados (com hash SHA-256 para conferência). Interpretações ficam separadas e registradas no
            histórico.
          </p>
          {project.files.length === 0 ? (
            <p className="text-sm text-muted">Nenhum arquivo enviado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Arquivos originais do projeto</caption>
                <thead className="border-b border-line text-xs uppercase text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3">Nome</th>
                    <th scope="col" className="py-2 pr-3">Tipo</th>
                    <th scope="col" className="py-2 pr-3">Tamanho</th>
                    <th scope="col" className="py-2 pr-3">SHA-256</th>
                    <th scope="col" className="py-2 pr-3">Enviado em</th>
                    <th scope="col" className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {project.files.map((f) => (
                    <tr key={f.id} className="border-b border-line/70 align-top">
                      <td className="py-2 pr-3">
                        {f.name}
                        {f.role && <span className="block text-xs text-muted">{f.role}</span>}
                        {f.externalSource && (
                          <span className="block text-xs text-muted">
                            Obtido de {f.externalSource.name} em {formatDate(f.externalSource.retrievedAt)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{f.kind}</td>
                      <td className="tabular py-2 pr-3">{formatBytes(f.size)}</td>
                      <td className="py-2 pr-3 font-mono text-xs" title={f.sha256}>
                        {f.sha256.slice(0, 16)}…
                      </td>
                      <td className="py-2 pr-3">{formatDate(f.uploadedAt)}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <a className="underline" href={`/api/projects/${project.id}/files/${f.id}`}>
                            Baixar original
                          </a>
                          <DeleteButton
                            url={`/api/projects/${project.id}/files/${f.id}?cascata=1`}
                            confirmText="excluir"
                            label="Excluir"
                            description={
                              usedFileIds.has(f.id)
                                ? "Este arquivo é a origem de dados, estrutura ou referência do projeto. Excluí-lo também remove os itens derivados dele."
                                : "O arquivo será removido do projeto."
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <details className="mt-4 rounded-lg border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium">Enviar imagem de resultado (ex.: foto do gel)</summary>
            <div className="mt-3">
              <FileUploadForm projectId={project.id} />
            </div>
          </details>
          {gelImages.length > 0 && (
            <p className="mt-2 text-xs text-muted">Imagens enviadas aparecem na escala de resultados do módulo de PCR como dados do pesquisador.</p>
          )}
        </Card>

        <Card title={<span id="assistente">Assistente científico</span>}>
          <AssistantPanel projectId={project.id} consent={project.aiConsent.claudeApi} context={{ kind: "projeto" }} />
        </Card>

        <Card title={<span id="historico">Histórico de alterações</span>}>
          <ol className="grid gap-2 text-sm">
            {project.history
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.id} className="grid gap-0.5 border-l-2 border-line pl-3">
                  <span className="text-xs text-muted">
                    {formatDate(h.at)} · {h.actor} · {h.action}
                  </span>
                  <span>{h.detail}</span>
                </li>
              ))}
          </ol>
        </Card>

        <Card title="Zona de exclusão">
          <DeleteButton
            url={`/api/projects/${project.id}`}
            confirmText={project.title}
            label="Excluir projeto"
            redirectTo="/projetos"
            description="Exclui o projeto, todos os arquivos originais, dados interpretados e o histórico. Esta ação não pode ser desfeita."
          />
        </Card>
      </div>
    </div>
  );
}
