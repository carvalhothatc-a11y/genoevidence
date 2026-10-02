"use client";
import { useEffect, useState } from "react";
import { CAMPO_INFO, getCampo, type Campo, type Cenario, type Valor } from "@/lib/ideia/schema";
import { TECNICA_NOME } from "@/lib/ideia/parse";

/** Grupos de parâmetros exibidos no plano e no editor de condições. */
export const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  { titulo: "Alvo e enzima", campos: ["alvo.gene", "alvo.ampliconPb", "polimerase", "primersTmC"] },
  { titulo: "Reação", campos: ["reacao.volumeUl", "reacao.mgcl2mM", "reacao.dntpsUM", "reacao.primerUM", "reacao.polimeraseU", "reacao.moldeNg", "reacao.amostras"] },
  {
    titulo: "Programa do termociclador",
    campos: [
      "programa.desnatInicial.tempC",
      "programa.desnatInicial.segundos",
      "programa.ciclos",
      "programa.desnat.tempC",
      "programa.desnat.segundos",
      "programa.anel.tempC",
      "programa.anel.segundos",
      "programa.ext.tempC",
      "programa.ext.segundos",
      "programa.extFinal.tempC",
      "programa.extFinal.segundos",
    ],
  },
  { titulo: "Controles", campos: ["controles.negativo", "controles.positivo"] },
  { titulo: "Gel", campos: ["gel.agarosePct", "gel.vPorCm", "gel.voltsTotal", "gel.marcador"] },
];

const BOOL: Campo[] = ["controles.negativo", "controles.positivo", "gel.marcador"];
const TEXTO: Campo[] = ["objetivo", "esperado", "alvo.gene"];
const INTEIRO: Campo[] = ["programa.ciclos", "reacao.amostras", "alvo.ampliconPb"];

export function CampoInput({ campo, valor, onChange, id }: { campo: Campo; valor: Valor; onChange: (v: Valor) => void; id: string }) {
  const info = CAMPO_INFO[campo];
  const [txt, setTxt] = useState(valor === null ? "" : String(valor).replace(".", ","));
  useEffect(() => setTxt(valor === null ? "" : String(valor).replace(".", ",")), [valor]);
  const cls = "w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none";

  if (BOOL.includes(campo))
    return (
      <select id={id} className={cls} value={valor === null ? "" : valor ? "sim" : "nao"} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "sim")}>
        <option value="">não informado</option>
        <option value="sim">sim</option>
        <option value="nao">não</option>
      </select>
    );
  if (campo === "polimerase")
    return (
      <select id={id} className={cls} value={(valor as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">não informada</option>
        <option value="taq">Taq</option>
        <option value="pfu">Pfu</option>
        <option value="outra">Outra</option>
      </select>
    );
  if (campo === "tecnica")
    return (
      <select id={id} className={cls} value={valor as string} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(TECNICA_NOME).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    );
  if (TEXTO.includes(campo))
    return <input id={id} className={cls} value={(valor as string) ?? ""} maxLength={campo === "alvo.gene" ? 80 : 500} onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)} />;

  const unidade = info.unidade === "s" ? "s" : info.unidade;
  return (
    <div className="flex items-center gap-1.5">
      <input
        id={id}
        inputMode="decimal"
        className={cls}
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => {
          const t = txt.trim().replace(",", ".");
          if (!t) return onChange(null);
          const n = Number(t);
          if (!Number.isFinite(n) || n < 0) return setTxt(valor === null ? "" : String(valor).replace(".", ","));
          onChange(INTEIRO.includes(campo) ? Math.round(n) : n);
        }}
        aria-describedby={unidade ? `${id}-u` : undefined}
      />
      {unidade && (
        <span id={`${id}-u`} className="shrink-0 font-mono text-xs text-muted">
          {unidade}
        </span>
      )}
    </div>
  );
}

/**
 * Editor de condições de um cenário já confirmado: guarda um rascunho local e, ao aplicar,
 * cria uma NOVA VERSÃO (a anterior é preservada).
 */
export function EditorCondicoes({ cenario, onAplicar, prefixo }: { cenario: Cenario; onAplicar: (m: { campo: Campo; valor: Valor }[]) => void; prefixo: string }) {
  const [draft, setDraft] = useState<Partial<Record<Campo, Valor>>>({});
  useEffect(() => setDraft({}), [cenario.id, cenario.versao]);
  const mudancas = (Object.entries(draft) as [Campo, Valor][]).filter(([c, v]) => getCampo(cenario, c) !== v).map(([campo, valor]) => ({ campo, valor }));
  return (
    <div className="grid gap-4">
      {GRUPOS.map((g) => (
        <fieldset key={g.titulo} className="grid gap-2">
          <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{g.titulo}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.campos.map((c) => {
              const id = `${prefixo}-${c.replace(/\./g, "-")}`;
              const v = c in draft ? (draft[c] as Valor) : getCampo(cenario, c);
              const alterado = c in draft && draft[c] !== getCampo(cenario, c);
              return (
                <div key={c} className={`grid gap-1 rounded-lg p-1.5 ${alterado ? "bg-accent-soft" : ""}`}>
                  <label htmlFor={id} className="text-xs font-semibold">
                    {CAMPO_INFO[c].rotulo}
                    {alterado && <span className="ml-1 text-accent-ink">• alterado</span>}
                  </label>
                  <CampoInput id={id} campo={c} valor={v} onChange={(nv) => setDraft((d) => ({ ...d, [c]: nv }))} />
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!mudancas.length}
          onClick={() => onAplicar(mudancas)}
          className="ge-press min-h-10 rounded-full bg-action px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Aplicar {mudancas.length ? `${mudancas.length} alteração(ões)` : "alterações"} — cria a versão {cenario.versao + 1}
        </button>
        {mudancas.length > 0 && (
          <button type="button" onClick={() => setDraft({})} className="text-xs font-semibold underline">
            Descartar
          </button>
        )}
      </div>
    </div>
  );
}
