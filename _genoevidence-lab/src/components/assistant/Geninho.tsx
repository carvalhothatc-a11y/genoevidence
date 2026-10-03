"use client";
import { useEffect, useRef, useState } from "react";
import { GeninhoAvatar } from "./GeninhoAvatar";
import { RichText } from "./RichText";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean; note?: string };

const SUGGESTIONS = [
  "Como escolho a temperatura de anelamento dos meus primers?",
  "Quais controles devo incluir numa PCR convencional?",
  "Qual a diferença entre PCR, RT-PCR e qPCR?",
  "Como normalizar dados de expressão gênica de qPCR?",
];

const MAX_MESSAGES = 16;
const MAX_CHARS = 4000;

const STOP_NOTES: Record<string, string> = {
  max_tokens: "A resposta foi interrompida por ser longa demais. Peça para continuar ou faça uma pergunta mais específica.",
  refusal: "O Geninho não pode ajudar com este pedido.",
};

export function Geninho({ configured, isAdmin, motivo }: { configured: boolean; isAdmin: boolean; motivo?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = async (question: string) => {
    const q = question.trim().slice(0, MAX_CHARS);
    if (!q || busy) return;
    const history: Msg[] = [...messages.filter((m) => !m.error && m.content), { role: "user", content: q }];
    // Mantém só as últimas mensagens, começando por uma pergunta.
    let payload = history.slice(-MAX_MESSAGES);
    while (payload.length && payload[0].role !== "user") payload = payload.slice(1);
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setStatus("O Geninho está pensando…");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const update = (fn: (m: Msg) => Msg) =>
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = fn(next[next.length - 1]);
        return next;
      });
    try {
      const res = await fetch("/api/geninho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload.map(({ role, content }) => ({ role, content: content.slice(0, MAX_CHARS) })) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        update((m) => ({ ...m, content: data.error ?? "O Geninho não conseguiu responder agora.", error: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const raw = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!raw.trim()) continue;
          const ev = JSON.parse(raw) as { t: "texto" | "fim" | "erro"; v?: string; motivo?: string };
          if (ev.t === "texto" && ev.v) {
            setStatus("O Geninho está respondendo…");
            update((m) => ({ ...m, content: m.content + ev.v }));
          } else if (ev.t === "erro") update((m) => ({ ...m, content: m.content || ev.v || "", error: !m.content, note: m.content ? ev.v : undefined }));
          else if (ev.t === "fim" && ev.motivo && STOP_NOTES[ev.motivo]) update((m) => ({ ...m, note: STOP_NOTES[ev.motivo!] }));
        }
      }
    } catch {
      if (ctrl.signal.aborted) update((m) => ({ ...m, note: "Resposta interrompida." }));
      else update((m) => ({ ...m, content: m.content || "Falha de conexão com o GenoLab.", error: !m.content }));
    } finally {
      setBusy(false);
      setStatus("Resposta concluída.");
      abortRef.current = null;
    }
  };

  return (
    <section aria-labelledby="geninho-titulo" className="ge-card overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-[linear-gradient(90deg,rgba(47,91,234,0.07),rgba(123,77,224,0.07)_55%,rgba(224,56,90,0.07))] p-4 sm:px-6">
        <GeninhoAvatar size={48} />
        <div className="min-w-0 flex-1">
          <h2 id="geninho-titulo" className="ge-display text-xl">
            Geninho
          </h2>
          <p className="text-sm text-muted">Assistente de IA para dúvidas de pesquisa em biologia molecular.</p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${configured ? "border-ok/30 bg-ok-soft text-ok" : "border-warn/30 bg-warn-soft text-warn"}`}>
          {configured ? "Ligado" : "Não configurado"}
        </span>
      </header>

      {!configured ? (
        <div className="grid gap-2 p-4 text-sm sm:p-6">
          <p className="font-semibold">O Geninho ainda não está ligado neste servidor.</p>
          {isAdmin ? (
            <>
              {motivo && <p className="text-warn">{motivo}</p>}
              <p>Para ativar, defina no arquivo <code className="rounded bg-surface-2 px-1">.env.local</code> do GenoLab (no servidor):</p>
              <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs">{"ANTHROPIC_API_KEY=sua-chave-aqui\nANTHROPIC_WORKSPACE_ID=id-do-workspace  # só para chaves que não pertencem a um workspace"}</pre>
              <p className="text-xs text-muted">A chave fica só no servidor e nunca é enviada ao navegador. Opcional: ANTHROPIC_MODEL para escolher outro modelo.</p>
            </>
          ) : (
            <p>A administração do GenoLab precisa configurar a chave da API. Enquanto isso, consulte o guia abaixo.</p>
          )}
        </div>
      ) : (
        <div className="grid">
          <div ref={logRef} role="log" aria-label="Conversa com o Geninho" className="grid max-h-[60vh] min-h-48 gap-4 overflow-y-auto p-4 sm:px-6">
            {messages.length === 0 && (
              <div className="grid gap-3">
                <p className="text-sm">
                  Olá! Sou o Geninho. Posso ajudar a planejar experimentos, entender técnicas, interpretar dados e tirar dúvidas sobre o GenoLab. Sobre o que é a sua dúvida?
                </p>
                <ul className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => void ask(s)} className="ge-press rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs text-ink hover:border-accent">
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-sm text-white">
                  <span className="sr-only">Você: </span>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ) : (
                <div key={i} className="flex max-w-[92%] gap-2.5">
                  <GeninhoAvatar size={28} className="mt-0.5 shrink-0" />
                  <div className={`min-w-0 rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-sm ${m.error ? "border-danger/40 bg-danger-soft" : "border-line bg-white"}`}>
                    <span className="sr-only">Geninho: </span>
                    {m.content ? <RichText text={m.content} /> : <p className="ge-mono text-xs text-muted">pensando…</p>}
                    {m.note && <p className="mt-2 text-xs text-muted">{m.note}</p>}
                    {m.content && !m.error && (busy ? i < messages.length - 1 : true) && (
                      <p className="mt-2 border-t border-line pt-1.5 text-[11px] text-muted">Resposta gerada por IA. Confira em fontes primárias e com o protocolo do seu laboratório.</p>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
          <p role="status" aria-live="polite" className="sr-only">
            {status}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="grid gap-2 border-t border-line p-4 sm:px-6"
          >
            <label htmlFor="geninho-pergunta" className="sr-only">
              Sua pergunta para o Geninho
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="geninho-pergunta"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(input);
                  }
                }}
                rows={2}
                maxLength={MAX_CHARS}
                placeholder="Escreva sua dúvida de pesquisa…"
                className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              {busy ? (
                <button type="button" onClick={() => abortRef.current?.abort()} className="ge-press min-h-11 rounded-full border-[1.5px] border-ink/80 px-4 text-sm font-semibold text-ink hover:bg-surface-2">
                  Parar
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} className="ge-press min-h-11 rounded-full bg-action px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                  Perguntar
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] leading-snug text-muted">
                Enviado à API da Anthropic (Claude): apenas as mensagens desta conversa. Não são enviados seus projetos, arquivos, nome ou e-mail, e a conversa não é salva no GenoLab. Não cole dados pessoais, de pacientes ou resultados confidenciais.
              </p>
              {messages.length > 0 && !busy && (
                <button type="button" onClick={() => (setMessages([]), setStatus(""))} className="text-xs font-semibold underline">
                  Nova conversa
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
