"use client";
import { useIdeia } from "@/store/ideia";
import { ausentes, perguntasPendentes } from "@/lib/ideia/avaliar";
import { montarProcedimento } from "@/lib/ideia/procedimento";
import { TECNICA_NOME } from "@/lib/ideia/parse";
import { formatarValor } from "@/lib/ideia/comparar";
import { CAMPO_INFO, getCampo, type Campo } from "@/lib/ideia/schema";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SourceList } from "@/components/sources/SourceList";
import { CampoInput, GRUPOS } from "./campos";
import { Secao } from "./parts";

const EQUIPAMENTOS = ["Micropipetas e ponteiras", "Balde de gelo", "Tubos de PCR de 0,2 mL e estante", "Microcentrífuga", "Termociclador", "Cuba e fonte de eletroforese", "Computador de análise"];

/** Referências do catálogo relacionadas a técnicas sem módulo (apenas para orientação). */
const REFS_TECNICA: Partial<Record<string, { id: string; locator?: string }[]>> = {
  qpcr: [{ id: "bustin2009", locator: "Resumo" }, { id: "livak2001", locator: "Resumo" }],
};

export function Plano() {
  const s = useIdeia();
  const c = s.rascunho;
  const interp = s.interpretacao;
  if (!c || !interp) return null;
  const etapas = montarProcedimento(c);
  const faltam = ausentes(c);
  const perguntas = perguntasPendentes(c);
  const extraiu = new Map(interp.extracoes.filter((x) => x.valor !== null).map((x) => [x.campo, x]));
  const pcr = c.tecnica === "pcr";

  return (
    <div className="grid gap-4">
      <Alert tone="info" title="Confira o plano antes de visualizar.">
        Cada valor mostra como foi escrito e de qual trecho veio. Corrija o que estiver errado; nada que falte é completado por suposição.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-4">
          <Secao titulo="Objetivo e técnica" id="plano-obj">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1 sm:col-span-2">
                <label htmlFor="plano-objetivo" className="text-xs font-semibold">
                  Objetivo
                </label>
                <CampoInput id="plano-objetivo" campo="objetivo" valor={c.objetivo} onChange={(v) => s.editarRascunho("objetivo", v)} />
              </div>
              <div className="grid gap-1">
                <label htmlFor="plano-tecnica" className="text-xs font-semibold">
                  Técnica
                </label>
                <CampoInput id="plano-tecnica" campo="tecnica" valor={c.tecnica} onChange={(v) => s.editarRascunho("tecnica", v)} />
              </div>
              <div className="grid gap-1">
                <label htmlFor="plano-esperado" className="text-xs font-semibold">
                  Resultado que você espera observar
                </label>
                <CampoInput id="plano-esperado" campo="esperado" valor={c.esperado} onChange={(v) => s.editarRascunho("esperado", v)} />
              </div>
            </div>
          </Secao>

          {!pcr ? (
            <Secao titulo={`Roteiro: ${TECNICA_NOME[c.tecnica]}`} id="plano-roteiro">
              <Alert tone="warn" title="Animação específica e simulação ainda não disponíveis para esta técnica.">
                O procedimento será organizado como roteiro visual, com as etapas que você descreveu. O laboratório de PCR não é apresentado como equivalente.
              </Alert>
              <ol className="mt-3 grid list-decimal gap-1.5 pl-5 text-sm">
                {c.roteiro.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
              {REFS_TECNICA[c.tecnica] && (
                <div className="mt-3">
                  <p className="text-xs font-semibold">Referências do catálogo relacionadas (somente o resumo foi lido):</p>
                  <SourceList refs={REFS_TECNICA[c.tecnica]!} compact />
                </div>
              )}
            </Secao>
          ) : (
            <>
              <Secao titulo="Parâmetros informados" id="plano-param">
                <div className="grid gap-5">
                  {GRUPOS.map((g) => (
                    <fieldset key={g.titulo}>
                      <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{g.titulo}</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {g.campos.map((campo) => parametroLinha(campo))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </Secao>

              <Secao titulo="Etapas e ordem" id="plano-etapas">
                <ol className="grid list-decimal gap-1 pl-5 text-sm">
                  {etapas.map((e) => (
                    <li key={e.id}>
                      <span className="font-semibold">{e.titulo}</span> <span className="text-muted">— {e.resumo}</span>
                    </li>
                  ))}
                </ol>
              </Secao>

              <Secao titulo="Materiais e equipamentos" id="plano-materiais">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted">Reagentes</p>
                    <ul className="grid gap-0.5">
                      <li>Água livre de nuclease e tampão de reação</li>
                      <li>dNTPs — {formatarValor("reacao.dntpsUM", c.reacao.dntpsUM)}</li>
                      <li>MgCl₂ — {formatarValor("reacao.mgcl2mM", c.reacao.mgcl2mM)}</li>
                      <li>Primers F e R — {formatarValor("reacao.primerUM", c.reacao.primerUM)}</li>
                      <li>DNA molde — {formatarValor("reacao.moldeNg", c.reacao.moldeNg)}</li>
                      <li>
                        Polimerase ({formatarValor("polimerase", c.polimerase)}) — {formatarValor("reacao.polimeraseU", c.reacao.polimeraseU)}
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted">Equipamentos (laboratório virtual)</p>
                    <ul className="grid gap-0.5">
                      {EQUIPAMENTOS.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Secao>
            </>
          )}
        </div>

        <aside className="grid content-start gap-4">
          {interp.sugestoes.length > 0 && (
            <Secao titulo="Unidades e valores a conferir" id="plano-sug">
              <ul className="grid gap-2">
                {interp.sugestoes.map((sg, i) => {
                  const atualV = getCampo(c, sg.campo);
                  const aplicada = atualV === sg.sugerido;
                  return (
                    <li key={i} className="rounded-lg border border-warn/40 bg-warn-soft p-2.5 text-xs" data-sugestao={sg.campo}>
                      <p className="font-semibold">{CAMPO_INFO[sg.campo].rotulo}</p>
                      <p className="mt-0.5">{sg.motivo}</p>
                      <p className="mt-0.5 text-muted">Trecho: “{sg.trecho}”</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {aplicada ? (
                          <span className="font-semibold text-ok">✓ Correção aplicada: {formatarValor(sg.campo, sg.sugerido)}</span>
                        ) : (
                          <>
                            <button type="button" className="ge-press rounded-full bg-ink px-2.5 py-1 font-semibold text-white" onClick={() => s.editarRascunho(sg.campo, sg.sugerido)}>
                              Usar {formatarValor(sg.campo, sg.sugerido)}
                            </button>
                            <span className="self-center text-muted">ou mantenha {formatarValor(sg.campo, atualV)}</span>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Secao>
          )}

          {pcr && perguntas.length > 0 && (
            <Secao titulo="Perguntas rápidas" id="plano-perg">
              <p className="mb-2 text-xs text-muted">Só o que muda a representação ou a avaliação. Pode deixar em branco.</p>
              <ul className="grid gap-3">
                {perguntas.map((p) => (
                  <li key={p.campo} className="grid gap-1" data-pergunta={p.campo}>
                    <label htmlFor={`perg-${p.campo}`} className="text-sm font-semibold">
                      {p.texto}
                    </label>
                    <CampoInput id={`perg-${p.campo}`} campo={p.campo} valor={getCampo(c, p.campo)} onChange={(v) => s.editarRascunho(p.campo, v)} />
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {pcr && (
            <Secao titulo="Informações ausentes" id="plano-aus">
              {faltam.length ? (
                <ul className="grid gap-1 text-sm" data-testid="ausentes">
                  {faltam.map((f) => (
                    <li key={f.campo} className="flex items-center justify-between gap-2">
                      <span>{f.rotulo}</span>
                      {f.critico && <span className="rounded-full border border-warn/40 bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn">afeta a avaliação</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nenhum campo do plano ficou vazio.</p>
              )}
            </Secao>
          )}

          {interp.avisos.length > 0 && (
            <Secao titulo="Avisos da interpretação" id="plano-avisos">
              <ul className="grid list-disc gap-1 pl-4 text-xs">
                {interp.avisos.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </Secao>
          )}

          <div className="ge-card grid gap-2 p-4">
            <Button onClick={() => s.confirmar()}>Confirmar plano e visualizar</Button>
            <button type="button" className="text-xs font-semibold underline" onClick={() => s.setPasso("descrever")}>
              Voltar e editar a descrição
            </button>
          </div>
        </aside>
      </div>
    </div>
  );

  /** Função (não componente) para não remontar os campos a cada digitação. */
  function parametroLinha(campo: Campo) {
    const ex = extraiu.get(campo);
    const id = `plano-${campo.replace(/\./g, "-")}`;
    const valor = getCampo(c!, campo);
    return (
      <div key={campo} className={`grid gap-1 rounded-lg border p-2 ${ex ? (ex.confianca === "conferir" ? "border-warn/50 bg-warn-soft/50" : "border-line bg-white") : valor === null ? "border-dashed border-line" : "border-line bg-white"}`} data-campo={campo}>
        <label htmlFor={id} className="flex flex-wrap items-center justify-between gap-1 text-xs font-semibold">
          {CAMPO_INFO[campo].rotulo}
          {ex?.confianca === "conferir" && <span className="text-[10px] font-semibold uppercase text-warn">conferir</span>}
        </label>
        <CampoInput id={id} campo={campo} valor={valor} onChange={(v) => s.editarRascunho(campo, v)} />
        {ex ? (
          <details className="text-[11px] text-muted">
            <summary className="cursor-pointer">
              escrito: <span className="font-mono">{ex.original}</span>
              {ex.nota ? ` · ${ex.nota}` : ""}
            </summary>
            <p className="mt-0.5">Trecho: “{ex.trecho}”</p>
          </details>
        ) : (
          <p className="text-[11px] text-muted">{valor === null ? "não informado" : "informado na conferência"}</p>
        )}
      </div>
    );
  }
}
