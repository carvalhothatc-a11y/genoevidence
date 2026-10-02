"use client";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { atual, useIdeia } from "@/store/ideia";
import { compararCenarios } from "@/lib/ideia/comparar";
import { montarProcedimento } from "@/lib/ideia/procedimento";
import type { Cenario } from "@/lib/ideia/schema";
import { SourceList } from "@/components/sources/SourceList";
import { Button } from "@/components/ui/Button";
import { EditorCondicoes } from "./campos";
import { EstadoChip, Secao } from "./parts";

function useReduced() {
  const [r, setR] = useState(false);
  useEffect(() => setR(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return r;
}

export function Comparar() {
  const s = useIdeia();
  const [a, b] = s.cenarios;
  const [modo, setModo] = useState<"cenarios" | "versoes">(b ? "cenarios" : "versoes");
  const [editar, setEditar] = useState<string | null>(null);
  const alvoVersoes = s.cenarios.find((c) => c.id === s.ativo) ?? a;
  const [va, setVa] = useState(1);
  const [vb, setVb] = useState(alvoVersoes ? atual(alvoVersoes).versao : 1);
  useEffect(() => {
    if (alvoVersoes) {
      setVb(atual(alvoVersoes).versao);
      setVa(Math.max(1, atual(alvoVersoes).versao - 1));
    }
  }, [alvoVersoes]);

  if (!a) return null;

  let esquerda: Cenario | undefined;
  let direita: Cenario | undefined;
  if (modo === "cenarios" && b) {
    esquerda = atual(a);
    direita = atual(b);
  } else if (alvoVersoes) {
    esquerda = alvoVersoes.versoes.find((x) => x.versao === va);
    direita = alvoVersoes.versoes.find((x) => x.versao === vb);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="O que comparar" className="flex rounded-full bg-surface-2 p-1 text-sm">
          <button type="button" role="radio" aria-checked={modo === "cenarios"} disabled={!b} onClick={() => setModo("cenarios")} className={`rounded-full px-3 py-1 font-semibold disabled:opacity-50 ${modo === "cenarios" ? "bg-ink text-white" : "text-ink"}`}>
            Cenário A × B
          </button>
          <button type="button" role="radio" aria-checked={modo === "versoes"} onClick={() => setModo("versoes")} className={`rounded-full px-3 py-1 font-semibold ${modo === "versoes" ? "bg-ink text-white" : "text-ink"}`}>
            Versões de um cenário
          </button>
        </div>
        {!b && (
          <Button variant="secondary" onClick={() => (s.duplicar(), setModo("cenarios"), setEditar(useIdeia.getState().cenarios[1]?.id ?? null))}>
            Duplicar como Cenário B
          </Button>
        )}
      </div>

      {modo === "versoes" && alvoVersoes && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {s.cenarios.length > 1 && (
            <select className="rounded-lg border border-line bg-white px-2 py-1" value={alvoVersoes.id} onChange={(e) => s.setAtivo(e.target.value)} aria-label="Cenário">
              {s.cenarios.map((c) => (
                <option key={c.id} value={c.id}>
                  {atual(c).nome}
                </option>
              ))}
            </select>
          )}
          <label>
            Versão{" "}
            <select className="rounded-lg border border-line bg-white px-2 py-1" value={va} onChange={(e) => setVa(Number(e.target.value))}>
              {alvoVersoes.versoes.map((v) => (
                <option key={v.versao} value={v.versao}>
                  {v.versao}
                </option>
              ))}
            </select>
          </label>
          <span>×</span>
          <label>
            Versão{" "}
            <select className="rounded-lg border border-line bg-white px-2 py-1" value={vb} onChange={(e) => setVb(Number(e.target.value))}>
              {alvoVersoes.versoes.map((v) => (
                <option key={v.versao} value={v.versao}>
                  {v.versao}
                </option>
              ))}
            </select>
          </label>
          {alvoVersoes.versoes.length === 1 && <span className="text-xs text-muted">Só há uma versão. Edite uma condição (aqui ou em Visualizar) para criar outra.</span>}
        </div>
      )}

      {modo === "cenarios" && b && (
        <div className="grid gap-3 md:grid-cols-2">
          {[a, b].map((c) => (
            <div key={c.id} className="ge-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">
                  {atual(c).nome} <span className="text-xs font-normal text-muted">versão {atual(c).versao}</span>
                </p>
                <div className="flex gap-2">
                  <button type="button" className="text-xs font-semibold underline" onClick={() => setEditar(editar === c.id ? null : c.id)} aria-expanded={editar === c.id}>
                    {editar === c.id ? "Fechar edição" : "Editar condições"}
                  </button>
                  <button type="button" className="text-xs font-semibold text-accent-ink underline" onClick={() => (s.setAtivo(c.id), s.setPasso("visualizar"))}>
                    Visualizar
                  </button>
                </div>
              </div>
              {editar === c.id && (
                <div className="mt-3">
                  <EditorCondicoes cenario={atual(c)} prefixo={`cmp-${c.id}`} onAplicar={(m) => s.aplicar(c.id, m)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {esquerda && direita && <Resultado a={esquerda} b={direita} rotA={modo === "cenarios" ? "Cenário A" : `Versão ${va}`} rotB={modo === "cenarios" ? "Cenário B" : `Versão ${vb}`} />}
    </div>
  );
}

function Resultado({ a, b, rotA, rotB }: { a: Cenario; b: Cenario; rotA: string; rotB: string }) {
  const reduced = useReduced();
  const cmp = useMemo(() => compararCenarios(a, b), [a, b]);
  const etapas = montarProcedimento(b);
  const destaque = (i: number) =>
    reduced
      ? {}
      : {
          initial: { backgroundColor: "rgba(47,91,234,0.18)", opacity: 0, y: 4 },
          animate: { backgroundColor: "rgba(47,91,234,0)", opacity: 1, y: 0 },
          transition: { delay: i * 0.06, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] as const },
        };

  if (!cmp.alterados.length) return <p className="text-sm text-muted">Os dois lados são idênticos. Edite uma condição para comparar.</p>;

  return (
    <div className="grid gap-4" data-testid="comparacao">
      <Secao titulo="O que foi alterado" id="cmp-alterado">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 font-semibold">Condição</th>
              <th className="py-1 font-semibold">{rotA}</th>
              <th className="py-1 font-semibold">{rotB}</th>
            </tr>
          </thead>
          <tbody>
            {cmp.alterados.map((d, i) => (
              <motion.tr key={d.campo} {...destaque(i)} className="border-t border-line" data-alterado={d.campo}>
                <td className="py-1.5 pr-2 font-semibold">{d.rotulo}</td>
                <td className="py-1.5 pr-2">{d.antes}</td>
                <td className="py-1.5 font-semibold text-accent-ink">{d.depois}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Secao>

      <Secao titulo="Etapas afetadas" id="cmp-etapas">
        <ul className="flex flex-wrap gap-1.5">
          {cmp.etapasAfetadas.length ? (
            cmp.etapasAfetadas.map((e, i) => (
              <motion.li key={e} {...destaque(i)} className="rounded-full border border-accent/40 px-2.5 py-0.5 text-xs font-semibold text-accent-ink">
                {e === "planejamento" ? "Planejamento" : etapas.find((x) => x.id === e)?.titulo ?? e}
              </motion.li>
            ))
          ) : (
            <li className="text-sm text-muted">Nenhuma etapa animada é afetada.</li>
          )}
        </ul>
      </Secao>

      <Secao titulo="Consequências sustentadas por fontes" id="cmp-cons">
        {cmp.consequencias.length ? (
          <ul className="grid gap-2">
            {cmp.consequencias.map((m) => (
              <li key={m.id} className="rounded-xl border border-line bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{m.titulo}</span>
                  {m.antes ? <EstadoChip estado={m.antes.estado} curto /> : <span className="text-xs">não avaliado</span>}
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">passa para</span>
                  {m.depois ? <EstadoChip estado={m.depois.estado} curto /> : <span className="text-xs">não avaliado</span>}
                </div>
                <p className="mt-1 text-xs">
                  <span className="text-muted">{rotA}:</span> {m.antes?.condicao ?? "—"}
                </p>
                <p className="text-xs">
                  <span className="text-muted">{rotB}:</span> {m.depois?.condicao ?? "—"}
                </p>
                {m.depois && <p className="mt-1 text-xs">Consequência: {m.depois.consequencia}</p>}
                {m.comFonte ? <SourceList refs={(m.depois ?? m.antes)!.refs} compact /> : <p className="mt-1 text-[11px] text-muted">Sem fonte: diferença apenas na informação disponível.</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">As alterações não mudaram nenhum item da avaliação.</p>
        )}
      </Secao>

      <Secao titulo="Diferenças calculadas" id="cmp-calc">
        {cmp.calculadas.length ? (
          <ul className="grid gap-2 text-sm">
            {cmp.calculadas.map((d) => (
              <li key={d.titulo} className="rounded-lg border border-[var(--kind-simulacao)]/30 bg-[var(--kind-simulacao-soft)] p-2.5">
                <p className="font-semibold">{d.titulo}</p>
                <p>
                  {rotA}: {d.antes} · {rotB}: {d.depois}
                </p>
                <p className="text-xs text-muted">{d.modelo}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhuma grandeza calculável mudou (perfil térmico, master mix, regra de extensão, diferença Tm − anelamento).</p>
        )}
      </Secao>

      <Secao titulo="O que permanece desconhecido" id="cmp-desc">
        <ul className="list-disc pl-5 text-sm">
          {cmp.desconhecidas.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </Secao>
    </div>
  );
}
