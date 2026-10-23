import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/Card";
import { AbasBioMol } from "@/components/biomol/Abas";

/**
 * Área BioMol: as ferramentas de biologia molecular dividem o mesmo cabeçalho e as mesmas abas.
 * Cada página continua conferindo a sessão por conta própria.
 */
export default function BioMolLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8">
      <PageHeader
        eyebrow="BioMol · biologia molecular"
        title="Moléculas"
        description="Estruturas reais em 3D, análise de sequências e os processos de replicação, transcrição e tradução — com a origem de cada dado à vista."
      />
      <AbasBioMol />
      {children}
    </div>
  );
}
