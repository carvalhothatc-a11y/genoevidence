"use client";
import { useState } from "react";
import { getLabObject, REAGENT_ORDER } from "@/lib/lab/objects";
import { extensionRule, formatDuration, validateProgram, type CyclingProgram } from "@/lib/models/pcr";
import { useLab } from "@/store/lab";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ClaimBasisBadge, SourceList } from "@/components/sources/SourceList";
import { usePcr, type LaneContent, type TubeContent } from "./store";

const reagentParts = getLabObject("reagentes")!.parts!;
const partName = (id: string) => reagentParts.find((p) => p.id === id)?.name ?? id;

/** Montagem de uma reação na ordem da Tabela 1 de Lorenz (2012). */
export function ReagentOrder() {
  const added = usePcr((s) => s.reagentsAdded);
  const addReagent = usePcr((s) => s.addReagent);
  const reset = usePcr((s) => s.resetReagents);
  const choose = usePcr((s) => s.choose);
  const [feedback, setFeedback] = useState<string | null>(null);
  const expected = REAGENT_ORDER[added.length];
  const sorted = [...REAGENT_ORDER].sort((a, b) => partName(a).localeCompare(partName(b), "pt-BR"));

  function pick(id: string) {
    useLab.getState().setHighlightReagent(id);
    if (added.includes(id)) return;
    if (id === expected) {
      addReagent(id);
      setFeedback(null);
      if (added.length + 1 === REAGENT_ORDER.length) choose("master_mix", "ordem_reagentes", "completa", "Montou a reação na ordem da Tabela 1 (Lorenz, 2012)");
    } else {
      setFeedback(
        `Pela Tabela 1 de Lorenz (2012), o próximo componente seria “${partName(expected)}”. Outros protocolos podem usar outra ordem; confira a sua referência principal.`,
      );
      choose("master_mix", "ordem_reagentes", id, `Tentou adicionar “${partName(id)}” fora da ordem da referência`);
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-line p-3" aria-label="Montar a reação">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Interação: montar uma reação na ordem descrita</h4>
        <ClaimBasisBadge basis="referencia" />
      </div>
      <p className="text-sm text-muted">Selecione os componentes. O tubo correspondente é destacado no balde de gelo da bancada.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Componentes disponíveis">
        {sorted.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pick(id)}
            aria-pressed={added.includes(id)}
            className={`rounded-md border px-3 py-1.5 text-sm ${added.includes(id) ? "border-ok bg-ok-soft" : "border-line bg-surface hover:bg-surface-2"}`}
          >
            {added.includes(id) ? "✔ " : ""}
            {partName(id)}
          </button>
        ))}
      </div>
      <ol className="flex flex-wrap gap-1 text-xs" aria-label="Ordem montada">
        {added.map((id, i) => (
          <li key={id} className="rounded bg-surface-2 px-2 py-0.5">
            {i + 1}. {partName(id)}
          </li>
        ))}
      </ol>
      <div aria-live="polite">
        {feedback && <Alert tone="warn" title={feedback} />}
        {added.length === REAGENT_ORDER.length && (
          <Alert tone="ok" title="Reação montada na ordem da referência.">
            Em um master mix, o DNA molde é adicionado depois, em cada tubo (Lorenz, 2012, §4, Notas).
          </Alert>
        )}
      </div>
      <SourceList refs={[{ id: "lorenz2012", locator: "Tabela 1; §4" }]} compact />
      {added.length > 0 && (
        <div>
          <Button variant="ghost" onClick={reset}>
            Recomeçar
          </Button>
        </div>
      )}
    </section>
  );
}

const TUBE_LABEL: Record<TubeContent, string> = { vazio: "Vazio", amostra: "Amostra", ntc: "Controle negativo (sem molde)", positivo: "Controle positivo" };

export function TubeAssignment() {
  const tubes = usePcr((s) => s.tubes);
  const setTube = usePcr((s) => s.setTube);
  const choose = usePcr((s) => s.choose);
  const hasNtc = tubes.includes("ntc");
  const hasPos = tubes.includes("positivo");
  return (
    <section className="grid gap-3 rounded-lg border border-line p-3" aria-label="Distribuir as reações">
      <h4 className="text-sm font-semibold">Interação: o que vai em cada tubo da tira</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tubes.map((t, i) => (
          <label key={i} className="grid gap-1 text-xs">
            Tubo {i + 1}
            <select
              className="rounded border border-line bg-surface px-1 py-1 text-sm"
              value={t}
              onChange={(e) => {
                setTube(i, e.target.value as TubeContent);
                choose("controles", `tubo_${i + 1}`, e.target.value, `Tubo ${i + 1}: ${TUBE_LABEL[e.target.value as TubeContent]}`);
              }}
            >
              {Object.entries(TUBE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div aria-live="polite" className="grid gap-2">
        {!hasNtc && <Alert tone="warn" title="Sem controle negativo. A referência recomenda sempre incluir um (Lorenz, 2012, §2)." />}
        {!hasPos && <Alert tone="info" title="Sem controle positivo. A referência o recomenda quando possível (Lorenz, 2012, §2, §4)." />}
        {hasNtc && hasPos && <Alert tone="ok" title="Controles negativo e positivo incluídos." />}
      </div>
    </section>
  );
}

const LANE_LABEL: Record<LaneContent, string> = { vazio: "Vazio", marcador: "Marcador de tamanho", amostra: "Amostra", ntc: "Controle negativo", positivo: "Controle positivo" };

export function GelLanes() {
  const lanes = usePcr((s) => s.lanes);
  const setLane = usePcr((s) => s.setLane);
  const choose = usePcr((s) => s.choose);
  return (
    <section className="grid gap-3 rounded-lg border border-line p-3" aria-label="Ordem das canaletas">
      <h4 className="text-sm font-semibold">Interação: ordem das canaletas no gel</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {lanes.map((l, i) => (
          <label key={i} className="grid gap-1 text-xs">
            Canaleta {i + 1}
            <select
              className="rounded border border-line bg-surface px-1 py-1 text-sm"
              value={l}
              onChange={(e) => {
                setLane(i, e.target.value as LaneContent);
                choose("eletroforese", `canaleta_${i + 1}`, e.target.value, `Canaleta ${i + 1}: ${LANE_LABEL[e.target.value as LaneContent]}`);
              }}
            >
              {Object.entries(LANE_LABEL).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <SourceList refs={[{ id: "lee2012", locator: "§2 (marcador aplicado junto com as amostras)" }]} compact />
    </section>
  );
}

// ---------------------------------------------------------------- editor de programa com conferência

type Check = { label: string; value: string; reference: string; status: "ok" | "fora" | "sem_info"; locator: string };

export function checkProgram(p: CyclingProgram, tmC: number | null, ampliconBp: number | null, polymerase: "taq" | "pfu" | "outra"): Check[] {
  const checks: Check[] = [];
  const st = (ok: boolean): Check["status"] => (ok ? "ok" : "fora");
  checks.push({
    label: "Desnaturação inicial (temperatura)",
    value: `${p.initialDenaturation.tempC} °C`,
    reference: "94–98 °C",
    status: st(p.initialDenaturation.tempC >= 94 && p.initialDenaturation.tempC <= 98),
    locator: "Tabela 2; §6",
  });
  checks.push({
    label: "Desnaturação inicial (tempo)",
    value: formatDuration(p.initialDenaturation.seconds),
    reference: "típico 1 min; > 3 min pode inativar a polimerase (exceto hot start)",
    status: st(p.initialDenaturation.seconds <= 180),
    locator: "§6",
  });
  checks.push({ label: "Número de ciclos", value: String(p.cycles), reference: "25–35", status: st(p.cycles >= 25 && p.cycles <= 35), locator: "§6" });
  checks.push({
    label: "Desnaturação por ciclo (tempo)",
    value: formatDuration(p.denaturation.seconds),
    reference: "10–60 s",
    status: st(p.denaturation.seconds >= 10 && p.denaturation.seconds <= 60),
    locator: "§6; Tabela 2",
  });
  checks.push(
    tmC === null
      ? { label: "Anelamento (temperatura)", value: `${p.annealing.tempC} °C`, reference: "≈ 5 °C abaixo da Tm aparente", status: "sem_info", locator: "§6" }
      : {
          label: "Anelamento (temperatura)",
          value: `${p.annealing.tempC} °C (Tm − ${(tmC - p.annealing.tempC).toFixed(1)} °C)`,
          reference: `≈ ${tmC - 5} °C (Tm ${tmC} °C − 5)`,
          status: st(Math.abs(tmC - 5 - p.annealing.tempC) <= 2),
          locator: "§6",
        },
  );
  checks.push({
    label: "Extensão (temperatura)",
    value: `${p.extension.tempC} °C`,
    reference: polymerase === "outra" ? "recomendação do fabricante" : "70–80 °C (Taq); Pfu ≈ 75 °C",
    status: polymerase === "outra" ? "sem_info" : st(p.extension.tempC >= 70 && p.extension.tempC <= 80),
    locator: "§6",
  });
  const rule = ampliconBp ? extensionRule(ampliconBp, polymerase) : null;
  checks.push({
    label: "Extensão (tempo)",
    value: formatDuration(p.extension.seconds),
    reference: rule?.seconds ? `≥ ${formatDuration(rule.seconds)} para ${ampliconBp} pb (${rule.text})` : rule ? rule.text : "informe o tamanho do amplicon",
    status: rule?.seconds ? st(p.extension.seconds >= rule.seconds) : "sem_info",
    locator: "§6",
  });
  checks.push({
    label: "Extensão final",
    value: formatDuration(p.finalExtension.seconds),
    reference: "≥ 5 min",
    status: st(p.finalExtension.seconds >= 300),
    locator: "§6; Tabela 2",
  });
  return checks;
}

function NumberInput({ label, value, onChange, unit, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; unit: string; min: number; max: number; step?: number }) {
  return (
    <label className="grid gap-1 text-xs">
      {label}
      <span className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          className="w-24 rounded border border-line bg-surface px-2 py-1 text-sm"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        />
        <span className="text-muted">{unit}</span>
      </span>
    </label>
  );
}

export function ProgramEditor() {
  const p = usePcr((s) => s.program);
  const setProgram = usePcr((s) => s.setProgram);
  const tmC = usePcr((s) => s.tmC);
  const ampliconBp = usePcr((s) => s.ampliconBp);
  const polymerase = usePcr((s) => s.polymerase);
  const setInputs = usePcr((s) => s.setInputs);
  const choose = usePcr((s) => s.choose);
  const errors = validateProgram(p);
  const checks = errors.length ? [] : checkProgram(p, tmC, ampliconBp, polymerase);
  const upd = (key: keyof CyclingProgram, field: "tempC" | "seconds", v: number) => {
    const next = { ...p, [key]: { ...(p[key] as { tempC: number; seconds: number }), [field]: v } };
    setProgram(next);
  };
  return (
    <section className="grid gap-3 rounded-lg border border-line p-3" aria-label="Programa do termociclador">
      <h4 className="text-sm font-semibold">Programa do termociclador e conferência com a referência</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs">
          Tm aparente dos primers (da sua ferramenta)
          <span className="flex items-center gap-1">
            <input
              type="number"
              className="w-24 rounded border border-line bg-surface px-2 py-1 text-sm"
              value={tmC ?? ""}
              onChange={(e) => setInputs({ tmC: e.target.value === "" ? null : Number(e.target.value) })}
            />
            °C
          </span>
        </label>
        <label className="grid gap-1 text-xs">
          Tamanho esperado do amplicon
          <span className="flex items-center gap-1">
            <input
              type="number"
              className="w-24 rounded border border-line bg-surface px-2 py-1 text-sm"
              value={ampliconBp ?? ""}
              onChange={(e) => setInputs({ ampliconBp: e.target.value === "" ? null : Number(e.target.value) })}
            />
            pb
          </span>
        </label>
        <label className="grid gap-1 text-xs">
          Polimerase
          <select
            className="rounded border border-line bg-surface px-2 py-1 text-sm"
            value={polymerase}
            onChange={(e) => {
              setInputs({ polymerase: e.target.value as "taq" | "pfu" | "outra" });
              choose("termociclador", "polimerase", e.target.value, `Polimerase: ${e.target.value}`);
            }}
          >
            <option value="taq">Taq</option>
            <option value="pfu">Pfu</option>
            <option value="outra">Outra (usar recomendação do fabricante)</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <fieldset className="grid gap-2 rounded border border-line p-2">
          <legend className="px-1 text-xs font-semibold">Desnaturação inicial</legend>
          <div className="flex gap-3">
            <NumberInput label="Temperatura" unit="°C" value={p.initialDenaturation.tempC} min={4} max={99} onChange={(v) => upd("initialDenaturation", "tempC", v)} />
            <NumberInput label="Tempo" unit="s" value={p.initialDenaturation.seconds} min={1} max={3600} onChange={(v) => upd("initialDenaturation", "seconds", v)} />
          </div>
        </fieldset>
        <fieldset className="grid gap-2 rounded border border-line p-2">
          <legend className="px-1 text-xs font-semibold">Ciclos</legend>
          <NumberInput label="Número de ciclos" unit="" value={p.cycles} min={1} max={60} onChange={(v) => setProgram({ ...p, cycles: v })} />
        </fieldset>
        {(
          [
            ["denaturation", "Desnaturação"],
            ["annealing", "Anelamento"],
            ["extension", "Extensão"],
            ["finalExtension", "Extensão final"],
          ] as const
        ).map(([k, label]) => (
          <fieldset key={k} className="grid gap-2 rounded border border-line p-2">
            <legend className="px-1 text-xs font-semibold">{label}</legend>
            <div className="flex gap-3">
              <NumberInput label="Temperatura" unit="°C" value={p[k].tempC} min={4} max={99} onChange={(v) => upd(k, "tempC", v)} />
              <NumberInput label="Tempo" unit="s" value={p[k].seconds} min={1} max={3600} onChange={(v) => upd(k, "seconds", v)} />
            </div>
          </fieldset>
        ))}
      </div>
      {errors.length > 0 ? (
        <Alert tone="danger" title="Programa inválido">
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="mb-1 text-left text-xs text-muted">Conferência com Lorenz (2012) — faixas citadas na referência, não regras universais</caption>
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-1 pr-2">Parâmetro</th>
                <th scope="col" className="py-1 pr-2">Seu valor</th>
                <th scope="col" className="py-1 pr-2">Referência</th>
                <th scope="col" className="py-1">Situação</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.label} className="border-t border-line align-top">
                  <th scope="row" className="py-1 pr-2 font-normal">{c.label}</th>
                  <td className="py-1 pr-2 tabular">{c.value}</td>
                  <td className="py-1 pr-2">
                    {c.reference} <span className="text-xs text-muted">({c.locator})</span>
                  </td>
                  <td className="py-1">{c.status === "ok" ? "✔ dentro" : c.status === "fora" ? "⚠ fora da faixa citada" : "? falta informação"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SourceList refs={[{ id: "lorenz2012", locator: "§6; Tabela 2" }]} compact />
    </section>
  );
}
