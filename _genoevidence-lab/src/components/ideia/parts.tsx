"use client";
import type { ReactNode } from "react";
import { ESTADO_INFO, type Estado, type ItemAvaliacao } from "@/lib/ideia/avaliar";
import type { Nivel } from "@/lib/ideia/procedimento";
import { SourceList } from "@/components/sources/SourceList";

const ESTADO_CLS: Record<Estado, string> = {
  compativel: "border-ok/35 bg-ok-soft text-ok",
  possivel_problema: "border-danger/35 bg-danger-soft text-danger",
  insuficiente: "border-warn/35 bg-warn-soft text-warn",
  fora_do_alcance: "border-line bg-surface-2 text-muted",
};

/** Estado da avaliação: ícone + texto (não depende só da cor). */
export function EstadoChip({ estado, curto = false }: { estado: Estado; curto?: boolean }) {
  const e = ESTADO_INFO[estado];
  const rot = curto ? { compativel: "Compatível", possivel_problema: "Possível problema", insuficiente: "Info. insuficiente", fora_do_alcance: "Fora do alcance" }[estado] : e.rotulo;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ESTADO_CLS[estado]}`} data-estado={estado}>
      <span aria-hidden="true" className="font-mono">
        {e.icone}
      </span>
      {rot}
    </span>
  );
}

const NIVEL: Record<Nivel | "avaliacao", { rotulo: string; cls: string; icone: string; ajuda: string }> = {
  procedimento: { rotulo: "Representação do procedimento", cls: "bg-[var(--kind-ilustracao-soft)] text-[var(--kind-ilustracao)] border-[var(--kind-ilustracao)]/30", icone: "✎", ajuda: "Mostra a sequência descrita. Não prevê resultado." },
  ilustracao: { rotulo: "Ilustração didática", cls: "bg-[var(--kind-ilustracao-soft)] text-[var(--kind-ilustracao)] border-[var(--kind-ilustracao)]/30", icone: "✎", ajuda: "Representação simplificada; não comprova mecanismo." },
  avaliacao: { rotulo: "Avaliação fundamentada", cls: "bg-[var(--kind-dados-soft)] text-[var(--kind-dados)] border-[var(--kind-dados)]/30", icone: "❝", ajuda: "Compara as condições com as fontes consultadas, sem previsão quantitativa." },
  simulacao: { rotulo: "Simulação científica", cls: "bg-[var(--kind-simulacao-soft)] text-[var(--kind-simulacao)] border-[var(--kind-simulacao)]/30", icone: "ƒ", ajuda: "Calculado por um modelo identificado, com pressupostos e limites." },
};

export function NivelBadge({ nivel }: { nivel: Nivel | "avaliacao" }) {
  const n = NIVEL[nivel];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${n.cls}`} title={n.ajuda} data-nivel={nivel}>
      <span aria-hidden="true">{n.icone}</span>
      {n.rotulo}
    </span>
  );
}

export function ItemAvaliacaoCard({ item, destaque = false, extra }: { item: ItemAvaliacao; destaque?: boolean; extra?: ReactNode }) {
  return (
    <article className={`rounded-xl border bg-white p-3 text-sm ${destaque ? "border-accent ring-2 ring-accent/20" : "border-line"}`} data-item={item.id} aria-labelledby={`av-${item.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={`av-${item.id}`} className="font-semibold text-ink">
          {item.titulo}
        </h4>
        <EstadoChip estado={item.estado} />
      </div>
      <dl className="mt-2 grid gap-1.5">
        <Linha rotulo="Condição analisada">{item.condicao}</Linha>
        <Linha rotulo="Fundamento">
          {item.fundamento}
          {item.refs.length > 0 && <SourceList refs={item.refs} compact />}
          {item.regraPlataforma && <p className="mt-1 text-xs text-muted">Regra da plataforma: {item.regraPlataforma}</p>}
        </Linha>
        <Linha rotulo="Consequência possível">{item.consequencia}</Linha>
        <Linha rotulo="O que permanece incerto">{item.incerto}</Linha>
        <Linha rotulo="O que verificar">{item.verificar}</Linha>
      </dl>
      {extra}
    </article>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[150px_1fr] sm:gap-3">
      <dt className="text-xs font-semibold text-muted">{rotulo}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export function Secao({ titulo, children, acao, id }: { titulo: string; children: ReactNode; acao?: ReactNode; id?: string }) {
  return (
    <section className="ge-card p-4 sm:p-5" aria-labelledby={id}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id={id} className="text-base font-bold">
          {titulo}
        </h3>
        {acao}
      </header>
      {children}
    </section>
  );
}
