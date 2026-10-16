import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/Card";
import { requirePageUser } from "@/lib/projects/server";
import { Explorador } from "@/components/moleculas/Explorador";

export const metadata: Metadata = { title: "Moléculas" };

export default async function MoleculasPage() {
  await requirePageUser("/moleculas");
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8">
      <PageHeader
        eyebrow="Explorar"
        title="Moléculas"
        description="Procure uma molécula pelo nome e veja a estrutura real em 3D. Tudo o que aparece aqui foi depositado por pesquisadores no RCSB PDB ou no PubChem — nada é desenhado nem calculado."
      />
      <Explorador />
    </div>
  );
}
