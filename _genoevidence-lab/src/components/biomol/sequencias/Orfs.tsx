"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { codigoGenetico, encontrarOrfs, type OpcoesOrf, type Orf } from "@/lib/biomol/sequencias";
import { useBioMol, type SeqSalva } from "../estado";
import { BotaoLeve, Secao, SeqBloco, Segmentado } from "../comum";
import { SeletorCodigo } from "./Analises";
import { ProcurarEstrutura } from "./ProcurarEstrutura";

export const MINIMOS = [30, 75, 150, 300, 600];

export function useOrfs(s: SeqSalva | null, opcoes: OpcoesOrf) {
  const codigo = useBioMol((x) => x.codigo);
  return useMemo(
    () => (s && s.tipo !== "proteina" ? encontrarOrfs(s.seq, codigoGenetico(codigo), opcoes) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s?.seq, s?.tipo, codigo, opcoes.minimoNt, opcoes.inicios, opcoes.incluirIncompletas],
  );
}

export const idOrf = (o: Orf) => `${o.quadro}:${o.inicio}-${o.fim}`;

export function Orfs({ s, opcoes, setOpcoes }: { s: SeqSalva; opcoes: OpcoesOrf; setOpcoes: (o: OpcoesOrf) => void }) {
  const orfs = useOrfs(s, opcoes);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const derivar = useBioMol((x) => x.derivar);
  if (s.tipo === "proteina") return null;
  const atual = orfs.find((o) => idOrf(o) === escolhida) ?? orfs[0] ?? null;

  return (
    <Secao titulo="ORFs — fases abertas de leitura" id="orfs">
      <SeletorCodigo />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Comprimento mínimo
          <select
            value={opcoes.minimoNt}
            onChange={(e) => setOpcoes({ ...opcoes, minimoNt: Number(e.target.value) })}
            className="min-h-9 rounded-lg border border-line bg-surface px-2 text-[13px]"
            data-testid="orf-minimo"
          >
            {MINIMOS.map((m) => (
              <option key={m} value={m}>
                {m} nt{m === 75 ? " (padrão do NCBI ORFfinder)" : ""}
              </option>
            ))}
          </select>
        </label>
        <Segmentado
          rotulo="Códons de início"
          valor={opcoes.inicios ?? "atg"}
          aoMudar={(v) => setOpcoes({ ...opcoes, inicios: v })}
          opcoes={[
            { valor: "atg", rotulo: "só ATG" },
            { valor: "tabela", rotulo: "inícios da tabela", dica: "Inclui códons de início alternativos, como GTG e TTG, conforme o código escolhido." },
          ]}
        />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(opcoes.incluirIncompletas)} onChange={(e) => setOpcoes({ ...opcoes, incluirIncompletas: e.target.checked })} />
          incluir as que chegam ao fim sem parada
        </label>
      </div>
      <p className="text-xs text-muted">
        Uma ORF vai do primeiro códon de início depois de uma parada até a parada seguinte, no mesmo quadro. O comprimento conta o códon de parada. ORF não é gene: é só
        um trecho que poderia ser traduzido.
      </p>

      <MapaOrfs comprimento={s.seq.length} orfs={orfs} escolhida={atual ? idOrf(atual) : null} aoEscolher={setEscolhida} />

      {orfs.length === 0 ? (
        <p className="rounded-lg border border-line p-3 text-sm text-muted" data-testid="sem-orf">
          Nenhuma ORF com pelo menos {opcoes.minimoNt} nt nos seis quadros.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm" data-testid="tabela-orfs">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-1.5 font-medium">#</th>
                <th className="py-1.5 font-medium">Fita</th>
                <th className="py-1.5 font-medium">Quadro</th>
                <th className="py-1.5 text-right font-medium">Início</th>
                <th className="py-1.5 text-right font-medium">Fim</th>
                <th className="py-1.5 text-right font-medium">nt</th>
                <th className="py-1.5 text-right font-medium">aa</th>
                <th className="py-1.5 pl-3 font-medium">Códons</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {orfs.slice(0, 200).map((o, i) => {
                const sel = atual && idOrf(o) === idOrf(atual);
                return (
                  <tr key={idOrf(o)} className={`border-b border-line/60 ${sel ? "bg-accent-soft" : ""}`}>
                    <td className="py-1.5 tabular-nums">{i + 1}</td>
                    <td className="py-1.5">{o.fita === "+" ? "direta (+)" : "reversa (−)"}</td>
                    <td className="ge-mono py-1.5">{o.quadro > 0 ? `+${o.quadro}` : o.quadro}</td>
                    <td className="py-1.5 text-right tabular-nums">{o.fita === "+" ? o.inicio : o.fim}</td>
                    <td className="py-1.5 text-right tabular-nums">{o.fita === "+" ? o.fim : o.inicio}</td>
                    <td className="py-1.5 text-right tabular-nums">{o.nt}</td>
                    <td className="py-1.5 text-right tabular-nums">{o.proteina.length}</td>
                    <td className="ge-mono py-1.5 pl-3 text-xs">
                      {o.codonInicio}…{o.codonParada ?? <span className="text-warn">sem parada</span>}
                    </td>
                    <td className="py-1.5 text-right">
                      <button type="button" onClick={() => setEscolhida(idOrf(o))} className="text-xs text-accent-ink underline" data-orf={i + 1}>
                        ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orfs.length > 200 && <p className="mt-1 text-xs text-muted">Mostrando as 200 maiores de {orfs.length}.</p>}
          <p className="mt-1 text-xs text-muted">Início e fim seguem o sentido da leitura: na fita reversa, o início fica numa posição maior que o fim (como no NCBI).</p>
        </div>
      )}

      {atual && (
        <div className="grid gap-2 rounded-xl border border-line p-3" data-testid="orf-escolhida">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Proteína da ORF {orfs.indexOf(atual) + 1} — {atual.proteina.length} aminoácidos
            </h3>
            <div className="flex flex-wrap gap-2">
              <BotaoLeve
                onClick={() => derivar(s, `${s.nome}_orf${orfs.indexOf(atual) + 1}`, atual.proteina, "proteina", `ORF ${atual.fita}${Math.abs(atual.quadro)} ${atual.inicio}-${atual.fim} de ${s.nome}`)}
                data-testid="guardar-proteina"
              >
                Guardar a proteína
              </BotaoLeve>
              <Link href="/moleculas/processos?processo=traducao" className="ge-press inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[13px] font-medium hover:bg-surface-2">
                Traduzir passo a passo
              </Link>
            </div>
          </div>
          {atual.codonInicio !== "ATG" && <p className="text-xs text-muted">Começa em {atual.codonInicio}: um códon de início alternativo é lido como metionina (M), como faz o NCBI.</p>}
          <SeqBloco seq={atual.proteina} />
          <ProcurarEstrutura proteina={atual.proteina} origem={`ORF ${orfs.indexOf(atual) + 1} de ${s.nome}`} />
        </div>
      )}
    </Secao>
  );
}

/** Mapa das ORFs nos seis quadros: uma faixa por quadro, cada ORF uma barra na posição real. */
function MapaOrfs({ comprimento, orfs, escolhida, aoEscolher }: { comprimento: number; orfs: Orf[]; escolhida: string | null; aoEscolher: (id: string) => void }) {
  const L = 1000;
  const faixa = 18;
  const quadros = [1, 2, 3, -1, -2, -3] as const;
  const x = (p: number) => 48 + ((p - 1) / Math.max(comprimento, 1)) * (L - 56);
  return (
    <figure className="grid gap-1">
      <svg viewBox={`0 0 ${L} ${faixa * 6 + 30}`} className="w-full" role="img" aria-label={`Mapa das ${orfs.length} ORFs nos seis quadros de leitura`} data-testid="mapa-orfs">
        {quadros.map((q, i) => (
          <g key={q}>
            <text x={4} y={14 + i * faixa + faixa / 2} className="fill-muted" fontSize="11" fontFamily="var(--font-mono)">
              {q > 0 ? `+${q}` : q}
            </text>
            <line x1={48} x2={L - 8} y1={10 + i * faixa + faixa / 2} y2={10 + i * faixa + faixa / 2} stroke="var(--line)" strokeWidth={1} />
          </g>
        ))}
        {orfs.map((o) => {
          const i = quadros.indexOf(o.quadro);
          const sel = idOrf(o) === escolhida;
          const x0 = x(o.inicio);
          const x1 = x(o.fim + 1);
          const y = 10 + i * faixa + 4;
          return (
            <g key={idOrf(o)} onClick={() => aoEscolher(idOrf(o))} className="cursor-pointer">
              <title>{`${o.fita === "+" ? "direta" : "reversa"}, quadro ${o.quadro}: ${o.inicio}–${o.fim} (${o.nt} nt, ${o.proteina.length} aa)`}</title>
              <rect x={x0} y={y - 4} width={Math.max(x1 - x0, 3)} height={faixa} fill="transparent" />
              <rect x={x0} y={y} width={Math.max(x1 - x0, 2)} height={faixa - 8} rx={3} fill={sel ? "var(--accent)" : o.fita === "+" ? "var(--ok)" : "var(--violet)"} opacity={o.completa ? 1 : 0.55} />
            </g>
          );
        })}
        <text x={48} y={faixa * 6 + 26} className="fill-muted" fontSize="11" fontFamily="var(--font-mono)">
          1
        </text>
        <text x={L - 8} y={faixa * 6 + 26} textAnchor="end" className="fill-muted" fontSize="11" fontFamily="var(--font-mono)">
          {comprimento.toLocaleString("pt-BR")}
        </text>
      </svg>
      <figcaption className="text-xs text-muted">
        Posição ao longo da sequência que você colou. Verde: fita direta; violeta: fita reversa; azul: a ORF escolhida; mais clara: sem parada até o fim. Clique numa barra
        para ver a proteína.
      </figcaption>
    </figure>
  );
}
