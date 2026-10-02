import Papa from "papaparse";
import { LIMITS } from "@/lib/config";
import type { ColumnMapping } from "@/lib/domain/schemas";

export type ParsedCsv = {
  header: string[];
  rows: Record<string, string>[];
  delimiter: string;
  /** Linhas com número de campos diferente do cabeçalho (1 = primeira linha de dados). */
  malformedRows: number[];
  suggestedDecimal: "." | ",";
  truncated: boolean;
  encodingWarning?: string;
};

export class CsvError extends Error {}

/** Decodifica bytes como UTF-8; se houver caracteres inválidos, tenta Latin-1 (comum em planilhas exportadas). */
export function decodeText(bytes: Uint8Array): { text: string; warning?: string } {
  let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  let warning: string | undefined;
  if (text.includes("�")) {
    text = new TextDecoder("latin1").decode(bytes);
    warning = "O arquivo não é UTF-8 válido; foi lido como Latin-1. Confira acentos nos rótulos.";
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return { text, warning };
}

export function parseCsv(bytes: Uint8Array, delimiter?: string): ParsedCsv {
  const { text, warning } = decodeText(bytes);
  if (!text.trim()) throw new CsvError("O arquivo está vazio.");
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    delimiter: delimiter || "",
    delimitersToGuess: [",", ";", "\t", "|"],
    transformHeader: (h) => h.trim(),
    preview: LIMITS.maxCsvRows + 1,
  });
  const header = (result.meta.fields ?? []).filter((h) => h !== "");
  if (header.length < 2) throw new CsvError("Não foi possível identificar colunas. Confira o separador (vírgula, ponto e vírgula ou tabulação).");
  if (header.length > LIMITS.maxCsvColumns) throw new CsvError(`O arquivo tem ${header.length} colunas; o limite é ${LIMITS.maxCsvColumns}.`);
  const dup = header.find((h, i) => header.indexOf(h) !== i);
  if (dup) throw new CsvError(`Cabeçalho com coluna repetida: "${dup}". Renomeie para importar.`);

  const malformed = new Set<number>();
  for (const e of result.errors) {
    if (typeof e.row === "number" && (e.code === "TooFewFields" || e.code === "TooManyFields")) malformed.add(e.row + 1);
  }
  const truncated = result.data.length > LIMITS.maxCsvRows;
  const rows = result.data.slice(0, LIMITS.maxCsvRows).map((r) => {
    const clean: Record<string, string> = {};
    for (const h of header) clean[h] = (r[h] ?? "").toString();
    return clean;
  });

  return {
    header,
    rows,
    delimiter: result.meta.delimiter,
    malformedRows: [...malformed].sort((a, b) => a - b),
    suggestedDecimal: guessDecimal(rows, header, result.meta.delimiter),
    truncated,
    encodingWarning: warning,
  };
}

/** Sugere vírgula decimal quando a maioria dos valores numéricos usa o formato "1,23". */
function guessDecimal(rows: Record<string, string>[], header: string[], delimiter: string): "." | "," {
  if (delimiter === ",") return ".";
  let comma = 0;
  let dot = 0;
  for (const r of rows.slice(0, 500)) {
    for (const h of header) {
      const v = r[h]?.trim() ?? "";
      if (/^-?\d+,\d+([eE][-+]?\d+)?$/.test(v)) comma++;
      else if (/^-?\d+\.\d+([eE][-+]?\d+)?$/.test(v)) dot++;
    }
  }
  return comma > dot ? "," : ".";
}

const SYNONYMS: Record<keyof ColumnMapping, string[]> = {
  gene: ["gene", "genes", "gene_id", "geneid", "gene_name", "symbol", "simbolo", "símbolo", "alvo", "target"],
  sample: ["amostra", "sample", "sample_id", "amostras", "samples", "id_amostra"],
  group: ["grupo", "group", "condicao", "condição", "condition", "tratamento", "treatment"],
  value: ["valor", "value", "expressao", "expressão", "expression", "nivel", "nível", "level"],
  unit: ["unidade", "unit", "units", "unidades"],
  replicate: ["replica", "réplica", "replicate", "rep", "replicata"],
};

export function suggestMapping(header: string[]): Partial<ColumnMapping> {
  const out: Partial<ColumnMapping> = {};
  const norm = (s: string) => s.trim().toLowerCase();
  for (const key of Object.keys(SYNONYMS) as (keyof ColumnMapping)[]) {
    const hit = header.find((h) => SYNONYMS[key].includes(norm(h)));
    if (hit) out[key] = hit;
  }
  return out;
}

const MISSING = new Set(["", "na", "n/a", "nan", "-", "--", "null", "none", "#n/a", "nd", "n.d.", "?"]);

export type ParsedNumber = { kind: "ok"; value: number; convertedComma: boolean } | { kind: "ausente" } | { kind: "invalido"; hint?: string };

/** Converte texto numérico respeitando o separador decimal declarado. Ausentes NUNCA viram zero. */
export function parseNumber(raw: string, decimal: "." | ","): ParsedNumber {
  const s = raw.trim();
  if (MISSING.has(s.toLowerCase())) return { kind: "ausente" };
  let normalized = s;
  let convertedComma = false;
  if (decimal === ",") {
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?([eE][-+]?\d+)?$/.test(s)) normalized = s.replace(/\./g, "");
    if (normalized.includes(",")) {
      normalized = normalized.replace(",", ".");
      convertedComma = true;
    }
  } else if (/^-?\d+,\d+$/.test(s)) {
    return { kind: "invalido", hint: "Usa vírgula decimal; selecione o separador decimal “vírgula”." };
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(normalized)) return { kind: "invalido" };
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { kind: "invalido" };
  return { kind: "ok", value, convertedComma };
}
