"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

export function StructureAddForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pdbId, setPdbId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);

  async function finish(res: Response) {
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ tone: "danger", text: data.error ?? "Falha ao adicionar a estrutura." });
    router.push(`/projetos/${projectId}/estruturas/${data.structure.id}`);
  }

  async function byId(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    await finish(await fetch(`/api/projects/${projectId}/structures`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pdbId }) }));
  }
  async function byFile(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    await finish(await fetch(`/api/projects/${projectId}/structures`, { method: "POST", body: fd }));
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={byFile} className="grid gap-2">
        <Field label="Enviar arquivo PDB ou mmCIF" htmlFor="estrutura-arquivo" hint="O arquivo original é preservado. Extensões: .pdb, .ent, .cif, .mmcif.">
          <input id="estrutura-arquivo" type="file" accept=".pdb,.ent,.cif,.mmcif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </Field>
        <div>
          <Button type="submit" variant="secondary" disabled={!file || busy}>
            Enviar estrutura
          </Button>
        </div>
      </form>
      <form onSubmit={byId} className="grid gap-2">
        <Field label="Ou buscar no RCSB PDB" htmlFor="pdb-id" hint="Será feita uma requisição pública ao RCSB PDB contendo apenas o identificador informado.">
          <TextInput id="pdb-id" value={pdbId} onChange={(e) => setPdbId(e.target.value.toUpperCase())} placeholder="ex.: 1UBQ" maxLength={4} className="ge-mono" />
        </Field>
        <div>
          <Button type="submit" variant="secondary" disabled={pdbId.length !== 4 || busy}>
            {busy ? "Buscando…" : "Buscar e adicionar"}
          </Button>
        </div>
      </form>
      <div aria-live="polite" className="md:col-span-2">
        {msg && <Alert tone={msg.tone} title={msg.text} />}
      </div>
    </div>
  );
}
