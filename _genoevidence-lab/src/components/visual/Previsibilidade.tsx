"use client";
import { useEffect, useState } from "react";
import { useRoteiro } from "@/store/roteiro";
import { ACAO_TITULO, ACOES_DISPONIVEIS, POSSIBILIDADES, TERMOS_PUBMED, type Acao, type PassoVisual } from "@/lib/visual/roteiro";
import { avaliarCenario, type Estado, type ItemAvaliacao } from "@/lib/ideia/avaliar";
import { clopperPearson, pct, preverResultado, type FrequenciaPublicada } from "@/lib/ideia/evidencia";
import type { Cenario } from "@/lib/ideia/schema";
import { SourceList } from "@/components/sources/SourceList";
import { EstadoChip } from "@/components/ideia/parts";

const PCR: Acao[] = ["pipetar", "misturar", "anelar", "desnaturar", "estender", "amplificar", "eletroforese"];
const ITENS_POR_ACAO: Partial<Record<Acao, string[]>> = {
  anelar: ["anelamento"],
  desnaturar: ["desnat", "desnat_inicial"],
  estender: ["extensao", "extensao_temp"],
  amplificar: ["mg", "ciclos", "anelamento", "extensao", "desnat", "desnat_inicial", "controle_negativo"],
  misturar: ["mg", "dntps", "primers_enzima"],
  pipetar: ["mg", "dntps", "primers_enzima"],
  eletroforese: ["agarose", "marcador", "campo_eletrico", "controle_negativo"],
};

type Prev = { pct: string | null; base: string; nivel: "frequencia" | "modelo" | "regras" | "sem_dados"; itens: ItemAvaliacao[] };

function previsibilidade(p: PassoVisual, cenario: Cenario | null, freq: FrequenciaPublicada[]): Prev {
  const pcr = PCR.includes(p.acao);
  const itens = pcr && cenario && cenario.tecnica === "pcr" ? avaliarCenario(cenario).itens.filter((i) => (ITENS_POR_ACAO[p.acao] ?? []).includes(i.id)) : [];
  if (pcr && (p.acao === "amplificar" || p.acao === "eletroforese")) {
    if (cenario) {
      const prev = preverResultado("banda_unica_tamanho_esperado", cenario);
      if (prev.status === "calculada") return { pct: `${pct(prev.p)} (${pct(prev.intervalo[0])}–${pct(prev.intervalo[1])})`, base: `Modelo ${prev.modelo.id} v${prev.modelo.versao}`, nivel: "modelo", itens };
    }
    const f = freq.find((x) => x.resultadoId === "banda_unica_tamanho_esperado");
    if (f) {
      const [lo, hi] = clopperPearson(f.sucessos, f.total);
      return { pct: `${pct(f.sucessos / f.total)} (${f.sucessos}/${f.total})`, base: `Frequência publicada no estudo (IC 95% ${pct(lo)}–${pct(hi)}), ${f.fonte.localizador}. Não é previsão para o seu cenário.`, nivel: "frequencia", itens };
    }
  }
  if (itens.length) return { pct: null, base: "Avaliação por regras das referências (sem porcentagem).", nivel: "regras", itens };
  if (pcr) return { pct: null, base: "Regras de PCR disponíveis: informe parâmetros (Tm, Mg²⁺, ciclos…) para avaliar.", nivel: "regras", itens };
  return { pct: null, base: "Sem dados publicados registrados para esta etapa; a plataforma não estima porcentagem.", nivel: "sem_dados", itens };
}

const contar = (itens: ItemAvaliacao[]) => {
  const c = new Map<Estado, number>();
  for (const i of itens) c.set(i.estado, (c.get(i.estado) ?? 0) + 1);
  return [...c.entries()];
};

/** Tabela de previsibilidade por etapa (ao lado da visualização). */
export function TabelaPrevisibilidade({ cenario, frequencias }: { cenario: Cenario | null; frequencias: FrequenciaPublicada[] }) {
  const { passos, idx, setIdx, setTocando } = useRoteiro();
  return (
    <div className="overflow-x-auto" data-testid="previsibilidade">
      <table className="w-full min-w-[460px] border-separate border-spacing-y-1 text-left text-[12px]">
        <caption className="sr-only">Previsibilidade por etapa</caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-[#7d8aa3]">
            <th className="px-2 py-1 font-semibold">Etapa</th>
            <th className="px-2 py-1 font-semibold">Previsibilidade</th>
            <th className="px-2 py-1 font-semibold">Pode acontecer</th>
            <th className="px-2 py-1 font-semibold">Dá para mudar</th>
          </tr>
        </thead>
        <tbody>
          {passos.map((p, i) => {
            const pv = previsibilidade(p, cenario, frequencias);
            const pos = POSSIBILIDADES[p.acao] ?? [];
            const atual = i === idx;
            return (
              <tr
                key={p.id}
                onClick={() => (setTocando(false), setIdx(i))}
                className={`cursor-pointer align-top ${atual ? "bg-[#7b4de0]/25" : "bg-white/[0.03] hover:bg-white/[0.06]"}`}
                aria-current={atual ? "step" : undefined}
                data-linha={p.acao}
              >
                <td className="rounded-l-lg px-2 py-2">
                  <span className="ge-mono text-[10px] text-[#e679b5]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="block font-semibold text-white">{p.titulo}</span>
                </td>
                <td className="px-2 py-2">
                  <span className={`block text-[15px] font-bold ${pv.pct ? "text-white" : "text-[#7d8aa3]"}`} title={pv.base} data-pct={pv.pct ?? "sem"}>
                    {pv.pct ?? "— %"}
                  </span>
                  <span className="block text-[10.5px] leading-snug text-[#a7b2c8]">{pv.pct ? pv.base : pv.nivel === "sem_dados" ? "sem dado publicado" : "por regras, sem %"}</span>
                  {pv.itens.length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {contar(pv.itens).map(([e, n]) => (
                        <span key={e} className="inline-flex items-center gap-1">
                          <EstadoChip estado={e} curto />
                          {n > 1 && <span className="text-[10px]">×{n}</span>}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-[#c9d2e3]">
                  {pos.length ? (
                    <ul className="grid gap-0.5">
                      {pos.slice(0, 3).map((x) => (
                        <li key={x.texto}>• {x.texto}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#7d8aa3]">não catalogado</span>
                  )}
                </td>
                <td className="rounded-r-lg px-2 py-2 text-[#c9d2e3]">
                  {p.variaveis.length ? (
                    <ul className="grid gap-0.5">
                      {p.variaveis.slice(0, 3).map((v) => (
                        <li key={v.nome}>• {v.nome}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#7d8aa3]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[10.5px] leading-snug text-[#7d8aa3]">
        Porcentagem só com frequência publicada registrada (com fonte e trecho) ou modelo validado; nunca por estimativa livre. Ausência de problema identificado não é garantia de sucesso.
      </p>
    </div>
  );
}

/** Detalhe da etapa atual: o que mostra, o que pode acontecer, o que mudar, pontos de atenção e referências. */
export function DetalheVisual({ refsProjeto }: { refsProjeto: { id: string; title: string }[] }) {
  const { passos, idx, corrigir } = useRoteiro();
  const p = passos[idx];
  const [busca, setBusca] = useState<{ estado: "idle" | "buscando" | "ok" | "erro"; itens: { pmid: string; title: string; journal: string; year: string; doi?: string }[]; termos?: string; erro?: string }>({ estado: "idle", itens: [] });
  useEffect(() => setBusca({ estado: "idle", itens: [] }), [p?.id]);
  if (!p) return null;
  const relacionadas = refsProjeto.filter((r) => {
    const t = r.title.toLowerCase();
    return TERMOS_PUBMED[p.acao]
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length > 4)
      .some((w) => t.includes(w));
  });
  const buscar = async () => {
    setBusca({ estado: "buscando", itens: [] });
    const q = new URLSearchParams({ acao: p.acao });
    if (p.rotulos.gene) q.set("gene", p.rotulos.gene);
    const r = await fetch(`/api/referencias/pubmed?${q.toString()}`);
    const d = (await r.json().catch(() => ({}))) as { itens?: typeof busca.itens; termos?: string; error?: string };
    setBusca(r.ok ? { estado: "ok", itens: d.itens ?? [], termos: d.termos } : { estado: "erro", itens: [], erro: d.error ?? "Falha na busca." });
  };

  return (
    <div className="grid gap-3 text-[13px]" data-testid="detalhe-visual">
      <label className="flex flex-wrap items-center gap-2 text-xs text-[#a7b2c8]">
        Interpretado como
        <select value={p.acao} onChange={(e) => corrigir(p.id, e.target.value as Acao)} className="rounded-lg border border-white/15 bg-transparent px-2 py-1 text-xs text-white">
          {ACOES_DISPONIVEIS.map((a) => (
            <option key={a} value={a}>
              {ACAO_TITULO[a]}
            </option>
          ))}
        </select>
        {p.confianca === "conferir" && <span className="text-[#ffb23f]">confira</span>}
      </label>

      {p.atencao.length > 0 && (
        <div className="grid gap-1.5">
          {p.atencao.map((a) => (
            <div key={a.texto} className="rounded-lg border border-[#ffb23f]/35 bg-[#ffb23f]/10 p-2 text-xs text-[#ffd99a]">
              ! {a.texto} {a.base === "geral" ? <span className="text-[#a7b2c8]">(orientação geral, sem fonte cadastrada)</span> : <SourceList refs={a.refs} compact />}
            </div>
          ))}
        </div>
      )}

      {(POSSIBILIDADES[p.acao] ?? []).length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#7d8aa3]">O que pode acontecer</p>
          <ul className="mt-1 grid gap-1">
            {(POSSIBILIDADES[p.acao] ?? []).map((x) => (
              <li key={x.texto} className="text-xs">
                • {x.texto} {x.base === "geral" ? <span className="text-[#7d8aa3]">(geral, sem fonte)</span> : <SourceList refs={x.refs} compact />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.variaveis.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#7d8aa3]">O que dá para mudar</p>
          <ul className="mt-1 grid gap-1.5">
            {p.variaveis.map((v) => (
              <li key={v.nome} className="text-xs">
                <span className="font-semibold text-white">{v.nome}:</span> {v.efeito} {v.base === "geral" ? <span className="text-[#7d8aa3]">(geral, sem fonte)</span> : <SourceList refs={v.refs} compact />}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#7d8aa3]">Referências</p>
        {p.refs.length ? <SourceList refs={p.refs} compact /> : <p className="text-xs text-[#a7b2c8]">Nenhuma referência verificada no catálogo do GenoLab para esta etapa.</p>}
        {relacionadas.length > 0 && (
          <p className="mt-1 text-xs text-[#c9d2e3]">
            Do seu projeto (pelo título; conteúdo não lido): {relacionadas.map((r) => r.title).join("; ")}
          </p>
        )}
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs">
          <button type="button" onClick={() => void buscar()} disabled={busca.estado === "buscando"} className="font-semibold text-[#9db4ff] underline disabled:opacity-50">
            {busca.estado === "buscando" ? "Buscando no PubMed…" : "Buscar referências no PubMed"}
          </button>
          <p className="mt-0.5 text-[10.5px] text-[#7d8aa3]">Envia ao NCBI apenas os termos “{TERMOS_PUBMED[p.acao]}{p.rotulos.gene ? ` ${p.rotulos.gene}` : ""}”, não o seu texto.</p>
          {busca.estado === "erro" && <p className="mt-1 text-[#ff5470]">{busca.erro}</p>}
          {busca.estado === "ok" && (
            <ul className="mt-1.5 grid gap-1">
              {busca.itens.length === 0 && <li className="text-[#a7b2c8]">Nada encontrado.</li>}
              {busca.itens.map((it) => (
                <li key={it.pmid}>
                  <a href={it.doi ? `https://doi.org/${it.doi}` : `https://pubmed.ncbi.nlm.nih.gov/${it.pmid}/`} target="_blank" rel="noopener noreferrer" className="text-[#c9d2e3] underline">
                    {it.title}
                  </a>{" "}
                  <span className="text-[#7d8aa3]">
                    {it.journal}, {it.year} · PMID {it.pmid}
                  </span>
                </li>
              ))}
              {busca.itens.length > 0 && <li className="text-[10.5px] text-[#ffb23f]">Encontradas por busca: conteúdo não lido nem verificado pela plataforma.</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
