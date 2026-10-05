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
    status: "implementado",
    href: "/modulos/eletroforese",
    modes: ["Guiado", "Cena 3D por etapa", "Explorar parâmetros", "Calculadora de posição de banda"],
    description: "Preparo do gel, aplicação, corrida e leitura das bandas, com estimativa ilustrativa de posição pelo marcador.",
    notes: "Não analisa fotos de gel nem quantifica DNA.",
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
  {
    id: "qpcr",
    name: "qPCR / RT-qPCR",
    status: "implementado",
    href: "/modulos/qpcr",
    modes: ["Guiado", "Cena 3D por etapa", "Explorar eficiência", "Calculadora de ΔΔCt"],
    description: "Estratégias de quantificação, montagem, ciclagem e cálculo de ΔCt, ΔΔCt e razão corrigida pela eficiência, a partir dos seus valores de Ct.",
    notes: "Não lê arquivos do equipamento, não estima eficiência e não faz testes estatísticos.",
  },
  {
    id: "western",
    name: "Western blot",
    status: "implementado",
    href: "/modulos/western",
    modes: ["Guiado", "Cena 3D por etapa", "Explorar membrana e bloqueio", "Calculadora de volume por poço"],
    description: "Lise, preparo das amostras, gel, transferência, anticorpos e detecção, com solução de problemas por sintoma.",
    notes: "O resultado do Western é semiquantitativo; o módulo não quantifica bandas nem analisa imagens.",
  },
  {
    id: "clonagem",
    name: "Clonagem molecular",
    status: "parcial",
    href: "/modulos/clonagem",
    modes: ["Guiado", "Cena 3D por etapa"],
    description: "Inserto, corte, ligação, transformação por choque térmico, seleção e verificação por sequenciamento.",
    notes: "Condições de digestão e ligação não têm fonte cadastrada; sem calculadora.",
  },
  {
    id: "sequenciamento",
    name: "Sequenciamento de Sanger",
    status: "parcial",
    href: "/modulos/sequenciamento",
    modes: ["Guiado", "Cena 3D por etapa"],
    description: "O princípio dos terminadores de cadeia e o caminho prático: amplificar, subclonar quando preciso e conferir a leitura.",
    notes: "Do artigo original só o resumo foi lido; equipamentos atuais não estão descritos nas fontes. Não lê cromatogramas.",
  },
  {
    id: "rnaseq",
    name: "RNA-seq (conceitual)",
    status: "parcial",
    href: "/modulos/rnaseq",
    modes: ["Guiado", "Calculadora de TPM"],
    description: "Etapas da análise, o que é TPM e por que comparar TPM entre amostras ou protocolos diferentes pode enganar.",
    notes: "Não processa dados brutos (FASTQ/BAM) nem calcula expressão diferencial.",
  },
  {
    id: "crispr",
    name: "Edição genômica (CRISPR-Cas9)",
    status: "parcial",
    href: "/modulos/crispr",
    modes: ["Conceitual", "Cena 3D por etapa", "Calculadora de frequência observada"],
    description: "Mecanismo da Cas9, as duas vias de reparo, a questão da especificidade e como relatar uma frequência observada com o intervalo de incerteza.",
    notes: "Conceitual: não é protocolo de bancada, não desenha guias e não estima efeitos fora do alvo.",
  },
];

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  implementado: "Implementado",
  parcial: "Parcial",
  nao_implementado: "Não implementado",
};
