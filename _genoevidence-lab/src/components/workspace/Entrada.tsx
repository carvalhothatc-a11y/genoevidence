"use client";
import { useMemo, useRef, useState } from "react";
import { extrairQuantidades, formatarValor } from "@/lib/experimento/quantidades";
import { interpretarRoteiro } from "@/lib/visual/roteiro";
import { temConteudo, useExperimento } from "@/store/experimento";
import { adicionarImagem, adicionarReferencias, adicionarRelatorio, adicionarTabela } from "./acoesMateriais";
import { IC, Icone } from "./ui";
import { useVoz } from "./useVoz";

export const EXEMPLOS_AREA = [
  { rotulo: "Uma ação", texto: "Estou pipetando 2 µL do primer forward no master mix." },
  { rotulo: "Sequência curta", texto: "Pipetei 2 µL do DNA molde no tubo com master mix. Depois coloquei no termociclador: 30 ciclos de 95 °C por 30 s, anelamento a 58 °C por 30 s e 72 °C por 45 s. Por fim, corri o gel de agarose 1,5%." },
  { rotulo: "Clonagem", texto: "Cortei o plasmídeo pUC19 com EcoRI, inseri o produto de PCR do gene GFP e transformei E. coli DH5α por choque térmico a 42 °C. Plaqueei em ágar com ampicilina." },
];

/** Termos reconhecidos no texto (grandezas, genes, organismos, enzimas) para conferência antes do uso. */
function TermosReconhecidos({ texto }: { texto: string }) {
  const { qs, nomes } = useMemo(() => {
    const qs = extrairQuantidades(texto).slice(0, 16);
    const nomes = new Set<string>();
    for (const p of texto.trim() ? interpretarRoteiro(texto) : []) for (const v of [p.rotulos.gene, p.rotulos.organismo, p.rotulos.enzima, p.rotulos.antibiotico]) if (v) nomes.add(v);
    return { qs, nomes: [...nomes].slice(0, 10) };
  }, [texto]);
  if (!qs.length && !nomes.length) return null;
  return (
    <div className="grid gap-1.5" aria-live="polite" data-testid="termos-reconhecidos">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7d8aa3]">Confira antes de usar</p>
      <ul className="flex flex-wrap gap-1.5">
        {qs.map((q, i) => (
          <li key={`q${i}`} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[12px]" data-termo="grandeza">
            <span className="ge-mono text-[#ffd08a]">{q.original}</span>
            <span className="text-[#7d8aa3]"> → </span>
            <span className="text-white">{formatarValor(q.valor, q.unidade)}</span>
            <span className="text-[#a7b2c8]"> · {q.nome.toLowerCase()}</span>
            {q.unidade !== q.unidadeCanonica && <span className="text-[#a7b2c8]"> ({formatarValor(q.valorCanonico, q.unidadeCanonica)})</span>}
          </li>
        ))}
        {nomes.map((n) => (
          <li key={n} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[12px] italic text-[#cdbcff]" data-termo="nome">
            {n}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-[#7d8aa3]">Se algo estiver errado, corrija no texto: nada é usado sem passar por aqui.</p>
    </div>
  );
}

export function Entrada({ compacta, onCriar, onAviso }: { compacta: boolean; onCriar: () => void; onAviso: (t: { tom: "ok" | "erro" | "aviso"; texto: string } | null) => void }) {
  const s = useExperimento();
  const voz = useVoz();
  const [refAberta, setRefAberta] = useState(false);
  const [refTexto, setRefTexto] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  /** Origem “áudio” vale enquanto a transcrição usada continuar no texto; depois de reescrita, é texto. */
  const ultimaFala = useRef<string | null>(null);
  const inImg = useRef<HTMLInputElement>(null);
  const inTab = useRef<HTMLInputElement>(null);
  const inRel = useRef<HTMLInputElement>(null);
  const pode = temConteudo(s);

  const comArquivos = async (files: FileList | null, tipo: "imagem" | "tabela" | "relatorio") => {
    if (!files?.length) return;
    onAviso(null);
    setOcupado(tipo);
    const avisos: string[] = [];
    for (const f of Array.from(files).slice(0, 8)) {
      const r = tipo === "imagem" ? adicionarImagem(f) : tipo === "tabela" ? await adicionarTabela(f) : await adicionarRelatorio(f);
      if (!r.ok) avisos.push(r.erro);
      else if (r.aviso) avisos.push(`${f.name}: ${r.aviso}`);
    }
    setOcupado(null);
    if (avisos.length) onAviso({ tom: avisos.some((a) => !a.includes(":")) ? "erro" : "aviso", texto: avisos.join(" ") });
  };

  const usarTranscricao = () => {
    const t = voz.transcricao.trim();
    if (!t) return;
    ultimaFala.current = t;
    s.setTexto(s.texto.trim() ? `${s.texto.trim()}\n${t}` : t, "voz");
    voz.limpar();
  };

  return (
    <section aria-labelledby="titulo-entrada" className={`ge-glass flex flex-col gap-3 p-4 ${compacta ? "" : "ring-1 ring-[#7b4de0]/40 shadow-[0_0_60px_-20px_rgba(123,77,224,0.6)]"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="titulo-entrada" className={`font-semibold tracking-[-0.01em] text-white ${compacta ? "text-[15px]" : "text-[20px]"}`}>
          {compacta ? "Sua descrição" : "Explique o que você quer fazer"}
        </h2>
        {!compacta && <span className="text-[11px] text-[#7d8aa3]">objetivo, procedimento, uma ação, condições ou dúvida</span>}
      </div>
      <label htmlFor="descricao" className="sr-only">
        Descreva sua ideia ou procedimento
      </label>
      <textarea
        id="descricao"
        value={s.texto}
        onChange={(e) => s.setTexto(e.target.value, s.via === "voz" && ultimaFala.current && e.target.value.includes(ultimaFala.current) ? "voz" : "texto")}
        placeholder="Descreva sua ideia ou procedimento. Ex.: “Pipetei 2 µL do DNA molde no master mix e levei ao termociclador.”"
        rows={compacta ? 3 : 7}
        maxLength={8000}
        className="w-full resize-y rounded-xl border border-white/12 bg-[#060a13]/60 px-3.5 py-3 text-[15px] leading-relaxed text-white placeholder:text-[#7d8aa3] focus:border-[#b49cf5] focus:outline-none focus:ring-2 focus:ring-[#7b4de0]/40"
      />

      {/* Gravação: início, encerramento e transcrição editável */}
      {voz.suporte && (voz.gravando || voz.transcricao) && (
        <div className="grid gap-2 rounded-xl border border-[#e679b5]/30 bg-[#e0385a]/[0.06] p-3" data-testid="transcricao">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-2 font-semibold text-white">
              {voz.gravando && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff5470]" aria-hidden="true" />}
              {voz.gravando ? `Gravando… ${Math.floor(voz.segundos / 60)}:${String(voz.segundos % 60).padStart(2, "0")} (máx. 2:00)` : "Transcrição — revise antes de usar"}
            </span>
            {voz.gravando && (
              <button type="button" onClick={voz.parar} className="ge-press rounded-full bg-[#ff5470] px-3 py-1 text-[12px] font-semibold text-white">
                Encerrar gravação
              </button>
            )}
          </div>
          <label htmlFor="transcricao-texto" className="sr-only">
            Transcrição editável
          </label>
          <textarea id="transcricao-texto" value={voz.transcricao + (voz.parcial ? ` ${voz.parcial}` : "")} onChange={(e) => voz.setTranscricao(e.target.value)} rows={3} readOnly={voz.gravando} className="w-full rounded-lg border border-white/12 bg-[#060a13]/60 px-3 py-2 text-[14px] text-white" />
          {!voz.gravando && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={usarTranscricao} className="ge-press rounded-full bg-[#7b4de0] px-3 py-1.5 text-[12px] font-semibold text-white">
                Usar na descrição
              </button>
              <button type="button" onClick={voz.limpar} className="ge-press rounded-full px-3 py-1.5 text-[12px] text-[#c9d2e3] hover:bg-white/10">
                Descartar
              </button>
            </div>
          )}
        </div>
      )}
      {voz.erro && <p className="text-[12px] text-[#ffb23f]" role="alert">{voz.erro}</p>}

      <TermosReconhecidos texto={s.texto} />

      {/* Opções de entrada */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Adicionar materiais">
        <BotaoEntrada icone={IC.mic} rotulo={voz.gravando ? "Gravando…" : "Gravar áudio"} onClick={voz.gravando ? voz.parar : voz.iniciar} disabled={!voz.suporte} ativo={voz.gravando} dica={voz.suporte ? "O microfone só liga quando você clica. O reconhecimento é feito pelo navegador; no Chrome, o áudio é processado por servidores do Google. O GenoLab não grava o áudio." : "Este navegador não oferece reconhecimento de voz."} />
        <BotaoEntrada icone={IC.imagem} rotulo={ocupado === "imagem" ? "Adicionando…" : "Imagem"} onClick={() => inImg.current?.click()} dica="Fotos de materiais, equipamentos, amostras, etapas, resultados ou anotações (PNG, JPEG, WebP)." />
        <BotaoEntrada icone={IC.tabela} rotulo={ocupado === "tabela" ? "Lendo…" : "Tabela"} onClick={() => inTab.current?.click()} dica="CSV ou XLSX com condições ou resultados." />
        <BotaoEntrada icone={IC.relatorio} rotulo={ocupado === "relatorio" ? "Lendo…" : "Relatório"} onClick={() => inRel.current?.click()} dica="PDF, DOCX ou TXT com etapas e condições." />
        <BotaoEntrada icone={IC.referencia} rotulo="Referências" onClick={() => setRefAberta((v) => !v)} ativo={refAberta} dica="DOI, link ou referência bibliográfica." />
        <input ref={inImg} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => (void comArquivos(e.target.files, "imagem"), (e.target.value = ""))} data-testid="input-imagem" />
        <input ref={inTab} type="file" accept=".csv,.tsv,.xlsx" className="hidden" onChange={(e) => (void comArquivos(e.target.files, "tabela"), (e.target.value = ""))} data-testid="input-tabela" />
        <input ref={inRel} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => (void comArquivos(e.target.files, "relatorio"), (e.target.value = ""))} data-testid="input-relatorio" />
      </div>

      {refAberta && (
        <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <label htmlFor="ref-texto" className="text-[12px] font-semibold text-white">
            Referências (uma por linha): DOI, link ou citação
          </label>
          <textarea id="ref-texto" value={refTexto} onChange={(e) => setRefTexto(e.target.value)} rows={3} placeholder="10.3791/3998&#10;https://…&#10;Autor A. Título. Revista. 2024." className="w-full rounded-lg border border-white/12 bg-[#060a13]/60 px-3 py-2 text-[13px] text-white placeholder:text-[#7d8aa3]" />
          <p className="text-[11px] text-[#7d8aa3]">Referências ficam “cadastradas”: o conteúdo não é lido automaticamente. Para que um documento seja analisado, anexe-o como relatório.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const n = adicionarReferencias(refTexto);
                if (n) {
                  setRefTexto("");
                  setRefAberta(false);
                  onAviso({ tom: "ok", texto: `${n} referência(s) cadastrada(s).` });
                }
              }}
              className="ge-press rounded-full bg-[#7b4de0] px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              Adicionar
            </button>
            <button type="button" onClick={() => setRefAberta(false)} className="ge-press rounded-full px-3 py-1.5 text-[12px] text-[#c9d2e3] hover:bg-white/10">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!compacta && !s.texto && (
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="text-[#7d8aa3]">Exemplos:</span>
          {EXEMPLOS_AREA.map((x) => (
            <button key={x.rotulo} type="button" onClick={() => s.setTexto(x.texto, "texto")} className="ge-press rounded-full border border-white/12 px-2.5 py-1 text-[#c9d2e3] hover:border-[#b49cf5]/60 hover:text-white">
              {x.rotulo}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onCriar}
        disabled={!pode}
        className="ge-press mt-1 rounded-full px-5 py-3 text-[15px] font-semibold text-white shadow-[0_8px_30px_-10px_rgba(224,56,90,0.7)] transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "linear-gradient(100deg,#2F5BEA,#7B4DE0 55%,#E0385A)" }}
      >
        {s.versoes.length ? "Atualizar visualização" : "Criar visualização"}
      </button>
      {!pode && <p className="-mt-1 text-center text-[11px] text-[#7d8aa3]">Escreva, grave, ou adicione um material com conteúdo para começar. Não é preciso criar um projeto antes.</p>}
    </section>
  );
}

function BotaoEntrada({ icone, rotulo, onClick, disabled, ativo, dica }: { icone: string; rotulo: string; onClick: () => void; disabled?: boolean; ativo?: boolean; dica: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={dica}
      aria-pressed={ativo}
      className={`ge-press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium disabled:opacity-40 ${ativo ? "border-[#e679b5]/70 bg-[#e0385a]/15 text-white" : "border-white/12 text-[#c9d2e3] hover:border-[#b49cf5]/60 hover:bg-white/5 hover:text-white"}`}
    >
      <Icone d={icone} size={16} />
      {rotulo}
    </button>
  );
}
