"use client";
import { useEffect, useRef, useState } from "react";
import { GeninhoAvatar } from "./GeninhoAvatar";
import { RichText } from "./RichText";

type Passo = { nome: string; rotulo: string; estado: "iniciou" | "ok" | "vazio" | "falhou"; detalhe?: string };
type Molecula =
  | { tipo: "estrutura"; pdbId: string; titulo: string; metodo?: string; resolucao?: number; url: string; arquivo: string }
  | { tipo: "composto"; cid: number; nome: string; formula?: string; massa?: string; imagem2d: string; sdf3d: string; url: string }
  | { tipo: "proteina"; acesso: string; nome: string; genes: string[]; organismo: string; url: string };
type Fonte = { titulo: string; url: string; origem: string; leitura: "encontrada" | "resumo" | "lida" };
type Msg = { role: "user" | "assistant"; content: string; error?: boolean; note?: string; passos?: Passo[]; moleculas?: Molecula[]; fontes?: Fonte[] };

const LEITURA: Record<Fonte["leitura"], string> = {
  lida: "conteúdo lido",
  resumo: "só o resumo foi lido",
  encontrada: "referência localizada; conteúdo não lido",
};

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

/**
 * contexto: síntese do experimento na área de trabalho. Só é enviada se a pessoa marcar a opção,
 * e vai como DADO (o servidor a separa da pergunta). sugestoes: perguntas rápidas do contexto.
 * pergunta: texto inicial do campo (ex.: “qual é o papel deste elemento?”).
 */
export function Geninho({ configured, isAdmin, motivo, contexto, sugestoes, pergunta }: { configured: boolean; isAdmin: boolean; motivo?: string; contexto?: string; sugestoes?: string[]; pergunta?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(pergunta ?? "");
  const [incluir, setIncluir] = useState(false);
  const [web, setWeb] = useState(false);
  useEffect(() => {
    if (pergunta) setInput(pergunta);
  }, [pergunta]);
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
        body: JSON.stringify({ messages: payload.map(({ role, content }) => ({ role, content: content.slice(0, MAX_CHARS) })), ...(contexto && incluir ? { contexto: contexto.slice(0, 6000) } : {}), ...(web ? { web: true } : {}) }),
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
          const ev = JSON.parse(raw) as {
            t: "texto" | "fim" | "erro" | "ferramenta" | "molecula" | "fontes";
            v?: string;
            motivo?: string;
            nome?: string;
            rotulo?: string;
            estado?: Passo["estado"];
            detalhe?: string;
            payload?: Molecula;
            itens?: Fonte[];
          };
          if (ev.t === "texto" && ev.v) {
            setStatus("O Geninho está respondendo…");
            update((m) => ({ ...m, content: m.content + ev.v }));
          } else if (ev.t === "ferramenta" && ev.nome && ev.rotulo && ev.estado) {
            const passo: Passo = { nome: ev.nome, rotulo: ev.rotulo, estado: ev.estado, detalhe: ev.detalhe };
            setStatus(ev.estado === "iniciou" ? `${ev.rotulo}…` : "O Geninho está trabalhando…");
            update((m) => {
              const passos = [...(m.passos ?? [])];
              const i = passos.findIndex((p) => p.nome === passo.nome && p.estado === "iniciou");
              if (i >= 0 && passo.estado !== "iniciou") passos[i] = passo;
              else passos.push(passo);
              return { ...m, passos };
            });
          } else if (ev.t === "molecula" && ev.payload) {
            const mol = ev.payload;
            update((m) => ({ ...m, moleculas: [...(m.moleculas ?? []).filter((x) => JSON.stringify(x) !== JSON.stringify(mol)), mol] }));
          } else if (ev.t === "fontes" && ev.itens) {
            update((m) => ({ ...m, fontes: ev.itens }));
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
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 id="geninho-titulo" className="ge-display text-xl">
              Geninho
            </h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${configured ? "border-ok/30 bg-ok-soft text-ok" : "border-warn/30 bg-warn-soft text-warn"}`}>
              {configured ? "Ligado" : "Não configurado"}
            </span>
          </div>
          <p className="text-sm text-muted">Assistente de IA para dúvidas de pesquisa em biologia molecular.</p>
        </div>
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
          <div ref={logRef} role="log" aria-label="Conversa com o Geninho" className="grid max-h-[55dvh] min-h-48 gap-4 overflow-y-auto p-4 sm:px-6">
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
                    {m.passos && m.passos.length > 0 && <Passos passos={m.passos} />}
                    {m.content ? <RichText text={m.content} /> : !m.passos?.length ? <p className="ge-mono text-xs text-muted">pensando…</p> : null}
                    {m.moleculas?.map((mol, k) => <CartaoMolecula key={k} m={mol} />)}
                    {m.fontes && m.fontes.length > 0 && <Fontes itens={m.fontes} />}
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
            <label className="flex items-start gap-2 text-[12px] text-body">
              <input type="checkbox" className="mt-0.5" checked={web} onChange={(e) => setWeb(e.target.checked)} data-testid="geninho-web" />
              <span>
                Pesquisar na internet nesta pergunta. Sem isso, o Geninho consulta apenas PubMed, UniProt, RCSB PDB e PubChem — que já cobrem artigos, proteínas, estruturas e compostos.
              </span>
            </label>
            {contexto && (
              <label className="flex items-start gap-2 text-[12px] text-body">
                <input type="checkbox" className="mt-0.5" checked={incluir} onChange={(e) => setIncluir(e.target.checked)} data-testid="geninho-contexto" />
                <span>Incluir a síntese do experimento atual (etapas, elementos, parâmetros e fontes) nesta conversa. Ela será enviada à Anthropic; arquivos e imagens não são enviados.</span>
              </label>
            )}
            {sugestoes && sugestoes.length > 0 && messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sugestoes.map((q) => (
                  <button key={q} type="button" onClick={() => setInput(q)} className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-surface-2">
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] leading-snug text-muted">
                Enviado à API da Anthropic (Claude): {contexto && incluir ? "as mensagens desta conversa e a síntese do experimento" : "apenas as mensagens desta conversa"}. Não são enviados seus arquivos, nome ou e-mail, e a conversa não é salva no GenoLab. O Geninho não altera dados nem parâmetros. Não cole dados pessoais, de pacientes ou resultados confidenciais.
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

// ---------------------------------------------------------------- passos, moléculas e fontes

const ICONE: Record<Passo["estado"], string> = { iniciou: "◌", ok: "✓", vazio: "∅", falhou: "✕" };
const COR: Record<Passo["estado"], string> = { iniciou: "text-muted", ok: "text-ok", vazio: "text-warn", falhou: "text-danger" };

/** O que o Geninho fez, com o estado REAL de cada ferramenta. */
function Passos({ passos }: { passos: Passo[] }) {
  return (
    <ul className="mb-2 grid gap-0.5 border-l-2 border-line pl-2.5 text-[12px]" aria-label="O que o Geninho fez">
      {passos.map((p, i) => (
        <li key={i} className={COR[p.estado]}>
          <span aria-hidden="true" className={p.estado === "iniciou" ? "inline-block animate-pulse" : ""}>
            {ICONE[p.estado]}
          </span>{" "}
          {p.rotulo}
          {p.detalhe ? <span className="text-muted"> · {p.detalhe}</span> : p.estado === "vazio" ? <span className="text-muted"> · nada encontrado</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Molécula de verdade, com identificador e origem. Nunca uma parecida no lugar da pedida. */
function CartaoMolecula({ m }: { m: Molecula }) {
  if (m.tipo === "composto")
    return (
      <figure className="mt-2 grid gap-2 rounded-xl border border-line bg-surface-2 p-3 sm:grid-cols-[120px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.imagem2d} alt={`Estrutura plana de ${m.nome}`} width={120} height={120} className="rounded-lg bg-white" loading="lazy" />
        <figcaption className="grid content-start gap-0.5 text-[12px]">
          <strong className="text-[13px]">{m.nome}</strong>
          <span className="text-muted">
            PubChem CID {m.cid}
            {m.formula ? ` · ${m.formula}` : ""}
            {m.massa ? ` · ${m.massa} g/mol` : ""}
          </span>
          <a href={m.url} target="_blank" rel="noreferrer noopener" className="underline">
            Ver no PubChem
          </a>
          <span className="text-muted">Desenho 2D do PubChem, servido pelo GenoLab.</span>
        </figcaption>
      </figure>
    );
  if (m.tipo === "estrutura")
    return (
      <div className="mt-2 grid gap-0.5 rounded-xl border border-line bg-surface-2 p-3 text-[12px]">
        <strong className="text-[13px]">
          {m.pdbId} — {m.titulo}
        </strong>
        <span className="text-muted">
          {m.metodo ?? "método não informado"}
          {m.resolucao ? ` · ${m.resolucao} Å` : ""}
        </span>
        <a href={m.url} target="_blank" rel="noreferrer noopener" className="underline">
          Ver no RCSB PDB
        </a>
        <span className="text-muted">Para abrir no visualizador Mol*, importe este código num projeto.</span>
      </div>
    );
  return (
    <div className="mt-2 grid gap-0.5 rounded-xl border border-line bg-surface-2 p-3 text-[12px]">
      <strong className="text-[13px]">{m.nome}</strong>
      <span className="text-muted">
        UniProt {m.acesso}
        {m.genes.length ? ` · gene ${m.genes.join(", ")}` : ""} · {m.organismo}
      </span>
      <a href={m.url} target="_blank" rel="noreferrer noopener" className="underline">
        Ver no UniProt
      </a>
    </div>
  );
}

/** Fontes com o nível real de leitura. */
function Fontes({ itens }: { itens: Fonte[] }) {
  return (
    <details className="mt-2 rounded-lg border border-line bg-surface-2 p-2 text-[12px]">
      <summary className="cursor-pointer font-semibold">Fontes consultadas ({itens.length})</summary>
      <ul className="mt-1.5 grid gap-1">
        {itens.map((f, i) => (
          <li key={i}>
            <a href={f.url} target="_blank" rel="noreferrer noopener" className="underline">
              {f.titulo}
            </a>
            <span className="text-muted">
              {" "}
              · {f.origem} · {LEITURA[f.leitura]}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
