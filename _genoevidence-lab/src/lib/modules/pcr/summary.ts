import type { Claim, SourceRef } from "@/lib/sources/catalog";
import { SOURCES } from "@/lib/sources/catalog";
import { PCR_MODULE } from "./content";

export type SummaryInput = {
  visited: string[];
  params: Record<string, string>;
  choices: { stepId: string; parameterId: string; value: string; label: string }[];
  questions: { stepId: string; text: string }[];
  tmC: number | null;
  ampliconBp: number | null;
  polymerase: "taq" | "pfu" | "outra";
  hasGelImage: boolean;
  primaryReferenceTitle?: string | null;
  projectReferencesNotAnalyzed: number;
};

export type SessionSummary = {
  referencesUsed: { id: string; citation: string; locators: string[]; verification: string }[];
  stepsExplored: { id: string; title: string }[];
  choices: string[];
  consequences: (Claim & { parameter: string; option: string })[];
  missingInformation: string[];
  toConfirm: string[];
};

function collectRefs(claims: Claim[], into: Map<string, Set<string>>) {
  for (const c of claims)
    for (const r of c.refs as SourceRef[]) {
      if (!into.has(r.id)) into.set(r.id, new Set());
      if (r.locator) into.get(r.id)!.add(r.locator);
    }
}

/** Resumo da experiência: o que foi usado, escolhido, fundamentado — e o que falta confirmar. */
export function buildSummary(i: SummaryInput): SessionSummary {
  const refs = new Map<string, Set<string>>();
  const steps = PCR_MODULE.steps.filter((s) => i.visited.includes(s.id));
  for (const s of steps) collectRefs([...s.whatHappens, ...s.why, ...s.controls, ...s.observe], refs);

  const consequences: SessionSummary["consequences"] = [];
  for (const p of PCR_MODULE.parameters) {
    const opt = p.options.find((o) => o.value === i.params[p.id]);
    if (!opt) continue;
    const touched = i.choices.some((c) => c.parameterId === p.id);
    if (!touched) continue;
    collectRefs(opt.consequences, refs);
    for (const c of opt.consequences) consequences.push({ ...c, parameter: p.label, option: opt.label });
  }

  const missing: string[] = [];
  if (i.tmC === null) missing.push("Tm aparente dos primers não informada: a temperatura de anelamento não pôde ser conferida.");
  if (i.ampliconBp === null) missing.push("Tamanho esperado do amplicon não informado: tempo de extensão e posição da banda não foram avaliados.");
  if (i.polymerase === "outra") missing.push("Polimerase não listada: tempos e temperaturas dependem da recomendação do fabricante.");
  if (!i.hasGelImage) missing.push("Nenhum resultado experimental (imagem de gel) foi associado ao projeto.");
  if (!i.primaryReferenceTitle) missing.push("Nenhuma referência do projeto foi escolhida como principal; o módulo usou apenas as fontes do catálogo.");
  if (i.projectReferencesNotAnalyzed > 0)
    missing.push(`${i.projectReferencesNotAnalyzed} referência(s) do projeto ainda sem conteúdo analisado; não foram usadas como base.`);
  for (const caveat of SOURCES.lorenz2012.extractionCaveats ?? []) missing.push(`Lorenz (2012): ${caveat}`);
  missing.push(...PCR_MODULE.limitations.map((l) => `Limitação do módulo: ${l}`));

  const toConfirm = [
    "Concentrações dos estoques e volumes de pipetagem do seu laboratório (o módulo não calcula volumes).",
    "Tm dos primers calculada por modelo de vizinhos mais próximos e temperatura de anelamento.",
    "Recomendação do fabricante da polimerase para temperatura e tempo de extensão.",
    "Compatibilidade dos tubos com o termociclador (0,2 mL ou 0,5 mL).",
    "Procedimento local de centrifugação breve e balanceamento do rotor (sem fonte cadastrada no módulo).",
    "Corante de DNA, sistema de visualização e regras de descarte disponíveis na instituição.",
    ...i.questions.map((q) => `Dúvida registrada (${q.stepId}): ${q.text}`),
  ];

  return {
    referencesUsed: [...refs.entries()]
      .filter(([id]) => SOURCES[id])
      .map(([id, loc]) => ({ id, citation: SOURCES[id].citation, locators: [...loc], verification: SOURCES[id].verification })),
    stepsExplored: steps.map((s) => ({ id: s.id, title: `${s.order}. ${s.title}` })),
    choices: i.choices.map((c) => c.label),
    consequences,
    missingInformation: missing,
    toConfirm,
  };
}
