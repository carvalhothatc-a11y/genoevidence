"use client";
import { Canvas } from "@react-three/fiber";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { VisualKindBadge } from "@/components/ui/Badges";
import { useUi } from "@/store/ui";
import { EXEMPLO_FASTA } from "@/lib/biomol/exemplos";
import {
  duracaoReplicacao,
  duracaoTranscricao,
  duracaoTraducao,
  estadoReplicacao,
  estadoTraducao,
  estadoTranscricao,
  roteiroTraducao,
  SIMPLIFICACOES,
} from "@/lib/biomol/processos";
import { AMINOACIDOS, codigoGenetico, complemento, detectarTipo, lerFasta, rnaParaDna, transcrever, validar } from "@/lib/biomol/sequencias";
import { useAtiva, useBioMol } from "../estado";
import { BotaoLeve, CLASSE_BASE, Secao, Segmentado } from "../comum";
import { CamadaHtml, usePaleta } from "./pecas";
import { CenaReplicacao } from "./CenaReplicacao";
import { CenaTranscricao } from "./CenaTranscricao";
import { CenaTraducao } from "./CenaTraducao";

type Processo = "replicacao" | "transcricao" | "traducao";
const NOMES: Record<Processo, string> = { replicacao: "Replicação", transcricao: "Transcrição", traducao: "Tradução" };
const JANELA = 30;
const FRAGMENTO = 8;
const MAX_CODONS = 60;

export function Processos() {
  const params = useSearchParams();
  const router = useRouter();
  const inicial = params.get("processo");
  const [proc, setProc] = useState<Processo>(inicial === "transcricao" || inicial === "traducao" ? inicial : "replicacao");
  const ativa = useAtiva();
  const fita = useBioMol((s) => s.fita);
  const setFita = useBioMol((s) => s.setFita);
  const codigo = useBioMol((s) => s.codigo);
  const substituir = useBioMol((s) => s.substituir);

  const usarExemplo = () => {
    const regs = lerFasta(EXEMPLO_FASTA).registros;
    substituir(regs.map((r) => ({ nome: r.nome, descricao: r.descricao, seq: r.seq, tipo: detectarTipo(r.seq).tipo, exemplo: true })));
    // o exemplo foi escrito como fita codificante (é assim que ele foi montado)
    setFita("codificante");
  };

  const trocar = (p: Processo) => {
    setProc(p);
    router.replace(`/moleculas/processos?processo=${p}`, { scroll: false });
  };

  const valida = ativa && !ativa.tipoSugerido && validar(ativa.seq, ativa.tipo).valida ? ativa : null;
  const precisaDna = proc !== "traducao";
  const ok = valida && (precisaDna ? valida.tipo === "dna" : valida.tipo !== "proteina");

  return (
    <div className="grid gap-4" data-testid="processos">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado<Processo>
          rotulo="Processo"
          valor={proc}
          aoMudar={trocar}
          opcoes={[
            { valor: "replicacao", rotulo: "Replicação", dica: "DNA → duas cópias" },
            { valor: "transcricao", rotulo: "Transcrição", dica: "DNA → RNA" },
            { valor: "traducao", rotulo: "Tradução", dica: "RNA → proteína" },
          ]}
          testid="processo"
        />
        <div className="flex flex-wrap items-center gap-2">
          <VisualKindBadge kind="ilustracao" />
          <span className="text-xs text-muted">animação esquemática do mecanismo — não é simulação física</span>
        </div>
      </div>

      {!ok ? (
        <Secao titulo={`${NOMES[proc]}: escolha uma sequência`} id="processo-sem-seq">
          <p className="text-sm" data-testid="sem-sequencia-processo">
            {proc === "traducao" ? "A tradução parte de um RNA mensageiro (ou de um DNA, que é transcrito antes)." : "Este processo parte de DNA."}{" "}
            {valida ? `A sequência ativa (${valida.nome}) é ${valida.tipo === "proteina" ? "proteína" : valida.tipo.toUpperCase()}.` : "Ainda não há uma sequência válida escolhida."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={usarExemplo} className="ge-press rounded-full bg-action px-4 py-2 text-[13px] font-semibold text-white" data-testid="processo-exemplo">
              Usar o exemplo fictício
            </button>
            <Link href="/moleculas/sequencias" className="ge-press rounded-full border border-line px-4 py-2 text-[13px] hover:bg-surface-2">
              Colar a minha em Sequências
            </Link>
          </div>
        </Secao>
      ) : proc === "replicacao" ? (
        <Replicacao seq={valida.seq} nome={valida.nome} exemplo={Boolean(valida.exemplo)} />
      ) : fita === null && valida.tipo === "dna" ? (
        <Secao titulo="Qual fita você colou?" id="processo-fita">
          <p className="text-sm">
            Para transcrever, o GenoLab precisa saber se a sequência de <strong>{valida.nome}</strong> é a fita codificante ou a fita molde. As duas dão RNAs diferentes, e
            isso não se adivinha.
          </p>
          <Segmentado
            rotulo="Fita fornecida"
            valor={"" as "codificante"}
            aoMudar={setFita}
            opcoes={[
              { valor: "codificante", rotulo: "codificante (senso)" },
              { valor: "molde", rotulo: "molde (antissenso)" },
            ]}
            testid="processo-fita"
          />
        </Secao>
      ) : proc === "transcricao" ? (
        <Transcricao seq={valida.seq} fita={fita!} nome={valida.nome} />
      ) : (
        <Traducao seq={valida.seq} tipo={valida.tipo as "dna" | "rna"} fita={fita} codigo={codigo} nome={valida.nome} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- linha do tempo

function useLinhaDoTempo(duracao: number, chave: string) {
  const pausadoGlobal = useUi((s) => s.paused);
  const [reduzido, setReduzido] = useState(false);
  const [t, setT] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const ultimo = useRef<number | null>(null);
  useEffect(() => setReduzido(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  // outra sequência ou processo: volta ao começo
  useEffect(() => {
    setT(0);
    setTocando(false);
  }, [chave]);
  useEffect(() => {
    if (!tocando || pausadoGlobal) {
      ultimo.current = null;
      return;
    }
    let id = 0;
    const passo = (agora: number) => {
      const dt = ultimo.current === null ? 0 : (agora - ultimo.current) / 1000;
      ultimo.current = agora;
      setT((x) => {
        // com movimento reduzido, anda em saltos de um passo inteiro
        const novo = reduzido ? x + (dt > 0 ? dt * velocidade * 1.4 : 0) : x + dt * velocidade * 1.4;
        if (novo >= duracao) {
          setTocando(false);
          return duracao;
        }
        return novo;
      });
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [tocando, pausadoGlobal, velocidade, duracao, reduzido]);
  const tVisivel = reduzido ? Math.floor(t) : t;
  return { t: tVisivel, tBruto: t, setT, tocando, setTocando, velocidade, setVelocidade, movimento: !reduzido, duracao };
}

function Controles({ l, rotuloPasso }: { l: ReturnType<typeof useLinhaDoTempo>; rotuloPasso: string }) {
  const { tBruto, setT, tocando, setTocando, velocidade, setVelocidade, duracao } = l;
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Controles da animação" data-testid="controles-processo">
      <BotaoLeve onClick={() => setT(0)} title="Recomeçar">
        ⏮ Recomeçar
      </BotaoLeve>
      <BotaoLeve onClick={() => setT((x) => Math.max(0, Math.ceil(x) - 1))} title={`${rotuloPasso} anterior`} data-testid="passo-anterior">
        ◀ Passo
      </BotaoLeve>
      <button
        type="button"
        onClick={() => {
          if (tBruto >= duracao) setT(0);
          setTocando(!tocando);
        }}
        className="ge-press min-h-9 rounded-full bg-accent px-4 text-[13px] font-semibold text-white"
        data-testid="tocar"
      >
        {tocando ? "⏸ Pausar" : "▶ Tocar"}
      </button>
      <BotaoLeve onClick={() => setT((x) => Math.min(duracao, Math.floor(x) + 1))} title={`Próximo ${rotuloPasso.toLowerCase()}`} data-testid="passo-seguinte">
        Passo ▶
      </BotaoLeve>
      <Segmentado
        rotulo="Velocidade"
        valor={velocidade}
        aoMudar={setVelocidade}
        opcoes={[
          { valor: 0.5, rotulo: "0,5×" },
          { valor: 1, rotulo: "1×" },
          { valor: 2, rotulo: "2×" },
        ]}
      />
      <input
        type="range"
        min={0}
        max={duracao}
        step={0.01}
        value={tBruto}
        onChange={(e) => {
          setTocando(false);
          setT(Number(e.target.value));
        }}
        aria-label="Linha do tempo"
        className="min-w-40 flex-1"
        data-testid="linha-do-tempo"
      />
    </div>
  );
}

function Palco({ children, rotulo }: { children: React.ReactNode; rotulo: string }) {
  const camada = useRef<HTMLDivElement>(null);
  return (
    <div className="relative h-[clamp(380px,58vh,640px)] overflow-hidden rounded-2xl border border-line bg-panel" data-testid="palco-processo">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.2, 9], fov: 40, near: 0.1, far: 200 }} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }} role="img" aria-label={rotulo}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 6, 8]} intensity={1.2} />
        <directionalLight position={[-5, -2, -3]} intensity={0.35} />
        <hemisphereLight args={["#bcd0ff", "#1b2742", 0.35]} />
        <CamadaHtml.Provider value={camada}>{children}</CamadaHtml.Provider>
      </Canvas>
      <div ref={camada} className="pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
}

function Etapas({ itens, atual }: { itens: string[]; atual: number }) {
  return (
    <ol className="grid gap-1" data-testid="etapas">
      {itens.map((x, i) => (
        <li
          key={x}
          aria-current={i === atual ? "step" : undefined}
          className={`flex gap-2 rounded-lg px-2 py-1.5 text-[13px] ${i === atual ? "bg-accent-soft text-ink" : i < atual ? "text-muted" : "text-muted/70"}`}
        >
          <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${i === atual ? "bg-accent text-white" : i < atual ? "bg-ok-soft text-ok" : "border border-line"}`}>
            {i < atual ? "✓" : i + 1}
          </span>
          {x}
        </li>
      ))}
    </ol>
  );
}

function Simplificacoes({ itens }: { itens: readonly string[] }) {
  return (
    <details className="rounded-xl border border-line p-3 text-sm">
      <summary className="cursor-pointer font-semibold">O que este esquema simplifica</summary>
      <ul className="mt-2 grid list-disc gap-1 pl-5 text-muted">
        {itens.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </details>
  );
}

function Fita({
  rotulo,
  seq,
  ate,
  de = 0,
  feito,
  ponta = ["5'", "3'"],
  testid,
}: {
  rotulo: string;
  seq: string;
  ate: number;
  de?: number;
  /** Posições já prontas, quando não são um trecho contínuo. */
  feito?: boolean[];
  ponta?: [string, string];
  testid?: string;
}) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs text-muted">{rotulo}</span>
      <p className="ge-mono break-all text-[12.5px] leading-5" data-testid={testid}>
        <span className="text-muted">{ponta[0]} </span>
        {[...seq].map((b, i) => (
          <span key={i} className={(feito ? feito[i] : i >= de && i < ate) ? CLASSE_BASE[b] : "text-muted/40"}>
            {b}
          </span>
        ))}
        <span className="text-muted"> {ponta[1]}</span>
      </p>
    </div>
  );
}

function Janela({ total, inicio, setInicio, tamanho }: { total: number; inicio: number; setInicio: (n: number) => void; tamanho: number }) {
  if (total <= tamanho) return null;
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      Trecho animado: bases {inicio + 1}–{Math.min(total, inicio + tamanho)} de {total}
      <input type="range" min={0} max={total - tamanho} value={inicio} onChange={(e) => setInicio(Number(e.target.value))} className="w-56" aria-label="Trecho animado" />
    </label>
  );
}

// ---------------------------------------------------------------- replicação

function Replicacao({ seq, nome, exemplo }: { seq: string; nome: string; exemplo: boolean }) {
  const paleta = usePaleta();
  const [inicio, setInicio] = useState(0);
  const trecho = seq.slice(inicio, inicio + JANELA);
  const n = trecho.length;
  const l = useLinhaDoTempo(duracaoReplicacao(n, FRAGMENTO), `rep:${trecho}`);
  const e = estadoReplicacao(n, l.t, FRAGMENTO);
  const comp = complemento(trecho, "dna");
  const ultimo = duracaoReplicacao(n, FRAGMENTO);
  const etapa = l.t < 1 ? 0 : e.atrasada.some(Boolean) ? (e.ligados ? 4 : 3) : e.lider.some(Boolean) ? 2 : 1;
  const nLider = e.lider.filter(Boolean).length;
  const nAtrasada = e.atrasada.filter(Boolean).length;
  const agora =
    l.t >= ultimo
      ? "A DNA ligase uniu os fragmentos de Okazaki. Cada molécula-filha tem uma fita velha e uma nova: replicação semiconservativa."
      : e.polLider >= 0 && l.t >= 1
        ? `Fita contínua: a polimerase põe ${trecho[e.polLider]} em frente ao ${comp[e.polLider]} do molde (posição ${inicio + e.polLider + 1}). A fita nova cresce 5'→3', no mesmo sentido da forquilha.`
        : e.polAtrasada >= 0
          ? `Fita atrasada: a polimerase põe ${comp[e.polAtrasada]} em frente ao ${trecho[e.polAtrasada]} do molde (posição ${inicio + e.polAtrasada + 1}), andando para trás — também 5'→3', só que em fragmentos.`
          : "A helicase começa a separar as duas fitas, quebrando as ligações de hidrogênio entre as bases.";

  return (
    <Secao titulo={`Replicação — ${nome}`} id="replicacao">
      <Janela total={seq.length} inicio={inicio} setInicio={setInicio} tamanho={JANELA} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-2">
          {paleta && (
            <Palco rotulo={`Replicação esquemática de ${n} pares: forquilha aberta até a posição ${e.aberto}.`}>
              <CenaReplicacao fita1={trecho} t={l.t} F={FRAGMENTO} paleta={paleta} movimento={l.movimento} />
            </Palco>
          )}
          <Controles l={l} rotuloPasso="Passo" />
        </div>
        <div className="grid content-start gap-3">
          <Etapas
            itens={["Abertura: a helicase separa as fitas", "Pareamento complementar: A com T, G com C", "Síntese 5'→3' contínua (fita líder)", "Síntese em fragmentos de Okazaki (fita atrasada)", "A ligase une os fragmentos"]}
            atual={etapa}
          />
          <p className="rounded-lg border border-line p-3 text-sm" aria-live="polite" data-testid="agora-processo">
            {agora}
          </p>
        </div>
      </div>
      <div className="grid gap-2 rounded-xl border border-line p-3">
        <Fita rotulo="Molde 1 (a sua fita)" seq={trecho} ate={n} />
        <Fita rotulo={`Nova sobre o molde 1 — atrasada (${nAtrasada}/${n})`} seq={comp} ate={n} feito={e.atrasada} ponta={["3'", "5'"]} testid="nova-atrasada" />
        <Fita rotulo={`Nova sobre o molde 2 — contínua (${nLider}/${n})`} seq={trecho} ate={nLider} testid="nova-lider" />
        <Fita rotulo="Molde 2 (a complementar)" seq={comp} ate={n} ponta={["3'", "5'"]} />
        {l.tBruto >= ultimo && (
          <p className="text-sm text-ok" data-testid="resultado-replicacao">
            ✓ Duas cópias: a fita nova da contínua tem a mesma sequência da sua fita, e a da atrasada é a complementar.{exemplo ? " (exemplo fictício)" : ""}
          </p>
        )}
      </div>
      <Simplificacoes itens={SIMPLIFICACOES.replicacao} />
    </Secao>
  );
}

// ---------------------------------------------------------------- transcrição

function Transcricao({ seq, fita, nome }: { seq: string; fita: "codificante" | "molde"; nome: string }) {
  const paleta = usePaleta();
  const setFita = useBioMol((s) => s.setFita);
  const tr = useMemo(() => transcrever(seq, fita), [seq, fita]);
  const [inicio, setInicio] = useState(0);
  const cod = tr.codificante.slice(inicio, inicio + JANELA);
  const rna = tr.rna.slice(inicio, inicio + JANELA);
  const l = useLinhaDoTempo(duracaoTranscricao(rna.length), `tr:${cod}`);
  const e = estadoTranscricao(rna, l.t);
  const molde = complemento(cod, "dna");
  const etapa = l.t < 0.5 ? 0 : e.terminou ? 4 : e.pos < 3 ? 1 : e.rna.length > 8 ? 3 : 2;
  const agora = e.terminou
    ? `Término: o mRNA de ${rna.length} nucleotídeos se solta e o DNA se fecha de novo.`
    : e.pos < rna.length
      ? `A polimerase lê ${molde[e.pos]} na fita molde e põe ${rna[e.pos]} no RNA (posição ${inicio + e.pos + 1}). O RNA cresce 5'→3'; a molde é lida 3'→5'.`
      : "A polimerase chega ao fim do trecho.";
  return (
    <Secao titulo={`Transcrição — ${nome}`} id="transcricao-processo">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        A sequência colada é a fita
        <Segmentado
          rotulo="Fita fornecida"
          valor={fita}
          aoMudar={setFita}
          opcoes={[
            { valor: "codificante", rotulo: "codificante" },
            { valor: "molde", rotulo: "molde" },
          ]}
        />
        <span className="text-xs text-muted">{fita === "molde" ? "Por isso a fita de cima mostra o reverso-complemento do que você colou." : "A fita de baixo, a molde, é a que a polimerase lê."}</span>
      </div>
      <Janela total={tr.rna.length} inicio={inicio} setInicio={setInicio} tamanho={JANELA} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-2">
          {paleta && (
            <Palco rotulo={`Transcrição esquemática: ${e.rna.length} de ${rna.length} nucleotídeos de RNA sintetizados.`}>
              <CenaTranscricao codificante={cod} rna={rna} t={l.t} paleta={paleta} movimento={l.movimento} />
            </Palco>
          )}
          <Controles l={l} rotuloPasso="Nucleotídeo" />
        </div>
        <div className="grid content-start gap-3">
          <Etapas
            itens={["A RNA polimerase se liga e abre o DNA (bolha)", "Seleção da fita molde: lida 3'→5'", "O RNA cresce 5'→3', complementar à molde", "O RNA se solta e o DNA se fecha atrás", "Término: mRNA pronto"]}
            atual={etapa}
          />
          <p className="rounded-lg border border-line p-3 text-sm" aria-live="polite" data-testid="agora-processo">
            {agora}
          </p>
        </div>
      </div>
      <div className="grid gap-2 rounded-xl border border-line p-3">
        <Fita rotulo="Fita codificante" seq={cod} ate={cod.length} />
        <Fita rotulo="Fita molde (lida pela polimerase)" seq={molde} ate={molde.length} ponta={["3'", "5'"]} />
        <Fita rotulo={`RNA sintetizado (${e.rna.length}/${rna.length})`} seq={rna} ate={e.rna.length} testid="rna-sintetizado" />
        {e.terminou && (
          <p className="text-sm text-ok" data-testid="resultado-transcricao">
            ✓ Igual ao mRNA calculado na aba Sequências{inicio > 0 || tr.rna.length > JANELA ? " (no trecho animado)" : ""}: {rna === tr.rna.slice(inicio, inicio + JANELA) ? "confere" : "não confere"}.
          </p>
        )}
      </div>
      <Simplificacoes itens={SIMPLIFICACOES.transcricao} />
    </Secao>
  );
}

// ---------------------------------------------------------------- tradução

function Traducao({ seq, tipo, fita, codigo, nome }: { seq: string; tipo: "dna" | "rna"; fita: "codificante" | "molde" | null; codigo: number; nome: string }) {
  const paleta = usePaleta();
  const mrnaTotal = useMemo(() => (tipo === "rna" ? seq : transcrever(seq, fita ?? "codificante").rna), [seq, tipo, fita]);
  const cod = codigoGenetico(codigo);
  const roteiroTotal = useMemo(() => roteiroTraducao(mrnaTotal, cod), [mrnaTotal, cod]);
  // recorte: um pouco antes do AUG até a parada (no máximo MAX_CODONS códons)
  const ini = Math.max(0, roteiroTotal.inicio - 6);
  const fimCod = roteiroTotal.inicio < 0 ? 0 : roteiroTotal.inicio + 3 * Math.min(roteiroTotal.passos.length + (roteiroTotal.parada ? 1 : 0), MAX_CODONS);
  const mrna = mrnaTotal.slice(ini, Math.min(mrnaTotal.length, fimCod + 6));
  const roteiro = useMemo(() => roteiroTraducao(mrna, cod, roteiroTotal.inicio < 0 ? undefined : roteiroTotal.inicio - ini), [mrna, cod, roteiroTotal.inicio, ini]);
  const cortado = roteiroTotal.passos.length > MAX_CODONS;
  const l = useLinhaDoTempo(duracaoTraducao(roteiro), `trad:${mrna}:${codigo}`);
  const e = estadoTraducao(roteiro, l.t);

  if (roteiroTotal.inicio < 0) {
    return (
      <Secao titulo={`Tradução — ${nome}`} id="traducao-processo">
        <p className="text-sm" data-testid="sem-aug">
          Não há nenhum AUG neste RNA, então o ribossomo não tem onde começar. {tipo === "dna" ? `(O RNA vem da fita ${fita}.)` : ""}
        </p>
      </Secao>
    );
  }

  const etapa = { varredura: 0, inicio: 1, alongamento: 2, terminacao: 3, fim: 3 }[e.fase];
  const pAtual = e.p >= 0 ? roteiro.passos[e.p] : null;
  const aAtual = e.a >= 0 ? roteiro.passos[e.a] : null;
  const agora =
    e.fase === "varredura"
      ? `A subunidade pequena do ribossomo entra pelo 5' e percorre o mRNA até o primeiro AUG (posição ${ini + roteiro.inicio + 1}).`
      : e.fase === "inicio"
        ? "Início: o tRNA iniciador, com metionina e anticódon 3'-UAC-5', pareia com o AUG no sítio P; a subunidade grande se junta."
        : e.fase === "alongamento" && aAtual
          ? `Alongamento: o tRNA com anticódon 3'-${[...aAtual.anticodon].reverse().join("")}-5' traz ${AMINOACIDOS[aAtual.aa]?.nome ?? aAtual.aa} para o códon ${aAtual.codon} (sítio A); a cadeia passa para ele (ligação peptídica).`
          : e.fase === "alongamento" && pAtual
            ? `Translocação: o ribossomo anda um códon (3 bases). O tRNA vazio sai pelo sítio E; ${pAtual.codon} (${AMINOACIDOS[pAtual.aa]?.tres}) fica no sítio P.`
            : e.fase === "terminacao" && roteiro.parada
              ? `Parada: ${roteiro.parada.codon} não tem tRNA; um fator de liberação entra e solta a cadeia de ${roteiro.proteina.length} aminoácidos.`
              : `Fim: as subunidades se separam. Proteína: ${roteiro.proteina.length} aminoácidos${roteiro.parada ? "" : " (o mRNA acabou antes de uma parada)"}.`;

  return (
    <Secao titulo={`Tradução — ${nome}`} id="traducao-processo">
      <p className="text-xs text-muted">
        Código genético {cod.id} ({cod.nome}). {tipo === "dna" ? `O mRNA vem da transcrição da sua sequência (fita ${fita}).` : "A sequência ativa já é RNA."}
        {cortado ? ` A proteína tem ${roteiroTotal.passos.length} aminoácidos; a animação mostra os primeiros ${MAX_CODONS}.` : ""}
      </p>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-2">
          {paleta && (
            <Palco rotulo={`Tradução esquemática: ${e.peptideo.length} aminoácidos na cadeia.`}>
              <CenaTraducao mrna={mrna} roteiro={roteiro} t={l.t} paleta={paleta} movimento={l.movimento} />
            </Palco>
          )}
          <Controles l={l} rotuloPasso="Códon" />
        </div>
        <div className="grid content-start gap-3">
          <Etapas itens={["Varredura até o códon de início (AUG)", "Início: tRNA iniciador (Met) no sítio P", "Alongamento: entra tRNA, ligação peptídica, translocação", "Parada e liberação da cadeia"]} atual={etapa} />
          <p className="rounded-lg border border-line p-3 text-sm" aria-live="polite" data-testid="agora-processo">
            {agora}
          </p>
        </div>
      </div>
      <div className="grid gap-2 rounded-xl border border-line p-3">
        <div className="grid gap-0.5">
          <span className="text-xs text-muted">mRNA (códons a partir do AUG)</span>
          <p className="ge-mono break-all text-[12.5px] leading-6" data-testid="codons">
            <span className="text-muted">5' {mrna.slice(0, roteiro.inicio)} </span>
            {roteiro.passos.map((p, i) => (
              <span key={i} className={`mr-1 rounded px-0.5 ${i === e.p ? "bg-ok-soft text-ok" : i === e.a ? "bg-violet-soft text-violet" : i < e.peptideo.length ? "" : "text-muted/50"}`}>
                {p.codon}
              </span>
            ))}
            {roteiro.parada && <span className={`mr-1 rounded px-0.5 ${e.fase === "terminacao" || e.fase === "fim" ? "bg-warn-soft text-warn" : "text-muted/50"}`}>{roteiro.parada.codon}</span>}
            <span className="text-muted"> 3'</span>
          </p>
        </div>
        <div className="grid gap-0.5">
          <span className="text-xs text-muted">Cadeia polipeptídica (N → C)</span>
          <p className="ge-mono break-all text-[13px] font-semibold" data-testid="peptideo">
            {e.peptideo || "—"}
          </p>
        </div>
        {e.fase === "fim" && (
          <p className="text-sm text-ok" data-testid="resultado-traducao">
            ✓ A proteína montada é {roteiro.proteina === roteiroTotal.proteina.slice(0, MAX_CODONS) ? "igual" : "DIFERENTE"} à tradução calculada na aba Sequências
            {cortado ? ` (nos primeiros ${MAX_CODONS} aminoácidos)` : ""}.
          </p>
        )}
        {tipo === "dna" && <p className="text-xs text-muted">DNA usado: {rnaParaDna(mrna).slice(0, 12)}… → mRNA {mrna.slice(0, 12)}…</p>}
      </div>
      <Simplificacoes itens={SIMPLIFICACOES.traducao} />
    </Secao>
  );
}
