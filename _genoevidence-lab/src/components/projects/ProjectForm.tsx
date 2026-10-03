"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Project } from "@/lib/domain/schemas";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/Field";

type Group = { name: string; description?: string };

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const editing = Boolean(project);
  const [title, setTitle] = useState(project?.title ?? "");
  const [objective, setObjective] = useState(project?.objective ?? "");
  const [organism, setOrganism] = useState(project?.organism ?? "");
  const [technique, setTechnique] = useState(project?.technique ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [groups, setGroups] = useState<Group[]>(project?.groups ?? []);
  const [conditions, setConditions] = useState(project?.conditions ?? "");
  const [unitsAndReplicates, setUnits] = useState(project?.unitsAndReplicates ?? "");
  const [limitations, setLimitations] = useState(project?.limitations ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "saved">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrors({});
    const fields = {
      title,
      objective,
      organism,
      technique,
      description,
      groups: groups.filter((g) => g.name.trim()),
      conditions,
      unitsAndReplicates,
      limitations,
    };
    const res = await fetch(editing ? `/api/projects/${project!.id}` : "/api/projects", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { fields } : fields),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const map: Record<string, string> = {};
      for (const d of data.details ?? []) map[d.campo] = d.mensagem;
      setErrors(map);
      setStatus("error");
      setMessage(data.error ?? "Não foi possível salvar.");
      return;
    }
    setStatus("saved");
    if (editing) {
      setMessage("Alterações salvas e registradas no histórico.");
      router.refresh();
    } else {
      router.push(`/projetos/${data.project.id}`);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate aria-describedby="form-status">
      <Field label="Título *" htmlFor="title" error={errors.title}>
        <TextInput id="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} aria-invalid={Boolean(errors.title)} />
      </Field>
      <Field label="Objetivo" htmlFor="objective" hint="O que a pesquisa pretende responder.">
        <TextArea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organismo ou sistema estudado" htmlFor="organism" hint="Ex.: Saccharomyces cerevisiae; linhagem celular HEK293.">
          <TextInput id="organism" value={organism} onChange={(e) => setOrganism(e.target.value)} />
        </Field>
        <Field label="Técnica principal" htmlFor="technique" hint="Ex.: PCR convencional; RNA-seq (dados processados).">
          <TextInput id="technique" value={technique} onChange={(e) => setTechnique(e.target.value)} />
        </Field>
      </div>
      <Field label="Descrição do experimento" htmlFor="description">
        <TextArea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <fieldset className="grid gap-2 rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-medium">Grupos</legend>
        {groups.length === 0 && <p className="text-sm text-muted">Nenhum grupo cadastrado.</p>}
        {groups.map((g, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <TextInput aria-label={`Nome do grupo ${i + 1}`} placeholder="Nome (ex.: controle)" value={g.name} onChange={(e) => setGroups(groups.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <TextInput aria-label={`Descrição do grupo ${i + 1}`} placeholder="Descrição" value={g.description ?? ""} onChange={(e) => setGroups(groups.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            <Button variant="ghost" onClick={() => setGroups(groups.filter((_, j) => j !== i))} aria-label={`Remover grupo ${i + 1}`}>
              Remover
            </Button>
          </div>
        ))}
        <div>
          <Button variant="secondary" onClick={() => setGroups([...groups, { name: "" }])}>
            + Adicionar grupo
          </Button>
        </div>
      </fieldset>
      <Field label="Condições" htmlFor="conditions" hint="Tratamentos, tempos, doses, ambiente.">
        <TextArea id="conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} />
      </Field>
      <Field label="Unidades e réplicas" htmlFor="units" hint="Ex.: 3 réplicas biológicas por grupo; valores em TPM.">
        <TextArea id="units" value={unitsAndReplicates} onChange={(e) => setUnits(e.target.value)} />
      </Field>
      <Field label="Limitações conhecidas" htmlFor="limitations">
        <TextArea id="limitations" value={limitations} onChange={(e) => setLimitations(e.target.value)} />
      </Field>
      <div id="form-status" aria-live="polite">
        {status === "error" && <Alert tone="danger" title={message} />}
        {status === "saved" && editing && <Alert tone="ok" title={message} />}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Salvando…" : editing ? "Salvar alterações" : "Criar projeto"}
        </Button>
      </div>
    </form>
  );
}
