import { z } from "@/lib/zod";

/**
 * Contratos centrais do domínio. Toda informação persistida passa por estes esquemas.
 * A IA (quando configurada) só pode PREENCHER estruturas validadas aqui — nunca gerar código.
 */

export const id = () => z.string().min(6).max(64).regex(/^[a-zA-Z0-9_-]+$/);
export const isoDate = () => z.string().datetime({ offset: true });

/** Categorias de representação visual — sempre exibidas ao usuário. */
export const VisualKind = z.enum(["dados", "ilustracao", "simulacao"]);
export type VisualKind = z.infer<typeof VisualKind>;

/** Fundamento de uma consequência no modo exploratório. */
export const ConsequenceBasis = z.enum(["referencia", "modelo", "ilustracao", "imprevisivel"]);
export type ConsequenceBasis = z.infer<typeof ConsequenceBasis>;

// ---------------------------------------------------------------- Arquivos

export const FileKind = z.enum(["csv", "pdf", "estrutura", "imagem", "texto", "planilha", "documento", "outro"]);
export type FileKind = z.infer<typeof FileKind>;

export const FileRecord = z.object({
  id: id(),
  name: z.string().min(1).max(255),
  mimeType: z.string().max(120),
  size: z.number().int().nonnegative(),
  sha256: z.string().length(64),
  kind: FileKind,
  uploadedAt: isoDate(),
  /** Papel declarado pelo pesquisador (ex.: "resultado de gel", "tabela de expressão"). */
  role: z.string().max(120).optional(),
  /** Origem externa, quando o arquivo foi obtido de um banco público a pedido do usuário. */
  externalSource: z
    .object({ name: z.string(), url: z.string().url(), retrievedAt: isoDate() })
    .optional(),
});
export type FileRecord = z.infer<typeof FileRecord>;

// ---------------------------------------------------------------- Referências

/**
 * cadastrada        → só metadados (título, DOI, link). O conteúdo NÃO foi lido.
 * conteudo_obtido   → texto extraído de arquivo ou colado pelo pesquisador.
 * analisada         → extração estruturada conferida pelo pesquisador.
 */
export const ReferenceStatus = z.enum(["cadastrada", "conteudo_obtido", "analisada"]);
export type ReferenceStatus = z.infer<typeof ReferenceStatus>;

export const ReferenceKind = z.enum(["artigo", "protocolo", "manual", "doi_link", "texto"]);
export type ReferenceKind = z.infer<typeof ReferenceKind>;

export const ExtractionCategory = z.enum([
  "objetivo",
  "tecnica",
  "materiais",
  "equipamentos",
  "etapas",
  "parametros",
  "controles",
  "resultados",
  "limitacoes",
]);
export type ExtractionCategory = z.infer<typeof ExtractionCategory>;

export const Origin = z.object({
  page: z.number().int().positive().optional(),
  section: z.string().max(200).optional(),
  /** Trecho curto do próprio documento do pesquisador, para conferência. */
  snippet: z.string().max(400).optional(),
});
export type Origin = z.infer<typeof Origin>;

export const ExtractionItem = z.object({
  id: id(),
  category: ExtractionCategory,
  text: z.string().min(1).max(2000),
  origin: Origin,
  method: z.enum(["regra", "ia", "pesquisador"]),
  confirmed: z.boolean(),
  /** Parâmetro estruturado, quando reconhecido (ex.: 95 °C, 30 s, 35 ciclos). */
  parameter: z
    .object({
      name: z.string().max(80),
      value: z.number().optional(),
      valueText: z.string().max(80),
      unit: z.string().max(20).optional(),
    })
    .optional(),
});
export type ExtractionItem = z.infer<typeof ExtractionItem>;

export const Reference = z.object({
  id: id(),
  kind: ReferenceKind,
  title: z.string().min(1).max(500),
  authors: z.string().max(1000).optional(),
  year: z.number().int().min(1800).max(2100).optional(),
  doi: z.string().max(200).optional(),
  url: z.string().url().max(1000).optional(),
  fileId: id().optional(),
  technique: z.string().max(120).optional(),
  status: ReferenceStatus,
  metadataSource: z.enum(["pesquisador", "arquivo", "catalogo_modulo"]),
  content: z
    .object({
      method: z.enum(["pdf_texto", "texto_colado"]),
      pages: z.number().int().nonnegative(),
      chars: z.number().int().nonnegative(),
      extractedAt: isoDate(),
      warnings: z.array(z.string()).default([]),
    })
    .optional(),
  extraction: z.array(ExtractionItem).default([]),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(5000).optional(),
  addedAt: isoDate(),
  updatedAt: isoDate(),
});
export type Reference = z.infer<typeof Reference>;

// ---------------------------------------------------------------- Expressão gênica

export const ExpressionValueType = z.enum([
  "contagem_bruta",
  "cpm",
  "tpm",
  "fpkm_rpkm",
  "normalizado",
  "log2_normalizado",
  "fold_change",
  "log2_fold_change",
  "ct",
  "delta_ct",
  "expressao_relativa",
  "outro",
]);
export type ExpressionValueType = z.infer<typeof ExpressionValueType>;

export const ColumnMapping = z.object({
  gene: z.string().min(1),
  sample: z.string().min(1),
  group: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  replicate: z.string().optional(),
});
export type ColumnMapping = z.infer<typeof ColumnMapping>;

export const Transformation = z.object({
  at: isoDate(),
  step: z.string().max(200),
  detail: z.string().max(2000),
  affectedRows: z.number().int().nonnegative(),
});
export type Transformation = z.infer<typeof Transformation>;

export const DatasetMeta = z.object({
  id: id(),
  name: z.string().min(1).max(200),
  fileId: id(),
  valueType: ExpressionValueType,
  valueTypeNote: z.string().max(500).optional(),
  /** Unidade fixa declarada quando o CSV não tem coluna de unidade. */
  declaredUnit: z.string().max(40).optional(),
  mapping: ColumnMapping,
  decimalSeparator: z.enum([".", ","]),
  rowCount: z.number().int().nonnegative(),
  validRowCount: z.number().int().nonnegative(),
  missingCount: z.number().int().nonnegative(),
  genes: z.array(z.string()),
  groups: z.array(z.string()),
  samples: z.array(z.string()),
  units: z.array(z.string()),
  issueSummary: z.object({ errors: z.number().int(), warnings: z.number().int() }),
  transformations: z.array(Transformation),
  confirmedAt: isoDate(),
  synthetic: z.boolean().default(false),
});
export type DatasetMeta = z.infer<typeof DatasetMeta>;

export const ExpressionRow = z.object({
  /** Número da linha no arquivo original (1 = primeira linha de dados). */
  sourceRow: z.number().int().positive(),
  gene: z.string(),
  sample: z.string(),
  group: z.string(),
  replicate: z.string().optional(),
  unit: z.string(),
  /** null = valor ausente ou inválido (NUNCA convertido para zero). */
  value: z.number().nullable(),
  status: z.enum(["ok", "ausente", "invalido"]),
  raw: z.string(),
});
export type ExpressionRow = z.infer<typeof ExpressionRow>;

// ---------------------------------------------------------------- Estruturas

export const StructureClassification = z.enum(["experimental", "computacional", "desconhecida"]);

export const ChainSummary = z.object({
  id: z.string(),
  entityType: z.enum(["polimero", "outro"]),
  residueCount: z.number().int().nonnegative(),
  firstResidue: z.number().int().optional(),
  lastResidue: z.number().int().optional(),
  sequence: z.string(),
  gaps: z.array(z.tuple([z.number().int(), z.number().int()])),
  hasInsertionCodes: z.boolean(),
  /** [número do autor, código de inserção, resíduo (3 letras)] — usado para conferir variantes. */
  residues: z.array(z.tuple([z.number().int(), z.string().max(1), z.string().max(4)])).default([]),
});
export type ChainSummary = z.infer<typeof ChainSummary>;

export const StructureSummary = z.object({
  title: z.string().optional(),
  idCode: z.string().optional(),
  method: z.string().optional(),
  resolution: z.number().optional(),
  classification: StructureClassification,
  classificationBasis: z.string(),
  chains: z.array(ChainSummary),
  numbering: z.literal("autor"),
  warnings: z.array(z.string()),
});
export type StructureSummary = z.infer<typeof StructureSummary>;

export const ResidueHighlight = z.object({
  id: id(),
  chain: z.string(),
  residueNumber: z.number().int(),
  insertionCode: z.string().max(1).optional(),
  expectedResidue: z.string().max(3).optional(),
  observedResidue: z.string().max(3).optional(),
  check: z.enum(["confere", "diverge", "nao_encontrado", "sem_expectativa"]),
  label: z.string().max(80).optional(),
  createdAt: isoDate(),
});
export type ResidueHighlight = z.infer<typeof ResidueHighlight>;

export const StructureRecord = z.object({
  id: id(),
  fileId: id(),
  format: z.enum(["pdb", "mmcif"]),
  source: z.object({
    type: z.enum(["upload", "rcsb", "exemplo"]),
    pdbId: z.string().max(12).optional(),
    url: z.string().url().optional(),
    retrievedAt: isoDate().optional(),
  }),
  summary: StructureSummary,
  highlights: z.array(ResidueHighlight),
  addedAt: isoDate(),
});
export type StructureRecord = z.infer<typeof StructureRecord>;

// ---------------------------------------------------------------- Sessões de módulos

export const ModuleChoice = z.object({
  at: isoDate(),
  stepId: z.string(),
  parameterId: z.string(),
  value: z.string(),
  label: z.string(),
});

export const ScenarioConsequence = z.object({
  text: z.string(),
  basis: ConsequenceBasis,
  sourceIds: z.array(z.string()),
  locator: z.string().optional(),
});

export const ModuleSession = z.object({
  id: id(),
  moduleId: z.string(),
  mode: z.enum(["guiado", "exploratorio"]),
  title: z.string().max(200),
  startedAt: isoDate(),
  savedAt: isoDate(),
  stepsVisited: z.array(z.string()),
  choices: z.array(ModuleChoice),
  consequences: z.array(ScenarioConsequence),
  questions: z.array(z.object({ at: isoDate(), stepId: z.string(), text: z.string().max(2000) })),
  primaryReferenceId: z.string().optional(),
  referencesUsed: z.array(z.string()),
  missingInformation: z.array(z.string()),
  toConfirm: z.array(z.string()),
  /** Estado das interações para reabrir a experiência (parâmetros, programa, canaletas…). */
  state: z.record(z.string(), z.unknown()).optional(),
});
export type ModuleSession = z.infer<typeof ModuleSession>;

// ---------------------------------------------------------------- Experimentos (plano preenchido pelo pesquisador)

export const ConcUnit = z.enum(["X", "mM", "µM", "nM", "U/µL", "U", "ng/µL"]);
export type ConcUnit = z.infer<typeof ConcUnit>;

export const ReactionComponent = z.object({
  id: z.enum(["tampao", "mgcl2", "dntps", "primer_f", "primer_r", "polimerase"]),
  stock: z.number().positive().nullable(),
  stockUnit: ConcUnit,
  final: z.number().nonnegative().nullable(),
  finalUnit: ConcUnit,
  inMasterMix: z.boolean().default(true),
});
export type ReactionComponent = z.infer<typeof ReactionComponent>;

export const ExperimentSample = z.object({
  name: z.string().max(80),
  templateType: z.enum(["dna_genomico", "plasmideo", "cdna", "produto_pcr", "outro"]),
  concentration: z.number().nonnegative().nullable(),
  a260280: z.number().nonnegative().nullable(),
  notes: z.string().max(300).default(""),
});

export const Primer = z.object({
  name: z.string().max(80),
  sequence: z.string().max(80),
  tmC: z.number().min(30).max(90).nullable(),
});

export const Step = z.object({ tempC: z.number(), seconds: z.number() });

export const ExperimentPlan = z.object({
  id: id(),
  title: z.string().max(200),
  objective: z.string().max(2000).default(""),
  responsible: z.string().max(120).default(""),
  plannedDate: z.string().max(10).default(""),
  status: z.enum(["rascunho", "pronto", "realizado"]),
  target: z.object({ gene: z.string().max(120), description: z.string().max(500).default(""), ampliconBp: z.number().int().positive().nullable(), referenceId: z.string().optional() }),
  primers: z.object({ forward: Primer, reverse: Primer }),
  samples: z.array(ExperimentSample).max(24),
  controls: z.object({ ntc: z.boolean(), positive: z.boolean(), positiveDescription: z.string().max(300).default("") }),
  reaction: z.object({
    finalVolumeUl: z.number().positive().nullable(),
    extraPercent: z.number().min(0).max(50),
    templateVolumeUl: z.number().nonnegative().nullable(),
    components: z.array(ReactionComponent),
  }),
  polymerase: z.enum(["taq", "pfu", "outra"]),
  polymeraseName: z.string().max(120).default(""),
  program: z.object({
    initialDenaturation: Step,
    cycles: z.number().int(),
    denaturation: Step,
    annealing: Step,
    extension: Step,
    finalExtension: Step,
    holdC: z.number(),
  }),
  gel: z.object({
    agarosePercent: z.number().positive().nullable(),
    buffer: z.enum(["TAE", "TBE", "outro"]),
    ladder: z.string().max(120).default(""),
    voltsPerCm: z.number().positive().nullable(),
    lanes: z.array(z.enum(["vazio", "marcador", "amostra", "ntc", "positivo"])).max(20),
  }),
  runs: z.array(z.object({ at: isoDate(), sessionId: z.string().optional(), notes: z.string().max(500).default("") })).default([]),
  createdAt: isoDate(),
  updatedAt: isoDate(),
});
export type ExperimentPlan = z.infer<typeof ExperimentPlan>;

// ---------------------------------------------------------------- Compartilhamento e notas

export const ShareRole = z.enum(["leitor", "editor", "gestor"]);
export type ShareRole = z.infer<typeof ShareRole>;

export const ProjectShare = z.object({
  id: id(),
  principal: z.object({ type: z.enum(["usuario", "equipe"]), id: z.string().min(6).max(64) }),
  role: ShareRole,
  grantedBy: z.string().max(64),
  grantedAt: isoDate(),
});
export type ProjectShare = z.infer<typeof ProjectShare>;

export const ProjectNote = z.object({
  id: id(),
  text: z.string().trim().min(1).max(5000),
  /** Vínculo opcional com etapa de módulo, objeto do laboratório ou referência. */
  link: z
    .object({ type: z.enum(["etapa", "objeto", "referencia", "dados", "estrutura"]), id: z.string().max(64), label: z.string().max(120) })
    .optional(),
  authorId: z.string().max(64),
  authorName: z.string().max(120),
  createdAt: isoDate(),
  updatedAt: isoDate().optional(),
});
export type ProjectNote = z.infer<typeof ProjectNote>;

// ---------------------------------------------------------------- Projeto

export const HistoryEntry = z.object({
  id: id(),
  at: isoDate(),
  actor: z.enum(["pesquisador", "sistema", "assistente"]),
  /** Quem fez a alteração (projetos compartilhados têm mais de uma pessoa). */
  actorId: z.string().max(64).optional(),
  actorName: z.string().max(120).optional(),
  action: z.string().max(120),
  detail: z.string().max(4000),
  entity: z.object({ type: z.string(), id: z.string() }).optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntry>;

export const ProjectGroup = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
});

export const ProjectFields = z.object({
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres.").max(200),
  objective: z.string().max(4000).default(""),
  organism: z.string().max(300).default(""),
  technique: z.string().max(200).default(""),
  description: z.string().max(10000).default(""),
  groups: z.array(ProjectGroup).max(50).default([]),
  conditions: z.string().max(4000).default(""),
  unitsAndReplicates: z.string().max(4000).default(""),
  limitations: z.string().max(6000).default(""),
});
export type ProjectFields = z.infer<typeof ProjectFields>;

export const Project = ProjectFields.extend({
  id: id(),
  ownerId: z.string().min(8),
  synthetic: z.boolean(),
  visibility: z.literal("privado"),
  aiConsent: z.object({ claudeApi: z.boolean(), changedAt: isoDate().optional() }),
  files: z.array(FileRecord),
  references: z.array(Reference),
  datasets: z.array(DatasetMeta),
  structures: z.array(StructureRecord),
  sessions: z.array(ModuleSession),
  experiments: z.array(ExperimentPlan).default([]),
  shares: z.array(ProjectShare).default([]),
  notes: z.array(ProjectNote).default([]),
  history: z.array(HistoryEntry),
  createdAt: isoDate(),
  updatedAt: isoDate(),
});
export type Project = z.infer<typeof Project>;

export type ProjectSummary = Pick<
  Project,
  "id" | "title" | "technique" | "organism" | "synthetic" | "createdAt" | "updatedAt"
> & {
  counts: { files: number; references: number; datasets: number; structures: number; sessions: number };
  /** Papel efetivo de quem lista (dono ou via compartilhamento). */
  role: "dono" | ShareRole;
};
