import "server-only";
import { z } from "zod";
import { ColumnMapping, DatasetMeta, ExpressionValueType, type ExpressionRow } from "@/lib/domain/schemas";
import { ApiError } from "@/lib/api";
import { newId, nowIso } from "@/lib/ids";
import type { Repository } from "@/lib/repo";
import type { Actor } from "@/lib/repo/types";
import { CsvError, parseCsv, suggestMapping } from "./csv";
import { interpretExpression } from "./validate";
import { VALUE_TYPES } from "./valueTypes";

export const ImportOptions = z.object({
  fileId: z.string(),
  delimiter: z.enum([",", ";", "\t", "|"]).optional(),
  mapping: ColumnMapping,
  valueType: ExpressionValueType,
  valueTypeNote: z.string().max(500).optional(),
  decimal: z.enum([".", ","]),
  declaredUnit: z.string().max(40).optional(),
});
export type ImportOptions = z.infer<typeof ImportOptions>;

export async function loadCsv(repo: Repository, projectId: string, fileId: string, delimiter?: string) {
  const found = await repo.readFile(projectId, fileId);
  if (!found) throw new ApiError(404, "Arquivo não encontrado (ou sem permissão de acesso).");
  if (found.record.kind !== "csv") throw new ApiError(422, "O arquivo selecionado não é um CSV.");
  try {
    return { record: found.record, parsed: parseCsv(found.bytes, delimiter) };
  } catch (err) {
    if (err instanceof CsvError) throw new ApiError(422, err.message);
    throw err;
  }
}

export async function previewCsv(repo: Repository, projectId: string, fileId: string, delimiter?: string) {
  const { record, parsed } = await loadCsv(repo, projectId, fileId, delimiter);
  return {
    file: record,
    header: parsed.header,
    sample: parsed.rows.slice(0, 30),
    rowCount: parsed.rows.length,
    delimiter: parsed.delimiter,
    suggestedDecimal: parsed.suggestedDecimal,
    suggestedMapping: suggestMapping(parsed.header),
    malformedRows: parsed.malformedRows.slice(0, 50),
    truncated: parsed.truncated,
    encodingWarning: parsed.encodingWarning,
  };
}

export async function validateImport(repo: Repository, projectId: string, opts: ImportOptions) {
  const { parsed } = await loadCsv(repo, projectId, opts.fileId, opts.delimiter);
  const result = interpretExpression(parsed.header, parsed.rows, opts);
  if (parsed.malformedRows.length)
    result.issues.unshift({
      level: "aviso",
      code: "linhas_malformadas",
      message: "Linhas com número de colunas diferente do cabeçalho. Confira o separador e aspas.",
      rows: parsed.malformedRows.slice(0, 50),
      count: parsed.malformedRows.length,
    });
  if (parsed.truncated)
    result.issues.unshift({ level: "erro", code: "limite_linhas", message: "O arquivo excede o limite de linhas; apenas o início foi lido.", blocking: true });
  if (opts.valueType === "outro" && !opts.valueTypeNote?.trim()) {
    result.issues.push({ level: "erro", code: "tipo_outro_sem_descricao", message: "Descreva o tipo de valor “Outro”.", blocking: true });
    result.canConfirm = false;
  }
  if (parsed.truncated) result.canConfirm = false;
  return { parsed, result };
}

export async function confirmImport(
  repo: Repository,
  projectId: string,
  actor: Actor,
  opts: ImportOptions & { name: string; synthetic?: boolean },
) {
  const { parsed, result } = await validateImport(repo, projectId, opts);
  if (!result.canConfirm) throw new ApiError(422, "A importação tem erros bloqueantes. Corrija antes de confirmar.", result.issues.filter((i) => i.blocking));
  const at = nowIso();
  const datasetId = newId("d_");
  const info = VALUE_TYPES[opts.valueType];
  const m = opts.mapping;
  const transformations = [
    {
      at,
      step: "Mapeamento de colunas",
      detail: `gene ← “${m.gene}”; amostra ← “${m.sample}”; grupo ← “${m.group}”; valor ← “${m.value}”; unidade ← ${m.unit ? `“${m.unit}”` : `declarada: “${opts.declaredUnit}”`}${m.replicate ? `; réplica ← “${m.replicate}”` : ""}. Separador de colunas: “${parsed.delimiter === "\t" ? "tabulação" : parsed.delimiter}”.`,
      affectedRows: parsed.rows.length,
    },
    { at, step: "Tipo de valor declarado", detail: `${info.label}${opts.valueTypeNote ? ` — ${opts.valueTypeNote}` : ""}.`, affectedRows: parsed.rows.length },
    { at, step: "Rótulos", detail: "Espaços no início e no fim de gene, amostra, grupo e unidade foram removidos.", affectedRows: parsed.rows.length },
  ];
  if (result.convertedCommaCount)
    transformations.push({ at, step: "Separador decimal", detail: "Vírgula decimal convertida para ponto na leitura numérica.", affectedRows: result.convertedCommaCount });
  if (result.missingCount)
    transformations.push({ at, step: "Valores ausentes", detail: "Mantidos como ausentes (não convertidos em zero).", affectedRows: result.missingCount });
  if (result.invalidCount)
    transformations.push({
      at,
      step: "Valores inválidos",
      detail: "Excluídos de gráficos e estatísticas; preservados no arquivo original e na tabela de conferência.",
      affectedRows: result.invalidCount,
    });

  const meta = DatasetMeta.parse({
    id: datasetId,
    name: opts.name.trim() || "Conjunto de dados",
    fileId: opts.fileId,
    valueType: opts.valueType,
    valueTypeNote: opts.valueTypeNote?.trim() || undefined,
    declaredUnit: m.unit ? undefined : opts.declaredUnit?.trim(),
    mapping: m,
    decimalSeparator: opts.decimal,
    rowCount: parsed.rows.length,
    validRowCount: result.validCount,
    missingCount: result.missingCount,
    genes: result.genes,
    groups: result.groups,
    samples: result.samples,
    units: result.units,
    issueSummary: {
      errors: result.issues.filter((i) => i.level === "erro").length,
      warnings: result.issues.filter((i) => i.level === "aviso").length,
    },
    transformations,
    confirmedAt: at,
    synthetic: Boolean(opts.synthetic),
  });
  await repo.putDerived(projectId, "datasets", datasetId, { meta, rows: result.rows, issues: result.issues, replicates: result.replicates });
  const updated = await repo.mutateProject(projectId, actor, (draft) => {
    draft.datasets.push(meta);
    return [
      {
        actor: "pesquisador",
        action: "dados_importados",
        detail: `Interpretação confirmada: “${meta.name}” (${info.label}; ${result.validCount} valores válidos, ${result.missingCount} ausentes, ${result.invalidCount} inválidos).`,
        entity: { type: "dados", id: datasetId },
      },
    ];
  });
  if (!updated) throw new ApiError(404, "Projeto não encontrado.");
  return meta;
}

export type StoredDataset = { meta: DatasetMeta; rows: ExpressionRow[]; issues: ReturnType<typeof interpretExpression>["issues"]; replicates: ReturnType<typeof interpretExpression>["replicates"] };
