import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { listVisibleProjects } from "@/lib/authz";
import { requirePageUser } from "@/lib/projects/server";
import { TECHNIQUES, STATUS_LABEL } from "@/lib/modules/registry";
import { ButtonLink } from "@/components/ui/Button";
import { assistantStatus } from "@/lib/assistant/status";

export default async function Home() {
  const user = await requirePageUser("/");
  const projects = await listVisibleProjects(user);
  const recent = projects.filter((p) => !p.synthetic).slice(0, 3);
  const assistant = assistantStatus();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-ink">Biologia molecular · primeira entrega</p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{APP_NAME}</h1>
          <p className="mt-3 max-w-xl text-lg text-muted">
            Organize sua pesquisa, apoie-se em referências conferidas e explore técnicas numa bancada virtual antes de ir para a prática.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/laboratorio" className="px-5 py-3 text-base">
              Entrar no laboratório
            </ButtonLink>
            <ButtonLink href="/laboratorio/explorar" variant="accent" className="px-5 py-3 text-base">
              Explorar uma ideia
            </ButtonLink>
            <ButtonLink href="/projetos/novo" variant="secondary" className="px-5 py-3 text-base">
              Criar projeto
            </ButtonLink>
            <ButtonLink href="/laboratorio/bancada?modo=2d" variant="ghost" className="px-5 py-3 text-base">
              Versão em painéis 2D
            </ButtonLink>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">Como as informações são identificadas</h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="font-semibold text-[var(--kind-dados)]">▦ Visualização de dados</dt>
              <dd className="text-muted">Resultados enviados por você, com arquivo original preservado.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--kind-ilustracao)]">✎ Ilustração didática</dt>
              <dd className="text-muted">Representação simplificada de um processo. Não comprova mecanismo.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--kind-simulacao)]">ƒ Simulação científica</dt>
              <dd className="text-muted">Cálculo de um modelo identificado, com parâmetros, pressupostos e limitações.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-semibold">Projetos recentes</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">
              Nenhum projeto ainda. <Link className="underline" href="/projetos/novo">Crie o primeiro</Link> ou explore um{" "}
              <Link className="underline" href="/projetos">exemplo com dados sintéticos</Link>.
            </p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link className="underline" href={`/projetos/${p.id}`}>
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-semibold">Técnicas e módulos</h2>
          <ul className="grid gap-1.5 text-sm">
            {TECHNIQUES.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                {t.href && t.status !== "nao_implementado" ? (
                  <Link className="underline" href={t.href}>
                    {t.name}
                  </Link>
                ) : (
                  <span>{t.name}</span>
                )}
                <span className="text-xs text-muted">{STATUS_LABEL[t.status]}</span>
              </li>
            ))}
          </ul>
          <Link href="/modulos" className="mt-3 inline-block text-sm underline">
            Ver todas as técnicas
          </Link>
        </div>
      </section>

      <p className="mt-8 text-sm text-muted">
        Assistente científico: <strong>{assistant.configured ? "configurado" : "não configurado"}</strong>.{" "}
        <Link className="underline" href="/integracoes">
          Ver estado das integrações
        </Link>
        .
      </p>
    </div>
  );
}
