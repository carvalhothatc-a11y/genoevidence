"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { getLabObject, ZONES, type LabObject } from "@/lib/lab/objects";
import { PCR_MODULE } from "@/lib/modules/pcr/content";
import { getSource } from "@/lib/sources/catalog";
import { ClaimList, ClaimView } from "@/components/sources/SourceList";

const STEP_TITLE = Object.fromEntries(PCR_MODULE.steps.map((s) => [s.id, `${s.order}. ${s.title}`]));

/** Alternador “Entender rapidamente” / “Ver detalhes técnicos”. */
export function DepthToggle({ value, onChange }: { value: "rapido" | "tecnico"; onChange: (v: "rapido" | "tecnico") => void }) {
  return (
    <div role="radiogroup" aria-label="Nível de detalhe" className="grid grid-cols-2 rounded-full bg-surface-2 p-1 text-xs font-semibold">
      {(
        [
          ["rapido", "Entender rapidamente"],
          ["tecnico", "Ver detalhes técnicos"],
        ] as const
      ).map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`ge-press rounded-full px-3 py-1.5 ${value === v ? "bg-white text-ink shadow-[var(--shadow-1)]" : "text-muted hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/**
 * Informação de um objeto: nome, função, relação com a etapa, explicação simples,
 * aprofundamento técnico e fonte. Usado no 3D e no painel 2D equivalente.
 */
export function ObjectInfo({ id, part, interactions, projectId, headingLevel = 2, actions }: { id: string; part?: string | null; interactions?: ReactNode; projectId?: string; headingLevel?: 2 | 3; actions?: ReactNode }) {
  const [depth, setDepth] = useState<"rapido" | "tecnico">("rapido");
  const obj = getLabObject(id);
  if (!obj) return <p className="text-sm text-muted">Objeto não encontrado.</p>;
  const H = headingLevel === 2 ? "h2" : "h3";
  const p = obj.parts?.find((x) => x.id === part);
  const q = projectId ? `&projeto=${projectId}` : "";
  const firstRef = obj.technical.flatMap((c) => c.refs)[0];
  const src = firstRef ? getSource(firstRef.id) : undefined;
  return (
    <article className="grid gap-4" aria-labelledby={`obj-${obj.id}`}>
      <header className="grid gap-1">
        <p className="ge-mono text-[11px] uppercase tracking-wide text-muted">{ZONES[obj.zone].label}</p>
        <H id={`obj-${obj.id}`} className="text-xl font-bold leading-snug">
          {obj.name}
        </H>
        <p className="text-sm text-body">{obj.function}</p>
      </header>
      {actions}
      <DepthToggle value={depth} onChange={setDepth} />
      {p && (
        <section className="rounded-xl border border-accent/30 bg-accent-soft/60 p-3" aria-label={`Componente selecionado: ${p.name}`}>
          <p className="text-sm font-semibold text-ink">{p.name}</p>
          <ClaimView claim={p.role} />
        </section>
      )}
      {depth === "rapido" ? (
        <div className="grid gap-4">
          <section>
            <h4 className="ge-mono mb-1 text-[11px] uppercase tracking-wide text-muted">O que é</h4>
            <p className="text-sm">{obj.simple}</p>
          </section>
          {Object.keys(obj.steps).length > 0 && (
            <section>
              <h4 className="ge-mono mb-1 text-[11px] uppercase tracking-wide text-muted">Onde entra na PCR</h4>
              <ul className="grid gap-1.5 text-sm">
                {Object.entries(obj.steps).map(([stepId, text]) => (
                  <li key={stepId} className="rounded-lg bg-surface-2 px-3 py-2">
                    <Link className="font-semibold text-accent-ink underline" href={`/modulos/pcr?etapa=${stepId}${q}`}>
                      {STEP_TITLE[stepId] ?? stepId}
                    </Link>
                    <span className="block text-body">{text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {obj.interaction && (
            <section>
              <h4 className="ge-mono mb-1 text-[11px] uppercase tracking-wide text-muted">O que você pode explorar</h4>
              <p className="text-sm">{obj.interaction}</p>
            </section>
          )}
          <section>
            <h4 className="ge-mono mb-1 text-[11px] uppercase tracking-wide text-muted">Referência</h4>
            {src ? (
              <p className="text-sm">
                <a href={src.url} target="_blank" rel="noreferrer noopener" className="underline">
                  {src.shortCitation}
                </a>
                {firstRef?.locator ? `, ${firstRef.locator}` : ""}
              </p>
            ) : (
              <p className="text-sm text-warn">Sem fonte cadastrada para este objeto — veja os detalhes técnicos.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-4">
          <ClaimList claims={obj.technical} />
          {obj.parts && <PartsList obj={obj} active={part ?? null} />}
        </div>
      )}
      {interactions}
      <p className="ge-mono text-[11px] text-muted">modelo 3D provisório · gerado por código · substituível por GLB</p>
    </article>
  );
}

function PartsList({ obj, active }: { obj: LabObject; active: string | null }) {
  return (
    <section>
      <h4 className="ge-mono mb-1 text-[11px] uppercase tracking-wide text-muted">Componentes</h4>
      <ul className="grid gap-2">
        {obj.parts!.map((p) => (
          <li key={p.id} className={`rounded-xl border p-2.5 text-sm ${active === p.id ? "border-accent bg-accent-soft/50" : "border-line"}`}>
            <p className="font-semibold text-ink">{p.name}</p>
            <ClaimView claim={p.role} />
          </li>
        ))}
      </ul>
    </section>
  );
}
