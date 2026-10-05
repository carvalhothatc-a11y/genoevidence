import { AUTORIA, R, S, X, ref, type TecnicaConteudo } from "./tipos";

const CO = ref("cohen1973", "Resumo");
const FH = ref("froger2007", "Resumo");
const RAN = (l: string) => ref("ran2013", l);
const L = (l: string) => ref("lorenz2012", l);
const LEE = (l: string) => ref("lee2012", l);

export const CLONAGEM: TecnicaConteudo = {
  id: "clonagem",
  titulo: "Clonagem molecular",
  tecnica: "Inserção de um fragmento de DNA num plasmídeo, transformação de E. coli, seleção e verificação",
  versao: "0.1.0",
  status: "parcial",
  resumo:
    "Siga o caminho do inserto até o plasmídeo verificado: corte, ligação, transformação por choque térmico, seleção de colônias e conferência por sequenciamento.",
  fontes: [CO, FH, RAN(""), L(""), LEE("")],
  etapas: [
    {
      id: "inserto",
      titulo: "Obter o inserto",
      resumo: "Por exemplo, um produto de PCR com sítios de restrição nas pontas.",
      cena: { acao: "amplificar", entidades: ["dna", "primer", "polimerase", "produto_pcr"], legenda: "Duplicação ilustrativa do inserto. Quantidades não são calculadas." },
      acontece: [
        R("Para clonar um produto de PCR num vetor como o pUC19, sítios de restrição podem ser acrescentados aos primers — por exemplo, EcoRI no primer direto e HindIII no reverso.", [RAN("Procedure — Sanger sequencing (Steps 109–117)")]),
      ],
      porque: [R("Para reduzir erros introduzidos na amplificação, Ran et al. recomendam polimerase de alta fidelidade (no contexto da amplificação do sgRNA).", [RAN("Materials — Reagents")])],
      materiais: [{ nome: "Primers com sítios de restrição", papel: "Criam extremidades compatíveis com o vetor após o corte.", refs: [RAN("Procedure — Sanger sequencing (Steps 109–117)")] }],
      controles: [R("Conferir o produto no gel antes de seguir: uma banda única do tamanho esperado.", [RAN("Procedure — Step 100"), LEE("§2")])],
      observar: [],
      limitacoes: ["O módulo não desenha primers nem escolhe enzimas."],
    },
    {
      id: "corte",
      titulo: "Cortar inserto e vetor com enzimas de restrição",
      resumo: "Fragmentos gerados por endonucleases de restrição podem ser unidos in vitro.",
      cena: {
        acao: "cortar",
        entidades: ["plasmideo", "enzima_corte"],
        origem: "plasmideo",
        rotulos: { enzima: "EcoRI / HindIII (exemplo)" },
        legenda: "Corte ilustrativo num sítio de reconhecimento. Sítios, sequências e extremidades não são reais.",
      },
      acontece: [R("Novos plasmídeos podem ser construídos unindo in vitro fragmentos gerados por endonucleases de restrição a partir de plasmídeos diferentes.", [CO])],
      porque: [S("Cortar inserto e vetor com as mesmas enzimas gera extremidades compatíveis entre si.", "Princípio geral; o resumo de Cohen et al. não descreve as extremidades.")],
      materiais: [{ nome: "Enzimas de restrição e tampão", papel: "Cortam o DNA em sítios específicos.", refs: [CO] }],
      controles: [S("Vetor cortado e ligado sem inserto, para estimar as colônias de fundo.", "Prática comum; sem fonte cadastrada neste módulo.")],
      observar: [X("Se o corte foi completo não pode ser previsto; confira no gel.")],
      limitacoes: ["Condições de digestão (tempo, temperatura, tampão) não são fornecidas: siga o fabricante da enzima."],
    },
    {
      id: "ligacao",
      titulo: "Ligar o inserto ao vetor",
      resumo: "A DNA ligase une as extremidades e forma o plasmídeo recombinante.",
      cena: { acao: "inserir_vetor", entidades: ["produto_pcr", "plasmideo", "ligase"], origem: "produto_pcr", destino: "plasmideo", legenda: "Ilustração da entrada do inserto no plasmídeo aberto. Proporções não são reais." },
      acontece: [
        R("Plasmídeos construídos assim, ao serem introduzidos em E. coli por transformação, são replicons funcionais com propriedades e sequências dos dois DNAs de origem.", [CO]),
        R("No protocolo de Ran et al., um par de oligos anelados é ligado ao plasmídeo; T7 ou T4 DNA ligase podem ser usadas, cada uma com o tampão compatível.", [RAN("Experimental design — sgRNA construction"), RAN("Materials — Reagents")]),
      ],
      porque: [],
      materiais: [{ nome: "DNA ligase e tampão", papel: "Une as extremidades de inserto e vetor.", refs: [RAN("Materials — Reagents")] }],
      controles: [],
      observar: [X("A proporção de plasmídeos com inserto não é prevista.")],
      limitacoes: ["Proporções inserto:vetor e condições de ligação não são fornecidas."],
    },
    {
      id: "transformacao",
      titulo: "Transformar E. coli por choque térmico",
      resumo: "Gelo, 42 °C por 45 s, gelo, meio SOC e 37 °C com agitação.",
      cena: {
        acao: "transformar",
        entidades: ["plasmideo", "bacteria"],
        origem: "plasmideo",
        destino: "bacteria",
        rotulos: { temperatura: "42 °C" },
        legenda: "Ilustração do plasmídeo entrando na bactéria. Eficiência de transformação não é representada.",
      },
      acontece: [
        R("Após curta incubação no gelo, a mistura de bactérias quimicamente competentes e DNA vai a 42 °C por 45 s (choque térmico) e volta ao gelo. Adiciona-se meio SOC e as células são incubadas a 37 °C por 30 min com agitação.", [FH]),
      ],
      porque: [R("Semeiam-se duas quantidades de bactérias transformadas para garantir colônias isoladas, qualquer que seja a eficiência da transformação.", [FH])],
      materiais: [
        { nome: "Bactérias quimicamente competentes", papel: "Recebem o plasmídeo.", refs: [FH] },
        { nome: "Banho a 42 °C, gelo e meio SOC", papel: "Choque térmico e recuperação.", refs: [FH] },
      ],
      controles: [],
      observar: [X("O número de colônias não pode ser previsto.")],
      limitacoes: ["Protocolos de células competentes diferentes podem usar tempos diferentes; siga o fabricante."],
    },
    {
      id: "selecao",
      titulo: "Selecionar e cultivar colônias",
      resumo: "Placa com antibiótico; colônias inoculadas em LB com ampicilina.",
      cena: { acao: "selecionar", entidades: ["bacteria", "placa", "antibiotico"], rotulos: { antibiotico: "ampicilina" }, legenda: "Placa e colônias ilustrativas. A quantidade de colônias não é prevista." },
      acontece: [
        R("De cada placa escolhem-se duas ou três colônias; cada uma é inoculada com ponteira estéril em 3 mL de LB com 100 µg/mL de ampicilina e incubada a 37 °C com agitação durante a noite.", [RAN("Procedure — Step 5B x")]),
      ],
      porque: [S("A seleção com antibiótico depende de o vetor carregar o gene de resistência correspondente; confira o mapa do seu vetor.", "Princípio geral; não descrito nos trechos lidos das fontes.")],
      materiais: [
        { nome: "Placas de LB ágar com ampicilina", papel: "Seleção das bactérias transformadas.", refs: [RAN("Materials — Reagents")] },
        { nome: "LB com ampicilina (3 mL por colônia)", papel: "Cultura de cada colônia escolhida.", refs: [RAN("Procedure — Step 5B x")] },
      ],
      controles: [],
      observar: [X("Quais colônias têm o inserto correto só se sabe depois da verificação.")],
      limitacoes: [],
    },
    {
      id: "verificacao",
      titulo: "Extrair o plasmídeo e verificar a sequência",
      resumo: "Miniprep e sequenciamento a partir de um primer do vetor.",
      cena: { acao: "sequenciar", entidades: ["plasmideo", "dna"], legenda: "Sequência ilustrativa: não é a do seu material." },
      acontece: [
        R("O DNA plasmidial é isolado com um kit de miniprep e cada colônia é sequenciada a partir de um primer do vetor; o resultado é comparado com a sequência esperada para conferir se o inserto está na posição certa.", [RAN("Procedure — Step 5B xi–xii")]),
      ],
      porque: [],
      materiais: [{ nome: "Kit de miniprep", papel: "Extrair o plasmídeo das culturas.", refs: [RAN("Procedure — Step 5B xi")] }],
      controles: [],
      observar: [],
      limitacoes: ["O módulo não compara sequências nem lê cromatogramas; veja o módulo de Sanger."],
    },
  ],
  modelos: [],
  problemas: [
    { sintoma: "Nenhuma colônia isolada", causas: [R("Semear duas quantidades de bactérias transformadas ajuda a obter colônias isoladas independentemente da eficiência.", [FH])] },
    { sintoma: "Inserto ausente ou errado", causas: [R("Escolher mais de uma colônia e verificar cada uma por sequenciamento.", [RAN("Procedure — Step 5B x–xii")])] },
  ],
  limitacoes: [
    "Parcial: as fontes cadastradas descrevem o princípio (resumos) e trechos de um protocolo; condições de digestão e ligação não têm fonte aqui.",
    "Sem calculadora: não há modelo validado para prever número de colônias ou acerto da clonagem.",
  ],
  naoFaz: ["Desenhar primers ou escolher enzimas", "Prever número de colônias", "Verificar sequências"],
  autoria: AUTORIA,
};
