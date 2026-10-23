"use client";
import { codigoGenetico, composicao, seisQuadros, type OpcoesOrf } from "@/lib/biomol/sequencias";
import { nomeDeArquivo, paraCsv, paraFasta, paraJson } from "@/lib/biomol/exportar";
import { useBioMol, type SeqSalva } from "../estado";
import { baixar, BotaoLeve, Secao } from "../comum";
import { useOrfs } from "./Orfs";

/** Tudo é gerado no navegador, a partir do que está na tela; nada passa pelo servidor. */
export function Exportar({ s, opcoesOrf }: { s: SeqSalva; opcoesOrf: OpcoesOrf }) {
  const todas = useBioMol((x) => x.sequencias);
  const codigo = useBioMol((x) => x.codigo);
  const orfs = useOrfs(s, opcoesOrf);
  const nt = s.tipo !== "proteina";
  const marca = { gerado_por: "GenoLab BioMol", gerado_em: new Date().toISOString(), exemplo_ficticio: Boolean(s.exemplo) };

  const composicaoCsv = () => {
    const c = composicao(s.seq, s.tipo);
    return paraCsv(
      ["simbolo", "contagem", "porcentagem"],
      Object.entries(c.contagem)
        .sort()
        .map(([k, n]) => ({ simbolo: k, contagem: n, porcentagem: Number(((100 * n) / c.comprimento).toFixed(3)) })),
    );
  };

  const orfsCsv = () =>
    paraCsv(
      ["n", "fita", "quadro", "inicio", "fim", "nt", "aa", "codon_inicio", "codon_parada", "completa", "proteina"],
      orfs.map((o, i) => ({
        n: i + 1,
        fita: o.fita === "+" ? "direta" : "reversa",
        quadro: o.quadro,
        // no sentido da leitura, como na tabela
        inicio: o.fita === "+" ? o.inicio : o.fim,
        fim: o.fita === "+" ? o.fim : o.inicio,
        nt: o.nt,
        aa: o.proteina.length,
        codon_inicio: o.codonInicio,
        codon_parada: o.codonParada ?? "",
        completa: o.completa,
        proteina: o.proteina,
      })),
    );

  const quadrosCsv = () =>
    paraCsv(
      ["quadro", "codons", "paradas", "proteina"],
      seisQuadros(s.seq, codigoGenetico(codigo)).map((q) => ({ quadro: q.quadro, codons: q.codons.length, paradas: (q.proteina.match(/\*/g) ?? []).length, proteina: q.proteina })),
    );

  const analiseJson = () => {
    const c = composicao(s.seq, s.tipo);
    return paraJson({
      ...marca,
      sequencia: { nome: s.nome, descricao: s.descricao ?? null, tipo: s.tipo, comprimento: s.seq.length, seq: s.seq },
      composicao: c,
      ...(nt
        ? {
            codigo_genetico: { id: codigo, nome: codigoGenetico(codigo).nomeNcbi, fonte: "NCBI gc.prt 4.6" },
            quadros: seisQuadros(s.seq, codigoGenetico(codigo)).map((q) => ({ quadro: q.quadro, proteina: q.proteina, bases_sobrando: q.sobra })),
            orfs: { opcoes: opcoesOrf, itens: orfs },
          }
        : {}),
    });
  };

  const base = nomeDeArquivo(s.nome, "x").replace(/\.x$/, "");
  return (
    <Secao titulo="Exportar" id="exportar">
      <p className="text-sm text-muted">
        Os arquivos são montados aqui no navegador, com o que está calculado na tela.{s.exemplo ? " Esta sequência é o exemplo fictício, e o arquivo diz isso." : ""}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Grupo titulo="FASTA">
          <BotaoLeve onClick={() => baixar(`${base}.fasta`, paraFasta([s]))} data-testid="baixar-fasta">
            Esta sequência
          </BotaoLeve>
          {todas.length > 1 && <BotaoLeve onClick={() => baixar("sequencias-genolab.fasta", paraFasta(todas))}>Todas ({todas.length})</BotaoLeve>}
        </Grupo>
        <Grupo titulo="CSV (planilha)">
          <BotaoLeve onClick={() => baixar(`${base}-composicao.csv`, composicaoCsv(), "text/csv")} data-testid="baixar-csv">
            Composição
          </BotaoLeve>
          {nt && <BotaoLeve onClick={() => baixar(`${base}-seis-quadros.csv`, quadrosCsv(), "text/csv")}>Seis quadros</BotaoLeve>}
          {nt && (
            <BotaoLeve onClick={() => baixar(`${base}-orfs.csv`, orfsCsv(), "text/csv")} disabled={!orfs.length}>
              ORFs ({orfs.length})
            </BotaoLeve>
          )}
        </Grupo>
        <Grupo titulo="JSON">
          <BotaoLeve onClick={() => baixar(`${base}-analise.json`, analiseJson(), "application/json")} data-testid="baixar-json">
            Análise completa
          </BotaoLeve>
        </Grupo>
      </div>
    </Secao>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2 rounded-xl border border-line p-3">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
