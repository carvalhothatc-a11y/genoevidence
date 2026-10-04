"use client";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useUi } from "@/store/ui";

const EASE = [0.2, 0, 0, 1] as const;

/** Painel flutuante ancorado (abre em ~240 ms; recolhível sem perder o contexto). */
export function FloatingPanel({
  side,
  title,
  eyebrow,
  open,
  onToggle,
  children,
  dark = false,
  width = 380,
  id,
}: {
  side: "left" | "right";
  title: string;
  eyebrow?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  dark?: boolean;
  width?: number;
  id: string;
}) {
  return (
    <>
      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            key={id}
            id={id}
            aria-label={title}
            initial={{ opacity: 0, x: side === "right" ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: side === "right" ? 24 : -24, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.24, ease: EASE }}
            className={`${dark ? "ge-float-dark" : "ge-float"} pointer-events-auto absolute bottom-3 top-16 z-20 hidden flex-col overflow-hidden md:flex ${side === "right" ? "right-3" : "left-3"}`}
            style={{ width }}
          >
            <header className={`flex items-start justify-between gap-2 border-b px-4 py-3 ${dark ? "border-panel-line" : "border-line"}`}>
              <div className="min-w-0">
                {eyebrow && <p className="ge-eyebrow text-[11px]">{eyebrow}</p>}
                <h2 className="truncate text-base font-bold">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                aria-controls={id}
                className={`ge-press rounded-full px-2.5 py-1 text-xs ${dark ? "text-panel-muted hover:bg-panel-2" : "text-muted hover:bg-surface-2"}`}
              >
                Recolher {side === "right" ? "→" : "←"}
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
          </motion.aside>
        )}
      </AnimatePresence>
      {!open && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-controls={id}
          className={`ge-float ge-press pointer-events-auto absolute top-1/2 z-20 hidden -translate-y-1/2 px-2 py-4 text-xs font-semibold text-ink [writing-mode:vertical-rl] md:block ${side === "right" ? "right-0 rounded-r-none" : "left-0 rotate-180 rounded-r-none"}`}
        >
          {title}
        </button>
      )}
    </>
  );
}

/** Painel inferior para celular (controles em área de toque ampla). */
export function BottomSheet({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section aria-label={title} data-testid="painel-inferior" className="ge-float pointer-events-auto absolute inset-x-2 bottom-2 z-20 flex max-h-[50%] flex-col md:hidden">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-12 items-center justify-between gap-2 px-4 py-2 text-left">
        <span className="text-sm font-bold text-ink">{title}</span>
        <span className="text-xs text-muted">{open ? "Recolher ▾" : "Abrir ▴"}</span>
      </button>
      {open && <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-4 py-3">{children}</div>}
    </section>
  );
}

/** Trilha de navegação entre escalas (sempre visível). */
export function Trail({ items }: { items: { id: string; label: string; onClick?: () => void; tag?: string }[] }) {
  return (
    <nav aria-label="Posição no laboratório" className="ge-float pointer-events-auto max-w-[min(92vw,720px)] overflow-x-auto rounded-full px-4 py-2 text-sm">
      <ol className="flex items-center gap-1.5 whitespace-nowrap">
        {items.map((c, i) => (
          <li key={c.id} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="text-muted">
                ›
              </span>
            )}
            {c.onClick && i < items.length - 1 ? (
              <button type="button" className="ge-press rounded-full px-1.5 text-muted underline-offset-2 hover:text-ink hover:underline" onClick={c.onClick}>
                {c.label}
              </button>
            ) : (
              <span aria-current={i === items.length - 1 ? "location" : undefined} className="px-1.5 font-semibold text-ink">
                {c.label}
              </span>
            )}
            {c.tag && <span className="rounded-full bg-violet-soft px-2 py-0.5 text-[11px] font-semibold text-violet">{c.tag}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Dica discreta para iniciantes (desativável). */
export function HintChip({ text }: { text: string | null }) {
  const hints = useUi((s) => s.hints);
  const setHints = useUi((s) => s.setHints);
  return (
    <AnimatePresence>
      {hints && text && (
        <motion.div
          key={text}
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.24, ease: EASE }}
          className="ge-float pointer-events-auto flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 text-sm"
        >
          <span className="ge-mono text-[11px] text-action">dica</span>
          <span className="text-ink">{text}</span>
          <button type="button" className="ge-press rounded-full px-2.5 py-1 text-xs text-muted hover:bg-surface-2" onClick={() => setHints(false)}>
            Ocultar dicas
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Progresso em pontos (padrão Geno Evidence). */
export function ProgressDots({ total, current, done, label, onGo }: { total: number; current: number; done: (i: number) => boolean; label: (i: number) => string; onGo?: (i: number) => void }) {
  return (
    <div className="ge-dots" role="list" aria-label="Progresso do experimento">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          role="listitem"
          aria-label={`${label(i)}${i === current ? " (etapa atual)" : done(i) ? " (visitada)" : ""}`}
          aria-current={i === current ? "step" : undefined}
          data-state={i === current ? "current" : done(i) ? "done" : "todo"}
          onClick={() => onGo?.(i)}
          className="cursor-pointer"
        />
      ))}
    </div>
  );
}

/** Entrada no laboratório: breve, pulável, não se repete no uso recorrente. */
export function IntroOverlay({ visible, onEnter, onSkip, resume }: { visible: boolean; onEnter: () => void; onSkip: () => void; resume?: { label: string; onClick: () => void } }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-gradient-to-b from-[#060a13]/80 via-[#060a13]/50 to-[#060a13]/20 p-4"
          role="dialog"
          aria-modal="false"
          aria-labelledby="intro-titulo"
          onKeyDown={(e) => e.key === "Escape" && onSkip()}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
            className="ge-float w-full max-w-lg p-7 text-center sm:p-9"
          >
            <Image src="/brand/geno-evidence-simbolo-192.png" alt="" width={72} height={72} className="mx-auto mb-4 drop-shadow-[0_12px_24px_rgba(115,78,225,0.35)]" priority />
            <p className="ge-eyebrow mb-2 justify-center">GenoLab</p>
            <h2 id="intro-titulo" className="ge-display text-3xl sm:text-4xl">
              Entre no <span className="ge-gradient-text">laboratório</span>.
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-body">
              Quatro bancadas organizadas por função: preparo, amplificação, eletroforese e análise. Escolha uma bancada ou retome um projeto.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <button type="button" onClick={onEnter} autoFocus className="ge-press min-h-12 rounded-full bg-action-brand px-6 text-base font-bold text-white shadow-[0_10px_24px_-10px_rgba(224,56,90,0.8)] hover:bg-action">
                Entrar no laboratório
              </button>
              {resume && (
                <button type="button" onClick={resume.onClick} className="ge-press min-h-12 rounded-full border-[1.5px] border-ink/80 bg-white px-5 text-sm font-semibold text-ink hover:bg-surface-2">
                  {resume.label}
                </button>
              )}
            </div>
            <button type="button" onClick={onSkip} className="mt-4 text-xs text-muted underline">
              Pular introdução
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
