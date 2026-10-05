"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

const ACEITOS = ".png,.jpg,.jpeg,.webp,.pdf,.docx,.csv,.tsv,.xlsx,.txt,.md";

/** Envio de arquivo do projeto (imagem, documento, planilha, PDF ou texto), preservado como dado do pesquisador. */
export function FileUploadForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
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
    setMsg({ tone: "ok", text: `Arquivo “${data.file.name}” preservado no projeto. O conteúdo não é interpretado aqui: para virar uma visualização, envie-o na área de trabalho.` });
    setFile(null);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Arquivo" htmlFor="upload-arquivo" hint="Imagem (PNG, JPEG, WebP), documento (PDF, DOCX, TXT, MD) ou tabela (CSV, TSV, XLSX). Até 20 MB.">
        <input id="upload-arquivo" type="file" accept={ACEITOS} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
      </Field>
      <Field label="O que este arquivo representa" htmlFor="upload-role" hint="Ex.: protocolo de síntese, imagem de gel, planilha de resultados, levantamento de artigos.">
        <TextInput id="upload-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="Descreva o papel deste arquivo no projeto" />
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
