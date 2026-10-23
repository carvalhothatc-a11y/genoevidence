"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { VisualKindBadge } from "@/components/ui/Badges";
import { paresDeBases, sentidoDasFitas, type ParDeBases } from "@/lib/biomol/estrutura";
import { complemento, validar } from "@/lib/biomol/sequencias";
import { useAtiva } from "../estado";
import { BotaoLeve, CLASSE_BASE, num, Secao } from "../comum";
import type { Carregado } from "../visor/VisorMolecular";
import type { MotorMolecular } from "../visor/motor";
import type { Rotulo3D } from "../visor/Rotulos3D";
import type { Selecao } from "../esquema/HeliceEsquema";

const VisorMolecular = dynamic(() => import("../visor/VisorMolecular").then((m) => m.VisorMolecular), {
  ssr: false,
  loading: () => <div className="grid h-[clamp(420px,66vh,760px)] place-items-center rounded-2xl border border-line bg-panel text-[13px] text-muted">Carregando o visualizador…</div>,
});
const HeliceEsquema = dynamic(() => import("../esquema/HeliceEsquema").then((m) => m.HeliceEsquema), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-[13px] text-muted">Carregando o esquema…</div>,
});

/** Estruturas experimentais de ácidos nucleicos, conferidas no RCSB (título, método e resolução). */
const ESTRUTURAS = [
  { id: "1BNA", rotulo: "DNA dupla-fita", dica: "Dodecâmero de B-DNA (Dickerson), raios X, 1,9 Å" },
  { id: "1EHZ", rotulo: "RNA transportador", dica: "tRNA da fenilalanina de levedura, raios X, 1,93 Å" },
];

const JANELA = 40;

export function AcidosNucleicos() {
  return (
    <div className="grid gap-6">
      <EstruturaReal />
      <SuaSequencia />
    </div>
  );
}

// ---------------------------------------------------------------- estrutura experimental

function EstruturaReal() {
  const [pdb, setPdb] = useState("1BNA");
  const [dados, setDados] = useState<Carregado | null>(null);
  const [motor, setMotor] = useState<MotorMolecular | null>(null);
  const [parSel, setParSel] = useState<number | null>(null);

  const analise = useMemo(() => {
    if (!dados?.atomos) return null;
    const pares = paresDeBases(dados.cadeias);
    return { pares, sentido: sentidoDasFitas(dados.cadeias, pares) };
  }, [dados]);

  // 5' e 3' de cada fita, presos aos átomos das pontas
  const pontas = useMemo<Rotulo3D[]>(() => {
    if (!dados) return [];
    const r: Rotulo3D[] = [];
    for (const c of dados.cadeias.filter((x) => x.tipo === "dna" || x.tipo === "rna")) {
      const nts = c.residuos.filter((x) => x.tipo === "nucleotideo");
      if (nts.length < 2) continue;
      const ini = nts[0].atomos.find((a) => a.nome === "P") ?? nts[0].atomos.find((a) => a.nome === "O5'") ?? nts[0].atomos[0];
      const fim = nts[nts.length - 1].atomos.find((a) => a.nome === "O3'") ?? nts[nts.length - 1].atomos[0];
      r.push({ id: `5-${c.id}`, texto: `5' · fita ${c.id}`, x: ini.x, y: ini.y, z: ini.z, tom: "ok" });
      r.push({ id: `3-${c.id}`, texto: `3' · fita ${c.id}`, x: fim.x, y: fim.y, z: fim.z, tom: "violet" });
    }
    return r;
  }, [dados]);

  const escolherPar = async (i: number, p: ParDeBases) => {
    setParSel(i);
    if (!motor) return;
    await motor.destacar([
      { estrutura: 0, cadeia: p.a.cadeia, de: p.a.numero, ate: p.a.numero },
      { estrutura: 0, cadeia: p.b.cadeia, de: p.b.numero, ate: p.b.numero },
    ]);
    motor.focarRegiao({ estrutura: 0, cadeia: p.a.cadeia, de: p.a.numero, ate: p.a.numero });
  };

  return (
    <Secao titulo="Estrutura experimental" id="acido-real">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Estrutura">
        {ESTRUTURAS.map((e) => (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={pdb === e.id}
            onClick={() => {
              setPdb(e.id);
              setParSel(null);
              setDados(null);
            }}
            data-estrutura-acido={e.id}
            className={`ge-press rounded-full border px-3 py-1.5 text-[13px] ${pdb === e.id ? "border-accent bg-accent-soft font-semibold" : "border-line hover:bg-surface-2"}`}
          >
            {e.id} · {e.rotulo} <span className="text-muted">· {e.dica}</span>
          </button>
        ))}
      </div>
      <VisorMolecular
        key={pdb}
        fontes={[{ tipo: "pdb", id: pdb }]}
        corInicial="residuo"
        rotulosExtras={pontas}
        aoCarregar={(c) => setDados(c[0] ?? null)}
        aoMotor={setMotor}
        testid="visor-acido"
        selo={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <VisualKindBadge kind="dados" />
            <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">PDB {pdb} · estrutura experimental</span>
          </span>
        }
        legenda={
          <p className="text-xs text-muted">
            Cores por nucleotídeo. As marcas 5' e 3' estão nos átomos das pontas de cada fita (fosfato ou O5' no início, O3' no fim).{" "}
            <a href={`https://www.rcsb.org/structure/${pdb}`} target="_blank" rel="noreferrer noopener" className="text-accent-ink underline">
              Ver no RCSB PDB
            </a>
          </p>
        }
      />

      {analise && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-testid="analise-acido">
          <div className="grid content-start gap-2 rounded-xl border border-line p-3">
            <h3 className="text-sm font-semibold">Complementaridade: pares encontrados nas coordenadas</h3>
            <p className="text-xs text-muted">
              Um par conta quando as bases são complementares (A–T ou A–U, G–C) e o N1 da purina fica a até 3,3 Å do N3 da pirimidina — a ligação de hidrogênio
              central do par de Watson-Crick. Pares não canônicos (como G·U) não entram nesta lista.
            </p>
            <p className="text-sm" data-testid="total-pares">
              <strong>{analise.pares.length}</strong> pares de Watson-Crick.
            </p>
            <ul className="grid max-h-64 gap-1 overflow-y-auto" data-testid="lista-pares">
              {analise.pares.map((p, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => void escolherPar(i, p)}
                    aria-pressed={parSel === i}
                    className={`ge-mono ge-press flex w-full justify-between rounded-lg border px-2.5 py-1 text-left text-[12.5px] ${parSel === i ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}
                  >
                    <span>
                      <span className={CLASSE_BASE[p.a.letra]}>{p.a.letra}</span>
                      {p.a.numero} ({p.a.cadeia}) · <span className={CLASSE_BASE[p.b.letra]}>{p.b.letra}</span>
                      {p.b.numero} ({p.b.cadeia})
                    </span>
                    <span className="text-muted">{num(p.distancia, 2)} Å</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid content-start gap-2 rounded-xl border border-line p-3" data-testid="antiparalelismo">
            <h3 className="text-sm font-semibold">Antiparalelismo, medido</h3>
            <p className="text-sm">
              Em <strong>{analise.sentido.antiparalelos}</strong> de {analise.sentido.antiparalelos + analise.sentido.paralelos} pares com vizinhos dos dois lados, as duas
              fitas correm em sentidos opostos ao longo do eixo da hélice.
              {analise.sentido.paralelos > 0 && ` Em ${analise.sentido.paralelos}, no mesmo sentido.`}
            </p>
            <p className="text-xs text-muted">
              Como medimos: o eixo local sai dos centros dos pares vizinhos, e o sentido 5'→3' de cada fita, dos átomos C4' dos nucleotídeos anterior e seguinte. Sinais
              opostos ao projetar no eixo = antiparalelas. {analise.sentido.semMedida > 0 && `${analise.sentido.semMedida} par(es) nas pontas ficaram sem medida.`}
            </p>
            {pdb === "1EHZ" && (
              <p className="text-xs text-muted">
                O tRNA é uma fita só que se dobra sobre si mesma: os pares ficam nos trechos em que a fita volta e se encontra (as hastes).
              </p>
            )}
          </div>
        </div>
      )}
    </Secao>
  );
}

// ---------------------------------------------------------------- sequência da pessoa (esquema)

function SuaSequencia() {
  const ativa = useAtiva();
  const usavel = ativa && ativa.tipo !== "proteina" && validar(ativa.seq, ativa.tipo).valida && !ativa.tipoSugerido ? ativa : null;
  const [inicio, setInicio] = useState(0);
  const [sel, setSel] = useState<Selecao>(null);
  const [girar, setGirar] = useState(false);

  if (!usavel) {
    return (
      <Secao titulo="Sua sequência em 3D (esquema)" id="acido-esquema">
        <p className="text-sm text-muted" data-testid="sem-sequencia-esquema">
          Escolha uma sequência de DNA ou RNA em{" "}
          <Link href="/moleculas/sequencias" className="text-accent-ink underline">
            Sequências
          </Link>{" "}
          (pode ser o exemplo fictício) e ela aparece aqui como dupla-hélice ou fita simples.
        </p>
      </Secao>
    );
  }

  const dna = usavel.tipo === "dna";
  const total = usavel.seq.length;
  const ini = Math.min(inicio, Math.max(0, total - JANELA));
  const trecho = usavel.seq.slice(ini, ini + JANELA);
  const comp = dna ? complemento(trecho, "dna") : "";
  const baseSel = sel ? (sel.fita === 1 ? trecho[sel.indice] : comp[sel.indice]) : null;
  const parSel = sel && dna ? (sel.fita === 1 ? comp[sel.indice] : trecho[sel.indice]) : null;

  return (
    <Secao
      titulo="Sua sequência em 3D (esquema)"
      id="acido-esquema"
      acoes={
        <BotaoLeve onClick={() => setGirar((g) => !g)} aria-pressed={girar}>
          {girar ? "Parar giro" : "Girar"}
        </BotaoLeve>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <VisualKindBadge kind="ilustracao" />
        <span className="text-sm">
          <strong>{usavel.nome}</strong> — {dna ? "dupla-hélice (forma B)" : "fita simples de RNA"}
          {usavel.exemplo ? " · exemplo fictício" : ""}
        </span>
      </div>
      <p className="rounded-lg border border-violet/40 bg-violet-soft p-3 text-sm" data-testid="aviso-esquema">
        <strong>Esquema, não estrutura medida.</strong>{" "}
        {dna
          ? "A hélice usa as medidas médias da forma B do DNA (3,4 Å por par, cerca de 10,5 pares por volta, cerca de 20 Å de diâmetro). A forma real desta sequência só se conhece medindo; ela pode se desviar disso."
          : "A fita aparece esticada em espiral só para mostrar a ordem das bases. O dobramento real de um RNA (grampos, alças, pares internos) depende da sequência e não é calculado aqui."}
      </p>
      {total > JANELA && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Mostrando as bases {ini + 1}–{Math.min(ini + JANELA, total)} de {total}
          <input type="range" min={0} max={total - JANELA} value={ini} onChange={(e) => setInicio(Number(e.target.value))} className="w-56" aria-label="Trecho mostrado" />
        </label>
      )}
      <div className="relative h-[clamp(320px,48vh,520px)] overflow-hidden rounded-2xl border border-line bg-panel" data-testid="esquema-3d">
        <HeliceEsquema fita1={trecho} fita2={dna ? comp : undefined} tipo={dna ? "dupla" : "simples"} selecao={sel} aoSelecionar={setSel} girar={girar} />
      </div>
      {sel && baseSel && (
        <p className="text-sm" data-testid="base-escolhida" aria-live="polite">
          Posição <strong>{ini + sel.indice + 1}</strong>, fita {sel.fita === 1 ? "dada (5'→3')" : "complementar (3'→5')"}: <span className={`font-bold ${CLASSE_BASE[baseSel]}`}>{baseSel}</span>
          {parSel && (
            <>
              {" "}
              — pareia com <span className={`font-bold ${CLASSE_BASE[parSel]}`}>{parSel}</span> na outra fita ({baseSel === "G" || baseSel === "C" ? "3 ligações de hidrogênio" : "2 ligações de hidrogênio"}).
            </>
          )}
        </p>
      )}
      <div className="grid gap-1">
        <p className="text-xs text-muted">A mesma fita em texto — clique numa letra para achar a base no 3D:</p>
        <div className="ge-mono flex flex-wrap gap-0.5 rounded-lg bg-panel p-2 text-[12px]" data-testid="fita-texto">
          <span className="mr-1 text-panel-muted">5'</span>
          {[...trecho].map((b, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSel({ fita: 1, indice: i })}
              aria-label={`posição ${ini + i + 1}, ${b}`}
              aria-pressed={sel?.indice === i}
              data-pos={ini + i + 1}
              className={`grid min-w-5 place-items-center rounded ${sel?.indice === i ? "bg-accent text-white" : `${CLASSE_BASE[b] ?? ""} hover:bg-surface-2`}`}
            >
              {b}
            </button>
          ))}
          <span className="ml-1 text-panel-muted">3'</span>
        </div>
      </div>
    </Secao>
  );
}
