import type { ModuleStatus } from "./contract";

export type TechniqueEntry = {
  id: string;
  name: string;
  status: ModuleStatus;
  href?: string;
  modes: string[];
  description: string;
  notes?: string;
};

/**
 * Técnicas com módulos na plataforma. Esta lista é a fonte de verdade sobre o que está implementado.
 * Enviar um artigo sobre outra técnica NÃO cria automaticamente um módulo nem uma simulação validada.
 */
export const TECHNIQUES: TechniqueEntry[] = [
  {
    id: "pcr",
    name: "PCR convencional (ponto final)",
    status: "implementado",
    href: "/modulos/pcr",
    modes: ["Guiado", "Exploratório", "Bancada 3D", "Escala molecular", "Resultados"],
    description: "Montagem da reação, controles, ciclagem térmica e análise em gel, com fontes por seção.",
  },
  {
    id: "eletroforese",
    name: "Eletroforese em gel de agarose",
    status: "parcial",
    href: "/modulos/pcr?etapa=eletroforese",
    modes: ["Guiado (dentro do módulo de PCR)"],
    description: "Montagem da cuba, polaridade, marcador e posição esperada de banda (ilustração).",
    notes: "Preparo do gel, coloração e fotodocumentação são descritos, mas não interativos.",
  },
  {
    id: "expressao",
    name: "Expressão gênica — dados já processados",
    status: "implementado",
    href: "/projetos",
    modes: ["Importação de CSV", "Validação", "Gráficos", "Tabela original"],
    description: "Importa tabelas (gene, amostra, grupo, valor, unidade) e preserva réplicas e unidades.",
    notes: "Não processa RNA-seq bruto (FASTQ/BAM) nem calcula expressão diferencial.",
  },
  {
    id: "estruturas",
    name: "Estruturas moleculares (PDB/mmCIF)",
    status: "implementado",
    href: "/projetos",
    modes: ["Visualizador Mol*", "Cadeias", "Destaque de resíduos com conferência"],
    description: "Carrega estruturas, mostra origem e método, confere cadeia/numeração antes de destacar resíduos.",
    notes: "Destacar um resíduo não calcula estrutura mutante nem dinâmica.",
  },
  { id: "qpcr", name: "qPCR / RT-qPCR", status: "nao_implementado", modes: [], description: "Sem módulo. Dados processados (Ct, ΔCt, expressão relativa) podem ser importados como tabela." },
  { id: "rnaseq", name: "Processamento de RNA-seq bruto", status: "nao_implementado", modes: [], description: "Sem módulo. Importe resultados já processados." },
  { id: "western", name: "Western blot", status: "nao_implementado", modes: [], description: "Sem módulo." },
  { id: "clonagem", name: "Clonagem molecular", status: "nao_implementado", modes: [], description: "Sem módulo." },
  { id: "crispr", name: "Edição genômica (CRISPR)", status: "nao_implementado", modes: [], description: "Sem módulo." },
  { id: "sequenciamento", name: "Sequenciamento de Sanger", status: "nao_implementado", modes: [], description: "Sem módulo." },
];

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  implementado: "Implementado",
  parcial: "Parcial",
  nao_implementado: "Não implementado",
};
