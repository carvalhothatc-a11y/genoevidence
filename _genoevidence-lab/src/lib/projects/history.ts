import type { Project, ProjectFields } from "@/lib/domain/schemas";

const LABELS: Record<keyof ProjectFields, string> = {
  title: "Título",
  objective: "Objetivo",
  organism: "Organismo/sistema",
  technique: "Técnica",
  description: "Descrição do experimento",
  groups: "Grupos",
  conditions: "Condições",
  unitsAndReplicates: "Unidades e réplicas",
  limitations: "Limitações",
};

function short(v: unknown): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 77) + "…" : s || "(vazio)";
}

/** Descreve, em linguagem simples, quais campos mudaram (para o histórico). */
export function describeFieldChanges(before: Project, patch: Partial<ProjectFields>): string {
  const parts: string[] = [];
  for (const key of Object.keys(patch) as (keyof ProjectFields)[]) {
    const a = before[key];
    const b = patch[key];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    parts.push(`${LABELS[key]}: "${short(a)}" → "${short(b)}"`);
  }
  return parts.join("; ");
}
