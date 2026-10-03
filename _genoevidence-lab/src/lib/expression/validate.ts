import type { ColumnMapping, ExpressionRow, ExpressionValueType } from "@/lib/domain/schemas";
import { parseNumber } from "./csv";
import { normalizeUnit, VALUE_TYPES } from "./valueTypes";

export type IssueLevel = "erro" | "aviso" | "info";

export type Issue = {
  level: IssueLevel;
  code: string;
  message: string;
  /** Linhas do arquivo original (1 = primeira linha de dados), no máximo 50 exemplos. */
  rows?: number[];
  count?: number;
  /** Erros bloqueantes impedem confirmar a importação. */
  blocking?: boolean;
};

export type InterpretOptions = {
  mapping: ColumnMapping;
  valueType: ExpressionValueType;
  decimal: "." | ",";
  declaredUnit?: string;
};

export type GroupReplicates = { gene: string; group: string; unit: string; n: number; missing: number; samples: string[] };

export type InterpretResult = {
  rows: ExpressionRow[];
  issues: Issue[];
  genes: string[];
  groups: string[];
  samples: string[];
  units: string[];
  missingCount: number;
  invalidCount: number;
  validCount: number;
  convertedCommaCount: number;
  replicates: GroupReplicates[];
  canConfirm: boolean;
};

function sample50(rows: number[]) {
  return rows.slice(0, 50);
}

export function interpretExpression(header: string[], raw: Record<string, string>[], opts: InterpretOptions): InterpretResult {
  const issues: Issue[] = [];
  const { mapping } = opts;
  const info = VALUE_TYPES[opts.valueType];

  // 1. Mapeamento
  const required: (keyof ColumnMapping)[] = ["gene", "sample", "group", "value"];
  for (const key of required) {
    if (!header.includes(mapping[key] ?? "")) {
      issues.push({ level: "erro", code: "mapeamento", message: `A coluna mapeada para “${key}” não existe no arquivo.`, blocking: true });
    }
  }
  const used = required.map((k) => mapping[k]);
  if (new Set(used).size !== used.length) {
    issues.push({ level: "erro", code: "mapeamento_repetido", message: "Gene, amostra, grupo e valor devem ser colunas diferentes.", blocking: true });
  }
  if (mapping.unit && !header.includes(mapping.unit)) {
    issues.push({ level: "erro", code: "mapeamento_unidade", message: "A coluna de unidade mapeada não existe.", blocking: true });
  }
  if (!mapping.unit && !opts.declaredUnit?.trim()) {
    issues.push({
      level: "erro",
      code: "unidade_ausente",
      message: "Informe a coluna de unidade ou declare a unidade de todos os valores.",
      blocking: true,
    });
  }
  if (issues.some((i) => i.blocking)) {
    return emptyResult(issues);
  }

  // 2. Linhas
  const rows: ExpressionRow[] = [];
  const missingRows: number[] = [];
  const invalidRows: number[] = [];
  const commaHintRows: number[] = [];
  const emptyLabelRows: number[] = [];
  const negativeRows: number[] = [];
  const fractionalRows: number[] = [];
  let convertedComma = 0;

  raw.forEach((r, idx) => {
    const sourceRow = idx + 1;
    const gene = (r[mapping.gene] ?? "").trim();
    const sample = (r[mapping.sample] ?? "").trim();
    const group = (r[mapping.group] ?? "").trim();
    const replicate = mapping.replicate ? (r[mapping.replicate] ?? "").trim() || undefined : undefined;
    const unit = mapping.unit ? (r[mapping.unit] ?? "").trim() : (opts.declaredUnit ?? "").trim();
    const rawValue = r[mapping.value] ?? "";
    if (!gene || !sample || !group || !unit) {
      emptyLabelRows.push(sourceRow);
      rows.push({ sourceRow, gene, sample, group, replicate, unit, value: null, status: "invalido", raw: rawValue });
      return;
    }
    const parsed = parseNumber(rawValue, opts.decimal);
    if (parsed.kind === "ausente") {
      missingRows.push(sourceRow);
      rows.push({ sourceRow, gene, sample, group, replicate, unit, value: null, status: "ausente", raw: rawValue });
      return;
    }
    if (parsed.kind === "invalido") {
      invalidRows.push(sourceRow);
      if (parsed.hint) commaHintRows.push(sourceRow);
      rows.push({ sourceRow, gene, sample, group, replicate, unit, value: null, status: "invalido", raw: rawValue });
      return;
    }
    if (parsed.convertedComma) convertedComma++;
    let status: ExpressionRow["status"] = "ok";
    if (!info.allowNegative && parsed.value < 0) {
      negativeRows.push(sourceRow);
      status = "invalido";
    }
    if (info.integerExpected && status === "ok" && !Number.isInteger(parsed.value)) fractionalRows.push(sourceRow);
    rows.push({ sourceRow, gene, sample, group, replicate, unit, value: status === "ok" ? parsed.value : null, status, raw: rawValue });
  });

  if (emptyLabelRows.length)
    issues.push({
      level: "erro",
      code: "rotulo_vazio",
      message: "Linhas sem gene, amostra, grupo ou unidade. Serão excluídas dos gráficos (permanecem no arquivo original).",
      rows: sample50(emptyLabelRows),
      count: emptyLabelRows.length,
    });
  if (invalidRows.length)
    issues.push({
      level: "erro",
      code: "valor_invalido",
      message: commaHintRows.length
        ? "Valores não numéricos. Alguns parecem usar vírgula decimal: ajuste o separador decimal."
        : "Valores não numéricos. Serão excluídos dos gráficos (não são convertidos em zero).",
      rows: sample50(invalidRows),
      count: invalidRows.length,
    });
  if (negativeRows.length)
    issues.push({
      level: "erro",
      code: "negativo_impossivel",
      message: `Valores negativos não são possíveis para “${info.label}”. Confira o tipo de valor declarado.`,
      rows: sample50(negativeRows),
      count: negativeRows.length,
    });
  if (missingRows.length)
    issues.push({
      level: "aviso",
      code: "ausentes",
      message: "Valores ausentes (vazio, NA, ND…). São mantidos como ausentes e mostrados na tabela, nunca como zero.",
      rows: sample50(missingRows),
      count: missingRows.length,
    });
  if (fractionalRows.length)
    issues.push({
      level: "aviso",
      code: "contagem_fracionaria",
      message: "Contagens brutas costumam ser inteiras. Valores fracionários podem indicar contagens estimadas ou dados já normalizados.",
      rows: sample50(fractionalRows),
      count: fractionalRows.length,
    });

  const ok = rows.filter((r) => r.status === "ok");
  const labelled = rows.filter((r) => r.gene && r.sample && r.group);

  // 3. Unidades
  const units = [...new Set(labelled.map((r) => r.unit).filter(Boolean))];
  if (units.length > 1)
    issues.push({
      level: "aviso",
      code: "unidades_mistas",
      message: `Há ${units.length} unidades diferentes (${units.join(", ")}). Os gráficos mostrarão cada unidade separadamente; valores não serão convertidos.`,
    });
  if (info.unitAliases.length) {
    const mismatched = units.filter((u) => !info.unitAliases.includes(normalizeUnit(u)));
    if (mismatched.length)
      issues.push({
        level: "aviso",
        code: "unidade_tipo",
        message: `A unidade “${mismatched.join(", ")}” não corresponde ao tipo declarado (${info.label}). Confira se o tipo de valor está correto.`,
      });
  }

  // 4. Amostra em mais de um grupo
  const sampleGroups = new Map<string, Set<string>>();
  for (const r of labelled) {
    if (!sampleGroups.has(r.sample)) sampleGroups.set(r.sample, new Set());
    sampleGroups.get(r.sample)!.add(r.group);
  }
  const conflicted = [...sampleGroups].filter(([, g]) => g.size > 1).map(([s]) => s);
  if (conflicted.length)
    issues.push({
      level: "erro",
      code: "amostra_multigrupo",
      message: `Amostra(s) atribuída(s) a mais de um grupo: ${conflicted.slice(0, 10).join(", ")}${conflicted.length > 10 ? "…" : ""}. Corrija o arquivo ou o mapeamento.`,
      blocking: true,
    });

  // 5. Duplicatas
  const seen = new Map<string, number[]>();
  for (const r of labelled) {
    const key = `${r.gene}\u0000${r.sample}\u0000${r.replicate ?? ""}\u0000${r.unit}`;
    seen.set(key, [...(seen.get(key) ?? []), r.sourceRow]);
  }
  const dupRows = [...seen.values()].filter((v) => v.length > 1).flat();
  if (dupRows.length)
    issues.push({
      level: "aviso",
      code: "duplicatas",
      message:
        "Mesmo gene e amostra aparecem mais de uma vez. Todas as linhas são preservadas; se forem réplicas técnicas, mapeie uma coluna de réplica.",
      rows: sample50(dupRows),
      count: dupRows.length,
    });

  // 6. Réplicas por gene × grupo × unidade
  const repMap = new Map<string, GroupReplicates>();
  for (const r of labelled) {
    const key = `${r.gene}\u0000${r.group}\u0000${r.unit}`;
    const g = repMap.get(key) ?? { gene: r.gene, group: r.group, unit: r.unit, n: 0, missing: 0, samples: [] };
    if (r.status === "ok") g.n++;
    else g.missing++;
    if (!g.samples.includes(r.sample)) g.samples.push(r.sample);
    repMap.set(key, g);
  }
  const replicates = [...repMap.values()];
  const single = replicates.filter((g) => g.n === 1);
  if (single.length)
    issues.push({
      level: "aviso",
      code: "sem_replica",
      message: `${single.length} combinação(ões) gene × grupo têm apenas um valor válido. Não é possível estimar variabilidade nesses casos.`,
    });

  if (info.relative)
    issues.push({
      level: "info",
      code: "valor_relativo",
      message: `“${info.label}” é relativo a uma referência. Os gráficos mostram a razão/diferença informada, não abundância.`,
    });
  if (opts.valueType === "ct")
    issues.push({ level: "info", code: "ct_inverso", message: "Para Ct/Cq, valores menores indicam mais molde inicial." });
  if (opts.valueType === "outro")
    issues.push({ level: "info", code: "tipo_outro", message: "Tipo “Outro”: descreva o que os valores representam antes de confirmar." });

  const genes = [...new Set(labelled.map((r) => r.gene))];
  const groups = [...new Set(labelled.map((r) => r.group))];
  const samples = [...new Set(labelled.map((r) => r.sample))];
  if (ok.length === 0) issues.push({ level: "erro", code: "sem_valores", message: "Nenhum valor numérico válido encontrado.", blocking: true });

  return {
    rows,
    issues,
    genes,
    groups,
    samples,
    units,
    missingCount: missingRows.length,
    invalidCount: rows.filter((r) => r.status === "invalido").length,
    validCount: ok.length,
    convertedCommaCount: convertedComma,
    replicates,
    canConfirm: !issues.some((i) => i.blocking),
  };
}

function emptyResult(issues: Issue[]): InterpretResult {
  return {
    rows: [],
    issues,
    genes: [],
    groups: [],
    samples: [],
    units: [],
    missingCount: 0,
    invalidCount: 0,
    validCount: 0,
    convertedCommaCount: 0,
    replicates: [],
    canConfirm: false,
  };
}
