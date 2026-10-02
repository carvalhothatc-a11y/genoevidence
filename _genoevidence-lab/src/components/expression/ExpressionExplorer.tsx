"use client";
import { useMemo, useState } from "react";
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { DatasetMeta, ExpressionRow } from "@/lib/domain/schemas";
import { describe, formatNumber } from "@/lib/expression/stats";
import { VALUE_TYPES } from "@/lib/expression/valueTypes";
import { ChartFrame } from "@/components/viz/ChartFrame";
import { VIZ } from "@/components/viz/tokens";
import { Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

type Point = { x: number; y: number; row: ExpressionRow };

function Ring(props: { cx?: number; cy?: number }) {
  const { cx = 0, cy = 0 } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      <circle cx={cx} cy={cy} r={5} fill={VIZ.series1} stroke={VIZ.surface} strokeWidth={2} />
    </g>
  );
}

function TooltipBox({ active, payload, unit }: { active?: boolean; payload?: { payload: Point }[]; unit: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="text-sm font-semibold tabular">
        {formatNumber(p.row.value)} {unit}
      </p>
      <p className="text-muted">
        Amostra {p.row.sample} · grupo {p.row.group}
        {p.row.replicate ? ` · réplica ${p.row.replicate}` : ""}
      </p>
      <p className="text-muted">Linha {p.row.sourceRow} do arquivo · valor original “{p.row.raw}”</p>
    </div>
  );
}

export function ExpressionExplorer({ meta, rows }: { meta: DatasetMeta; rows: ExpressionRow[] }) {
  const info = VALUE_TYPES[meta.valueType];
  const [gene, setGene] = useState(meta.genes[0] ?? "");
  const [unit, setUnit] = useState(meta.units[0] ?? "");
  const [log, setLog] = useState(false);

  const geneRows = useMemo(() => rows.filter((r) => r.gene === gene && r.unit === unit), [rows, gene, unit]);
  const groups = useMemo(() => meta.groups.filter((g) => geneRows.some((r) => r.group === g)), [meta.groups, geneRows]);
  const points: Point[] = useMemo(() => {
    const out: Point[] = [];
    groups.forEach((g, gi) => {
      geneRows
        .filter((r) => r.group === g && r.status === "ok" && r.value !== null)
        .forEach((r, k) => out.push({ x: gi + ((k % 5) - 2) * 0.07, y: r.value as number, row: r }));
    });
    return out;
  }, [groups, geneRows]);
  const stats = useMemo(() => describe(geneRows, meta.groups), [geneRows, meta.groups]);
  const notPlotted = geneRows.filter((r) => r.status !== "ok");
  const canLog = info.axis === "linear-log-opcional" && points.length > 0 && points.every((p) => p.y > 0);
  const useLog = log && canLog;
  const allStats = useMemo(() => describe(rows.filter((r) => r.unit === unit), meta.groups), [rows, unit, meta.groups]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Filtros do gráfico">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Gene</span>
          <Select value={gene} onChange={(e) => setGene(e.target.value)} className="min-w-48">
            {meta.genes.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </label>
        {meta.units.length > 1 && (
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Unidade (não são misturadas)</span>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {meta.units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </Select>
          </label>
        )}
        {info.axis === "linear-log-opcional" && (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={useLog} disabled={!canLog} onChange={(e) => setLog(e.target.checked)} />
            Eixo em escala logarítmica{!canLog && " (indisponível: há valores ≤ 0)"}
          </label>
        )}
      </div>

      <ChartFrame
        id="expr"
        title={`${gene} — valores individuais por grupo (${unit})`}
        kind="dados"
        description={
          <>
            Cada ponto é um valor do arquivo (réplicas preservadas); o traço horizontal é a média descritiva. Tipo de valor: {info.label}.
            {info.relative && " Valores relativos a uma referência — não representam abundância."}
          </>
        }
        notes="Nenhum teste estatístico foi realizado. Diferenças visuais não indicam significância nem relação causal."
      >
        {points.length === 0 ? (
          <Alert tone="warn" title="Sem valores válidos para este gene e unidade." />
        ) : (
          <div className="h-[340px] w-full" role="img" aria-label={`Gráfico de pontos de ${gene}: ${stats.map((s) => `${s.group}, n=${s.n}, média ${formatNumber(s.mean)}`).join("; ")}. Tabela equivalente abaixo.`}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 8 }}>
                <CartesianGrid stroke={VIZ.grid} vertical={false} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[-0.6, groups.length - 0.4]}
                  ticks={groups.map((_, i) => i)}
                  tickFormatter={(i: number) => groups[i] ?? ""}
                  interval={0}
                  tick={{ fill: VIZ.axis, fontSize: 12 }}
                  axisLine={{ stroke: VIZ.grid }}
                  tickLine={false}
                  label={{ value: "Grupo", position: "insideBottom", offset: -16, fill: VIZ.muted, fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  scale={useLog ? "log" : "linear"}
                  domain={useLog ? ["auto", "auto"] : info.allowNegative ? ["auto", "auto"] : [0, "auto"]}
                  allowDataOverflow={false}
                  tick={{ fill: VIZ.axis, fontSize: 12 }}
                  tickFormatter={(v: number) => formatNumber(v)}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  label={{ value: unit, angle: -90, position: "insideLeft", fill: VIZ.muted, fontSize: 12 }}
                />
                <Tooltip content={<TooltipBox unit={unit} />} cursor={false} />
                {stats.map((s) => {
                  const gi = groups.indexOf(s.group);
                  if (s.mean === null || gi < 0) return null;
                  return (
                    <ReferenceLine
                      key={s.group}
                      segment={[
                        { x: gi - 0.25, y: s.mean },
                        { x: gi + 0.25, y: s.mean },
                      ]}
                      stroke={VIZ.ink}
                      strokeWidth={2}
                    />
                  );
                })}
                <Scatter data={points} shape={<Ring />} isAnimationActive={false} name="Valores individuais" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted" aria-label="Legenda">
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill={VIZ.series1} />
            </svg>
            Valor individual (réplica)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="16" height="12" aria-hidden="true">
              <line x1="1" x2="15" y1="6" y2="6" stroke={VIZ.ink} strokeWidth="2" />
            </svg>
            Média descritiva
          </span>
        </div>
        {notPlotted.length > 0 && (
          <p className="mt-2 text-xs text-warn">
            Fora do gráfico: {notPlotted.map((r) => `${r.sample} (${r.status === "ausente" ? "ausente" : "inválido"}, linha ${r.sourceRow})`).join("; ")}.
          </p>
        )}
      </ChartFrame>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="mb-1 text-left text-xs font-semibold text-muted">Estatística descritiva — {gene} ({unit})</caption>
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th scope="col" className="py-1.5 pr-3">Grupo</th>
              <th scope="col" className="py-1.5 pr-3">n válidos</th>
              <th scope="col" className="py-1.5 pr-3">Ausentes/inválidos</th>
              <th scope="col" className="py-1.5 pr-3">Média</th>
              <th scope="col" className="py-1.5 pr-3">DP (n−1)</th>
              <th scope="col" className="py-1.5 pr-3">Mediana</th>
              <th scope="col" className="py-1.5 pr-3">Mín.</th>
              <th scope="col" className="py-1.5">Máx.</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {stats.map((s) => (
              <tr key={s.group} className="border-b border-line/70">
                <th scope="row" className="py-1.5 pr-3 font-medium">{s.group}</th>
                <td className="py-1.5 pr-3">{s.n}</td>
                <td className="py-1.5 pr-3">{s.missing}</td>
                <td className="py-1.5 pr-3">{formatNumber(s.mean)}</td>
                <td className="py-1.5 pr-3">{s.sd === null ? "— (n < 2)" : formatNumber(s.sd)}</td>
                <td className="py-1.5 pr-3">{formatNumber(s.median)}</td>
                <td className="py-1.5 pr-3">{formatNumber(s.min)}</td>
                <td className="py-1.5">{formatNumber(s.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-medium">Visão geral: média por gene e grupo ({unit})</summary>
        <div className="mt-2 max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Média descritiva e n por gene e grupo</caption>
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-1 pr-3">Gene</th>
                {meta.groups.map((g) => (
                  <th scope="col" key={g} className="py-1 pr-3">
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {meta.genes.map((g) => (
                <tr key={g} className="border-t border-line">
                  <th scope="row" className="py-1 pr-3 font-medium">
                    <button type="button" className="underline" onClick={() => setGene(g)}>
                      {g}
                    </button>
                  </th>
                  {meta.groups.map((grp) => {
                    const s = allStats.find((x) => x.gene === g && x.group === grp);
                    return (
                      <td key={grp} className="py-1 pr-3">
                        {s ? `${formatNumber(s.mean)} (n=${s.n})` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
