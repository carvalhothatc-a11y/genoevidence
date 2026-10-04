"use client";
import { useMemo, useState } from "react";
import { interpretarDescricao } from "@/lib/ideia/parse";
import { programaCompleto } from "@/lib/ideia/procedimento";
import type { DadoObservado } from "@/lib/experimento/schema";
import { SOURCES } from "@/lib/sources/catalog";
import { useExperimento } from "@/store/experimento";
import { PerfilTermicoMini, GelIlustrativo } from "@/components/studio/Resultados";

/**
 * Resultados em quatro categorias sempre identificadas:
 *  ✎ processo ilustrado (didático) · ▦ observado (dado enviado) · ◇ esperado (qualitativo, com fonte)
 *  · ƒ previsto (só com modelo aplicável; senão suspenso).
 */
type Aba = "ilustrado" | "observado" | "esperado" | "previsto";
const ABAS: { id: Aba; rotulo: string; selo: string; cor: string }[] = [
  { id: "ilustrado", rotulo: "Processo ilustrado", selo: "✎", cor: "text-[#cdbcff]" },
  { id: "observado", rotulo: "Resultado observado", selo: "▦", cor: "text-[#9db4ff]" },
  { id: "esperado", rotulo: "Resultado esperado", selo: "◇", cor: "text-[#8de8bf]" },
  { id: "previsto", rotulo: "Resultado previsto", selo: "ƒ", cor: "text-[#ffd08a]" },
];

const fmt = (v: number) => (Math.abs(v) >= 1000 || Number.isInteger(v) ? v.toLocaleString("pt-BR") : v.toLocaleString("pt-BR", { maximumFractionDigits: 3 }));

/** Pontos por grupo (eixo categórico; nunca uma linha do tempo, que não foi medida). */
function PontosPorGrupo({ d }: { d: DadoObservado }) {
  const [tabela, setTabela] = useState(false);
  const [foco, setFoco] = useState<string | null>(null);
  const valores = d.grupos.flatMap((g) => g.valores.filter((v): v is number => v !== null));
  if (!valores.length) return <p className="text-[12px] text-[#a7b2c8]">Sem valores numéricos nesta coluna.</p>;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const pad = (max - min || Math.abs(max) || 1) * 0.12;
  const y0 = min - pad;
  const y1 = max + pad;
  const W = 520;
  const Hh = 220;
  const esq = 48;
  const base = Hh - 34;
  const topo = 14;
  const y = (v: number) => base - ((v - y0) / (y1 - y0)) * (base - topo);
  const grupos = d.grupos.slice(0, 24);
  const larg = (W - esq - 10) / grupos.length;
  const ticks = Array.from({ length: 4 }, (_, i) => y0 + ((y1 - y0) * (i + 0.5)) / 4);
  return (
    <figure className="grid gap-1.5" data-testid="dado-observado">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-white">
          {d.variavel}
          {d.unidade ? <span className="font-normal text-[#a7b2c8]"> ({d.unidade})</span> : null}
        </span>
        <button type="button" onClick={() => setTabela((v) => !v)} aria-pressed={tabela} className="text-[12px] text-[#9db4ff] underline">
          {tabela ? "Ver gráfico" : "Ver tabela"}
        </button>
      </figcaption>
      {tabela ? (
        <div className="max-h-56 overflow-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-[12px]">
            <caption className="sr-only">Valores enviados de {d.variavel}</caption>
            <thead className="bg-white/[0.04] text-[#a7b2c8]">
              <tr>
                <th scope="col" className="px-2 py-1">Grupo</th>
                <th scope="col" className="px-2 py-1">Réplica</th>
                <th scope="col" className="px-2 py-1 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {d.grupos.flatMap((g) =>
                g.valores.map((v, i) => (
                  <tr key={`${g.nome}-${i}`} className="border-t border-white/5">
                    <td className="px-2 py-1 text-white">{g.nome}</td>
                    <td className="px-2 py-1 text-[#a7b2c8]">{g.replicas?.[i] || "—"}</td>
                    <td className="ge-mono px-2 py-1 text-right text-white">{v === null ? <span className="text-[#7d8aa3]">ausente</span> : fmt(v)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full" role="img" aria-label={`${d.variavel} por grupo: ${grupos.map((g) => `${g.nome}, ${g.valores.filter((v) => v !== null).length} valor(es)`).join("; ")}. Veja a tabela para os valores.`}>
          {ticks.map((tv) => (
            <g key={tv}>
              <line x1={esq} x2={W - 6} y1={y(tv)} y2={y(tv)} stroke="rgba(167,178,200,0.12)" />
              <text x={esq - 6} y={y(tv) + 3} fontSize="10" fill="#7d8aa3" textAnchor="end">
                {fmt(Math.round(tv * 100) / 100)}
              </text>
            </g>
          ))}
          <line x1={esq} x2={W - 6} y1={base} y2={base} stroke="rgba(167,178,200,0.3)" />
          {grupos.map((g, gi) => {
            const cx = esq + larg * gi + larg / 2;
            const nums = g.valores.filter((v): v is number => v !== null);
            const media = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
            return (
              <g key={g.nome} onMouseEnter={() => setFoco(g.nome)} onMouseLeave={() => setFoco(null)}>
                <rect x={cx - larg / 2} y={topo} width={larg} height={base - topo} fill={foco === g.nome ? "rgba(255,255,255,0.04)" : "transparent"} />
                {media !== null && <line x1={cx - Math.min(18, larg * 0.35)} x2={cx + Math.min(18, larg * 0.35)} y1={y(media)} y2={y(media)} stroke="#EEF2F9" strokeWidth="2" strokeLinecap="round" />}
                {g.valores.map((v, i) =>
                  v === null ? null : (
                    <circle key={i} cx={cx + (((i * 37) % 11) - 5) * Math.min(2.4, larg / 40)} cy={y(v)} r={4.5} fill="#4D7CFF" stroke="#0B1221" strokeWidth="2">
                      <title>{`${g.nome}${g.replicas?.[i] ? ` · réplica ${g.replicas[i]}` : ""}: ${fmt(v)}${d.unidade ? ` ${d.unidade}` : ""}`}</title>
                    </circle>
                  ),
                )}
                <text x={cx} y={base + 14} fontSize="10.5" fill="#c9d2e3" textAnchor="middle">
                  {g.nome.length > 14 ? `${g.nome.slice(0, 13)}…` : g.nome}
                </text>
                <text x={cx} y={base + 26} fontSize="9" fill="#7d8aa3" textAnchor="middle">
                  n={nums.length}
                  {g.valores.length - nums.length ? ` · ${g.valores.length - nums.length} aus.` : ""}
                </text>
                {foco === g.nome && media !== null && (
                  <text x={cx} y={y(media) - 8} fontSize="10" fill="#EEF2F9" textAnchor="middle">
                    média {fmt(Math.round(media * 1000) / 1000)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <p className="text-[11px] text-[#7d8aa3]">
        Pontos: valores enviados (como estão na tabela) · traço: média do grupo · {d.ausentes ? `${d.ausentes} ausente(s) mantido(s) como ausentes · ` : ""}
        {d.temTempo ? "há coluna de tempo, mas a comparação aqui é por grupo." : "comparação entre grupos, não uma evolução no tempo."}
      </p>
    </figure>
  );
}

export function ResultadosExp({ onAvaliarPcr }: { onAvaliarPcr: (texto: string) => void }) {
  const s = useExperimento();
  const [aba, setAba] = useState<Aba>("ilustrado");
  const exp = s.versoes[s.atual];
  const etapa = s.cena?.etapas[s.idx];
  // texto de entrada para o módulo de PCR (descrição + relatórios extraídos)
  const textoPcr = useMemo(() => [s.texto, ...s.materiais.filter((m) => m.tipo === "relatorio" && m.estado === "extraido").map((m) => (m.tipo === "relatorio" ? m.texto.slice(0, 6000) : ""))].join("\n"), [s.texto, s.materiais]);
  const pcr = useMemo(() => {
    if (!exp?.acoes.some((a) => a.tipo === "amplificar" || a.tipo === "anelar" || a.tipo === "desnaturar" || a.tipo === "estender")) return null;
    const c = interpretarDescricao(textoPcr, { id: "previa", via: s.via }).cenario;
    return c.tecnica === "pcr" ? c : null;
  }, [exp, textoPcr, s.via]);
  if (!exp || !etapa) return null;

  return (
    <section aria-labelledby="titulo-resultados" className="ge-glass grid gap-3 p-4" data-testid="resultados">
      <h2 id="titulo-resultados" className="sr-only">
        Resultados
      </h2>
      <div role="tablist" aria-label="Tipos de resultado" className="flex flex-wrap gap-1">
        {ABAS.map((a) => (
          <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls={`painel-${a.id}`} onClick={() => setAba(a.id)} className={`ge-press rounded-full px-3 py-1.5 text-[12px] font-semibold ${aba === a.id ? "bg-white/10 text-white ring-1 ring-white/20" : "text-[#a7b2c8] hover:bg-white/5 hover:text-white"}`}>
            <span className={`mr-1 ${a.cor}`} aria-hidden="true">
              {a.selo}
            </span>
            {a.rotulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} className="grid gap-3 text-[13px] text-[#c9d2e3]">
        {aba === "ilustrado" && (
          <>
            <p className="text-white">{etapa.mostra}</p>
            <p className="text-[12px] text-[#a7b2c8]">Representação didática da ação descrita: formas, escalas, cores e quantidades não são reais e não indicam que algo foi observado ou calculado.</p>
            {etapa.passo.refs.length > 0 && (
              <p className="text-[12px] text-[#a7b2c8]">
                Explicação apoiada em:{" "}
                {etapa.passo.refs.map((r) => (
                  <span key={r.id + r.locator} className="mr-1">
                    {SOURCES[r.id]?.shortCitation ?? r.id} ({r.locator});
                  </span>
                ))}
              </p>
            )}
          </>
        )}

        {aba === "observado" &&
          (exp.dados.length ? (
            exp.dados.map((d) => <PontosPorGrupo key={d.id} d={d} />)
          ) : (
            <p className="text-[#a7b2c8]">Nenhum dado observado. Adicione uma tabela (CSV ou XLSX) e marque a coluna de valores; os valores serão mostrados exatamente como enviados.</p>
          ))}

        {aba === "esperado" &&
          (etapa.possibilidades.length ? (
            <>
              <p className="text-[12px] text-[#a7b2c8]">Desfechos qualitativos possíveis para “{etapa.titulo}”. Não são probabilidades nem previsões para o seu experimento.</p>
              <ul className="grid gap-1.5">
                {etapa.possibilidades.map((p) => (
                  <li key={p.texto} className="rounded-lg border border-white/10 bg-black/15 px-2.5 py-1.5">
                    <span className="text-white">{p.texto}</span>
                    <span className="block text-[11px] text-[#a7b2c8]">{p.base === "referencia" ? `Fonte: ${p.refs.map((r) => `${SOURCES[r.id]?.shortCitation ?? r.id} (${r.locator})`).join("; ")}` : "Orientação geral, sem fonte cadastrada."}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[#a7b2c8]">Sem desfechos cadastrados para esta ação.</p>
          ))}

        {aba === "previsto" && (
          <>
            <div className="rounded-lg border border-white/10 bg-black/15 p-3">
              <p className="font-semibold text-white">Probabilidade de sucesso: não estimada</p>
              <p className="mt-1 text-[12px] text-[#a7b2c8]">Não há modelo validado para este cenário. Concordância entre artigos não vira porcentagem, e nenhuma porcentagem é inventada para preencher a tela.</p>
            </div>
            {pcr && programaCompleto(pcr) ? (
              <>
                <PerfilTermicoMini cenario={pcr} />
                <GelIlustrativo ampliconPb={pcr.alvo.ampliconPb} />
              </>
            ) : pcr ? (
              <p className="text-[12px] text-[#a7b2c8]">Para calcular o perfil do programa da PCR (duração total), informe temperaturas, tempos e número de ciclos.</p>
            ) : null}
            {pcr && (
              <button type="button" onClick={() => onAvaliarPcr(textoPcr)} className="ge-press justify-self-start rounded-full bg-[#7b4de0] px-3 py-1.5 text-[12px] font-semibold text-white">
                Conferir parâmetros e avaliar a PCR (regras com fonte)
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
