import type { ReactNode } from "react";

type Tone = "info" | "warn" | "danger" | "ok";
const tones: Record<Tone, { cls: string; icon: string; label: string }> = {
  info: { cls: "border-line bg-surface-2 text-ink", icon: "ℹ", label: "Informação" },
  warn: { cls: "border-warn/40 bg-warn-soft text-ink", icon: "⚠", label: "Atenção" },
  danger: { cls: "border-danger/40 bg-danger-soft text-ink", icon: "✖", label: "Erro" },
  ok: { cls: "border-ok/40 bg-ok-soft text-ink", icon: "✔", label: "Concluído" },
};

export function Alert({ tone = "info", title, children, className = "" }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  const t = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={`flex gap-3 rounded-lg border p-3 text-sm ${t.cls} ${className}`}>
      <span aria-hidden="true" className="mt-0.5 font-bold">
        {t.icon}
      </span>
      <div className="min-w-0">
        <span className="sr-only">{t.label}: </span>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="prose-lab">{children}</div>}
      </div>
    </div>
  );
}
