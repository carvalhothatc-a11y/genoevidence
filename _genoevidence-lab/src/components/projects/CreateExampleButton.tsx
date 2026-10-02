"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CreateExampleButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/examples", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Falha ao criar o exemplo.");
    router.push(`/projetos/${data.project.id}`);
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={create} disabled={busy}>
        {busy ? "Criando…" : "Criar projeto de exemplo (sintético)"}
      </Button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
