"use client";
import Link from "next/link";
import { useMemo } from "react";
import {
  AMINOACIDOS,
  codigoGenetico,
  complemento,
  composicao,
  reversoComplemento,
  seisQuadros,
  TABELAS,
  transcrever,
  type TipoSequencia,
} from "@/lib/biomol/sequencias";
import { useBioMol, type SeqSalva } from "../estado";
import { BotaoLeve, CLASSE_BASE, num, Secao, SeqBloco, Segmentado } from "../comum";

// ---------------------------------------------------------------- resumo

const ORDEM_NT: Record<"dna" | "rna", string[]> = { dna: ["A", "C", "G", "T"], rna: ["A", "C", "G", "U"] };
const COR_BARRA: Record<string, string> = { A: "bg-ok", C: "bg-accent", G: "bg-warn", T: "bg-danger", U: "bg-danger" };

export function Resumo({ s }: { s: SeqSalva }) {
  const c = useMemo(() => composicao(s.seq, s.tipo), [s.seq, s.tipo]);
  if (s.tipo === "proteina") return <ResumoProteina s={s} />;
  const ordem = ORDEM_NT[s.tipo];
  const outros = c.comprimento - ordem.reduce((t, b) => t + (c.contagem[b] ?? 0), 0);
  const gc = c.gc!;
  return (
    <Secao titulo="Comprimento e composição" id="resumo">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Comprimento" valor={`${c.comprimento.toLocaleString("pt-BR")} nt`} />
        <Numero
          rotulo="Conteúdo GC"
          valor={gc.porcentagem === null ? "indefinido" : `${num(gc.porcentagem, 1)}%`}
          nota={gc.excluidos ? `${gc.excluidos} base${gc.excluidos > 1 ? "s" : ""} ambígua${gc.excluidos > 1 ? "s" : ""} fora da conta` : `${gc.gc} G+C de ${gc.gc + gc.at}`}
          testid="gc"
        />
        <Numero rotulo="Tipo" valor={s.tipo === "dna" ? "DNA" : "RNA"} />
        <Numero rotulo="Ambíguas" valor={String(outros)} nota="N, R, Y e outros códigos IUPAC" />
      </dl>
      <figure className="grid gap-2">
        <figcaption className="text-xs text-muted">Composição de bases (contagem e porcentagem do total)</figcaption>
        <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {ordem.map((b) => {
            const n = c.contagem[b] ?? 0;
            return n ? <div key={b} className={COR_BARRA[b]} style={{ width: `${(100 * n) / c.comprimento}%` }} /> : null;
          })}
          {outros > 0 && <div className="bg-panel-dim" style={{ width: `${(100 * outros) / c.comprimento}%` }} />}
        </div>
        <table className="w-full max-w-md text-sm">
          <thead className="sr-only">
            <tr>
              <th>Base</th>
              <th>Contagem</th>
              <th>Porcentagem</th>
            </tr>
          </thead>
          <tbody>
            {ordem.map((b) => (
              <tr key={b} className="border-b border-line/60">
                <td className="py-1">
                  <span className={`ge-mono font-bold ${CLASSE_BASE[b]}`}>{b}</span>
                </td>
                <td className="py-1 text-right tabular-nums">{(c.contagem[b] ?? 0).toLocaleString("pt-BR")}</td>
                <td className="py-1 text-right tabular-nums text-muted">{num((100 * (c.contagem[b] ?? 0)) / c.comprimento, 1)}%</td>
              </tr>
            ))}
            {outros > 0 && (
              <tr>
                <td className="py-1 text-muted">outras</td>
                <td className="py-1 text-right tabular-nums">{outros}</td>
                <td className="py-1 text-right tabular-nums text-muted">{num((100 * outros) / c.comprimento, 1)}%</td>
              </tr>
            )}
          </tbody>
        </table>
      </figure>
      <SeqBloco seq={s.seq} colorir />
    </Secao>
  );
}

function ResumoProteina({ s }: { s: SeqSalva }) {
  const c = composicao(s.seq, "proteina");
  const linhas = Object.entries(c.contagem).sort((a, b) => b[1] - a[1]);
  const max = linhas[0]?.[1] ?? 1;
  return (
    <Secao titulo="Comprimento e composição" id="resumo">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Comprimento" valor={`${c.comprimento.toLocaleString("pt-BR")} aa`} />
        <Numero rotulo="Aminoácidos diferentes" valor={String(linhas.filter(([k]) => k !== "*").length)} />
      </dl>
      <table className="w-full max-w-xl text-sm" data-testid="composicao-aa">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1 font-medium">Aminoácido</th>
            <th className="py-1 text-right font-medium">Contagem</th>
            <th className="py-1 text-right font-medium">%</th>
            <th className="w-1/3 py-1" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {linhas.map(([aa, n]) => (
            <tr key={aa} className="border-b border-line/60">
              <td className="py-1">
                <span className="ge-mono font-bold">{aa}</span> <span className="text-muted">{AMINOACIDOS[aa] ? `${AMINOACIDOS[aa].tres} · ${AMINOACIDOS[aa].nome}` : ""}</span>
              </td>
              <td className="py-1 text-right tabular-nums">{n}</td>
              <td className="py-1 text-right tabular-nums text-muted">{num((100 * n) / c.comprimento, 1)}</td>
              <td className="py-1 pl-3" aria-hidden="true">
                <div className="h-2 rounded-full bg-violet" style={{ width: `${(100 * n) / max}%` }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <SeqBloco seq={s.seq} />
    </Secao>
  );
}

function Numero({ rotulo, valor, nota, testid }: { rotulo: string; valor: string; nota?: string; testid?: string }) {
  return (
    <div className="rounded-xl border border-line p-3" data-testid={testid}>
      <dt className="text-xs text-muted">{rotulo}</dt>
      <dd className="text-lg font-semibold tabular-nums">{valor}</dd>
      {nota && <dd className="text-xs text-muted">{nota}</dd>}
    </div>
  );
}

// ---------------------------------------------------------------- fitas

/**
 * As duas fitas, uma embaixo da outra, com a orientação escrita em cada linha. A de cima é a que a
 * pessoa colou (5'→3'); a de baixo é o complemento, lido 3'→5' — antiparalela.
 */
export function DuplaFita({ cima, baixo, limite = 1200, rotulos = ["5'", "3'"] }: { cima: string; baixo: string; limite?: number; rotulos?: [string, string] }) {
  const n = Math.min(cima.length, limite);
  const linhas: number[] = [];
  for (let k = 0; k < n; k += 60) linhas.push(k);
  const largura = String(n).length;
  const outro = (r: string) => (r === "5'" ? "3'" : "5'");
  return (
    <div className="grid gap-1">
      <pre className="ge-mono overflow-x-auto rounded-lg bg-panel p-3 text-[12.5px] leading-5 text-ink" data-testid="dupla-fita">
        {linhas.map((k) => {
          const a = cima.slice(k, Math.min(k + 60, n));
          const b = baixo.slice(k, Math.min(k + 60, n));
          return (
            <div key={k} className="mb-2">
              <div>
                <span className="select-none text-panel-dim">{String(k + 1).padStart(largura)} </span>
                <span className="select-none text-panel-muted">{rotulos[0]} </span>
                {[...a].map((ch, i) => (
                  <span key={i} className={CLASSE_BASE[ch]}>
                    {ch}
                  </span>
                ))}
                <span className="select-none text-panel-muted"> {outro(rotulos[0])}</span>
              </div>
              <div className="select-none text-panel-dim">
                {" ".repeat(largura + 4)}
                {[...a].map((ch, i) => (pareia(ch, b[i]) ? "|" : " ")).join("")}
              </div>
              <div>
                <span className="select-none">{" ".repeat(largura + 1)}</span>
                <span className="select-none text-panel-muted">{rotulos[1]} </span>
                {[...b].map((ch, i) => (
                  <span key={i} className={CLASSE_BASE[ch]}>
                    {ch}
                  </span>
                ))}
                <span className="select-none text-panel-muted"> {outro(rotulos[1])}</span>
              </div>
            </div>
          );
        })}
      </pre>
      {cima.length > limite && <p className="text-xs text-muted">Mostrando as primeiras {limite.toLocaleString("pt-BR")} bases.</p>}
    </div>
  );
}

function pareia(a: string, b: string | undefined): boolean {
  const p = a + (b ?? "");
  return ["AT", "TA", "GC", "CG", "AU", "UA"].includes(p);
}

export function Fitas({ s }: { s: SeqSalva }) {
  const derivar = useBioMol((x) => x.derivar);
  if (s.tipo === "proteina") return null;
  const t = s.tipo;
  const comp = complemento(s.seq, t);
  const rc = reversoComplemento(s.seq, t);
  return (
    <Secao
      titulo="Fitas: complemento e reverso-complemento"
      id="fitas"
      acoes={
        <>
          <BotaoLeve onClick={() => derivar(s, `${s.nome}_revcomp`, rc, t, `reverso-complemento de ${s.nome}`)} data-testid="guardar-revcomp">
            Guardar o reverso-complemento
          </BotaoLeve>
          <Link href="/moleculas/acidos-nucleicos" className="ge-press inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[13px] font-medium hover:bg-surface-2">
            Ver em 3D
          </Link>
        </>
      }
    >
      <p className="text-sm">
        As fitas de um {t === "dna" ? "DNA" : "RNA"} de dupla fita são <strong>complementares</strong> (A com {t === "dna" ? "T" : "U"}, G com C) e{" "}
        <strong>antiparalelas</strong>: enquanto uma corre de 5' para 3', a outra corre de 3' para 5'. Cada “|” abaixo é um par de Watson-Crick.
      </p>
      <DuplaFita cima={s.seq} baixo={comp} />
      <div className="grid gap-1">
        <h3 className="text-sm font-semibold">Reverso-complemento (a fita de baixo, escrita 5'→3')</h3>
        <p className="text-xs text-muted">É como a outra fita se escreve por convenção — e é o que você usa para desenhar um primer reverso, por exemplo.</p>
        <SeqBloco seq={rc} colorir />
      </div>
    </Secao>
  );
}

// ---------------------------------------------------------------- transcrição

export function Transcricao({ s }: { s: SeqSalva }) {
  const fita = useBioMol((x) => x.fita);
  const setFita = useBioMol((x) => x.setFita);
  const derivar = useBioMol((x) => x.derivar);
  if (s.tipo !== "dna") {
    return (
      <Secao titulo="Transcrição" id="transcricao">
        <p className="text-sm text-muted">A transcrição parte de DNA. {s.tipo === "rna" ? "Esta sequência já é RNA." : "Esta sequência é proteína."}</p>
      </Secao>
    );
  }
  const t = fita ? transcrever(s.seq, fita) : null;
  return (
    <Secao
      titulo="Transcrição: DNA → RNA"
      id="transcricao"
      acoes={
        t && (
          <>
            <BotaoLeve onClick={() => derivar(s, `${s.nome}_mRNA`, t.rna, "rna", `mRNA transcrito de ${s.nome} (fita ${fita})`)} data-testid="guardar-mrna">
              Guardar o mRNA
            </BotaoLeve>
            <Link href="/moleculas/processos?processo=transcricao" className="ge-press inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[13px] font-medium hover:bg-surface-2">
              Ver passo a passo
            </Link>
          </>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">A sequência que você colou é a fita</span>
        <Segmentado
          rotulo="Fita fornecida"
          valor={fita ?? ("" as "codificante")}
          aoMudar={setFita}
          opcoes={[
            { valor: "codificante", rotulo: "codificante (senso)", dica: "Mesma sequência do mRNA, com T no lugar de U. É como os genes costumam aparecer nas bases de dados." },
            { valor: "molde", rotulo: "molde (antissenso)", dica: "A fita que a RNA polimerase lê." },
          ]}
          testid="fita-fornecida"
        />
      </div>
      {!t ? (
        <p className="rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm" role="status">
          Diga qual fita você colou. O GenoLab não supõe: as duas escolhas dão RNAs diferentes. (Genes nas bases de dados costumam estar escritos como a fita codificante.)
        </p>
      ) : (
        <>
          <p className="text-sm">
            A RNA polimerase lê a <strong>fita molde</strong> no sentido 3'→5' e monta o RNA no sentido <strong>5'→3'</strong>, complementar a ela. Por isso o RNA
            tem a mesma sequência da fita codificante, com <span className={CLASSE_BASE.U}>U</span> no lugar de <span className={CLASSE_BASE.T}>T</span>.
          </p>
          <DuplaFita cima={t.codificante} baixo={complemento(t.codificante, "dna")} rotulos={["5'", "3'"]} />
          <p className="text-xs text-muted">Em cima, a fita codificante (5'→3'); embaixo, a fita molde (3'→5').</p>
          <div className="grid gap-1">
            <h3 className="text-sm font-semibold">mRNA (5'→3')</h3>
            <SeqBloco seq={t.rna} colorir />
          </div>
        </>
      )}
    </Secao>
  );
}

// ---------------------------------------------------------------- tradução

export function SeletorCodigo() {
  const codigo = useBioMol((x) => x.codigo);
  const setCodigo = useBioMol((x) => x.setCodigo);
  const c = codigoGenetico(codigo);
  return (
    <div className="grid gap-1">
      <label className="flex flex-wrap items-center gap-2 text-sm">
        Código genético
        <select
          value={codigo}
          onChange={(e) => setCodigo(Number(e.target.value))}
          className="min-h-9 max-w-full rounded-lg border border-line bg-surface px-2 text-[13px]"
          data-testid="codigo-genetico"
        >
          {TABELAS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id} — {t.nome}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted">
        Tabela {c.id} do NCBI ({c.nomeNcbi}). Paradas: {c.paradas.join(", ")}. Inícios: {c.inicios.join(", ")}.
        {c.paradasAmbiguas.length > 0 && ` Atenção: nesta tabela ${c.paradasAmbiguas.join(", ")} pode ser parada ou aminoácido, conforme o contexto; aqui é traduzido como aminoácido.`}
      </p>
    </div>
  );
}

export function Traducao({ s, tipo }: { s: SeqSalva; tipo: TipoSequencia }) {
  const codigo = useBioMol((x) => x.codigo);
  const derivar = useBioMol((x) => x.derivar);
  const quadros = useMemo(() => (tipo === "proteina" ? [] : seisQuadros(s.seq, codigoGenetico(codigo))), [s.seq, tipo, codigo]);
  if (tipo === "proteina") return null;
  return (
    <Secao titulo="Tradução nos seis quadros de leitura" id="traducao">
      <SeletorCodigo />
      <p className="text-sm">
        Cada quadro começa numa posição diferente. +1, +2 e +3 leem a fita que você colou; −1, −2 e −3 leem a outra fita (o reverso-complemento), como no NCBI. “*” é
        códon de parada; “X”, códon com base ambígua que não decide o aminoácido.
      </p>
      <ol className="grid gap-2" data-testid="seis-quadros">
        {quadros.map((q) => {
          const paradas = (q.proteina.match(/\*/g) ?? []).length;
          return (
            <li key={q.quadro} className="grid gap-1 rounded-xl border border-line p-3" data-quadro={q.quadro}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  <strong className="ge-mono">{q.quadro > 0 ? `+${q.quadro}` : q.quadro}</strong>{" "}
                  <span className="text-muted">
                    · {q.codons.length} códons · {paradas} parada{paradas === 1 ? "" : "s"}
                    {q.sobra ? ` · ${q.sobra} base${q.sobra > 1 ? "s" : ""} no fim sem formar códon` : ""}
                  </span>
                </p>
                <BotaoLeve
                  onClick={() => derivar(s, `${s.nome}_quadro${q.quadro > 0 ? "+" : ""}${q.quadro}`, q.proteina, "proteina", `tradução do quadro ${q.quadro} de ${s.nome}, código ${codigo}`)}
                >
                  Guardar como proteína
                </BotaoLeve>
              </div>
              <p className="ge-mono break-all text-[12.5px] leading-5">
                {q.proteina.length > 1500 ? (
                  q.proteina.slice(0, 1500) + "…"
                ) : (
                  [...q.proteina].map((aa, i) => (
                    <span key={i} className={aa === "*" ? "font-bold text-danger" : aa === "M" ? "text-ok" : undefined}>
                      {aa}
                    </span>
                  ))
                )}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted">
        Em verde, metionina (M); em vermelho, paradas. Os quadros mostram a tradução completa, sem cortar no primeiro stop — para ver onde começa e termina cada proteína
        possível, use ORFs.
      </p>
    </Secao>
  );
}
