import type { ReactNode } from "react";

export function Card({ title, actions, children, className = "", as: As = "section" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return (
    <As className={`ge-card p-4 sm:p-6 ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          {title && <h2 className="text-base font-semibold leading-snug">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </As>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="ge-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="ge-display text-3xl sm:text-4xl">{title}</h1>
        {description && <div className="mt-2 text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
