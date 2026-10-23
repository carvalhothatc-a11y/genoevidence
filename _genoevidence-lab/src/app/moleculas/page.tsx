import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePageUser } from "@/lib/projects/server";
import { Explorador } from "@/components/moleculas/Explorador";

export const metadata: Metadata = { title: "Moléculas" };

export default async function MoleculasPage() {
  await requirePageUser("/moleculas");
  return (
    <div className="grid gap-4">
      <p className="max-w-3xl text-sm text-muted">
        Procure uma molécula pelo nome e veja a estrutura real em 3D. Tudo o que aparece aqui foi depositado por pesquisadores no RCSB PDB ou no
        PubChem — nada é desenhado nem calculado.
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Explorador />
      </Suspense>
    </div>
  );
}
