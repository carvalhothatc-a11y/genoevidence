import { AUTORIA, I, M, R, S, X, ref, type TecnicaConteudo } from "./tipos";

const RAO = (l: string) => ref("rao2013", l);
const LIV = ref("livak2001", "Resumo");
const HIG = ref("higuchi1993", "Resumo");
const BUS = ref("bustin2000", "Resumo");
const PF = ref("pfaffl2001", "Resumo");
const MIQE = ref("bustin2009", "Resumo");
const L = (l: string) => ref("lorenz2012", l);

export const QPCR: TecnicaConteudo = {
  id: "qpcr",
  titulo: "qPCR e RT-qPCR",
  tecnica: "PCR em tempo real (quantitativa), com ou sem transcrição reversa, e quantificação relativa",
  versao: "0.1.0",
  status: "implementado",
  resumo:
    "Planeje a quantificação, acompanhe a reação etapa por etapa e calcule ΔCt, ΔΔCt e a razão corrigida pela eficiência a partir dos seus valores de Ct, vendo o que cada cálculo pressupõe.",
  fontes: [RAO(""), LIV, HIG, BUS, PF, MIQE, L("")],
  etapas: [
    {
      id: "planejamento",
      titulo: "Escolher a estratégia de quantificação",
      resumo: "Absoluta (cópias, com curva padrão) ou relativa (em relação a uma amostra de referência).",
      cena: { acao: "generica", entidades: ["rna", "primer", "tubo"], legenda: "Ilustração genérica dos materiais. Não representa quantidades." },
      acontece: [
        R("As duas estratégias mais usadas são a quantificação absoluta, que determina o número inicial de cópias em geral por meio de uma curva padrão, e a relativa, que compara o sinal do alvo num grupo (por exemplo, tratado) com o de outra amostra (por exemplo, um controle não tratado).", [LIV, RAO("Background")]),
      ],
      porque: [
        R("A quantificação relativa dispensa a curva padrão e, com isso, os erros das diluições usadas para construí-la; muitas vezes a diferença entre grupos interessa mais do que o número exato de moléculas.", [RAO("Background")]),
      ],
      materiais: [
        { nome: "Gene de referência (controle interno)", papel: "Normaliza diferenças na quantidade de material e na montagem e ciclagem das reações.", refs: [RAO("Background")] },
        { nome: "Amostra de referência (calibradora)", papel: "Amostra com a qual as demais são comparadas (por exemplo, o controle não tratado).", refs: [RAO("Background")] },
      ],
      controles: [
        R("A expressão do gene de referência deve ser estável entre as amostras. Ela pode variar com a espécie, o tecido e a condição; por isso pode ser necessário verificar a estabilidade antes do experimento.", [RAO("Discussion")]),
      ],
      observar: [R("As diretrizes MIQE reúnem a informação mínima que um artigo de qPCR deve relatar para que o experimento possa ser avaliado.", [MIQE])],
      limitacoes: ["O módulo não desenha primers nem escolhe genes de referência."],
    },
    {
      id: "transcricao_reversa",
      titulo: "RT-qPCR: converter o RNA em cDNA",
      resumo: "Na RT-qPCR o mRNA vira cDNA por transcrição reversa antes da amplificação.",
      cena: {
        acao: "generica",
        entidades: ["rna", "tubo"],
        legenda: "A transcrição reversa (RNA → cDNA) não tem animação própria; a cena mostra só os materiais envolvidos.",
      },
      acontece: [R("Na RT-qPCR, o cDNA produzido por transcrição reversa a partir do mRNA é o que a PCR em tempo real amplifica.", [PF, RAO("Methods")])],
      porque: [
        R("A RT-PCR é o método mais sensível para detectar mRNA de baixa abundância, mas é complexa e tem problemas de sensibilidade real, reprodutibilidade e especificidade; desenho cuidadoso e validação continuam essenciais.", [BUS]),
      ],
      materiais: [{ nome: "RNA extraído e transcriptase reversa", papel: "Molde e enzima da conversão em cDNA.", refs: [RAO("Methods")] }],
      controles: [S("Reação sem transcriptase reversa para revelar sinal de DNA genômico contaminante.", "Prática comum; não descrita nas fontes cadastradas neste módulo.")],
      observar: [X("Quanto do RNA foi convertido em cDNA não é medido nem previsto aqui.")],
      limitacoes: ["A eficiência da transcrição reversa não é modelada."],
    },
    {
      id: "montagem",
      titulo: "Montar a reação e os controles",
      resumo: "Mistura de reação com corante fluorescente, amostras e controle sem molde.",
      cena: {
        acao: "misturar",
        entidades: ["primer", "nucleotideos", "polimerase", "tubo"],
        origem: "primer",
        destino: "tubo",
        legenda: "Ilustração da adição de componentes. Volumes e concentrações não são representados.",
      },
      acontece: [
        R("A detecção acompanha o acúmulo de DNA dupla-fita: no trabalho original, a fluorescência do brometo de etídio aumentava ao se ligar ao DNA dupla-fita.", [HIG]),
        R("No estudo de Rao et al., as amplificações usaram uma mistura comercial com SYBR Green.", [RAO("Methods")]),
      ],
      porque: [R("Com SYBR Green, parte da fluorescência de fundo pode vir de corante livre ou ligado a DNA que não é o alvo; subtrair o fundo de forma errada distorce a quantidade estimada e a eficiência.", [RAO("Background")])],
      materiais: [
        { nome: "Mistura de reação com corante (ex.: SYBR Green)", papel: "Polimerase, nucleotídeos e corante que fluoresce com DNA dupla-fita.", refs: [RAO("Methods"), HIG] },
        { nome: "Primers do gene-alvo e do gene de referência", papel: "Uma reação para cada gene em cada amostra.", refs: [RAO("Methods")] },
      ],
      controles: [
        R("Controle negativo sem molde em toda corrida.", [L("§2 Materials and Reagents")]),
        R("Contaminação por produtos de reações anteriores é causa conhecida de falsos positivos em PCR.", [ref("kwok1989", "Resumo")]),
      ],
      observar: [X("Se haverá produto inespecífico ou dímero de primer não pode ser previsto a partir da montagem.")],
      limitacoes: ["O módulo não calcula volumes de reação; siga o protocolo do fabricante da mistura usada."],
    },
    {
      id: "ciclagem",
      titulo: "Ciclar e ler a fluorescência a cada ciclo",
      resumo: "Quanto menos ciclos até a fluorescência ser detectável, mais cópias havia no início.",
      cena: {
        acao: "amplificar",
        entidades: ["dna", "primer", "polimerase"],
        legenda: "Duplicação ilustrativa. Não é uma curva de amplificação nem prevê o Ct.",
      },
      acontece: [
        R("A cinética do acúmulo de fluorescência durante a ciclagem está relacionada ao número inicial de cópias: quanto menos ciclos forem necessários para uma fluorescência detectável, maior o número de sequências-alvo.", [HIG]),
        R("O ciclo limiar (Ct) é o ciclo em que a fluorescência atinge um nível definido, o limiar.", [RAO("Background")]),
        R("Exemplo de programa relatado num estudo (não é recomendação): 95 °C por 10 min e 40 ciclos de 95 °C por 30 s, 60 °C por 30 s e 72 °C por 30 s, com análise de curva de fusão.", [RAO("Methods")]),
      ],
      porque: [R("A eficiência de amplificação real não é 100%: inibidores, a extração de RNA e diferenças de sondas, primers e enzimas a alteram e a fazem variar entre amostras.", [RAO("Background")])],
      materiais: [{ nome: "Termociclador com leitura de fluorescência", papel: "Cicla as temperaturas e registra o sinal a cada ciclo.", refs: [HIG, RAO("Methods")] }],
      controles: [],
      observar: [X("O valor de Ct de cada amostra não é previsto pelo módulo: ele vem do seu equipamento.")],
      limitacoes: ["Curvas de amplificação não são simuladas.", "A eficiência não é estimada pelo módulo; ela precisa ser informada."],
      parametros: [
        {
          id: "eficiencia",
          rotulo: "Eficiência das reações",
          descricao: "O que muda na análise conforme a eficiência das reações do gene-alvo e do gene de referência.",
          padrao: "igual100",
          opcoes: [
            {
              valor: "igual100",
              rotulo: "100% nas duas",
              consequencias: [M("Com eficiência de 100% para alvo e referência, 2^−ΔΔCt e a razão corrigida dão o mesmo resultado.", [RAO("Background")])],
            },
            {
              valor: "iguaisMenores",
              rotulo: "Iguais, abaixo de 100%",
              consequencias: [
                M("Se as eficiências forem iguais, mas menores que 100%, a razão corrigida vira (1+E)^−ΔΔCt e se afasta de 2^−ΔΔCt tanto mais quanto maior o ΔΔCt (em módulo); com ΔΔCt = 0 as duas valem 1."),
                R("Estudos citados por Rao et al. relatam eficiências de 60–110%, 80–100% e 65–90%.", [RAO("Background")]),
              ],
            },
            {
              valor: "diferentes",
              rotulo: "Diferentes entre alvo e referência",
              consequencias: [
                R("Uma variação de eficiência de apenas 0,04 (de 1,78 a 1,82) leva a erro de 4 vezes na diferença calculada; 5% de diferença entre alvo e referência pode errar a razão em 432%.", [RAO("Background")]),
                R("Os modelos com correção de eficiência de Pfaffl consideram eficiências diferentes entre alvo e referência, mas supõem a mesma eficiência no controle e na amostra tratada — o que os dados de Rao et al. contradizem.", [RAO("Discussion")]),
              ],
            },
          ],
        },
      ],
    },
    {
      id: "analise",
      titulo: "Calcular ΔCt, ΔΔCt e a razão",
      resumo: "Normalize pelo gene de referência e compare com a amostra de referência.",
      cena: {
        acao: "detectar",
        entidades: ["dna", "tubo"],
        legenda: "Brilho ilustrativo nos tubos. Intensidades e valores não são previstos.",
      },
      acontece: [
        R("ΔCt é a diferença entre o Ct do gene-alvo e o do gene de referência; ΔΔCt é a diferença entre o ΔCt da amostra-alvo e o da amostra de referência. O resultado 2^−ΔΔCt é a mudança da expressão do alvo em relação à amostra de referência, que vale 1.", [RAO("Background"), LIV]),
        R("O método de Pfaffl calcula a razão de expressão só a partir das eficiências da PCR e da diferença de ciclos da amostra versus o controle, sem curva de calibração.", [PF]),
      ],
      porque: [
        R("2^−ΔΔCt pressupõe eficiência uniforme de 100% em todas as amostras: o 2 é 1 mais uma eficiência de 1 (100%).", [RAO("Background")]),
      ],
      materiais: [{ nome: "Valores de Ct do seu equipamento", papel: "Entrada dos cálculos. Use médias de réplicas técnicas.", refs: [] }],
      controles: [],
      observar: [
        X("A calculadora devolve um número; se a diferença é biologicamente relevante ou estatisticamente significativa não pode ser dito sem réplicas e análise estatística."),
        I("Um Ct menor no alvo da amostra tratada (com a referência estável) indica mais cópias iniciais do alvo nessa amostra.", [HIG]),
      ],
      limitacoes: [
        "Calcula a partir de médias informadas: não estima variância, intervalos nem testes estatísticos.",
        "Não estima eficiência a partir de curvas ou diluições.",
      ],
      calculadora: "ddct",
    },
  ],
  modelos: [
    {
      id: "ddct",
      name: "Quantificação relativa 2^−ΔΔCt",
      equation: "ΔCt = Ct(alvo) − Ct(referência);  ΔΔCt = ΔCt(amostra) − ΔCt(amostra de referência);  mudança = 2^(−ΔΔCt)",
      parameters: [
        { id: "ct", label: "Quatro valores de Ct (alvo e referência, em cada amostra)", range: "1–50", source: "usuario" },
        { id: "base", label: "Base 2 (eficiência de 100%)", range: "fixo", source: "fixo" },
      ],
      assumptions: ["Eficiência de 100% em todas as reações.", "Gene de referência com expressão estável entre as amostras.", "Valores de Ct comparáveis (mesmo limiar por gene)."],
      validity: "Quando as eficiências do alvo e da referência são próximas de 100% e semelhantes entre si.",
      limitations: ["Com eficiências diferentes, o resultado pode ser muito distorcido.", "Não incorpora réplicas nem incerteza."],
      implementation: "src/lib/models/qpcr.ts → ddct()",
      doesNotPredict: ["Significância estatística", "Relevância biológica", "Valores de Ct"],
      refs: [RAO("Background"), LIV],
    },
    {
      id: "razao_corrigida",
      name: "Razão corrigida pela eficiência",
      equation: "razão = (1+E_alvo)^(Ct_alvo,ref − Ct_alvo,amostra) ÷ (1+E_ref)^(Ct_ref,ref − Ct_ref,amostra)",
      parameters: [
        { id: "ct", label: "Quatro valores de Ct", range: "1–50", source: "usuario" },
        { id: "E", label: "Eficiências do alvo e da referência", range: "10–150% (informadas por você)", source: "usuario" },
      ],
      assumptions: [
        "Crescimento exponencial N = N₀·(1+E)ⁿ até o limiar.",
        "Para cada gene, o limiar corresponde à mesma quantidade de produto em todas as amostras.",
        "A eficiência de cada gene é a mesma na amostra e na amostra de referência.",
      ],
      validity: "Fase exponencial, com eficiências medidas pelo pesquisador para cada par de primers.",
      limitations: [
        "Equação derivada do modelo exponencial; a forma publicada por Pfaffl (2001) não foi lida (só o resumo). Confira no original antes de citar.",
        "Rao et al. mostram que cada amostra pode ter eficiência própria, o que este modelo não considera.",
      ],
      implementation: "src/lib/models/qpcr.ts → razaoCorrigida()",
      doesNotPredict: ["A eficiência das reações", "Significância estatística"],
      refs: [PF, RAO("Background"), RAO("Discussion")],
    },
  ],
  problemas: [
    { sintoma: "Resultado muito diferente do esperado com 2^−ΔΔCt", causas: [R("Eficiências diferentes de 100% ou diferentes entre alvo e referência distorcem o resultado.", [RAO("Background")])] },
    { sintoma: "Gene de referência muda com o tratamento", causas: [R("A estabilidade do gene de referência depende de espécie, tecido e condição; teste candidatos antes.", [RAO("Discussion")])] },
    { sintoma: "Fundo de fluorescência alto ou irregular", causas: [R("Corante livre ou ligado a DNA não-alvo e subtração incorreta do fundo distorcem os resultados.", [RAO("Background")])] },
    { sintoma: "Sinal no controle sem molde", causas: [R("Contaminação por produtos de reações anteriores causa falsos positivos.", [ref("kwok1989", "Resumo")])] },
  ],
  limitacoes: [
    "Educativo: não lê arquivos do equipamento nem curvas de amplificação.",
    "Os cálculos usam médias informadas por você; réplicas e estatística ficam fora do módulo.",
  ],
  naoFaz: ["Estimar eficiência", "Escolher gene de referência", "Prever Ct ou sucesso da reação", "Testes estatísticos"],
  autoria: AUTORIA,
};
