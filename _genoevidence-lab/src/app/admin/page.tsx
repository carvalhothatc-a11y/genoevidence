import type { Metadata } from "next";
import { listAccounts, toPublic } from "@/lib/auth/store";
import { recentAudit } from "@/lib/audit";
import { requireAdminPage, formatDate } from "@/lib/projects/server";
import { AccountsTable } from "@/components/admin/AccountsTable";
import { Card, PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Administração" };

export default async function AdminPage() {
  const admin = await requireAdminPage();
  const accounts = (await listAccounts()).map(toPublic);
  const events = await recentAudit(60);
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <PageHeader eyebrow="administração" title="Acessos ao GenoLab" description="Aprove pesquisadores, suspenda acessos e acompanhe eventos de segurança. Contas novas começam pendentes e não veem nenhum dado." />
      <div className="grid gap-6">
        <Card title="Contas">
          <AccountsTable rows={accounts} selfId={admin.id} />
        </Card>
        <Card title="Eventos de segurança recentes">
          <p className="mb-3 text-xs text-muted">Registro sem conteúdo de pesquisa: só identificadores, ações e resultados. E-mails aparecem apenas como resumo criptográfico.</p>
          {events.length === 0 ? (
            <p className="text-sm text-muted">Nenhum evento neste mês.</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Eventos de segurança</caption>
                <thead className="ge-mono uppercase text-muted">
                  <tr>
                    <th scope="col" className="py-1 pr-3">Quando</th>
                    <th scope="col" className="py-1 pr-3">Evento</th>
                    <th scope="col" className="py-1 pr-3">Resultado</th>
                    <th scope="col" className="py-1">Detalhe</th>
                  </tr>
                </thead>
                <tbody className="ge-mono">
                  {events.map((e, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-1 pr-3">{formatDate(e.at)}</td>
                      <td className="py-1 pr-3">{e.event}</td>
                      <td className="py-1 pr-3">{e.result ?? "—"}</td>
                      <td className="py-1">{[e.action, e.detail].filter(Boolean).join(" · ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
