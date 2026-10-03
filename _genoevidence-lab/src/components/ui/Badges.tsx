import type { ConsequenceBasis, ReferenceStatus, VisualKind } from "@/lib/domain/schemas";

const kindInfo: Record<VisualKind, { label: string; icon: string; cls: string; help: string }> = {
  dados: {
    label: "Visualização de dados",
    icon: "▦",
    cls: "bg-[var(--kind-dados-soft)] text-[var(--kind-dados)] border-[var(--kind-dados)]/30",
    help: "Representa resultados enviados pelo pesquisador.",
  },
  ilustracao: {
    label: "Ilustração didática",
    icon: "✎",
    cls: "bg-[var(--kind-ilustracao-soft)] text-[var(--kind-ilustracao)] border-[var(--kind-ilustracao)]/30",
    help: "Representação simplificada de um processo. Não comprova mecanismo nem gera resultado.",
  },
  simulacao: {
    label: "Simulação científica",
    icon: "ƒ",
    cls: "bg-[var(--kind-simulacao-soft)] text-[var(--kind-simulacao)] border-[var(--kind-simulacao)]/30",
    help: "Calculado por um modelo identificado, com parâmetros, pressupostos e limitações.",
  },
};

/** Selo obrigatório em toda visualização. Usa ícone + texto (não depende só de cor). */
export function VisualKindBadge({ kind, className = "" }: { kind: VisualKind; className?: string }) {
  const k = kindInfo[kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${k.cls} ${className}`}
      title={k.help}
      data-visual-kind={kind}
    >
      <span aria-hidden="true">{k.icon}</span>
      {k.label}
    </span>
  );
}

const basisInfo: Record<ConsequenceBasis, { label: string; icon: string; cls: string }> = {
  referencia: { label: "Descrito na referência", icon: "❝", cls: "bg-[var(--kind-dados-soft)] text-[var(--kind-dados)]" },
  modelo: { label: "Calculado por modelo", icon: "ƒ", cls: "bg-[var(--kind-simulacao-soft)] text-[var(--kind-simulacao)]" },
  ilustracao: { label: "Ilustração didática", icon: "✎", cls: "bg-[var(--kind-ilustracao-soft)] text-[var(--kind-ilustracao)]" },
  imprevisivel: {
    label: "Não previsível com as informações disponíveis",
    icon: "?",
    cls: "bg-[var(--kind-imprevisivel-soft)] text-[var(--kind-imprevisivel)]",
  },
};

export function BasisBadge({ basis }: { basis: ConsequenceBasis }) {
  const b = basisInfo[basis];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${b.cls}`} data-basis={basis}>
      <span aria-hidden="true">{b.icon}</span>
      {b.label}
    </span>
  );
}

const statusInfo: Record<ReferenceStatus, { label: string; cls: string; help: string }> = {
  cadastrada: {
    label: "Cadastrada — conteúdo não lido",
    cls: "bg-surface-2 text-muted border-line",
    help: "Somente metadados. O sistema não leu este documento.",
  },
  conteudo_obtido: {
    label: "Conteúdo obtido",
    cls: "bg-warn-soft text-warn border-warn/30",
    help: "O texto foi extraído; a organização ainda precisa ser conferida.",
  },
  analisada: {
    label: "Analisada e conferida",
    cls: "bg-ok-soft text-ok border-ok/30",
    help: "Extração estruturada conferida pelo pesquisador.",
  },
};

export function ReferenceStatusBadge({ status }: { status: ReferenceStatus }) {
  const s = statusInfo[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`} title={s.help}>
      {s.label}
    </span>
  );
}

export function SyntheticBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-warn bg-warn-soft px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-warn"
      title="Dados fictícios para demonstração. Separados dos projetos reais."
    >
      <span aria-hidden="true">⚑</span> Dados sintéticos
    </span>
  );
}

export function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded border border-line bg-surface-2 px-2 py-0.5 text-xs text-muted ${className}`}>{children}</span>;
}
