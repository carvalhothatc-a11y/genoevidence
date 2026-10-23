import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePageUser } from "@/lib/projects/server";
import { Processos } from "@/components/biomol/processos/Processos";

export const metadata: Metadata = { title: "Processos · Moléculas" };

export default async function ProcessosPage() {
  await requirePageUser("/moleculas/processos");
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Processos />
    </Suspense>
  );
}
