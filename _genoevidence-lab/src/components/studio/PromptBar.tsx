"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useIdeia } from "@/store/ideia";
import { interpretarDescricao } from "@/lib/ideia/parse";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type Ctor = new () => Recognition;
const getSR = (): Ctor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const ERROS: Record<string, string> = {
  "not-allowed": "O navegador não deu permissão para o microfone.",
  "service-not-allowed": "O reconhecimento de voz está bloqueado neste navegador.",
  "no-speech": "Nenhuma fala detectada.",
  "audio-capture": "Nenhum microfone encontrado.",
  network: "O reconhecimento de voz precisa de internet e não conseguiu se conectar.",
};
const LIMITE_MS = 120_000;

export const EXEMPLOS = [
  {
    rotulo: "PCR completa (com valores)",
    texto:
      "Quero amplificar o gene GAPDH de cDNA de 6 amostras. Reação de 25 µL com MgCl2 1,5 mM, dNTPs 200 µM cada, primers 0,4 µM e 1,25 U de Taq. Desnaturação inicial a 95 °C por 3 min; 35 ciclos de desnaturação a 95 °C por 30 s, anelamento a 58 °C por 30 s e extensão a 72 °C por 45 s; extensão final de 5 min a 72 °C. Tm dos primers de 62 °C. Amplicon de 450 pb. Vou incluir controle negativo. Gel de agarose 1,5% com marcador. Espero ver uma banda de 450 pb.",
  },
  { rotulo: "Unidades a conferir", texto: "PCR com 30 ciclos de 94ºC/30 seg, 55C/30s, 72 graus/1 min. MgCl2 1,5 M e primer 200 nM, Taq. Amplicon de 1,2 kb." },
  { rotulo: "Informações ausentes", texto: "Vou fazer uma PCR para detectar o gene 16S nas amostras, anelamento a 55, sem controle negativo." },
  { rotulo: "Técnica sem módulo", texto: "Quero fazer qPCR com SYBR Green para o gene ACTB. Preparar a placa, rodar 40 ciclos e analisar a curva de melting." },
  { rotulo: "O que estou fazendo agora", texto: "Estou pipetando o primer forward no master mix" },
];

function Icone({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}

export function PromptBar({ onEnviar, onArquivo, aviso }: { onEnviar: (texto: string) => void; onArquivo: (f: File) => void; aviso?: string | null }) {
  const s = useIdeia();
  const [ouvindo, setOuvindo] = useState(false);
  const [erroVoz, setErroVoz] = useState<string | null>(null);
  const [suporteVoz, setSuporteVoz] = useState(false);
  const [conferido, setConferido] = useState(false);
  const [exemplos, setExemplos] = useState(false);
  const [foco, setFoco] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSuporteVoz(Boolean(getSR()));
    return () => {
      recRef.current?.stop();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // altura automática (até ~5 linhas)
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "0px";
    // recolhida (2 linhas) fora de uso, para não cobrir a cena
    el.style.height = Math.min(foco ? 140 : 48, el.scrollHeight) + "px";
  }, [s.texto, foco]);

  const previa = useMemo(() => (s.via === "voz" && s.texto.trim().length > 3 ? interpretarDescricao(s.texto, { id: "previa", via: "voz" }) : null), [s.texto, s.via]);

  const iniciarVoz = () => {
    const SR = getSR();
    if (!SR || ouvindo) return;
    setErroVoz(null);
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = true;
    const antes = s.texto.trim();
    rec.onresult = (e) => {
      let dito = "";
      for (let i = 0; i < e.results.length; i++) dito += e.results[i][0].transcript;
      useIdeia.getState().setTexto((antes ? antes + " " : "") + dito.trim(), "voz");
      setConferido(false);
    };
    rec.onerror = (e) => setErroVoz(ERROS[e.error] ?? "O reconhecimento de voz falhou. Digite a descrição.");
    rec.onend = () => {
      setOuvindo(false);
      if (timer.current) clearTimeout(timer.current);
    };
    recRef.current = rec;
    try {
      rec.start(); // a permissão do microfone é pedida só aqui
      setOuvindo(true);
      timer.current = setTimeout(() => rec.stop(), LIMITE_MS);
    } catch {
      setErroVoz("Não foi possível iniciar o microfone.");
    }
  };

  const precisaConferir = s.via === "voz";
  const pronto = s.texto.trim().length >= 6 && (!precisaConferir || conferido) && !ouvindo;
  const enviar = () => {
    if (!pronto) return;
    onEnviar(s.texto.trim());
  };

  return (
    <div className="pointer-events-auto grid gap-2">
      <AnimatePresence>
        {(precisaConferir && s.texto.trim() && !ouvindo) || erroVoz || aviso || ouvindo ? (
          <motion.div key="extra" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="ge-glass p-3 text-[13px]">
            {ouvindo && (
              <p role="status" className="flex items-center gap-2 text-white">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff5470]" aria-hidden="true" />
                Gravando… fale o procedimento e clique em “Encerrar”. Para sozinho após 2 minutos.
              </p>
            )}
            {precisaConferir && s.texto.trim() && !ouvindo && (
              <div role="group" aria-labelledby="conferir-transcricao">
                <p id="conferir-transcricao" className="font-semibold text-white">
                  Confira a transcrição antes de interpretar
                </p>
                <p className="text-xs text-[#a7b2c8]">Reconhecimento de voz erra nomes científicos, números e unidades. Edite o texto se precisar. Valores encontrados:</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {previa?.extracoes.length ? (
                    previa.extracoes.map((x, i) => (
                      <li key={i} className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs text-white">
                        {x.original}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-[#a7b2c8]">nenhum valor com unidade reconhecido</li>
                  )}
                </ul>
                <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-white">
                  <input type="checkbox" checked={conferido} onChange={(e) => setConferido(e.target.checked)} />
                  Conferi nomes, valores e unidades
                </label>
              </div>
            )}
            {erroVoz && <p className="text-xs text-[#ff5470]">{erroVoz}</p>}
            {aviso && <p className="text-xs text-[#ffb23f]">{aviso}</p>}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {exemplos && (
        <div className="ge-glass p-2" role="menu" aria-label="Exemplos">
          {EXEMPLOS.map((ex) => (
            <button
              key={ex.rotulo}
              type="button"
              role="menuitem"
              onClick={() => {
                s.setTexto(ex.texto, "texto");
                setConferido(false);
                setExemplos(false);
                area.current?.focus();
              }}
              className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] text-[#c9d2e3] hover:bg-white/10 hover:text-white"
            >
              {ex.rotulo}
            </button>
          ))}
        </div>
      )}

      <form
        className="ge-prompt flex items-end gap-2 px-3 py-2.5 sm:px-4"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <span aria-hidden="true" className="mb-1.5 shrink-0">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <defs>
              <linearGradient id="faisca" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e679b5" />
                <stop offset="1" stopColor="#7b4de0" />
              </linearGradient>
            </defs>
            <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="url(#faisca)" />
          </svg>
        </span>
        <label htmlFor="prompt-ideia" className="sr-only">
          Descreva o que você quer fazer. Vamos explorar no laboratório.
        </label>
        <textarea
          id="prompt-ideia"
          ref={area}
          rows={1}
          value={s.texto}
          onChange={(e) => {
            s.setTexto(e.target.value, s.via === "voz" ? "voz" : e.target.value.length > 400 ? "protocolo" : "texto");
            setConferido(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          maxLength={8000}
          placeholder="Descreva sua ideia ou procedimento"
          className="min-h-[28px] flex-1 resize-none bg-transparent py-1 text-[15px] text-white outline-none placeholder:text-[#a7b2c8]"
        />
        <div className="mb-0.5 flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setExemplos(!exemplos)} aria-expanded={exemplos} title="Exemplos" className="ge-press rounded-lg p-1.5 text-[#c9d2e3] hover:bg-white/10 hover:text-white">
            <Icone d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
            <span className="sr-only">Exemplos</span>
          </button>
          <label title="Anexar protocolo (.txt, .md ou .pdf)" className="ge-press cursor-pointer rounded-lg p-1.5 text-[#c9d2e3] hover:bg-white/10 hover:text-white">
            <Icone d="M20 11.5 12.4 19a5 5 0 0 1-7.1-7.1l7.8-7.8a3.3 3.3 0 0 1 4.7 4.7l-7.8 7.8a1.7 1.7 0 0 1-2.4-2.4l7.1-7.1" />
            <span className="sr-only">Anexar protocolo</span>
            <input type="file" accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && onArquivo(e.target.files[0])} />
          </label>
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/15" />
          {suporteVoz &&
            (ouvindo ? (
              <button type="button" onClick={() => recRef.current?.stop()} className="ge-press inline-flex items-center gap-1.5 rounded-full bg-[#ff5470] px-3 py-1.5 text-[13px] font-semibold text-white">
                <span aria-hidden="true">■</span> Encerrar
              </button>
            ) : (
              <button type="button" onClick={iniciarVoz} title="Iniciar microfone" className="ge-press rounded-lg p-1.5 text-[#c9d2e3] hover:bg-white/10 hover:text-white">
                <Icone d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
                <span className="sr-only">Iniciar microfone</span>
              </button>
            ))}
          <button type="submit" disabled={!pronto} title="Interpretar" className="ge-press grid h-9 w-9 place-items-center rounded-full text-white disabled:opacity-35" style={{ background: "var(--ge-gradient)" }}>
            <Icone d="M5 12h14M13 6l6 6-6 6" />
            <span className="sr-only">Interpretar</span>
          </button>
        </div>
      </form>
      {suporteVoz && <p className="px-2 text-center text-[10.5px] text-[#7d8aa3]">Microfone só quando ativado; transcrição feita pelo navegador (no Chrome/Edge o áudio vai ao serviço do fabricante). O GenoLab não grava o áudio.</p>}
    </div>
  );
}
