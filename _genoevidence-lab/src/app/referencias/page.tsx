import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { requirePageUser } from "@/lib/projects/server";
import { SOURCES, VERIFICATION_LABEL, type VerificationLevel } from "@/lib/sources/catalog";

export const metadata: Metadata = { title: "Referências" };

const CLS: Record<VerificationLevel, string> = {
  texto_completo: "border-ok/30 bg-ok-soft text-ok",
  resumo: "border-accent/30 bg-accent-soft text-accent-ink",
  metadados: "border-warn/30 bg-warn-soft text-warn",
  nao_verificado: "border-line bg-surface-2 text-muted",
};

export default async function ReferenciasPage() {
  await requirePageUser("/referencias");
  const fontes = Object.values(SOURCES).sort((a, b) => a.shortCitation.localeCompare(b.shortCitation));
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8">
      <PageHeader
        eyebrow="Fontes"
        title="Referências"
        description="O catálogo usado pelas explicações, regras de avaliação e cenas do GenoLab. Cada fonte informa exatamente o que foi lido."
      />
      <Alert tone="info" title="Como as referências entram no laboratório">
        Explicações e regras citam a seção da fonte. Referências que você cadastra num <Link href="/projetos" className="underline">projeto</Link> aparecem como “cadastradas” até o conteúdo ser lido; a busca opcional no PubMed lista artigos encontrados, sem leitura nem verificação.
      </Alert>
      <ul className="mt-6 grid gap-3">
        {fontes.map((s) => (
          <li key={s.id} className="rounded-xl border border-line bg-surface p-4" id={s.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-semibold">{s.shortCitation}</h2>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CLS[s.verification]}`}>{VERIFICATION_LABEL[s.verification]}</span>
            </div>
            <p className="mt-1 text-sm">{s.citation}</p>
            <p className="mt-1 text-xs text-muted">Uso no GenoLab: {s.scope}</p>
            {s.sectionsRead && <p className="mt-1 text-xs text-muted">Seções lidas: {s.sectionsRead.join("; ")}</p>}
            {s.extractionCaveats?.map((c) => (
              <p key={c} className="mt-1 text-xs text-warn">
                Ressalva: {c}
              </p>
            ))}
            <p className="mt-2 text-xs">
              <a className="underline" href={s.url} target="_blank" rel="noopener noreferrer">
                {s.doi ? `doi:${s.doi}` : s.url}
              </a>
              {s.pmid && <span className="text-muted"> · PMID {s.pmid}</span>}
              {s.verifiedAt && <span className="text-muted"> · conferida em {s.verifiedAt.split("-").reverse().join("/")} via {s.verifiedVia}</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
