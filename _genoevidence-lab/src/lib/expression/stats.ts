import type { ExpressionRow } from "@/lib/domain/schemas";

export type Descriptive = {
  gene: string;
  group: string;
  unit: string;
  n: number;
  missing: number;
  mean: number | null;
  /** Desvio-padrão amostral (n − 1); null quando n < 2. */
  sd: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
};

function median(sorted: number[]): number {
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/**
 * Estatística DESCRITIVA por gene × grupo × unidade. Nenhum teste de hipótese é realizado,
 * e nenhum valor de significância é produzido.
 */
export function describe(rows: ExpressionRow[], groupOrder?: string[]): Descriptive[] {
  const map = new Map<string, { gene: string; group: string; unit: string; values: number[]; missing: number }>();
  for (const r of rows) {
    if (!r.gene || !r.group) continue;
    const key = `${r.gene}\u0000${r.group}\u0000${r.unit}`;
    const e = map.get(key) ?? { gene: r.gene, group: r.group, unit: r.unit, values: [], missing: 0 };
    if (r.status === "ok" && r.value !== null) e.values.push(r.value);
    else e.missing++;
    map.set(key, e);
  }
  const out: Descriptive[] = [];
  for (const e of map.values()) {
    const v = [...e.values].sort((a, b) => a - b);
    const n = v.length;
    const mean = n ? v.reduce((a, b) => a + b, 0) / n : null;
    const sd = n >= 2 && mean !== null ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : null;
    out.push({ gene: e.gene, group: e.group, unit: e.unit, n, missing: e.missing, mean, sd, median: n ? median(v) : null, min: n ? v[0] : null, max: n ? v[n - 1] : null });
  }
  const order = groupOrder ?? [];
  return out.sort((a, b) => a.gene.localeCompare(b.gene) || order.indexOf(a.group) - order.indexOf(b.group) || a.group.localeCompare(b.group));
}

export function formatNumber(v: number | null, digits = 3): string {
  if (v === null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 0.001 || abs >= 1e6)) return v.toExponential(2).replace(".", ",");
  return v.toLocaleString("pt-BR", { maximumSignificantDigits: Math.max(digits, 1) + (abs >= 100 ? 2 : 1) });
}
