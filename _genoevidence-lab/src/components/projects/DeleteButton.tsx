"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Exclusão com confirmação explícita (digitar o nome). */
export function DeleteButton({ url, confirmText, label, redirectTo, description }: { url: string; confirmText: string; label: string; redirectTo?: string; description: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    setBusy(true);
    setError("");
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível excluir.");
      return;
    }
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
    setOpen(false);
  }

  if (!open)
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  return (
    <div role="group" aria-label={label} className="grid gap-2 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm">
      <p>{description}</p>
      <label className="grid gap-1">
        <span>
          Digite <strong>{confirmText}</strong> para confirmar:
        </span>
        <input className="rounded border border-line bg-surface px-2 py-1" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
      </label>
      {error && <p role="alert" className="font-medium text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="danger" disabled={typed !== confirmText || busy} onClick={doDelete}>
          {busy ? "Excluindo…" : "Excluir definitivamente"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
