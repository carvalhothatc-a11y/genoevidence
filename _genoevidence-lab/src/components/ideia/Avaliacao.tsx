"use client";
import { useEffect, useMemo, useState } from "react";
import { atual, useIdeia } from "@/store/ideia";
import { avaliarCenario, ESTADO_INFO, type Estado, type EtapaId } from "@/lib/ideia/avaliar";
import { montarProcedimento } from "@/lib/ideia/procedimento";
import {
  clopperPearson,
  compatibilidade,
  FREQUENCIAS_CATALOGO,
  pct,
  preverResultado,
  qualidadeEvidencia,
  RESULTADOS,
  trechoSustentaNumeros,
  type FrequenciaPublicada,
} from "@/lib/ideia/evidencia";
import type { Cenario } from "@/lib/ideia/schema";
import type { Reference } from "@/lib/domain/schemas";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EstadoChip, ItemAvaliacaoCard, NivelBadge, Secao } from "./parts";

const ORDEM: Estado[] = ["possivel_problema", "insuficiente", "compativel", "fora_do_alcance"];

export function Avaliacao({ podeEditar }: { podeEditar: boolean }) {
  const s = useIdeia();
  const cv = s.cenarios.find((c) => c.id === s.ativo) ?? s.cenarios[0];
  const cen = cv ? atual(cv) : null;
  const av = useMemo(() => (cen ? avaliarCenario(cen) : null), [cen]);
  if (!cen || !av) return null;
  const etapas = montarProcedimento(cen);
  const titulo = (e: EtapaId) => (e === "planejamento" ? "Planejamento" : etapas.find((x) => x.id === e)?.titulo ?? e);
  const grupos = [...new Set(av.itens.map((i) => i.etapa))];

  return (
    <div className="grid gap-4">
      <Secao titulo={`Avaliação do conjunto — ${cen.nome}${cv!.versoes.length > 1 ? ` (versão ${cen.versao})` : ""}`} id="av-conjunto" acao={<NivelBadge nivel="avaliacao" />}>
        <ul className="flex flex-wrap gap-2" aria-label="Resumo por estado">
          {ORDEM.map((e) => (
            <li key={e} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm" data-contagem={e}>
              <EstadoChip estado={e} curto />
              <span className="font-bold">{av.conjunto.contagem[e]}</span>
            </li>
          ))}
        </ul>
        <Alert tone="warn" className="mt-3" title={av.conjunto.aviso} />
        {av.conjunto.foraDoAlcance.length > 0 && (
          <div className="mt-3 text-sm">
            <p className="font-semibold">{ESTADO_INFO.fora_do_alcance.rotulo} (vale para qualquer cenário):</p>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {av.conjunto.foraDoAlcance.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </Secao>

      {grupos.map((g) => (
        <Secao key={g} titulo={`Etapa: ${titulo(g)}`} id={`av-${g}`}>
          <div className="grid gap-2">
            {av.itens
              .filter((i) => i.etapa === g)
              .sort((a, b) => ORDEM.indexOf(a.estado) - ORDEM.indexOf(b.estado))
              .map((i) => (
                <ItemAvaliacaoCard key={i.id} item={i} />
              ))}
          </div>
        </Secao>
      ))}

      {cen.tecnica === "pcr" && <PrevisoesQuantitativas cenario={cen} projetoId={s.projetoId} podeEditar={podeEditar} />}
    </div>
  );
}

function PrevisoesQuantitativas({ cenario, projetoId, podeEditar }: { cenario: Cenario; projetoId: string | null; podeEditar: boolean }) {
  const resultado = RESULTADOS[0];
  const [doProjeto, setDoProjeto] = useState<FrequenciaPublicada[]>([]);
  const [refs, setRefs] = useState<Reference[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const carregar = () => {
    if (!projetoId) return;
    fetch(`/api/projects/${projetoId}/evidencias`)
      .then((r) => (r.ok ? r.json() : { itens: [] }))
      .then((d: { itens: FrequenciaPublicada[] }) => setDoProjeto(d.itens))
      .catch(() => undefined);
    fetch(`/api/projects/${projetoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { project?: { references: Reference[] } } | null) => setRefs(d?.project?.references ?? []))
      .catch(() => undefined);
  };
  useEffect(carregar, [projetoId]); // eslint-disable-line react-hooks/exhaustive-deps
  const todas = [...FREQUENCIAS_CATALOGO, ...doProjeto].filter((f) => f.resultadoId === resultado.id);
  const previsao = preverResultado(resultado.id, cenario);

  return (
    <section className="ge-card p-4 sm:p-6" aria-labelledby="prev-titulo" data-testid="previsoes">
      <h3 id="prev-titulo" className="text-lg font-bold">
        Previsões quantitativas
      </h3>
      <p className="mt-1 text-sm text-muted">Probabilidades só aparecem quando há dados e um modelo validado. Nenhum número é gerado por julgamento livre de IA.</p>

      <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3 text-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Resultado definido antes de qualquer cálculo</p>
        <dl className="mt-1 grid gap-1">
          <div>
            <dt className="inline font-semibold">Resultado: </dt>
            <dd className="inline">{resultado.resultado}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Critério de sucesso: </dt>
            <dd className="inline">{resultado.criterioSucesso}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Condições: </dt>
            <dd className="inline">{resultado.condicoes}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Contexto: </dt>
            <dd className="inline">{resultado.contexto}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* 1. Frequência observada */}
        <div className="grid content-start gap-2 rounded-xl border border-line p-3" data-bloco="frequencia">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">1 · Frequência observada</p>
          {todas.length === 0 ? (
            <p className="text-sm">
              Nenhuma frequência publicada registrada para este resultado. Nas seções lidas das fontes do módulo (Lorenz 2012; Lee et al. 2012) não foram extraídas contagens com denominador. {projetoId ? "Você pode registrar uma a partir das referências do projeto." : "Associe um projeto para registrar frequências das suas referências."}
            </p>
          ) : (
            todas.map((f) => {
              const [lo, hi] = clopperPearson(f.sucessos, f.total);
              return (
                <article key={f.id} className="rounded-lg border border-line bg-white p-2.5 text-sm" data-frequencia={f.id}>
                  <p className="font-semibold">
                    {f.sucessos} de {f.total} {f.unidadeContagem} ({pct(f.sucessos / f.total)})
                  </p>
                  <p className="text-xs text-muted">
                    Intervalo de confiança de 95% (exato de Clopper–Pearson) para a proporção NO ESTUDO: {pct(lo)} a {pct(hi)}.
                  </p>
                  <p className="mt-1 text-xs">{f.contexto}</p>
                  <blockquote className="mt-1 border-l-2 border-line pl-2 text-xs italic">“{f.fonte.trecho}”</blockquote>
                  <p className="text-[11px] text-muted">
                    {f.fonte.citacao} — {f.fonte.localizador}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">É a frequência relatada na fonte, não uma previsão para o seu cenário.</p>
                </article>
              );
            })
          )}
        </div>

        {/* 2. Probabilidade estimada */}
        <div className="grid content-start gap-2 rounded-xl border border-line p-3" data-bloco="probabilidade">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">2 · Probabilidade estimada</p>
          {previsao.status === "suspensa" ? (
            <>
              <p className="text-sm font-semibold" data-previsao="suspensa">
                Previsão suspensa
              </p>
              <p className="text-sm">{previsao.motivo}</p>
              <p className="text-xs text-muted">Alterar parâmetros não gera nova estimativa: não há modelo que contemple essas alterações.</p>
            </>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-semibold">{pct(previsao.p)}</span> (intervalo {pct(previsao.intervalo[0])}–{pct(previsao.intervalo[1])})
              </p>
              <p className="text-xs">
                Modelo {previsao.modelo.id} v{previsao.modelo.versao} · {previsao.modelo.metodo}
              </p>
              <p className="text-xs text-muted">Validação: {previsao.modelo.validacao.estrategia}; calibração: {previsao.modelo.validacao.calibracao}.</p>
            </>
          )}
        </div>

        {/* 3. Qualidade da evidência */}
        <div className="grid content-start gap-2 rounded-xl border border-line p-3" data-bloco="qualidade">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">3 · Qualidade da evidência</p>
          {todas.length === 0 ? (
            <p className="text-sm">Sem evidência quantitativa para avaliar.</p>
          ) : (
            todas.map((f) => {
              const q = qualidadeEvidencia(f, cenario, todas);
              return (
                <div key={f.id} className="rounded-lg border border-line bg-white p-2.5 text-xs">
                  <p className="font-semibold">
                    {f.sucessos}/{f.total} · {f.fonte.localizador}
                  </p>
                  <ul className="mt-1 grid gap-0.5">
                    <li>Amostra: {q.tamanhoAmostra}</li>
                    <li>Rastreabilidade: {q.rastreabilidade}</li>
                    <li>Compatibilidade: {q.compatibilidade}</li>
                  </ul>
                  <table className="mt-1.5 w-full text-left">
                    <thead>
                      <tr className="text-muted">
                        <th className="font-semibold">Condição</th>
                        <th className="font-semibold">Cenário</th>
                        <th className="font-semibold">Fonte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compatibilidade(f, cenario).map((x) => (
                        <tr key={x.condicao}>
                          <td>{x.condicao}</td>
                          <td>{x.cenario}</td>
                          <td className={x.estado === "diferente" ? "font-semibold text-danger" : x.estado === "nao_comparavel" ? "text-muted" : ""}>
                            {x.fonte} {x.estado === "diferente" ? "(≠)" : x.estado === "compativel" ? "(=)" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {q.alertas.map((a) => (
                    <p key={a} className="mt-1 text-warn">
                      ! {a}
                    </p>
                  ))}
                  <p className="mt-1 text-[11px] text-muted">Avaliação qualitativa; não é probabilidade de sucesso.</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {projetoId && podeEditar && (
        <div className="mt-4">
          {formAberto ? (
            <NovaFrequencia
              projetoId={projetoId}
              refs={refs}
              onFechar={() => setFormAberto(false)}
              onSalvo={() => {
                setFormAberto(false);
                carregar();
              }}
            />
          ) : (
            <Button variant="secondary" onClick={() => setFormAberto(true)}>
              Registrar frequência publicada
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function NovaFrequencia({ projetoId, refs, onFechar, onSalvo }: { projetoId: string; refs: Reference[]; onFechar: () => void; onSalvo: () => void }) {
  const [f, setF] = useState({
    sucessos: "",
    total: "",
    unidadeContagem: "reações",
    contexto: "",
    polimerase: "nao_informado",
    ampMin: "",
    ampMax: "",
    cicMin: "",
    cicMax: "",
    referenciaId: "",
    citacao: "",
    localizador: "",
    trecho: "",
    grupo: "",
    conferi: false,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const n = (x: string) => (x.trim() ? Number(x) : null);
  const suc = Number(f.sucessos);
  const tot = Number(f.total);
  const numerosOk = Number.isInteger(suc) && Number.isInteger(tot) && tot >= 1 && suc >= 0 && suc <= tot;
  const trechoOk = numerosOk && f.trecho.length >= 10 && trechoSustentaNumeros({ sucessos: suc, total: tot, fonte: { referenciaId: null, citacao: "", localizador: "", trecho: f.trecho } });
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const cls = "w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm";

  const enviar = async () => {
    setErro(null);
    setEnviando(true);
    const ref = refs.find((r) => r.id === f.referenciaId);
    const body = {
      resultadoId: "banda_unica_tamanho_esperado",
      sucessos: suc,
      total: tot,
      unidadeContagem: f.unidadeContagem,
      contexto: f.contexto,
      condicoes: { polimerase: f.polimerase, ampliconMinPb: n(f.ampMin), ampliconMaxPb: n(f.ampMax), ciclosMin: n(f.cicMin), ciclosMax: n(f.cicMax), tipoMolde: null },
      fonte: { referenciaId: ref?.id ?? null, citacao: ref ? `${ref.title}${ref.year ? ` (${ref.year})` : ""}` : f.citacao, localizador: f.localizador, trecho: f.trecho },
      grupoAmostral: f.grupo.trim() || null,
      conferi: f.conferi,
    };
    const r = await fetch(`/api/projects/${projetoId}/evidencias`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setEnviando(false);
    if (r.ok) return onSalvo();
    const d = (await r.json().catch(() => ({}))) as { error?: string; details?: { campo: string; mensagem: string }[] };
    setErro(d.details?.length ? d.details.map((x) => `${x.campo}: ${x.mensagem}`).join(" · ") : (d.error ?? "Não foi possível registrar."));
  };

  return (
    <form
      className="grid gap-3 rounded-xl border border-line bg-surface-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
      aria-labelledby="nova-freq"
    >
      <h4 id="nova-freq" className="text-sm font-bold">
        Registrar frequência publicada
      </h4>
      <p className="text-xs text-muted">Somente contagens relatadas na fonte, com o trecho correspondente. Conclusões qualitativas não devem ser convertidas em números.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold">
          Sucessos
          <input className={cls} inputMode="numeric" value={f.sucessos} onChange={(e) => set("sucessos", e.target.value)} required />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Total (denominador)
          <input className={cls} inputMode="numeric" value={f.total} onChange={(e) => set("total", e.target.value)} required />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          O que foi contado
          <input className={cls} value={f.unidadeContagem} onChange={(e) => set("unidadeContagem", e.target.value)} required />
        </label>
      </div>
      <label className="grid gap-1 text-xs font-semibold">
        Contexto e condições do estudo
        <textarea className={cls} rows={2} value={f.contexto} onChange={(e) => set("contexto", e.target.value)} required />
      </label>
      <div className="grid gap-2 sm:grid-cols-5">
        <label className="grid gap-1 text-xs font-semibold">
          Polimerase
          <select className={cls} value={f.polimerase} onChange={(e) => set("polimerase", e.target.value)}>
            <option value="nao_informado">não informada</option>
            <option value="taq">Taq</option>
            <option value="pfu">Pfu</option>
            <option value="outra">outra</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Amplicon mín. (pb)
          <input className={cls} inputMode="numeric" value={f.ampMin} onChange={(e) => set("ampMin", e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Amplicon máx. (pb)
          <input className={cls} inputMode="numeric" value={f.ampMax} onChange={(e) => set("ampMax", e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Ciclos mín.
          <input className={cls} inputMode="numeric" value={f.cicMin} onChange={(e) => set("cicMin", e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Ciclos máx.
          <input className={cls} inputMode="numeric" value={f.cicMax} onChange={(e) => set("cicMax", e.target.value)} />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold">
          Referência do projeto
          <select className={cls} value={f.referenciaId} onChange={(e) => set("referenciaId", e.target.value)}>
            <option value="">outra (informar citação)</option>
            {refs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
        {!f.referenciaId && (
          <label className="grid gap-1 text-xs font-semibold">
            Citação
            <input className={cls} value={f.citacao} onChange={(e) => set("citacao", e.target.value)} required />
          </label>
        )}
        <label className="grid gap-1 text-xs font-semibold">
          Localizador (página, seção, tabela)
          <input className={cls} value={f.localizador} onChange={(e) => set("localizador", e.target.value)} required />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Grupo amostral (para evitar contagem duplicada)
          <input className={cls} value={f.grupo} onChange={(e) => set("grupo", e.target.value)} placeholder="ex.: coorte A do estudo X" />
        </label>
      </div>
      <label className="grid gap-1 text-xs font-semibold">
        Trecho da fonte que contém os números
        <textarea className={cls} rows={3} value={f.trecho} onChange={(e) => set("trecho", e.target.value)} required />
      </label>
      {f.trecho.length >= 10 && numerosOk && !trechoOk && <p className="text-xs text-warn">O trecho não contém {suc} e {tot}. Confira se a extração está correta.</p>}
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" checked={f.conferi} onChange={(e) => set("conferi", e.target.checked)} />
        Conferi que o trecho sustenta os números informados
      </label>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={!numerosOk || enviando}>
          {enviando ? "Registrando…" : "Registrar"}
        </Button>
        <Button variant="ghost" onClick={onFechar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
