"use client";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bandPosition, formatDuration, idealizedCopies, ILLUSTRATIVE_LADDER_BP, strandCounts, thermalProfile, type CyclingProgram } from "@/lib/models/pcr";
import { PCR_MODULE } from "@/lib/modules/pcr/content";
import type { ModelCard as ModelCardT } from "@/lib/modules/contract";
import { ChartFrame } from "@/components/viz/ChartFrame";
import { VIZ } from "@/components/viz/tokens";
import { Alert } from "@/components/ui/Alert";
import { SourceList } from "@/components/sources/SourceList";
import type { LaneContent } from "./store";

export function ModelCard({ id }: { id: string }) {
  const m = PCR_MODULE.models.find((x) => x.id === id) as ModelCardT;
  return (
    <details className="rounded-lg border border-[var(--kind-simulacao)]/30 bg-[var(--kind-simulacao-soft)]/40 p-3 text-sm">
      <summary className="cursor-pointer font-medium">Cartão do modelo: {m.name}</summary>
      <dl className="mt-2 grid gap-2">
        <div>
          <dt className="font-semibold">Equação</dt>
          <dd className="font-mono text-xs">{m.equation}</dd>
        </div>
        <div>
          <dt className="font-semibold">Parâmetros</dt>
          <dd>
            <ul className="list-disc pl-5">
              {m.parameters.map((p) => (
                <li key={p.id}>
                  {p.label} — {p.range} ({p.source === "usuario" ? "informado por você" : p.source === "fixo" ? "fixo no modelo" : "da referência"})
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Pressupostos</dt>
          <dd>
            <ul className="list-disc pl-5">
              {m.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Domínio de validade</dt>
          <dd>{m.validity}</dd>
        </div>
        <div>
          <dt className="font-semibold">Limitações</dt>
          <dd>
            <ul className="list-disc pl-5">
              {m.limitations.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Não prevê</dt>
          <dd>{m.doesNotPredict.join("; ")}</dd>
        </div>
        <div>
          <dt className="font-semibold">Implementação</dt>
          <dd className="font-mono text-xs">{m.implementation}</dd>
        </div>
      </dl>
    </details>
  );
}

// ---------------------------------------------------------------- perfil térmico

export function ThermalProfile({ program }: { program: CyclingProgram }) {
  const { data, total } = useMemo(() => {
    const prof = thermalProfile(program, 3);
    const first = prof.segments.filter((s) => s.cycle === undefined || s.cycle <= 3);
    const pts: { t: number; temp: number; label: string }[] = [];
    let t = 0;
    for (const s of first.slice(0, 1 + 9)) {
      pts.push({ t: +(t / 60).toFixed(2), temp: s.tempC, label: s.label + (s.cycle ? ` (ciclo ${s.cycle})` : "") });
      t += s.seconds;
      pts.push({ t: +(t / 60).toFixed(2), temp: s.tempC, label: s.label + (s.cycle ? ` (ciclo ${s.cycle})` : "") });
    }
    return { data: pts, total: prof.totalSeconds };
  }, [program]);

  return (
    <ChartFrame
      id="perfil"
      title="Perfil térmico programado — desnaturação inicial e 3 primeiros ciclos"
      kind="simulacao"
      description={`Aritmética do programa informado; os demais ${program.cycles - 3 > 0 ? program.cycles - 3 : 0} ciclos repetem o padrão. Tempo total estimado (sem rampas): ${formatDuration(total)}.`}
      notes="Transições entre temperaturas são desenhadas como instantâneas; as rampas reais do equipamento aumentam o tempo. Não é medição da temperatura da amostra."
    >
      <div className="h-56 w-full" role="img" aria-label={`Perfil térmico: ${data.filter((_, i) => i % 2 === 0).map((d) => `${d.label} ${d.temp} °C`).join("; ")}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 22, left: 0 }}>
            <CartesianGrid stroke={VIZ.grid} vertical={false} />
            <XAxis
              type="number"
              dataKey="t"
              domain={[0, "dataMax"]}
              tick={{ fill: VIZ.axis, fontSize: 12 }}
              tickFormatter={(v: number) => v.toLocaleString("pt-BR")}
              label={{ value: "tempo (min)", position: "insideBottom", offset: -12, fill: VIZ.muted, fontSize: 12 }}
            />
            <YAxis domain={[0, 100]} tick={{ fill: VIZ.axis, fontSize: 12 }} width={44} label={{ value: "°C", angle: -90, position: "insideLeft", fill: VIZ.muted, fontSize: 12 }} />
            <Tooltip
              formatter={(v) => [`${v} °C`, "Temperatura"]}
              labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string })?.label ?? ""}
            />
            <Line type="linear" dataKey="temp" stroke={VIZ.series1} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ModelCard id="perfil_termico" />
    </ChartFrame>
  );
}

// ---------------------------------------------------------------- modelo exponencial idealizado

export function IdealizedModel({ N0, E, cycles }: { N0: number; E: number; cycles: number }) {
  const data = useMemo(() => {
    try {
      return idealizedCopies(N0, E, Math.min(45, cycles));
    } catch {
      return [];
    }
  }, [N0, E, cycles]);
  const last = data[data.length - 1];
  return (
    <ChartFrame
      id="modelo"
      title="Cópias teóricas da região-alvo — modelo exponencial idealizado"
      kind="simulacao"
      description={
        <>
          N₀ = {N0.toLocaleString("pt-BR")} · E = {E.toLocaleString("pt-BR")} · {cycles} ciclos → {last ? last.copies.toExponential(2).replace(".", ",") : "—"} cópias no máximo teórico.
          <strong> Não é previsão de rendimento.</strong>
        </>
      }
      notes="Eixo vertical logarítmico. O modelo ignora esgotamento de reagentes e outros limites reais; vale apenas como cálculo sob os pressupostos do cartão do modelo."
    >
      {data.length === 0 ? (
        <Alert tone="warn" title="Parâmetros fora do domínio do modelo (N₀ ≥ 1; 0 ≤ E ≤ 1; até 45 ciclos)." />
      ) : (
        <div className="h-56 w-full" role="img" aria-label={`Modelo idealizado: de ${N0} cópias a ${last.copies.toExponential(2)} cópias após ${cycles} ciclos com eficiência ${E}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 22, left: 8 }}>
              <CartesianGrid stroke={VIZ.grid} vertical={false} />
              <XAxis dataKey="cycle" tick={{ fill: VIZ.axis, fontSize: 12 }} label={{ value: "ciclo", position: "insideBottom", offset: -12, fill: VIZ.muted, fontSize: 12 }} />
              <YAxis
                scale="log"
                domain={["auto", "auto"]}
                tick={{ fill: VIZ.axis, fontSize: 12 }}
                width={64}
                tickFormatter={(v: number) => v.toExponential(0).replace("e+", "e")}
              />
              <Tooltip formatter={(v) => [Number(v).toExponential(3).replace(".", ","), "cópias (teóricas)"]} labelFormatter={(c) => `Ciclo ${c}`} />
              <Line type="monotone" dataKey="copies" stroke={VIZ.series2} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <ModelCard id="exponencial_idealizado" />
    </ChartFrame>
  );
}

export function StrandTable() {
  const rows = useMemo(() => strandCounts(6), []);
  return (
    <ChartFrame
      id="fitas"
      title="Contagem idealizada de fitas por molécula-molde (eficiência 100%)"
      kind="simulacao"
      description="Mostra por que moléculas com exatamente o tamanho do alvo aparecem a partir do 3º ciclo e passam a predominar."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm tabular">
          <caption className="sr-only">Contagem de fitas por ciclo</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th scope="col" className="py-1 pr-3">Ciclo</th>
              <th scope="col" className="py-1 pr-3">Fitas originais</th>
              <th scope="col" className="py-1 pr-3">Fitas longas</th>
              <th scope="col" className="py-1 pr-3">Fitas de tamanho exato</th>
              <th scope="col" className="py-1 pr-3">Duplexes de tamanho exato</th>
              <th scope="col" className="py-1">Total de duplexes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cycle} className="border-t border-line">
                <td className="py-1 pr-3">{r.cycle}</td>
                <td className="py-1 pr-3">{r.original}</td>
                <td className="py-1 pr-3">{r.long}</td>
                <td className="py-1 pr-3">{r.short}</td>
                <td className="py-1 pr-3">{r.exactDuplexes}</td>
                <td className="py-1">{r.totalDuplexes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ModelCard id="contagem_fitas" />
    </ChartFrame>
  );
}

// ---------------------------------------------------------------- gel esperado (ilustração)

const LANE_LABEL: Record<LaneContent, string> = { vazio: "vazio", marcador: "M", amostra: "A", ntc: "NTC", positivo: "C+" };

export function ExpectedGel({ lanes, ampliconBp }: { lanes: LaneContent[]; ampliconBp: number | null }) {
  const W = 420;
  const H = 300;
  const top = 34;
  const gelH = H - top - 30;
  const laneW = (W - 60) / lanes.length;
  const pos = ampliconBp ? bandPosition(ampliconBp) : null;
  const y = (f: number) => top + f * gelH;
  const hasMarker = lanes.includes("marcador");
  return (
    <ChartFrame
      id="gel"
      title="Padrão esperado hipotético no gel (não é resultado)"
      kind="ilustracao"
      description={
        ampliconBp
          ? pos === null
            ? `O tamanho informado (${ampliconBp} pb) está fora da faixa do marcador ilustrativo (100–3000 pb); a posição não é desenhada.`
            : `Contorno tracejado: onde uma banda de ${ampliconBp} pb migraria SE o produto específico estivesse presente. Presença, intensidade e bandas extras não são previstas.`
          : "Informe o tamanho esperado do amplicon para desenhar a posição hipotética."
      }
      notes={
        <>
          Posição pela relação semi-logarítmica entre distância e tamanho, dentro da faixa do marcador. Marcador genérico ilustrativo (não é um produto
          comercial).
          <SourceList refs={[{ id: "lee2012", locator: "Resumo; Discussão" }]} compact />
        </>
      }
    >
      {!hasMarker && <Alert tone="warn" title="Nenhuma canaleta com marcador. A referência indica aplicar sempre um marcador de tamanho junto com as amostras." />}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg" role="img" aria-label={`Gel ilustrativo com ${lanes.length} canaletas: ${lanes.map((l, i) => `${i + 1}: ${l}`).join(", ")}.`}>
        <rect x={40} y={top - 6} width={W - 60} height={gelH + 12} rx={6} fill="#26333a" />
        <text x={W - 16} y={top + 4} fontSize="12" fill="#17201c" textAnchor="end">−</text>
        <text x={W - 16} y={top + gelH} fontSize="12" fill="#17201c" textAnchor="end">+</text>
        {lanes.map((l, i) => {
          const cx = 40 + laneW * (i + 0.5);
          return (
            <g key={i}>
              <rect x={cx - laneW * 0.32} y={top - 2} width={laneW * 0.64} height={5} fill="#0e171b" />
              <text x={cx} y={top - 12} fontSize="11" textAnchor="middle" fill="#17201c">
                {LANE_LABEL[l]}
              </text>
              {l === "marcador" &&
                ILLUSTRATIVE_LADDER_BP.map((bp) => {
                  const f = bandPosition(bp)!;
                  return <rect key={bp} x={cx - laneW * 0.3} y={y(f) - 1.5} width={laneW * 0.6} height={3} fill="#d9e6c8" opacity={0.85} />;
                })}
              {(l === "amostra" || l === "positivo") && pos !== null && (
                <rect x={cx - laneW * 0.3} y={y(pos) - 3} width={laneW * 0.6} height={6} fill="none" stroke="#f3d27a" strokeWidth={1.5} strokeDasharray="4 3" />
              )}
              {l === "ntc" && (
                <text x={cx} y={top + gelH / 2} fontSize="9" fill="#cfd8dc" textAnchor="middle" transform={`rotate(-90 ${cx} ${top + gelH / 2})`}>
                  esperado: sem banda
                </text>
              )}
            </g>
          );
        })}
        {hasMarker &&
          ILLUSTRATIVE_LADDER_BP.map((bp) => (
            <text key={bp} x={34} y={y(bandPosition(bp)!) + 3} fontSize="9" textAnchor="end" fill="#17201c">
              {bp}
            </text>
          ))}
        <text x={20} y={H - 6} fontSize="10" fill="#4a5650">pb</text>
      </svg>
    </ChartFrame>
  );
}

export function ProjectGelImages({ projectId, images }: { projectId: string; images: { id: string; name: string; role?: string }[] }) {
  if (!images.length)
    return (
      <Alert tone="info" title="Nenhum resultado experimental enviado.">
        Envie a imagem do seu gel na página do projeto (Arquivos originais). Ela aparecerá aqui como dado do pesquisador.
      </Alert>
    );
  return (
    <div className="grid gap-3">
      {images.map((im) => (
        <ChartFrame key={im.id} id={`img-${im.id}`} title={im.role ?? im.name} kind="dados" description={`Arquivo original: ${im.name}. Exibido sem alterações.`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/projects/${projectId}/files/${im.id}`} alt={`Imagem enviada pelo pesquisador: ${im.role ?? im.name}`} className="max-h-96 rounded-md border border-line" />
        </ChartFrame>
      ))}
    </div>
  );
}
