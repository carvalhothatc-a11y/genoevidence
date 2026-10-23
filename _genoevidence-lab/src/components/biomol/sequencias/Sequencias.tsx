"use client";
import { useState } from "react";
import { validar, type OpcoesOrf } from "@/lib/biomol/sequencias";
import { AVISO_EXEMPLO } from "@/lib/biomol/exemplos";
import { useAtiva } from "../estado";
import { Entrada, TipoDaAtiva } from "./Entrada";
import { Fitas, Resumo, Transcricao, Traducao } from "./Analises";
import { Orfs } from "./Orfs";
import { Alinhar } from "./Alinhar";
import { Exportar } from "./Exportar";
import { ProcurarEstrutura } from "./ProcurarEstrutura";

type Ferramenta = "resumo" | "fitas" | "transcricao" | "traducao" | "orfs" | "alinhar" | "exportar";

const FERRAMENTAS: { id: Ferramenta; rotulo: string; so?: "nt" | "dna" }[] = [
  { id: "resumo", rotulo: "Resumo" },
  { id: "fitas", rotulo: "Fitas", so: "nt" },
  { id: "transcricao", rotulo: "Transcrição", so: "dna" },
  { id: "traducao", rotulo: "Tradução", so: "nt" },
  { id: "orfs", rotulo: "ORFs", so: "nt" },
  { id: "alinhar", rotulo: "Alinhar" },
  { id: "exportar", rotulo: "Exportar" },
];

/** Ferramenta de sequências: entrada em cima, a análise da sequência escolhida embaixo. */
export function Sequencias() {
  const s = useAtiva();
  const [ferramenta, setFerramenta] = useState<Ferramenta>("resumo");
  const [opcoesOrf, setOpcoesOrf] = useState<OpcoesOrf>({ minimoNt: 75, inicios: "atg", incluirIncompletas: false });

  const disponiveis = FERRAMENTAS.filter((f) => !f.so || (s && (f.so === "dna" ? s.tipo === "dna" : s.tipo !== "proteina")));
  const atual = disponiveis.some((f) => f.id === ferramenta) ? ferramenta : "resumo";
  const valida = s ? validar(s.seq, s.tipo).valida : false;

  return (
    <div className="grid gap-4" data-testid="sequencias">
      <Entrada />
      {!s ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Cole uma sequência acima — ou use o exemplo fictício — para ver comprimento, GC, fitas, tradução, ORFs e alinhamento.
        </p>
      ) : (
        <>
          <div className="grid gap-2 rounded-xl border border-line p-3">
            <p className="text-sm">
              Analisando <strong>{s.nome}</strong>
              {s.descricao ? <span className="text-muted"> — {s.descricao}</span> : null}
            </p>
            {s.exemplo && (
              <p className="text-xs text-warn" data-testid="aviso-exemplo">
                {AVISO_EXEMPLO}
              </p>
            )}
            <TipoDaAtiva s={s} />
          </div>
          {s.tipoSugerido ? (
            <p className="rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm" role="status">
              Confirme o tipo acima para continuar. DNA, RNA e proteína dão resultados diferentes.
            </p>
          ) : !valida ? null : (
            <>
              <nav aria-label="Análises da sequência" className="flex flex-wrap gap-1" data-testid="ferramentas">
                {disponiveis.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFerramenta(f.id)}
                    aria-pressed={atual === f.id}
                    data-ferramenta={f.id}
                    className={`ge-press min-h-9 rounded-full px-3.5 text-[13px] font-medium ${atual === f.id ? "bg-surface-2 text-ink shadow-[inset_0_0_0_1px_var(--accent)]" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
                  >
                    {f.rotulo}
                  </button>
                ))}
              </nav>
              {atual === "resumo" && (
                <>
                  <Resumo s={s} />
                  {s.tipo === "proteina" && (
                    <section className="ge-card grid gap-2 p-4 sm:p-5">
                      <h2 className="text-base font-semibold">Estruturas 3D parecidas</h2>
                      <ProcurarEstrutura proteina={s.seq} origem={s.nome} />
                    </section>
                  )}
                </>
              )}
              {atual === "fitas" && <Fitas s={s} />}
              {atual === "transcricao" && <Transcricao s={s} />}
              {atual === "traducao" && <Traducao s={s} tipo={s.tipo} />}
              {atual === "orfs" && <Orfs s={s} opcoes={opcoesOrf} setOpcoes={setOpcoesOrf} />}
              {atual === "alinhar" && <Alinhar s={s} />}
              {atual === "exportar" && <Exportar s={s} opcoesOrf={opcoesOrf} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
