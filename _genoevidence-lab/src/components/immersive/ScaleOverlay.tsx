"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { hotspotRegistry } from "@/components/lab3d/hotspots";

const EASE = [0.2, 0, 0, 1] as const;

/**
 * Painel de escala (processo molecular ou resultados) que se abre a partir do equipamento
 * selecionado: a origem da animação é a posição do equipamento na tela, mantendo a continuidade.
 */
export function ScaleOverlay({
  open,
  anchorId,
  title,
  tag,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  anchorId: string | null;
  title: string;
  tag: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [origin, setOrigin] = useState("50% 50%");
  useEffect(() => {
    if (!open || !anchorId) return;
    const el = hotspotRegistry.get(`o-${anchorId}`)?.el;
    const parent = el?.offsetParent as HTMLElement | null;
    if (el && parent) {
      const r = el.getBoundingClientRect();
      const p = parent.getBoundingClientRect();
      setOrigin(`${(((r.left + r.width / 2 - p.left) / p.width) * 100).toFixed(1)}% ${(((r.top + r.height / 2 - p.top) / p.height) * 100).toFixed(1)}%`);
    }
  }, [open, anchorId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scale-backdrop"
          className="pointer-events-auto absolute inset-0 z-[25] grid place-items-center bg-[rgba(15,23,48,0.28)] p-3 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="escala-titulo"
            className="ge-float flex max-h-full w-full max-w-4xl flex-col overflow-hidden"
            style={{ transformOrigin: origin }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="escala-titulo" className="text-lg font-bold">
                  {title}
                </h2>
                {tag}
              </div>
              <button type="button" onClick={onClose} autoFocus className="ge-press rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
                ← Voltar à bancada
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <footer className="border-t border-line px-5 py-3 text-sm">{footer}</footer>}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function OverlayLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-accent-ink underline">
      {children}
    </Link>
  );
}
