import type { ConcUnit, ExperimentPlan, ReactionComponent } from "@/lib/domain/schemas";

/**
 * Cálculo de volumes por diluição (C₁V₁ = C₂V₂) e do master mix (reações + excedente, arredondado
 * para cima — Lorenz 2012, §4, Notas). É aritmética sobre os valores informados; não verifica se as
 * concentrações escolhidas são adequadas para a reação.
 */

export const COMPONENT_LABEL: Record<ReactionComponent["id"], string> = {
  tampao: "Tampão de PCR",
  mgcl2: "MgCl₂",
  dntps: "dNTPs (cada)",
  primer_f: "Primer direto (F)",
  primer_r: "Primer reverso (R)",
  polimerase: "DNA polimerase",
};

const MOLAR: Partial<Record<ConcUnit, number>> = { mM: 1e-3, "µM": 1e-6, nM: 1e-9 };

export type ComponentVolume = {
  id: ReactionComponent["id"];
  label: string;
  perReactionUl: number | null;
  masterMixUl: number | null;
  error?: string;
  warning?: string;
};

export type MasterMixResult = {
  reactions: number;
  masterMixReactions: number;
  components: ComponentVolume[];
  templateUl: number | null;
  waterPerReactionUl: number | null;
  waterMasterMixUl: number | null;
  masterMixPerTubeUl: number | null;
  errors: string[];
  warnings: string[];
};

export function componentVolume(c: ReactionComponent, finalVolumeUl: number): { ul: number | null; error?: string } {
  if (c.stock === null || c.final === null) return { ul: null, error: "Informe estoque e concentração final." };
  if (c.final === 0) return { ul: 0 };
  // Atividade total por reação (U) a partir de estoque em U/µL.
  if (c.finalUnit === "U") {
    if (c.stockUnit !== "U/µL") return { ul: null, error: "Para unidades totais (U), o estoque deve estar em U/µL." };
    return { ul: c.final / c.stock };
  }
  if (c.stockUnit === "X" || c.finalUnit === "X") {
    if (c.stockUnit !== c.finalUnit) return { ul: null, error: "Estoque e final precisam estar ambos em X." };
    return { ul: (c.final * finalVolumeUl) / c.stock };
  }
  const ms = MOLAR[c.stockUnit];
  const mf = MOLAR[c.finalUnit];
  if (ms !== undefined && mf !== undefined) return { ul: (c.final * mf * finalVolumeUl) / (c.stock * ms) };
  if (c.stockUnit === c.finalUnit) return { ul: (c.final * finalVolumeUl) / c.stock };
  return { ul: null, error: `Unidades incompatíveis (${c.stockUnit} → ${c.finalUnit}).` };
}

export function reactionCount(plan: Pick<ExperimentPlan, "samples" | "controls">): number {
  return plan.samples.length + (plan.controls.ntc ? 1 : 0) + (plan.controls.positive ? 1 : 0);
}

export function computeMasterMix(plan: Pick<ExperimentPlan, "samples" | "controls" | "reaction">): MasterMixResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const reactions = reactionCount(plan);
  const mmReactions = Math.ceil(reactions * (1 + plan.reaction.extraPercent / 100));
  const V = plan.reaction.finalVolumeUl;
  if (!V) errors.push("Informe o volume final da reação.");
  const components: ComponentVolume[] = plan.reaction.components.map((c) => {
    if (!V) return { id: c.id, label: COMPONENT_LABEL[c.id], perReactionUl: null, masterMixUl: null };
    const r = componentVolume(c, V);
    const out: ComponentVolume = {
      id: c.id,
      label: COMPONENT_LABEL[c.id],
      perReactionUl: r.ul,
      masterMixUl: r.ul !== null && c.inMasterMix ? r.ul * mmReactions : null,
      error: r.error,
    };
    if (r.ul !== null && r.ul > 0 && r.ul < 0.5)
      out.warning = "Volume < 0,5 µL por reação: confira se está na faixa de precisão da sua micropipeta (no master mix o volume é maior).";
    return out;
  });
  for (const c of components) if (c.error) errors.push(`${c.label}: ${c.error}`);
  const template = plan.reaction.templateVolumeUl;
  if (template === null) errors.push("Informe o volume de molde por reação.");
  let water: number | null = null;
  if (V && template !== null && components.every((c) => c.perReactionUl !== null)) {
    const sum = components.reduce((a, c) => a + (c.perReactionUl ?? 0), 0) + template;
    water = V - sum;
    if (water < 0) errors.push(`A soma dos volumes (${sum.toFixed(2)} µL) excede o volume final (${V} µL). Use estoques mais concentrados ou aumente o volume.`);
  }
  const mmComponents = components.filter((c, i) => plan.reaction.components[i].inMasterMix);
  const perTube = water !== null && water >= 0 ? mmComponents.reduce((a, c) => a + (c.perReactionUl ?? 0), 0) + water : null;
  if (reactions === 0) errors.push("Inclua ao menos uma amostra ou controle.");
  return {
    reactions,
    masterMixReactions: mmReactions,
    components,
    templateUl: template,
    waterPerReactionUl: water,
    waterMasterMixUl: water !== null && water >= 0 ? water * mmReactions : null,
    masterMixPerTubeUl: perTube,
    errors,
    warnings: [...warnings, ...components.flatMap((c) => (c.warning ? [`${c.label}: ${c.warning}`] : []))],
  };
}

// ---------------------------------------------------------------- primers (descritivo)

export const IUPAC = /^[ACGTRYSWKMBDHVN]*$/;

export function primerStats(seq: string): { length: number; gc: number | null; valid: boolean } {
  const s = seq.replace(/\s+/g, "").toUpperCase();
  const valid = IUPAC.test(s);
  const gcCount = (s.match(/[GC]/g) ?? []).length;
  return { length: s.length, gc: s.length ? (gcCount / s.length) * 100 : null, valid };
}

export function defaultComponents(): ReactionComponent[] {
  // Valores de partida = composição típica da Tabela 1 de Lorenz (2012), para 50 µL. Ajuste aos seus estoques.
  return [
    { id: "tampao", stock: 10, stockUnit: "X", final: 1, finalUnit: "X", inMasterMix: true },
    { id: "dntps", stock: 10, stockUnit: "mM", final: 200, finalUnit: "µM", inMasterMix: true },
    { id: "mgcl2", stock: 25, stockUnit: "mM", final: 1.5, finalUnit: "mM", inMasterMix: true },
    { id: "primer_f", stock: 20, stockUnit: "µM", final: 0.4, finalUnit: "µM", inMasterMix: true },
    { id: "primer_r", stock: 20, stockUnit: "µM", final: 0.4, finalUnit: "µM", inMasterMix: true },
    { id: "polimerase", stock: 5, stockUnit: "U/µL", final: 2.5, finalUnit: "U", inMasterMix: true },
  ];
}
