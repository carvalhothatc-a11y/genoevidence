"use client";
import { useRef, useState } from "react";
import { detectarTipo, lerFasta, NOME_TIPO, validar, type TipoSequencia } from "@/lib/biomol/sequencias";
import { AVISO_EXEMPLO, EXEMPLO_FASTA } from "@/lib/biomol/exemplos";
import { MAX_SEQUENCIAS, useBioMol, type SeqSalva } from "../estado";
import { BotaoLeve, Segmentado } from "../comum";

const MAX_ARQUIVO = 5 * 1024 * 1024;

/**
 * Onde a sequência entra: colar (solta ou FASTA), abrir um arquivo do computador ou usar o exemplo.
 * O arquivo é lido AQUI, no navegador; não é enviado ao servidor.
 */
export function Entrada() {
  const [texto, setTexto] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const arquivo = useRef<HTMLInputElement>(null);
  const adicionar = useBioMol((s) => s.adicionar);
  const total = useBioMol((s) => s.sequencias.length);

  const ler = (t: string, exemplo = false) => {
    const r = lerFasta(t);
    if (!r.registros.length) {
      setAvisos(["Não encontrei nenhuma sequência nesse texto."]);
      return;
    }
    const novas: Omit<SeqSalva, "id">[] = r.registros.map((reg) => {
      const d = detectarTipo(reg.seq);
      return { nome: reg.nome, descricao: reg.descricao, seq: reg.seq, tipo: d.tipo, tipoSugerido: !d.clara, exemplo };
    });
    const extra = total + novas.length > MAX_SEQUENCIAS ? [`Cabem ${MAX_SEQUENCIAS} sequências por vez; as mais antigas saíram da lista.`] : [];
    adicionar(novas);
    setAvisos([...r.avisos, ...extra]);
    setTexto("");
  };

  const abrirArquivo = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_ARQUIVO) {
      setAvisos([`O arquivo tem ${(f.size / 1024 / 1024).toFixed(1)} MB; o limite aqui é 5 MB.`]);
      return;
    }
    ler(await f.text());
    if (arquivo.current) arquivo.current.value = "";
  };

  return (
    <section className="ge-card grid gap-3 p-4 sm:p-5" aria-labelledby="entrada-titulo">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="entrada-titulo" className="text-base font-semibold">
            Sua sequência
          </h2>
          <p className="text-sm text-muted">Cole DNA, RNA ou proteína — solta ou em FASTA, uma ou várias. A análise é feita no seu navegador.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotaoLeve onClick={() => arquivo.current?.click()}>Abrir arquivo FASTA</BotaoLeve>
          <BotaoLeve onClick={() => ler(EXEMPLO_FASTA, true)} title={AVISO_EXEMPLO} data-testid="usar-exemplo">
            Usar o exemplo fictício
          </BotaoLeve>
        </div>
      </div>
      <input ref={arquivo} type="file" accept=".fa,.fasta,.fna,.faa,.ffn,.frn,.seq,.txt" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void abrirArquivo(e.target.files?.[0])} />
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) ler(texto);
        }}
      >
        <label htmlFor="seq-texto" className="sr-only">
          Sequência ou FASTA
        </label>
        <textarea
          id="seq-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          spellCheck={false}
          placeholder={">minha_sequencia\nATGGCC…"}
          className="ge-mono min-h-24 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-muted/70 focus-visible:border-accent"
          data-testid="seq-texto"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={!texto.trim()} className="ge-press min-h-10 rounded-full bg-action px-5 text-[14px] font-semibold text-white disabled:opacity-50">
            Adicionar
          </button>
          <span className="text-xs text-muted">Espaços e números de posição (formato GenBank) são tirados; qualquer outra letra estranha é apontada, não apagada.</span>
        </div>
      </form>
      {avisos.length > 0 && (
        <ul className="grid gap-1 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm" role="status">
          {avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <Lista />
    </section>
  );
}

function Lista() {
  const sequencias = useBioMol((s) => s.sequencias);
  const ativa = useBioMol((s) => s.ativa);
  const escolher = useBioMol((s) => s.escolher);
  const remover = useBioMol((s) => s.remover);
  const limpar = useBioMol((s) => s.limpar);
  if (!sequencias.length) return null;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">Sequências nesta aba ({sequencias.length}) — clique para analisar:</p>
        <button type="button" onClick={limpar} className="text-xs text-muted underline hover:text-ink">
          Tirar todas
        </button>
      </div>
      <ul className="flex flex-wrap gap-1.5" data-testid="lista-sequencias">
        {sequencias.map((s) => (
          <li key={s.id} className={`flex items-center rounded-full border ${s.id === ativa ? "border-accent bg-accent-soft" : "border-line"}`}>
            <button type="button" onClick={() => escolher(s.id)} aria-pressed={s.id === ativa} className="ge-press max-w-[18rem] truncate py-1.5 pl-3 pr-1 text-left text-[13px]" data-seq={s.nome}>
              <span className="font-medium">{s.nome}</span>
              <span className="text-muted">
                {" "}
                · {NOME_TIPO[s.tipo]} · {s.seq.length.toLocaleString("pt-BR")}
                {s.exemplo ? " · fictício" : ""}
              </span>
            </button>
            <button type="button" onClick={() => remover(s.id)} aria-label={`Tirar ${s.nome}`} className="ge-press grid size-8 place-items-center rounded-full text-muted hover:text-ink">
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Tipo da sequência ativa. Quando a detecção não tem certeza, a pessoa precisa confirmar antes de
 * qualquer análise: DNA, RNA e proteína dão resultados diferentes, e isso não se adivinha.
 */
export function TipoDaAtiva({ s }: { s: SeqSalva }) {
  const definirTipo = useBioMol((x) => x.definirTipo);
  const d = detectarTipo(s.seq);
  const v = validar(s.seq, s.tipo);
  return (
    <div className="grid gap-2" data-testid="tipo-ativa">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">Esta sequência é</span>
        <Segmentado<TipoSequencia>
          rotulo="Tipo da sequência"
          valor={s.tipo}
          aoMudar={(t) => definirTipo(s.id, t)}
          opcoes={[
            { valor: "dna", rotulo: "DNA" },
            { valor: "rna", rotulo: "RNA" },
            { valor: "proteina", rotulo: "Proteína" },
          ]}
          testid="tipo"
        />
        {s.tipoSugerido ? (
          <span className="text-xs text-warn">Sugestão automática — {d.motivo} Confirme clicando no tipo certo.</span>
        ) : (
          <span className="text-xs text-muted">{d.motivo}</span>
        )}
      </div>
      {!v.valida && (
        <p className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm" role="alert" data-testid="seq-invalida">
          {v.mensagem}
          {v.totalInvalidos > 1 && (
            <span className="mt-1 block text-xs text-muted">
              Posições: {v.invalidos.map((p) => `${p.posicao} (“${p.caractere}”)`).join(", ")}
              {v.totalInvalidos > v.invalidos.length ? "…" : ""}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
