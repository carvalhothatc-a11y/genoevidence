"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ColumnMapping, ExpressionValueType, FileRecord } from "@/lib/domain/schemas";
import { VALUE_TYPES } from "@/lib/expression/valueTypes";
import type { Issue, GroupReplicates } from "@/lib/expression/validate";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { SourceList } from "@/components/sources/SourceList";

type Preview = {
  file: FileRecord;
  header: string[];
  sample: Record<string, string>[];
  rowCount: number;
  delimiter: string;
  suggestedDecimal: "." | ",";
  suggestedMapping: Partial<ColumnMapping>;
  malformedRows: number[];
  truncated: boolean;
  encodingWarning?: string;
};

type Validation = {
  issues: Issue[];
  canConfirm: boolean;
  summary: {
    genes: string[];
    groups: string[];
    samples: string[];
    units: string[];
    validCount: number;
    missingCount: number;
    invalidCount: number;
    replicates: GroupReplicates[];
  };
};

const STEPS = ["Arquivo", "Conferir leitura", "Mapear colunas", "Validar", "Confirmar"];
const DELIMS: { v: string; label: string }[] = [
  { v: ",", label: "Vírgula (,)" },
  { v: ";", label: "Ponto e vírgula (;)" },
  { v: "\t", label: "Tabulação" },
  { v: "|", label: "Barra vertical (|)" },
];

async function api<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Falha na solicitação.");
  return data as T;
}

function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return <Alert tone="ok" title="Nenhum problema encontrado." />;
  const order = { erro: 0, aviso: 1, info: 2 } as const;
  return (
    <ul className="grid gap-2">
      {[...issues]
        .sort((a, b) => order[a.level] - order[b.level])
        .map((i, k) => (
          <li key={k}>
            <Alert tone={i.level === "erro" ? "danger" : i.level === "aviso" ? "warn" : "info"} title={`${i.level === "erro" ? "Erro" : i.level === "aviso" ? "Aviso" : "Nota"}${i.blocking ? " (bloqueia a confirmação)" : ""}: ${i.message}`}>
              {i.count !== undefined && (
                <p>
                  {i.count} linha(s)
                  {i.rows?.length ? `; exemplos (linha de dados): ${i.rows.slice(0, 15).join(", ")}${i.rows.length > 15 ? "…" : ""}` : ""}
                </p>
              )}
            </Alert>
          </li>
        ))}
    </ul>
  );
}

export function ImportWizard({ projectId, csvFiles, synthetic }: { projectId: string; csvFiles: FileRecord[]; synthetic: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [delimiter, setDelimiter] = useState<string | undefined>();
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [unitMode, setUnitMode] = useState<"coluna" | "declarada">("coluna");
  const [declaredUnit, setDeclaredUnit] = useState("");
  const [valueType, setValueType] = useState<ExpressionValueType | "">("");
  const [valueTypeNote, setValueTypeNote] = useState("");
  const [decimal, setDecimal] = useState<"." | ",">(".");
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<Validation | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const base = `/api/projects/${projectId}`;

  async function loadPreview(fileId: string, delim?: string) {
    setBusy(true);
    setError("");
    try {
      const p = await api<Preview>(`${base}/datasets`, { action: "preview", fileId, delimiter: delim });
      setPreview(p);
      setDelimiter(p.delimiter);
      setMapping(p.suggestedMapping);
      setUnitMode(p.suggestedMapping.unit ? "coluna" : "declarada");
      setDecimal(p.suggestedDecimal);
      setName((n) => n || p.file.name.replace(/\.[^.]+$/, ""));
      setStep(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("role", "Tabela de expressão (CSV)");
    const res = await fetch(`${base}/files`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Falha no envio.");
    await loadPreview(data.file.id);
  }

  async function useExample() {
    setBusy(true);
    setError("");
    const res = await fetch("/samples/expressao_exemplo_SINTETICO.csv");
    const blob = await res.blob();
    setBusy(false);
    await upload(new File([blob], "expressao_exemplo_SINTETICO.csv", { type: "text/csv" }));
  }

  const fullMapping = useMemo((): ColumnMapping | null => {
    if (!mapping.gene || !mapping.sample || !mapping.group || !mapping.value) return null;
    return {
      gene: mapping.gene,
      sample: mapping.sample,
      group: mapping.group,
      value: mapping.value,
      unit: unitMode === "coluna" ? mapping.unit : undefined,
      replicate: mapping.replicate || undefined,
    };
  }, [mapping, unitMode]);

  function options() {
    return {
      fileId: preview!.file.id,
      delimiter: delimiter as "," | ";" | "\t" | "|",
      mapping: fullMapping!,
      valueType: valueType as ExpressionValueType,
      valueTypeNote: valueTypeNote || undefined,
      decimal,
      declaredUnit: unitMode === "declarada" ? declaredUnit : undefined,
    };
  }

  async function runValidation() {
    if (!fullMapping || !valueType) return setError("Mapeie as colunas obrigatórias e escolha o tipo de valor.");
    setBusy(true);
    setError("");
    try {
      setValidation(await api<Validation>(`${base}/datasets`, { action: "validate", ...options() }));
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ dataset: { id: string } }>(`${base}/datasets`, { action: "confirm", ...options(), name, confirmed: true });
      router.push(`/projetos/${projectId}/dados/${data.dataset.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const vt = valueType ? VALUE_TYPES[valueType] : null;
  const columnSelect = (key: keyof ColumnMapping, label: string, required: boolean) => (
    <Field label={`${label}${required ? " *" : ""}`} htmlFor={`map-${key}`}>
      <Select id={`map-${key}`} value={mapping[key] ?? ""} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value || undefined })}>
        <option value="">{required ? "Selecione a coluna" : "Nenhuma"}</option>
        {preview?.header.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <div className="grid gap-5">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Etapas da importação">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={`rounded-full border px-3 py-1 ${i === step ? "border-accent bg-accent-soft font-semibold text-accent-ink" : i < step ? "border-line bg-surface" : "border-line text-muted"}`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div aria-live="polite">{error && <Alert tone="danger" title={error} />}</div>

      {step === 0 && (
        <section className="grid gap-4" aria-label="Escolher arquivo">
          <Field label="Enviar CSV (o original é preservado sem alterações)" htmlFor="csv-file" hint="Aceita .csv, .tsv ou .txt com separador vírgula, ponto e vírgula ou tabulação.">
            <input
              id="csv-file"
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              disabled={busy}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              className="text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2"
            />
          </Field>
          {csvFiles.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm font-medium">Ou use um CSV já enviado a este projeto:</p>
              <ul className="flex flex-wrap gap-2">
                {csvFiles.map((f) => (
                  <li key={f.id}>
                    <Button variant="secondary" disabled={busy} onClick={() => loadPreview(f.id)}>
                      {f.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {synthetic ? (
            <Button variant="secondary" onClick={useExample} disabled={busy}>
              Usar o CSV de exemplo (dados sintéticos)
            </Button>
          ) : (
            <p className="text-sm text-muted">
              Modelo de colunas:{" "}
              <a className="underline" href="/samples/expressao_exemplo_SINTETICO.csv" download>
                baixar exemplo (dados sintéticos)
              </a>
              . O exemplo não é importado em projetos reais.
            </p>
          )}
          {busy && <p role="status">Processando…</p>}
        </section>
      )}

      {step === 1 && preview && (
        <section className="grid gap-4" aria-label="Conferir leitura">
          <p className="text-sm">
            Arquivo <strong>{preview.file.name}</strong>: {preview.rowCount} linha(s) de dados e {preview.header.length} coluna(s).
          </p>
          {preview.encodingWarning && <Alert tone="warn" title={preview.encodingWarning} />}
          {preview.malformedRows.length > 0 && (
            <Alert tone="warn" title="Linhas com número de colunas diferente do cabeçalho">
              Linhas: {preview.malformedRows.join(", ")}. Confira o separador.
            </Alert>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Separador de colunas" htmlFor="delim" hint="Detectado automaticamente; altere se a tabela abaixo estiver errada.">
              <Select
                id="delim"
                value={delimiter}
                onChange={(e) => {
                  setDelimiter(e.target.value);
                  loadPreview(preview.file.id, e.target.value);
                }}
              >
                {DELIMS.map((d) => (
                  <option key={d.v} value={d.v}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Separador decimal" htmlFor="decimal" hint={`Sugestão a partir do conteúdo: “${preview.suggestedDecimal === "," ? "vírgula" : "ponto"}”.`}>
              <Select id="decimal" value={decimal} onChange={(e) => setDecimal(e.target.value as "." | ",")}>
                <option value=".">Ponto (1.5)</option>
                <option value=",">Vírgula (1,5)</option>
              </Select>
            </Field>
          </div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Primeiras linhas do arquivo como lidas</caption>
              <thead className="bg-surface-2 text-xs">
                <tr>
                  <th scope="col" className="px-2 py-1.5">Linha</th>
                  {preview.header.map((h) => (
                    <th scope="col" key={h} className="px-2 py-1.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="tabular px-2 py-1 text-muted">{i + 1}</td>
                    {preview.header.map((h) => (
                      <td key={h} className="px-2 py-1">
                        {r[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Voltar
            </Button>
            <Button onClick={() => setStep(2)}>A leitura está correta</Button>
          </div>
        </section>
      )}

      {step === 2 && preview && (
        <section className="grid gap-4" aria-label="Mapear colunas">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {columnSelect("gene", "Gene", true)}
            {columnSelect("sample", "Amostra", true)}
            {columnSelect("group", "Grupo", true)}
            {columnSelect("value", "Valor", true)}
          </div>
          <fieldset className="grid gap-3 rounded-lg border border-line p-3">
            <legend className="px-1 text-sm font-medium">Unidade *</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="unitMode" checked={unitMode === "coluna"} onChange={() => setUnitMode("coluna")} /> Uma coluna do arquivo informa a unidade
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="unitMode" checked={unitMode === "declarada"} onChange={() => setUnitMode("declarada")} /> Todos os valores têm a mesma unidade
              </label>
            </div>
            {unitMode === "coluna" ? (
              columnSelect("unit", "Coluna de unidade", true)
            ) : (
              <Field label="Unidade de todos os valores" htmlFor="declared-unit" hint="Ex.: TPM, contagens, log2FC, Ct.">
                <TextInput id="declared-unit" value={declaredUnit} onChange={(e) => setDeclaredUnit(e.target.value)} />
              </Field>
            )}
          </fieldset>
          {columnSelect("replicate", "Réplica (opcional)", false)}
          <Field label="Tipo de valor *" htmlFor="value-type" hint="Contagens brutas, TPM, valores normalizados e fold change não são equivalentes e nunca são misturados.">
            <Select id="value-type" value={valueType} onChange={(e) => setValueType(e.target.value as ExpressionValueType)}>
              <option value="">Selecione</option>
              {Object.entries(VALUE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
          {vt && (
            <Alert tone="info" title={vt.description}>
              <ul>
                {vt.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              {vt.refs.length > 0 && <SourceList refs={vt.refs} compact />}
            </Alert>
          )}
          <Field label={`Observação sobre o tipo de valor${valueType === "outro" ? " *" : ""}`} htmlFor="vt-note" hint="Ex.: método de normalização, gene de referência, software usado.">
            <TextInput id="vt-note" value={valueTypeNote} onChange={(e) => setValueTypeNote(e.target.value)} />
          </Field>
          <Field label="Nome deste conjunto de dados" htmlFor="ds-name">
            <TextInput id="ds-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button onClick={runValidation} disabled={busy || !fullMapping || !valueType}>
              {busy ? "Validando…" : "Validar"}
            </Button>
          </div>
        </section>
      )}

      {step === 3 && validation && (
        <section className="grid gap-4" aria-label="Resultado da validação">
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <p className="rounded-lg border border-line bg-surface p-3">
              <span className="block text-xs text-muted">Valores válidos</span>
              <strong className="tabular text-lg">{validation.summary.validCount}</strong>
            </p>
            <p className="rounded-lg border border-line bg-surface p-3">
              <span className="block text-xs text-muted">Ausentes (mantidos)</span>
              <strong className="tabular text-lg">{validation.summary.missingCount}</strong>
            </p>
            <p className="rounded-lg border border-line bg-surface p-3">
              <span className="block text-xs text-muted">Inválidos</span>
              <strong className="tabular text-lg">{validation.summary.invalidCount}</strong>
            </p>
            <p className="rounded-lg border border-line bg-surface p-3">
              <span className="block text-xs text-muted">Unidade(s)</span>
              <strong>{validation.summary.units.join(", ") || "—"}</strong>
            </p>
          </div>
          <IssueList issues={validation.issues} />
          <details className="rounded-lg border border-line p-3" open>
            <summary className="cursor-pointer text-sm font-medium">
              Réplicas por gene e grupo ({validation.summary.genes.length} genes, {validation.summary.groups.length} grupos, {validation.summary.samples.length} amostras)
            </summary>
            <div className="mt-2 max-h-72 overflow-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Número de valores válidos por gene e grupo</caption>
                <thead className="text-xs text-muted">
                  <tr>
                    <th scope="col" className="py-1 pr-3">Gene</th>
                    <th scope="col" className="py-1 pr-3">Grupo</th>
                    <th scope="col" className="py-1 pr-3">Unidade</th>
                    <th scope="col" className="py-1 pr-3">n válidos</th>
                    <th scope="col" className="py-1 pr-3">Ausentes/inválidos</th>
                    <th scope="col" className="py-1">Amostras</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.summary.replicates.map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-1 pr-3">{r.gene}</td>
                      <td className="py-1 pr-3">{r.group}</td>
                      <td className="py-1 pr-3">{r.unit}</td>
                      <td className="tabular py-1 pr-3">
                        {r.n}
                        {r.n < 2 && <span className="ml-1 text-warn">(sem réplica)</span>}
                      </td>
                      <td className="tabular py-1 pr-3">{r.missing}</td>
                      <td className="py-1">{r.samples.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Corrigir mapeamento
            </Button>
            <Button onClick={() => setStep(4)} disabled={!validation.canConfirm}>
              Prosseguir para confirmação
            </Button>
          </div>
          {!validation.canConfirm && <Alert tone="danger" title="Há erros bloqueantes. Corrija o mapeamento ou o arquivo e valide novamente." />}
        </section>
      )}

      {step === 4 && validation && vt && (
        <section className="grid gap-4" aria-label="Confirmar interpretação">
          <Alert tone="info" title="Confirme a interpretação antes de salvar">
            <ul>
              <li>
                Tipo de valor: <strong>{vt.label}</strong>
                {valueTypeNote ? ` (${valueTypeNote})` : ""}
              </li>
              <li>Unidade(s): {validation.summary.units.join(", ")}</li>
              <li>
                Grupos: {validation.summary.groups.join(", ")} · {validation.summary.samples.length} amostras · {validation.summary.genes.length} genes
              </li>
              <li>Valores ausentes ficam ausentes; valores inválidos ficam fora dos gráficos; o arquivo original não é alterado.</li>
              <li>Nenhum teste estatístico será realizado; a plataforma mostra apenas estatística descritiva.</li>
            </ul>
          </Alert>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            Confirmo que os valores são do tipo e unidade indicados e que o mapeamento de amostras e grupos está correto.
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Voltar
            </Button>
            <Button onClick={confirm} disabled={!confirmed || busy}>
              {busy ? "Salvando…" : "Confirmar e salvar"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
