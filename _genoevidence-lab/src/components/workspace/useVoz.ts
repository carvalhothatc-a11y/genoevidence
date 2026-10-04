"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reconhecimento de voz do navegador. O microfone só é acionado quando a pessoa clica em gravar;
 * a gravação para sozinha em 2 minutos. Nada é gravado pelo GenoLab: recebe-se apenas o texto.
 */
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
export const LIMITE_VOZ_MS = 120_000;

export function useVoz() {
  const [suporte, setSuporte] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [transcricao, setTranscricao] = useState("");
  const [parcial, setParcial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [agora, setAgora] = useState(0);
  const rec = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSuporte(Boolean(getSR()));
    return () => {
      rec.current?.stop();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!gravando) return;
    const i = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(i);
  }, [gravando]);

  const parar = useCallback(() => {
    rec.current?.stop();
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const iniciar = useCallback(() => {
    const SR = getSR();
    if (!SR) return setErro("Este navegador não oferece reconhecimento de voz. Escreva a descrição.");
    setErro(null);
    setParcial("");
    const r = new SR();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      let finais = "";
      let temp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finais += res[0].transcript;
        else temp += res[0].transcript;
      }
      if (finais) setTranscricao((t) => (t ? `${t.trim()} ${finais.trim()}` : finais.trim()));
      setParcial(temp);
    };
    r.onerror = (e) => setErro(ERROS[e.error] ?? "O reconhecimento de voz falhou.");
    r.onend = () => {
      setGravando(false);
      setParcial("");
      setInicio(null);
      if (timer.current) clearTimeout(timer.current);
    };
    rec.current = r;
    try {
      r.start();
      setGravando(true);
      setInicio(Date.now());
      setAgora(Date.now());
      timer.current = setTimeout(() => r.stop(), LIMITE_VOZ_MS);
    } catch {
      setErro("Não foi possível iniciar o microfone.");
    }
  }, []);

  const segundos = gravando && inicio ? Math.max(0, Math.floor((agora - inicio) / 1000)) : 0;
  return { suporte, gravando, transcricao, setTranscricao, parcial, erro, iniciar, parar, segundos, limpar: () => setTranscricao("") };
}
