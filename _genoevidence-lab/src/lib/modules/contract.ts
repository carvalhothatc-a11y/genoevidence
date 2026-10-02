import type { Claim, SourceRef } from "@/lib/sources/catalog";

/**
 * Contrato estruturado de um módulo educativo/técnico. Os componentes de interface APENAS
 * renderizam estes contratos; não há geração de código de simulação a partir de documentos.
 */
export type ModuleStatus = "implementado" | "parcial" | "nao_implementado";

export type ModelCard = {
  id: string;
  name: string;
  equation: string;
  parameters: { id: string; label: string; unit?: string; range: string; source: "usuario" | "referencia" | "fixo" }[];
  assumptions: string[];
  validity: string;
  limitations: string[];
  implementation: string;
  doesNotPredict: string[];
};

export type ModuleOutput = {
  id: string;
  label: string;
  kind: "dados" | "ilustracao" | "simulacao";
  requires: string;
};

export type ModuleStep = {
  id: string;
  order: number;
  title: string;
  short: string;
  /** Objetos do laboratório 3D relevantes nesta etapa (ids de lib/lab/objects). */
  benchObjects: string[];
  /** Fase da ilustração molecular sincronizada com a etapa (se houver). */
  molecularPhase?: MolecularPhase;
  /** Saída da escala de resultados relacionada (se houver). */
  resultOutput?: string;
  whatHappens: Claim[];
  why: Claim[];
  materials: { objectId: string; role: string }[];
  controls: Claim[];
  observe: Claim[];
  limitations: string[];
};

export type MolecularPhase = "inicio" | "desnaturacao" | "anelamento" | "extensao" | "produtos";

export type ParameterOption = {
  value: string;
  label: string;
  consequences: Claim[];
};

export type ExploratoryParameter = {
  id: string;
  label: string;
  stepId: string;
  description: string;
  options: ParameterOption[];
  defaultValue: string;
};

export type ModuleContract = {
  id: string;
  title: string;
  technique: string;
  version: string;
  status: ModuleStatus;
  summary: string;
  acceptedInputs: string[];
  requiredFields: string[];
  sources: SourceRef[];
  steps: ModuleStep[];
  visualObjects: string[];
  interactions: string[];
  parameters: ExploratoryParameter[];
  models: ModelCard[];
  outputs: ModuleOutput[];
  limitations: string[];
  authorship: string;
};
