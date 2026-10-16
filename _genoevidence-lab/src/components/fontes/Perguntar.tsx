"use client";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type Fonte = { arquivoId: string; nome: string; trechos: number; motivo?: string };
type Citacao = { trechoId: string; citacao: string; arquivo: string; pagina: number | null; endereco: string; textoDoTrecho: string };
type Consultado = { trechoId: string; endereco: string; texto: string; casaram: string[] };
type Resposta = {
  resposta: string;
  suficiente: boolean;
  citacoes: Citacao[];
  recusadas: { citacao: string; motivo: string }[];
  consultados: Consultado[];
};

/**
 * Perguntar aos documentos do projeto.
 *
 * O princípio da tela: a resposta é um PONTEIRO para os trechos, não um substituto para lê-los.
 * Por isso cada citação aparece com o parágrafo inteiro de onde saiu, e não só o nome do arquivo —
 * a diferença entre “está no artigo X” e “está aqui, leia”.
 */
export function Perguntar({ projetoId, arquivos = "" }: { projetoId: string; arquivos?: string }) {
  const [fontes, setFontes] = useState<Fonte[] | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [r, setR] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [relendo, setRelendo] = useState(false);

  const carregarFontes = useCallback(async () => {
    const res = await fetch(`/api/projects/${projetoId}/fontes`);
    const d = (await res.json().catch(() => ({}))) as { fontes?: Fonte[] };
    if (d.fontes) setFontes(d.fontes);
  }, [projetoId]);

  /**
   * A lista é relida ao montar E quando a aba volta ao foco. O envio de arquivo acontece noutra
   * parte da MESMA página: sem isto, você anexa um PDF e o painel continua dizendo que não há
   * documento, até recarregar. Também há um botão, para quem não quiser depender do foco.
   */
  useEffect(() => {
    void carregarFontes();
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void carregarFontes();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
    // `arquivos` entra aqui de propósito: quando um arquivo é anexado, o servidor re-renderiza com
    // outra assinatura e isto dispara a releitura. Sem isso o painel ficaria com a lista velha.
  }, [carregarFontes, arquivos]);

  const reler = async () => {
    setRelendo(true);
    await carregarFontes().finally(() => setRelendo(false));
  };

  const perguntar = async () => {
    setCarregando(true);
    setErro(null);
    setR(null);
    try {
      const res = await fetch(`/api/projects/${projetoId}/fontes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta }),
      });
      const d = (await res.json().catch(() => ({}))) as Resposta & { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Não foi possível responder agora.");
      setR(d);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível responder agora.");
    } finally {
      setCarregando(false);
    }
  };

  const comTexto = (fontes ?? []).filter((f) => f.trechos > 0);
  const semTexto = (fontes ?? []).filter((f) => f.trechos === 0);
  const totalTrechos = comTexto.reduce((a, f) => a + f.trechos, 0);

  return (
    <section className="grid gap-4" aria-label="Perguntar aos documentos" data-testid="perguntar-fontes">
      {fontes && comTexto.length === 0 ? (
        <Alert tone="warn" title="Nenhum documento com texto para consultar.">
          Envie um PDF, DOCX ou TXT neste projeto. Tabelas e imagens não viram trecho citável por enquanto.{" "}
          <button type="button" onClick={() => void reler()} className="underline" data-testid="reler-fontes">
            {relendo ? "relendo…" : "acabei de anexar um arquivo"}
          </button>
        </Alert>
      ) : (
        <>
          <div className="grid gap-2">
            <label htmlFor="pergunta-fontes" className="text-sm font-medium">
              Pergunte aos seus documentos
            </label>
            <textarea
              id="pergunta-fontes"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              rows={2}
              placeholder="Ex.: qual temperatura de anelamento os artigos usaram para esse gene?"
              className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/80 focus-visible:border-accent"
              data-testid="pergunta"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted" data-testid="fontes-resumo">
                {comTexto.length} documento(s) · {totalTrechos} trecho(s) citável(is)
                {semTexto.length > 0 && ` · ${semTexto.length} fora`}{" "}
                <button type="button" onClick={() => void reler()} className="underline hover:text-ink" data-testid="reler-fontes">
                  {relendo ? "relendo…" : "acabei de anexar um arquivo"}
                </button>
              </p>
              <Button onClick={() => void perguntar()} disabled={carregando || pergunta.trim().length < 3} data-testid="enviar-pergunta">
                {carregando ? "Procurando nos documentos…" : "Perguntar"}
              </Button>
            </div>
          </div>

          {semTexto.length > 0 && (
            <details className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
              <summary className="cursor-pointer font-medium">Arquivos que ficaram de fora ({semTexto.length})</summary>
              <ul className="mt-2 grid gap-1">
                {semTexto.map((f) => (
                  <li key={f.arquivoId} className="text-muted">
                    <strong className="text-ink">{f.nome}</strong> — {f.motivo ?? "sem texto para citar."}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {erro && (
        <Alert tone="danger" title="Não foi possível responder.">
          {erro}
        </Alert>
      )}

      {r && <Resultado r={r} />}
    </section>
  );
}

function Resultado({ r }: { r: Resposta }) {
  const [verTrechos, setVerTrechos] = useState(false);
  return (
    <div className="grid gap-3" data-testid="resposta-fontes">
      {!r.suficiente && (
        <Alert tone="warn" title="Os seus documentos não respondem isso.">
          O que está abaixo é o que foi encontrado — não complete a lacuna com ele.
        </Alert>
      )}

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{r.resposta}</p>
      </div>

      {r.citacoes.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">De onde veio — conferido no seu documento</h3>
          <ul className="grid gap-2" data-testid="citacoes">
            {r.citacoes.map((c, i) => (
              <li key={`${c.trechoId}-${i}`} className="rounded-xl border border-ok/30 bg-ok-soft p-3" data-citacao={c.trechoId}>
                <p className="text-xs font-medium text-ok">✔ {c.endereco}</p>
                <blockquote className="mt-1.5 border-l-2 border-ok/50 pl-3 text-sm italic">“{c.citacao}”</blockquote>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted">ver o parágrafo inteiro</summary>
                  <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-surface-2 p-2.5 text-[13px] leading-relaxed">{c.textoDoTrecho}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.recusadas.length > 0 && (
        <div className="grid gap-2 rounded-xl border border-warn/40 bg-warn-soft p-3" data-testid="recusadas">
          <h3 className="text-sm font-semibold">
            {r.recusadas.length === 1 ? "Uma citação foi recusada" : `${r.recusadas.length} citações foram recusadas`}
          </h3>
          <p className="text-xs">
            Confiro cada citação contra o seu documento antes de mostrar. Estas não bateram, então não valem como fonte:
          </p>
          <ul className="grid gap-1.5 text-sm">
            {r.recusadas.map((x, i) => (
              <li key={i}>
                <span className="italic">“{x.citacao.slice(0, 140)}”</span>
                <span className="block text-xs text-muted">{x.motivo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.consultados.length > 0 && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setVerTrechos(!verTrechos)}>
            {verTrechos ? "Fechar" : `Ver os ${r.consultados.length} trechos consultados`}
          </Button>
          {verTrechos && (
            <ul className="mt-2 grid gap-2" data-testid="consultados">
              {r.consultados.map((c) => (
                <li key={c.trechoId} className="rounded-lg border border-line bg-surface p-3 text-sm">
                  <p className="text-xs text-muted">
                    {c.endereco}
                    {c.casaram.length > 0 && <span> · bateu em: {c.casaram.join(", ")}</span>}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">{c.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
