import { getSource, VERIFICATION_LABEL, type Claim, type SourceRef } from "@/lib/sources/catalog";

/** Lista de fontes do catálogo com nível de verificação e localizador (seção/tabela). */
export function SourceList({ refs, compact = false }: { refs: SourceRef[]; compact?: boolean }) {
  if (!refs.length) return null;
  return (
    <ul className={`grid gap-1 ${compact ? "mt-1 text-xs" : "text-sm"}`} aria-label="Fontes">
      {refs.map((r, i) => {
        const s = getSource(r.id);
        if (!s) return <li key={i}>Fonte desconhecida ({r.id})</li>;
        return (
          <li key={i} className="text-muted">
            <span aria-hidden="true">↳ </span>
            <a href={s.url} className="underline" target="_blank" rel="noreferrer noopener">
              {s.shortCitation}
            </a>
            {r.locator ? `, ${r.locator}` : ""} <span className="whitespace-nowrap">· {VERIFICATION_LABEL[s.verification]}</span>
          </li>
        );
      })}
    </ul>
  );
}

const BASIS: Record<Claim["basis"], { label: string; icon: string; cls: string }> = {
  referencia: { label: "Descrito na referência", icon: "❝", cls: "bg-[var(--kind-dados-soft)] text-[var(--kind-dados)]" },
  modelo: { label: "Calculado por modelo", icon: "ƒ", cls: "bg-[var(--kind-simulacao-soft)] text-[var(--kind-simulacao)]" },
  ilustracao: { label: "Ilustração / inferência didática", icon: "✎", cls: "bg-[var(--kind-ilustracao-soft)] text-[var(--kind-ilustracao)]" },
  imprevisivel: { label: "Não previsível com as informações disponíveis", icon: "?", cls: "bg-[var(--kind-imprevisivel-soft)] text-[var(--kind-imprevisivel)]" },
  sem_fonte: { label: "Prática comum — sem fonte cadastrada", icon: "!", cls: "bg-warn-soft text-warn" },
};

export function ClaimBasisBadge({ basis }: { basis: Claim["basis"] }) {
  const b = BASIS[basis];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${b.cls}`} data-basis={basis}>
      <span aria-hidden="true">{b.icon}</span>
      {b.label}
    </span>
  );
}

export function ClaimView({ claim }: { claim: Claim }) {
  return (
    <div className="grid gap-1">
      <p className="text-sm">{claim.text}</p>
      <div className="flex flex-wrap items-center gap-2">
        <ClaimBasisBadge basis={claim.basis} />
      </div>
      {claim.note && <p className="text-xs italic text-muted">{claim.note}</p>}
      <SourceList refs={claim.refs} compact />
    </div>
  );
}

export function ClaimList({ claims, empty }: { claims: Claim[]; empty?: string }) {
  if (!claims.length) return empty ? <p className="text-sm text-muted">{empty}</p> : null;
  return (
    <ul className="grid gap-3">
      {claims.map((c, i) => (
        <li key={i} className="border-l-2 border-line pl-3">
          <ClaimView claim={c} />
        </li>
      ))}
    </ul>
  );
}
