import { AUTORIA, M, R, X, ref, type TecnicaConteudo } from "./tipos";

const CO = ref("conesa2016", "Resumo");
const MO = ref("mortazavi2008", "Resumo");
const ZH = (l: string) => ref("zhao2020", l);
const WA = ref("wagner2012", "Resumo");
const LO = ref("love2014", "Resumo");

export const RNASEQ: TecnicaConteudo = {
  id: "rnaseq",
  titulo: "RNA-seq: entender o caminho dos dados",
  tecnica: "Sequenciamento de RNA — etapas da análise, unidades de expressão e comparação entre amostras",
  versao: "0.1.0",
  status: "parcial",
  resumo:
    "Módulo conceitual: as etapas da análise, o que é TPM, como ele é calculado e por que comparar TPM entre amostras ou protocolos diferentes pode enganar.",
  fontes: [CO, MO, ZH(""), WA, LO],
  etapas: [
    {
      id: "pipeline",
      titulo: "As etapas da análise",
      resumo: "Não existe um caminho único que sirva a todos os casos.",
      cena: { acao: "generica", entidades: ["rna", "dna"], legenda: "Ilustração genérica dos materiais. Não representa o processamento dos dados." },
      acontece: [
        R("As principais etapas da análise de RNA-seq são: desenho experimental, controle de qualidade, alinhamento das leituras, quantificação de genes e transcritos, visualização, expressão diferencial, splicing alternativo, análise funcional, detecção de fusões gênicas e mapeamento de eQTL.", [CO]),
        R("O RNA-seq tem muitas aplicações, e nenhum pipeline único serve a todos os casos.", [CO]),
      ],
      porque: [
        R("O RNA-Seq mede a presença e a prevalência dos transcritos de forma digital: conta com que frequência cada gene aparece na amostra sequenciada.", [MO]),
        R("Num experimento típico, o RNA é purificado, em geral enriquecido com primers oligo(dT), fragmentado, e milhões de leituras curtas são geradas a partir da biblioteca de cDNA.", [ZH("Introduction")]),
      ],
      materiais: [{ nome: "Leituras sequenciadas e anotação do genoma", papel: "Entrada da quantificação.", refs: [CO, ZH("Introduction")] }],
      controles: [],
      observar: [X("O GenoLab não processa dados brutos de RNA-seq (FASTQ/BAM): este módulo é conceitual.")],
      limitacoes: ["Não alinha leituras, não quantifica a partir de arquivos, não roda nenhum pipeline."],
    },
    {
      id: "unidades",
      titulo: "Contagens, RPKM e TPM",
      resumo: "Por que contagens brutas não são comparáveis e o que o TPM corrige.",
      cena: { acao: "quantificar", entidades: ["rna"], legenda: "Ilustração de medição. Valores não são previstos." },
      acontece: [
        R("Contagens brutas de um gene não são comparáveis entre amostras porque a profundidade de sequenciamento varia; e dentro de uma amostra não são comparáveis entre genes, porque transcritos mais longos acumulam mais leituras com a mesma expressão. Por isso usam-se unidades normalizadas: RPKM, FPKM e TPM.", [ZH("Measures of expression")]),
        R("O RPKM foi criado para permitir comparar níveis de transcritos dentro e entre amostras, reescalando as contagens pelo tamanho da biblioteca e pelo comprimento do gene.", [ZH("Measures of expression")]),
        R("O RPKM não respeita a propriedade de média invariante, então não é uma medida exata de concentração molar relativa de RNA; o TPM, uma modificação do RPKM, é adimensional e cumpre esse critério. A média de TPM numa amostra é 10⁶ dividido pelo número de transcritos anotados, uma constante.", [ZH("Measures of expression"), WA]),
      ],
      porque: [
        R("O TPM responde: se você sequenciasse um milhão de transcritos completos dessa amostra, quantos seriam desse gene.", [ZH("Measures of expression")]),
      ],
      materiais: [
        { nome: "Contagens por gene e comprimentos", papel: "Entrada do cálculo de TPM.", refs: [ZH("Measures of expression")] },
      ],
      controles: [],
      observar: [
        M("A calculadora soma as taxas (leituras por kilobase) de todos os genes informados e converte cada uma em partes por milhão; por isso o total sempre dá 10⁶ dentro do conjunto informado."),
        X("Com poucos genes informados, os valores não representam uma amostra real, que tem dezenas de milhares de genes."),
      ],
      limitacoes: [
        "A fórmula de conversão não veio na extração do artigo: o cálculo foi derivado das duas propriedades descritas no texto (proporcional ao RPKM e soma 10⁶). Confira no original antes de citar.",
      ],
      calculadora: "tpm",
    },
    {
      id: "comparar",
      titulo: "Comparar amostras com cuidado",
      resumo: "TPM já é normalizado, mas nem por isso comparável entre amostras.",
      cena: { acao: "generica", entidades: ["rna", "celula"], legenda: "Ilustração genérica. Não representa comparação de dados." },
      acontece: [
        R("RPKM e TPM representam a abundância relativa de um transcrito dentro da população sequenciada; por isso dependem da composição do RNA da amostra e não são automaticamente comparáveis entre amostras ou projetos.", [ZH("Introduction")]),
        R("A comparação direta só faz sentido quando o RNA total e a distribuição das populações de RNA são próximos entre as amostras comparadas.", [ZH("Caution on RPKM and TPM comparison")]),
      ],
      porque: [
        R("O preparo muda o que é sequenciado: com seleção de poli(A) a categoria mais abundante foi a de genes codificadores de proteína, e com depleção de rRNA foram os RNAs pequenos — na mesma amostra. Num exemplo de sangue, os três genes mais expressos somavam 4,2% dos transcritos com seleção de poli(A) e 75% com depleção de rRNA.", [ZH("Sample preparation protocol")]),
        R("A quantidade total de RNA por célula pode mudar: entre células-tronco embrionárias e fibroblastos houve diferença de 5,5 vezes nos níveis de mRNA, e células com muito c-Myc produzem duas a três vezes mais RNA total.", [ZH("Caution on RPKM and TPM comparison")]),
      ],
      materiais: [],
      controles: [
        R("Antes de comparar, confira: o mesmo protocolo quanto a fita (stranded ou não) — se diferirem, as amostras não podem ser comparadas; o mesmo método de isolamento de RNA (poli(A) ou depleção de rRNA) — se diferirem, não devem ser comparadas; e as frações de RNA ribossomal, mitocondrial e de globina, além dos transcritos mais expressos.", [ZH("Discussions and conclusions")]),
      ],
      observar: [
        R("Na prática, RPKM e TPM não costumam ser usados diretamente na análise diferencial: métodos baseados em contagens, como DESeq e edgeR, foram desenvolvidos para isso.", [ZH("Discussions and conclusions"), LO]),
        X("O GenoLab não faz análise de expressão diferencial nem testes estatísticos."),
      ],
      limitacoes: ["Nenhuma comparação entre amostras é calculada aqui."],
    },
  ],
  modelos: [
    {
      id: "tpm",
      name: "TPM a partir de contagens e comprimentos",
      equation: "taxaᵢ = leiturasᵢ ÷ comprimentoᵢ(kb);  TPMᵢ = 10⁶ · taxaᵢ ÷ Σⱼ taxaⱼ",
      parameters: [
        { id: "leituras", label: "Leituras mapeadas em cada gene", range: "inteiro ≥ 0", source: "usuario" },
        { id: "comprimento", label: "Comprimento de cada gene", unit: "pb", range: "> 0", source: "usuario" },
      ],
      assumptions: [
        "Os genes informados representam o conjunto sobre o qual o TPM é calculado (numa amostra real, todos os genes anotados).",
        "Comprimento efetivo igual ao comprimento informado.",
      ],
      validity: "Dentro de uma amostra, para comparar genes entre si.",
      limitations: [
        "Equação derivada das propriedades descritas por Zhao et al. (proporcional ao RPKM e soma 10⁶); a fórmula publicada não veio na extração.",
        "Não reproduz quantificadores como RSEM, Kallisto ou Salmon, citados na referência.",
        "Valores de amostras diferentes não são comparáveis só por serem TPM.",
      ],
      implementation: "src/lib/models/rnaseq.ts → tpm()",
      doesNotPredict: ["Expressão diferencial", "Significância estatística", "Equivalência entre amostras"],
      refs: [ZH("Measures of expression"), WA],
    },
  ],
  problemas: [
    { sintoma: "Dois conjuntos de dados dão valores muito diferentes para o mesmo gene", causas: [R("Protocolos diferentes (fita, seleção de poli(A) versus depleção de rRNA) mudam o repertório sequenciado e, com ele, os valores.", [ZH("Discussions and conclusions")])] },
    { sintoma: "Todos os genes parecem “menos expressos” numa amostra", causas: [R("Poucos transcritos muito abundantes podem ocupar grande parte das leituras e deflacionar artificialmente os demais.", [ZH("Sample preparation protocol")])] },
  ],
  limitacoes: [
    "Parcial e conceitual: o GenoLab não processa dados brutos de RNA-seq.",
    "Dados já processados podem ser importados como tabela em Projetos, com a unidade declarada.",
  ],
  naoFaz: ["Alinhar leituras", "Quantificar a partir de arquivos", "Expressão diferencial", "Comparar amostras automaticamente"],
  autoria: AUTORIA,
};
