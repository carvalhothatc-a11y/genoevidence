import type { ReactNode } from "react";
import type { VisualKind } from "@/lib/domain/schemas";
import { VisualKindBadge } from "@/components/ui/Badges";

/** Moldura padrão: título, selo de categoria (dados/ilustração/simulação), descrição e notas. */
export function ChartFrame({
  title,
  kind,
  description,
  children,
  notes,
  id,
}: {
  title: string;
  kind: VisualKind;
  description?: ReactNode;
  children: ReactNode;
  notes?: ReactNode;
  id?: string;
}) {
  return (
    <figure className="grid gap-2 rounded-xl border border-line bg-surface p-4" aria-labelledby={id ? `${id}-t` : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={id ? `${id}-t` : undefined} className="text-sm font-semibold">
          {title}
        </h3>
        <VisualKindBadge kind={kind} />
      </div>
      {description && <div className="text-xs text-muted">{description}</div>}
      <div>{children}</div>
      {notes && <figcaption className="text-xs text-muted">{notes}</figcaption>}
    </figure>
  );
}
