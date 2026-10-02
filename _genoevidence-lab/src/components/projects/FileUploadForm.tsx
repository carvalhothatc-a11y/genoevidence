"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

/** Envio de imagem de resultado (ex.: gel). O arquivo é preservado e exibido como dado do pesquisador. */
export function FileUploadForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("Imagem de gel de agarose");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("role", role);
    const res = await fetch(`/api/projects/${projectId}/files`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ tone: "danger", text: data.error ?? "Falha no envio." });
    setMsg({ tone: "ok", text: `Arquivo “${data.file.name}” preservado no projeto.` });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Imagem (PNG, JPEG ou WebP)" htmlFor="upload-img">
        <input id="upload-img" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
      </Field>
      <Field label="O que este arquivo representa" htmlFor="upload-role">
        <TextInput id="upload-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} />
      </Field>
      <div aria-live="polite">{msg && <Alert tone={msg.tone} title={msg.text} />}</div>
      <div>
        <Button type="submit" disabled={!file || busy}>
          {busy ? "Enviando…" : "Enviar"}
        </Button>
      </div>
    </form>
  );
}
