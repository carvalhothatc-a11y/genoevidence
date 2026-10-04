"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { destinoSeguro, ultimaPagina } from "@/lib/navegacao";

/** Quem já entrou não vê o login de novo: volta para onde estava (ou para a área de trabalho). */
export function Retomar({ voltar }: { voltar?: string | null }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(destinoSeguro(voltar) ?? ultimaPagina() ?? "/laboratorio");
  }, [router, voltar]);
  return (
    <p role="status" className="grid min-h-[50vh] place-items-center text-sm text-[#a7b2c8]">
      Você já está conectado. Voltando para onde estava…
    </p>
  );
}
