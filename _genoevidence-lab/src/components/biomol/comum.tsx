"use client";
import type { ReactNode } from "react";

/** Peças pequenas repetidas nas ferramentas da BioMol. */

/** Cor de cada base. Ícone + letra sempre acompanham: a cor nunca é a única pista. */
export const CLASSE_BASE: Record<string, string> = {
  A: "text-ok",
  T: "text-danger",
  U: "text-danger",
  G: "text-warn",
  C: "text-accent-ink",
};

/** Lê um token de cor do tema atual (para 3D e SVG, que não usam classes). */
export function corDoToken(nome: string, el?: Element | null): string {
  if (typeof window === "undefined") return "#888888";
  const v = getComputedStyle(el ?? document.querySelector(".ge-dark") ?? document.documentElement).getPropertyValue(`--${nome}`).trim();
  return v || "#888888";
}

/** Baixa um texto como arquivo, gerado no próprio navegador. */
export function baixar(nome: string, conteudo: string, tipo = "text/plain") {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Secao({ titulo, acoes, children, id, className = "" }: { titulo: ReactNode; acoes?: ReactNode; children: ReactNode; id?: string; className?: string }) {
  return (
    <section className={`ge-card grid gap-3 p-4 sm:p-5 ${className}`} aria-labelledby={id}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-base font-semibold">
          {titulo}
        </h2>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </header>
      {children}
    </section>
  );
}

/** Botões de escolha única (no lugar de um <select> quando há poucas opções). */
export function Segmentado<T extends string | number>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  testid,
}: {
  rotulo: string;
  valor: T;
  opcoes: { valor: T; rotulo: string; dica?: string }[];
  aoMudar: (v: T) => void;
  testid?: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="inline-flex flex-wrap gap-1 rounded-full border border-line p-1" data-testid={testid}>
      {opcoes.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          title={o.dica}
          onClick={() => aoMudar(o.valor)}
          data-valor={String(o.valor)}
          className={`ge-press min-h-9 rounded-full px-3 text-[13px] font-medium ${valor === o.valor ? "bg-accent text-white" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Botão pequeno de contorno, usado nas barras de ação. */
export function BotaoLeve({ children, className = "", ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={`ge-press inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Número em português, com casas decimais fixas. */
export function num(v: number, casas = 1): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/**
 * Sequência em blocos de 10, linhas de 60, com a posição à esquerda. Acima de `limite` letras, mostra
 * o começo e avisa — a sequência inteira continua disponível para baixar.
 */
export function SeqBloco({ seq, colorir = false, limite = 3000, destaque }: { seq: string; colorir?: boolean; limite?: number; destaque?: (i: number) => string | undefined }) {
  const visivel = seq.slice(0, limite);
  const linhas: { pos: number; texto: string }[] = [];
  for (let k = 0; k < visivel.length; k += 60) linhas.push({ pos: k + 1, texto: visivel.slice(k, k + 60) });
  const comCor = (colorir || destaque) && visivel.length <= 1200;
  const largura = String(visivel.length).length;
  return (
    <div className="grid gap-1">
      <pre className="ge-mono overflow-x-auto rounded-lg bg-panel p-3 text-[12.5px] leading-6 text-ink" data-testid="seq-bloco">
        {linhas.map((l) => (
          <div key={l.pos}>
            <span className="select-none text-panel-dim">{String(l.pos).padStart(largura)} </span>
            {comCor
              ? [...l.texto].map((ch, i) => {
                  const idx = l.pos - 1 + i;
                  const extra = destaque?.(idx);
                  return (
                    <span key={i} className={`${colorir ? (CLASSE_BASE[ch] ?? "") : ""} ${extra ?? ""}`}>
                      {ch}
                      {(i + 1) % 10 === 0 && i < 59 ? " " : ""}
                    </span>
                  );
                })
              : l.texto.replace(/(.{10})(?=.)/g, "$1 ")}
          </div>
        ))}
      </pre>
      {seq.length > limite && (
        <p className="text-xs text-muted">
          Mostrando as primeiras {limite.toLocaleString("pt-BR")} de {seq.length.toLocaleString("pt-BR")} letras. Os cálculos usam a sequência inteira; para vê-la toda, baixe em Exportar.
        </p>
      )}
    </div>
  );
}
