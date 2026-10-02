"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ResidueHighlight, StructureRecord } from "@/lib/domain/schemas";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { VisualKindBadge } from "@/components/ui/Badges";
import type { ViewerCommand } from "./MolstarViewer";

const MolstarViewer = dynamic(() => import("./MolstarViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center" role="status">
      <p className="ge-mono text-sm text-panel-muted">carregando o Mol*…</p>
    </div>
  ),
});

const CHECK_LABEL: Record<ResidueHighlight["check"], { label: string; cls: string; icon: string }> = {
  confere: { label: "confere", cls: "bg-ok-soft text-ok", icon: "✔" },
  diverge: { label: "diverge", cls: "bg-danger-soft text-danger", icon: "✖" },
  nao_encontrado: { label: "não encontrado", cls: "bg-warn-soft text-warn", icon: "?" },
  sem_expectativa: { label: "sem resíduo esperado", cls: "bg-surface-2 text-muted", icon: "·" },
};

export function StructureWorkbench({ projectId, structure }: { projectId: string; structure: StructureRecord }) {
  const router = useRouter();
  const s = structure.summary;
  const [status, setStatus] = useState<{ state: "carregando" | "pronto" | "erro"; message?: string }>({ state: "carregando" });
  const [cmd, setCmd] = useState<(ViewerCommand & { nonce: number }) | null>(null);
  const [isolated, setIsolated] = useState<string | null>(null);
  const [chain, setChain] = useState(s.chains[0]?.id ?? "");
  const [num, setNum] = useState("");
  const [ins, setIns] = useState("");
  const [expected, setExpected] = useState("");
  const [label, setLabel] = useState("");
  const [check, setCheck] = useState<{ check: ResidueHighlight["check"]; message: string } | null>(null);
  const [error, setError] = useState("");
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  const send = (c: ViewerCommand) => setCmd({ ...c, nonce: Date.now() });

  async function verify(save: boolean) {
    setError("");
    const n = Number(num);
    if (!chain || !Number.isInteger(n)) return setError("Informe cadeia e número do resíduo (inteiro).");
    const res = await fetch(`/api/projects/${projectId}/structures/${structure.id}/highlights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain, residueNumber: n, insertionCode: ins || undefined, expectedResidue: expected || undefined, label: label || undefined, dryRun: !save }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Falha na conferência.");
    setCheck(data.result);
    if (data.result.check !== "nao_encontrado") send({ type: "focusResidue", residue: { chain, residueNumber: n, insertionCode: ins || undefined } });
    if (save) router.refresh();
  }

  async function removeHighlight(id: string) {
    await fetch(`/api/projects/${projectId}/structures/${structure.id}/highlights?h=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <section aria-label="Visualizador molecular" className="grid gap-2">
        <div className="relative h-[62vh] min-h-[360px] overflow-hidden rounded-[var(--r-lg)] bg-panel shadow-[var(--shadow-3)]">
          <MolstarViewer
            url={`/api/projects/${projectId}/files/${structure.fileId}`}
            format={structure.format}
            highlights={structure.highlights.map((h) => ({ chain: h.chain, residueNumber: h.residueNumber, insertionCode: h.insertionCode }))}
            command={cmd}
            reducedMotion={reduced}
            onStatus={setStatus}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
            <span className="pointer-events-auto rounded-full bg-panel-2/90 px-3 py-1.5 text-xs font-semibold text-white">
              {s.idCode ?? "estrutura"} · cadeias coloridas pelo Mol* (identidade) · destaques em azul
            </span>
            <span className="pointer-events-auto">
              <VisualKindBadge kind="dados" />
            </span>
          </div>
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2" role="toolbar" aria-label="Câmera do visualizador">
            <button type="button" onClick={() => send({ type: "reset" })} className="ge-press rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-ink">
              ↺ Reiniciar câmera
            </button>
            {isolated && (
              <button
                type="button"
                onClick={() => {
                  setIsolated(null);
                  send({ type: "isolate", chain: null });
                }}
                className="ge-press rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-ink"
              >
                Mostrar todas as cadeias
              </button>
            )}
          </div>
          {status.state !== "pronto" && (
            <div className="absolute inset-0 grid place-items-center p-6" role="status">
              {status.state === "erro" ? <Alert tone="danger" title={status.message ?? "Falha ao carregar a estrutura."} /> : <p className="ge-mono text-sm text-panel-muted">carregando estrutura…</p>}
            </div>
          )}
        </div>
        <p className="text-xs text-muted">
          Arraste para girar, role para aproximar. Destacar uma posição <strong>não</strong> calcula uma estrutura mutante nem prevê dinâmica.
        </p>
      </section>

      <aside className="grid content-start gap-4">
        <section className="ge-card p-4" aria-labelledby="origem">
          <h2 id="origem" className="mb-2 text-base font-bold">
            Origem
          </h2>
          <dl className="grid gap-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Fonte</dt>
              <dd className="text-right">
                {structure.source.type === "rcsb" ? (
                  <a className="underline" href={`https://www.rcsb.org/structure/${structure.source.pdbId}`} target="_blank" rel="noreferrer noopener">
                    RCSB PDB {structure.source.pdbId}
                  </a>
                ) : structure.source.type === "exemplo" ? (
                  "Arquivo de exemplo (RCSB PDB)"
                ) : (
                  "Enviado pelo pesquisador"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Método</dt>
              <dd className="ge-mono text-right text-xs">{s.method ?? "não informado"}</dd>
            </div>
            {s.resolution !== undefined && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Resolução</dt>
                <dd className="ge-mono text-xs">{s.resolution.toLocaleString("pt-BR")} Å</dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Tipo</dt>
              <dd className="font-semibold">
                {s.classification === "experimental" ? "Estrutura experimental" : s.classification === "computacional" ? "Modelo computacional" : "Não identificado"}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">{s.classificationBasis}</p>
          {s.title && <p className="mt-2 text-xs">Título no arquivo: “{s.title}”</p>}
          {s.warnings.map((w) => (
            <p key={w} className="mt-1 text-xs text-warn">
              ⚠ {w}
            </p>
          ))}
        </section>

        <section className="ge-card p-4" aria-labelledby="cadeias">
          <h2 id="cadeias" className="mb-2 text-base font-bold">
            Cadeias
          </h2>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Cadeias poliméricas e numeração do autor</caption>
            <thead className="ge-mono text-[11px] text-muted">
              <tr>
                <th scope="col" className="py-1">Cadeia</th>
                <th scope="col" className="py-1">Resíduos</th>
                <th scope="col" className="py-1">Numeração</th>
                <th scope="col" className="py-1">Ações</th>
              </tr>
            </thead>
            <tbody>
              {s.chains.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <th scope="row" className="ge-mono py-1.5">{c.id}</th>
                  <td className="ge-mono py-1.5">{c.residueCount}</td>
                  <td className="ge-mono py-1.5 text-xs">
                    {c.firstResidue}–{c.lastResidue}
                    {c.gaps.length ? ` (${c.gaps.length} lacuna${c.gaps.length > 1 ? "s" : ""})` : ""}
                  </td>
                  <td className="py-1.5">
                    <div className="flex gap-1">
                      <button type="button" className="rounded-full border border-line px-2 py-0.5 text-xs hover:bg-surface-2" onClick={() => send({ type: "focusChain", chain: c.id })}>
                        Focar
                      </button>
                      <button
                        type="button"
                        aria-pressed={isolated === c.id}
                        className={`rounded-full border px-2 py-0.5 text-xs ${isolated === c.id ? "border-ink bg-ink text-white" : "border-line hover:bg-surface-2"}`}
                        onClick={() => {
                          const next = isolated === c.id ? null : c.id;
                          setIsolated(next);
                          send({ type: "isolate", chain: next });
                        }}
                      >
                        Isolar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted">Sequência observada no arquivo</summary>
            {s.chains.map((c) => (
              <p key={c.id} className="ge-mono mt-1 break-all text-[11px]">
                {c.id}: {c.sequence}
              </p>
            ))}
          </details>
        </section>

        <section className="ge-card p-4" aria-labelledby="destaque">
          <h2 id="destaque" className="mb-1 text-base font-bold">
            Destacar resíduo
          </h2>
          <p className="mb-3 text-xs text-muted">A conferência usa a numeração do autor do arquivo, que pode diferir da UniProt.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-xs">
              Cadeia
              <select value={chain} onChange={(e) => setChain(e.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-sm w-full min-w-0">
                {s.chains.map((c) => (
                  <option key={c.id}>{c.id}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Número
              <input inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value)} className="ge-mono rounded-lg border border-line px-2 py-1.5 text-sm w-full min-w-0" />
            </label>
            <label className="grid gap-1 text-xs">
              Inserção
              <input maxLength={1} value={ins} onChange={(e) => setIns(e.target.value.toUpperCase())} className="ge-mono rounded-lg border border-line px-2 py-1.5 text-sm w-full min-w-0" placeholder="—" />
            </label>
            <label className="grid gap-1 text-xs">
              Esperado
              <input maxLength={3} value={expected} onChange={(e) => setExpected(e.target.value.toUpperCase())} className="ge-mono rounded-lg border border-line px-2 py-1.5 text-sm w-full min-w-0" placeholder="K ou LYS" />
            </label>
          </div>
          <label className="mt-2 grid gap-1 text-xs">
            Rótulo (opcional)
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-sm w-full min-w-0" placeholder="ex.: posição de interesse" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => verify(false)}>
              Conferir
            </Button>
            <Button size="sm" onClick={() => verify(true)} disabled={!check || check.check === "nao_encontrado"}>
              Salvar destaque
            </Button>
          </div>
          <div aria-live="polite" className="mt-2 grid gap-2">
            {error && <Alert tone="danger" title={error} />}
            {check && <Alert tone={check.check === "confere" ? "ok" : check.check === "diverge" ? "danger" : check.check === "nao_encontrado" ? "warn" : "info"} title={check.message} />}
          </div>
          {structure.highlights.length > 0 && (
            <ul className="mt-3 grid gap-1.5 text-sm">
              {structure.highlights.map((h) => {
                const c = CHECK_LABEL[h.check];
                return (
                  <li key={h.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
                    <button type="button" className="text-left" onClick={() => send({ type: "focusResidue", residue: { chain: h.chain, residueNumber: h.residueNumber, insertionCode: h.insertionCode } })}>
                      <span className="ge-mono">
                        {h.chain}:{h.observedResidue ?? "?"}
                        {h.residueNumber}
                        {h.insertionCode ?? ""}
                      </span>
                      {h.label && <span className="ml-2 text-muted">{h.label}</span>}
                    </button>
                    <span className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.cls}`}>
                        {c.icon} {c.label}
                      </span>
                      <button type="button" className="text-xs underline" onClick={() => removeHighlight(h.id)} aria-label="Remover destaque">
                        remover
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
