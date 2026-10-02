import type { Metadata } from "next";
import Link from "next/link";
import { STATUS_LABEL, TECHNIQUES } from "@/lib/modules/registry";
import { PCR_MODULE } from "@/lib/modules/pcr/content";
import { PageHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Técnicas" };

const STATUS_CLS = {
  implementado: "bg-ok-soft text-ok border-ok/30",
  parcial: "bg-warn-soft text-warn border-warn/30",
  nao_implementado: "bg-surface-2 text-muted border-line",
} as const;

export default function ModulesPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8">
      <PageHeader
        eyebrow="Aprender e explorar"
        title="Técnicas com módulos"
        description="Esta lista mostra exatamente o que está implementado. Enviar um artigo sobre outra técnica não cria automaticamente um módulo nem uma simulação validada."
      />
      <ul className="grid gap-3">
        {TECHNIQUES.map((t) => (
          <li key={t.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {t.href && t.status !== "nao_implementado" ? (
                  <Link className="underline" href={t.href}>
                    {t.name}
                  </Link>
                ) : (
                  t.name
                )}
              </h2>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
            </div>
            <p className="mt-1 text-sm">{t.description}</p>
            {t.modes.length > 0 && <p className="mt-1 text-xs text-muted">Modos: {t.modes.join(" · ")}</p>}
            {t.notes && <p className="mt-1 text-xs text-muted">{t.notes}</p>}
          </li>
        ))}
      </ul>
      <section className="mt-8 grid gap-3" aria-labelledby="contrato">
        <h2 id="contrato" className="text-lg font-semibold">Contrato do módulo de PCR</h2>
        <Alert tone="info" title="Cada módulo declara entradas, fontes, etapas, objetos, interações, parâmetros, modelos, saídas e limitações.">
          Os componentes apenas renderizam este contrato. Nenhum código de simulação é gerado a partir de documentos.
        </Alert>
        <dl className="grid gap-3 rounded-xl border border-line bg-surface p-4 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold">Entradas aceitas</dt><dd><ul className="list-disc pl-5">{PCR_MODULE.acceptedInputs.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
          <div><dt className="font-semibold">Campos obrigatórios</dt><dd><ul className="list-disc pl-5">{PCR_MODULE.requiredFields.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
          <div><dt className="font-semibold">Etapas</dt><dd>{PCR_MODULE.steps.map((s) => `${s.order}. ${s.title}`).join(" · ")}</dd></div>
          <div><dt className="font-semibold">Interações</dt><dd><ul className="list-disc pl-5">{PCR_MODULE.interactions.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
          <div><dt className="font-semibold">Parâmetros exploráveis</dt><dd>{PCR_MODULE.parameters.map((p) => p.label).join(" · ")}</dd></div>
          <div><dt className="font-semibold">Modelos</dt><dd>{PCR_MODULE.models.map((m) => m.name).join(" · ")}</dd></div>
          <div><dt className="font-semibold">Saídas</dt><dd>{PCR_MODULE.outputs.map((o) => `${o.label} (${o.kind})`).join(" · ")}</dd></div>
          <div><dt className="font-semibold">Limitações</dt><dd><ul className="list-disc pl-5">{PCR_MODULE.limitations.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
          <div className="sm:col-span-2"><dt className="font-semibold">Autoria</dt><dd>{PCR_MODULE.authorship}</dd></div>
        </dl>
      </section>
    </div>
  );
}
