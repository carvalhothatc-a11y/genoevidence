"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { dataCurta } from "@/lib/datas";

type Row = { id: string; name: string; email: string; institution?: string; createdAt: string; status: "pendente" | "autorizado" | "suspenso"; role: "admin" | "pesquisador"; statusChangedAt?: string };

const STATUS = {
  pendente: { label: "Pendente", cls: "bg-warn-soft text-warn" },
  autorizado: { label: "Autorizado", cls: "bg-ok-soft text-ok" },
  suspenso: { label: "Suspenso", cls: "bg-danger-soft text-danger" },
} as const;

export function AccountsTable({ rows, selfId }: { rows: Row[]; selfId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [filter, setFilter] = useState<"todos" | Row["status"]>("pendente");
  const [confirmar, setConfirmar] = useState<string | null>(null);
  async function excluir(r: Row) {
    setMsg(null);
    setConfirmar(null);
    const res = await fetch(`/api/admin/contas/${r.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg({ tone: "danger", text: data.error ?? "Não foi possível excluir." });
    setMsg({ tone: "ok", text: `Conta de ${r.name} excluída, com ${data.projetosApagados ?? 0} projeto(s) de que era dona.` });
    router.refresh();
  }
  async function patch(id: string, body: object, ok: string) {
    setMsg(null);
    const res = await fetch(`/api/admin/contas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg({ tone: "danger", text: data.error ?? "Não foi possível alterar." });
    setMsg({ tone: "ok", text: ok });
    router.refresh();
  }
  const shown = rows.filter((r) => filter === "todos" || r.status === filter);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filtrar contas">
        {(["pendente", "autorizado", "suspenso", "todos"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={`ge-press rounded-full px-3.5 py-1.5 text-sm ${filter === f ? "bg-ink text-white" : "shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2"}`}
          >
            {f === "todos" ? "Todas" : STATUS[f].label} <span className="ge-mono text-xs opacity-70">{f === "todos" ? rows.length : rows.filter((r) => r.status === f).length}</span>
          </button>
        ))}
      </div>
      <div aria-live="polite">{msg && <Alert tone={msg.tone} title={msg.text} />}</div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma conta neste filtro.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Contas do GenoLab</caption>
            <thead className="ge-mono text-[11px] uppercase text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3">Pessoa</th>
                <th scope="col" className="py-2 pr-3">Instituição</th>
                <th scope="col" className="py-2 pr-3">Cadastro</th>
                <th scope="col" className="py-2 pr-3">Estado</th>
                <th scope="col" className="py-2 pr-3">Papel</th>
                <th scope="col" className="py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <th scope="row" className="py-2.5 pr-3 font-normal">
                    <span className="block font-semibold text-ink">{r.name}</span>
                    <span className="ge-mono text-xs text-muted">{r.email}</span>
                  </th>
                  <td className="py-2.5 pr-3">{r.institution || <span className="text-muted">—</span>}</td>
                  <td className="ge-mono py-2.5 pr-3 text-xs">{dataCurta(r.createdAt)}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                  </td>
                  <td className="py-2.5 pr-3">{r.role === "admin" ? "Administração" : "Pesquisador"}</td>
                  <td className="py-2.5">
                    {r.id === selfId ? (
                      <span className="text-xs text-muted">sua conta</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.status !== "autorizado" && (
                          <button type="button" className="ge-press rounded-full bg-action px-3 py-1 text-xs font-semibold text-white" onClick={() => patch(r.id, { status: "autorizado" }, `Acesso de ${r.name} autorizado.`)}>
                            Autorizar
                          </button>
                        )}
                        {r.status !== "suspenso" && (
                          <button type="button" className="ge-press rounded-full px-3 py-1 text-xs shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2" onClick={() => patch(r.id, { status: "suspenso" }, `Acesso de ${r.name} suspenso; sessões encerradas.`)}>
                            Suspender
                          </button>
                        )}
                        {r.status === "autorizado" && (
                          <button
                            type="button"
                            className="ge-press rounded-full px-3 py-1 text-xs shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2"
                            onClick={() => patch(r.id, { role: r.role === "admin" ? "pesquisador" : "admin" }, "Papel alterado.")}
                          >
                            {r.role === "admin" ? "Tornar pesquisador" : "Tornar administração"}
                          </button>
                        )}
                        {confirmar === r.id ? (
                          <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Confirmar exclusão da conta de ${r.name}`}>
                            <span className="text-xs text-danger">Apagar conta e projetos?</span>
                            <button type="button" className="ge-press rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white" onClick={() => excluir(r)}>
                              Confirmar exclusão
                            </button>
                            <button type="button" className="ge-press rounded-full px-3 py-1 text-xs shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2" onClick={() => setConfirmar(null)}>
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button type="button" className="ge-press rounded-full px-3 py-1 text-xs text-danger shadow-[inset_0_0_0_1px_var(--line)] hover:bg-danger-soft" onClick={() => setConfirmar(r.id)}>
                            Excluir conta
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
