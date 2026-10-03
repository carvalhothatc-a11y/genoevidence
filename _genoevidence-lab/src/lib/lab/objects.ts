import type { Claim } from "@/lib/sources/catalog";

export type ZoneId = "pre" | "amp" | "pos" | "analise";

/** Ordem de adição dos componentes de uma reação segundo a Tabela 1 de Lorenz (2012). */
export const REAGENT_ORDER = ["agua", "tampao", "dntps", "mgcl2", "primer-f", "primer-r", "molde", "polimerase"] as const;

export const ZONES: Record<ZoneId, { id: ZoneId; label: string; short: string; description: string }> = {
  pre: {
    id: "pre",
    label: "Zona 1 · Preparo de reações (pré-PCR)",
    short: "Preparo",
    description: "Reagentes no gelo, micropipetas, ponteiras e tubos. Aqui não entram produtos já amplificados.",
  },
  amp: {
    id: "amp",
    label: "Zona 2 · Amplificação",
    short: "Amplificação",
    description: "Termociclador onde os tubos fechados passam pelo programa de temperaturas.",
  },
  pos: {
    id: "pos",
    label: "Zona 3 · Eletroforese (pós-PCR)",
    short: "Eletroforese",
    description: "Cuba, fonte e pipeta dedicada para analisar os produtos em gel de agarose.",
  },
  analise: {
    id: "analise",
    label: "Zona 4 · Análise de dados",
    short: "Análise",
    description: "Computador com acesso aos projetos, tabelas, gráficos, estruturas e referências.",
  },
};

export type LabObject = {
  id: string;
  name: string;
  zone: ZoneId;
  function: string;
  /** Relação com etapas do módulo de PCR (ids de etapa → texto). */
  steps: Record<string, string>;
  simple: string;
  technical: Claim[];
  /** Interação disponível (somente quando contribui para o aprendizado). */
  interaction?: string;
  /** Sub-itens clicáveis (ex.: cada reagente). */
  parts?: { id: string; name: string; role: Claim }[];
};

const L = (locator: string) => ({ id: "lorenz2012", locator });
const LEE = (locator: string) => ({ id: "lee2012", locator });

export const LAB_OBJECTS: LabObject[] = [
  {
    id: "placa-zona-pre",
    name: "Sinalização da zona pré-PCR",
    zone: "pre",
    function: "Identifica a área de preparo de reações.",
    steps: { preparo: "Define onde a reação é montada, longe dos produtos amplificados." },
    simple: "Reações são montadas em uma área separada da análise dos produtos para reduzir contaminação.",
    technical: [
      {
        text: "Contaminação por DNA, incluindo produtos de PCR anteriores, pode gerar falsos positivos.",
        basis: "referencia",
        refs: [L("§4, Notas"), { id: "kwok1989", locator: "Resumo" }],
      },
      {
        text: "O arranjo físico deste laboratório (zonas separadas) é uma ilustração da prática; não reproduz uma norma específica.",
        basis: "ilustracao",
        refs: [],
      },
    ],
  },
  {
    id: "micropipetas",
    name: "Micropipetas (P-10, P-20, P-200, P-1000) e suporte",
    zone: "pre",
    function: "Medir e transferir volumes de microlitros.",
    steps: {
      master_mix: "Usadas para pipetar cada reagente do master mix.",
      controles: "Distribuem o master mix e o molde nos tubos de reação.",
    },
    simple: "Cada pipeta cobre uma faixa de volume. Escolha a de menor faixa que comporte o volume desejado.",
    technical: [
      {
        text: "A referência ilustra o conjunto P-10, P-20, P-200 e P-1000 para montar uma PCR.",
        basis: "referencia",
        refs: [L("legenda da figura do balde de gelo com reagentes e pipetas")],
      },
      {
        text: "Para dispersar a polimerase (em glicerol 50%), homogeneize pipetando cerca de 20 vezes, com a pipeta em cerca de metade do volume e sem formar bolhas.",
        basis: "referencia",
        refs: [L("§4")],
      },
      {
        text: "A faixa nominal exata de cada modelo depende do fabricante; os números indicam o volume máximo usual.",
        basis: "sem_fonte",
        refs: [],
        note: "Confira o manual da sua micropipeta.",
      },
    ],
  },
  {
    id: "ponteiras",
    name: "Caixas de ponteiras",
    zone: "pre",
    function: "Ponteiras descartáveis acopladas à micropipeta.",
    steps: { master_mix: "Uma ponteira nova a cada reagente e a cada amostra." },
    simple: "Trocar a ponteira evita levar um reagente ou molde para outro tubo.",
    technical: [
      {
        text: "Trocar a ponteira entre reagentes e amostras é uma prática de prevenção de contaminação cruzada.",
        basis: "sem_fonte",
        refs: [{ id: "kwok1989", locator: "Resumo (tema: contaminação)" }],
        note: "As cores das ponteiras variam por fabricante; aqui são só visuais.",
      },
    ],
  },
  {
    id: "balde-gelo",
    name: "Balde de gelo",
    zone: "pre",
    function: "Manter reagentes e tubos de reação frios durante o preparo.",
    steps: { preparo: "Reagentes descongelados e mantidos no gelo.", master_mix: "O master mix é montado com tudo no gelo." },
    simple: "Manter tudo frio protege os reagentes e reduz reações indesejadas antes da ciclagem.",
    technical: [
      { text: "Reagentes em balde de gelo recém-preparado, totalmente descongelados e mantidos no gelo.", basis: "referencia", refs: [L("§2")] },
      { text: "Tubos frios ajudam a prevenir atividade de nucleases e anelamento inespecífico.", basis: "referencia", refs: [L("§4")] },
    ],
  },
  {
    id: "reagentes",
    name: "Reagentes da PCR",
    zone: "pre",
    function: "Componentes da reação, um tubo para cada.",
    steps: {
      master_mix: "Adicionados na ordem: água, tampão, dNTPs, MgCl₂, primers, molde.",
      ciclo_molecular: "Cada componente tem papel na síntese.",
    },
    simple: "Selecione um tubo para ver a função de cada componente.",
    interaction: "Selecionar os reagentes na ordem de montagem",
    technical: [{ text: "Ordem de pipetagem e concentrações típicas descritas na referência.", basis: "referencia", refs: [L("§4"), L("Tabela 1")] }],
    parts: [
      {
        id: "agua",
        name: "Água estéril",
        role: { text: "Completa o volume final da reação; no controle negativo substitui o molde.", basis: "referencia", refs: [L("Tabela 1"), L("§4")] },
      },
      {
        id: "tampao",
        name: "Tampão de PCR 10X",
        role: {
          text: "Usado a 1X na reação; alguns tampões já contêm MgCl₂ (ex.: 15 mM no 10X).",
          basis: "referencia",
          refs: [L("Tabela 1"), L("§8 Magnesium salt")],
        },
      },
      {
        id: "dntps",
        name: "dNTPs (dATP, dCTP, dGTP, dTTP)",
        role: {
          text: "Substratos da síntese, em concentrações equivalentes; congelamentos repetidos podem degradá-los. Faixa tolerada: 20–200 µM de cada.",
          basis: "referencia",
          refs: [L("§8 Deoxynucleotide 5'-triphosphates")],
        },
      },
      {
        id: "mgcl2",
        name: "MgCl₂",
        role: {
          text: "Fonte de Mg²⁺, cofator da polimerase; faixa de 0,5 a 5,0 mM. Excesso reduz especificidade e fidelidade; falta impede a reação.",
          basis: "referencia",
          refs: [L("§8 Magnesium salt")],
        },
      },
      {
        id: "primer-f",
        name: "Primer direto (forward)",
        role: { text: "Anela a uma das fitas e define uma extremidade do produto.", basis: "referencia", refs: [L("§1")] },
      },
      {
        id: "primer-r",
        name: "Primer reverso (reverse)",
        role: { text: "Anela à fita complementar e define a outra extremidade do produto.", basis: "referencia", refs: [L("§1")] },
      },
      {
        id: "molde",
        name: "DNA molde",
        role: {
          text: "Contém a sequência-alvo. Pureza (razão A260/A280 ideal entre 1,8 e 2,0) e número de moléculas influenciam o resultado.",
          basis: "referencia",
          refs: [L("§8 Template DNA")],
        },
      },
      {
        id: "polimerase",
        name: "DNA polimerase termoestável (Taq)",
        role: {
          text: "Sintetiza as novas fitas a partir dos primers; isolada de Thermus aquaticus, tolera as temperaturas da ciclagem.",
          basis: "referencia",
          refs: [{ id: "saiki1988", locator: "Resumo" }, { id: "chien1976", locator: "Resumo" }],
        },
      },
    ],
  },
  {
    id: "tubo-master-mix",
    name: "Tubo de 1,8 mL (master mix)",
    zone: "pre",
    function: "Recebe a mistura comum a todas as reações.",
    steps: { master_mix: "Volume calculado para o número de reações mais ~10% de excedente." },
    simple: "Preparar uma mistura única garante que todas as reações recebam o mesmo conteúdo.",
    technical: [{ text: "Master mix em tubo de 1,8 mL; reagentes comuns × (reações + 10%).", basis: "referencia", refs: [L("§4, Notas")] }],
  },
  {
    id: "rack-microtubos",
    name: "Rack de microtubos",
    zone: "pre",
    function: "Suporte para tubos de 1,5–2 mL.",
    steps: { master_mix: "Apoia o tubo do master mix durante a montagem." },
    simple: "Mantém os tubos em pé e organizados.",
    technical: [{ text: "Tubos de 1,8 mL e rack fazem parte do material ilustrado pela referência.", basis: "referencia", refs: [L("legenda da figura do balde de gelo")] }],
  },
  {
    id: "tubos-pcr",
    name: "Tubos de PCR de 0,2 mL (tira)",
    zone: "pre",
    function: "Tubos de parede fina para a reação no termociclador.",
    steps: {
      controles: "Cada tubo recebe master mix + molde (ou água, no controle negativo).",
      centrifugacao: "Fechados e centrifugados brevemente.",
      termociclador: "Posicionados no bloco do termociclador.",
    },
    simple: "A parede fina facilita a troca de calor rápida com o bloco do termociclador.",
    interaction: "Levar a tira até a microcentrífuga e depois ao termociclador",
    technical: [
      { text: "A maioria dos termocicladores modernos usa tubos de 0,2 mL; alguns modelos exigem 0,5 mL.", basis: "referencia", refs: [L("§4, Notas")] },
      { text: "Rotular os tubos com marcador resistente a etanol antes de pipetar.", basis: "referencia", refs: [L("§3")] },
    ],
  },
  {
    id: "rack-pcr",
    name: "Suporte para tubos de PCR",
    zone: "pre",
    function: "Apoia os tubos de 0,2 mL (pode ser uma placa de 96 poços sobre o gelo).",
    steps: { controles: "Organiza amostras e controles na ordem planejada." },
    simple: "Mantém a ordem das reações e evita trocas.",
    technical: [{ text: "Placa de 96 poços no gelo como suporte para os tubos.", basis: "referencia", refs: [L("§4")] }],
  },
  {
    id: "microcentrifuga",
    name: "Microcentrífuga",
    zone: "pre",
    function: "Centrifugação rápida de microtubos e tiras.",
    steps: { centrifugacao: "Reúne o líquido no fundo dos tubos antes da ciclagem." },
    simple: "Gira os tubos para trazer gotas da parede e da tampa para o fundo. Os tubos devem ficar balanceados.",
    interaction: "Posicionar tubos no rotor e conferir o balanceamento",
    technical: [
      {
        text: "Centrifugação breve e balanceamento do rotor: prática comum, sem fonte cadastrada neste módulo.",
        basis: "sem_fonte",
        refs: [],
        note: "Confira o manual do fabricante e o protocolo do laboratório.",
      },
    ],
  },
  {
    id: "termociclador",
    name: "Termociclador",
    zone: "amp",
    function: "Executa o programa de temperaturas da PCR.",
    steps: {
      termociclador: "Tubos no bloco, tampa aquecida fechada, programa iniciado.",
      ciclo_molecular: "Cada patamar corresponde a uma fase molecular.",
    },
    simple: "Aquece e resfria o bloco onde ficam os tubos, repetindo desnaturação, anelamento e extensão.",
    interaction: "Abrir a tampa, posicionar os tubos e iniciar o programa",
    technical: [
      { text: "Aquecimento e resfriamento rápidos permitem a desnaturação, o anelamento e a extensão.", basis: "referencia", refs: [L("§6")] },
      { text: "A velocidade de rampa do equipamento influencia o tempo efetivo de cada etapa.", basis: "referencia", refs: [L("§6")] },
      { text: "Ao final, os tubos podem ser mantidos a 4 °C.", basis: "referencia", refs: [L("§4"), L("Tabela 2")] },
    ],
  },
  {
    id: "placa-zona-pos",
    name: "Sinalização da zona pós-PCR",
    zone: "pos",
    function: "Identifica a área onde os produtos amplificados são manipulados.",
    steps: { eletroforese: "Produtos de PCR só são abertos nesta área." },
    simple: "Os produtos amplificados ficam longe da área de preparo.",
    technical: [
      {
        text: "Contaminação por produtos de outra PCR (carry-over) pode causar falsos positivos.",
        basis: "referencia",
        refs: [L("§4, Notas")],
      },
    ],
  },
  {
    id: "micropipeta-pos",
    name: "Micropipeta dedicada (pós-PCR)",
    zone: "pos",
    function: "Aplicar amostras no gel.",
    steps: { eletroforese: "Carregar marcador e amostras nos poços." },
    simple: "Uma pipeta usada só nesta área evita levar produtos amplificados para o preparo.",
    technical: [
      {
        text: "Equipamentos dedicados por área são uma prática comum de prevenção de contaminação.",
        basis: "sem_fonte",
        refs: [{ id: "kwok1989", locator: "Resumo (tema: contaminação)" }],
      },
      { text: "Aplicar a amostra lenta e cuidadosamente nos poços.", basis: "referencia", refs: [LEE("§2")] },
    ],
  },
  {
    id: "cuba-eletroforese",
    name: "Cuba de eletroforese horizontal com gel de agarose",
    zone: "pos",
    function: "Separar fragmentos de DNA por tamanho.",
    steps: { eletroforese: "Gel imerso em tampão; amostras aplicadas nos poços." },
    simple: "O DNA, com carga negativa, atravessa o gel em direção ao polo positivo; fragmentos menores andam mais.",
    interaction: "Definir a ordem das canaletas",
    technical: [
      { text: "Géis de 0,5–2% de agarose; tampões TAE ou TBE; mesmo tampão no gel e na corrida.", basis: "referencia", refs: [LEE("§1"), LEE("§2")] },
      { text: "Distância percorrida inversamente proporcional ao log do tamanho; faixa útil de ~100 pb a 25 kb.", basis: "referencia", refs: [LEE("Resumo")] },
      { text: "Conformação do DNA altera a migração (superenovelado, linear, circular aberto).", basis: "referencia", refs: [LEE("Discussão")] },
    ],
  },
  {
    id: "fonte-eletroforese",
    name: "Fonte de eletroforese",
    zone: "pos",
    function: "Aplicar a diferença de potencial ao gel.",
    steps: { eletroforese: "Programada em 1–5 V/cm; cabo preto (cátodo) do lado dos poços." },
    simple: "Liga a cuba à energia. A polaridade correta faz o DNA correr para dentro do gel.",
    technical: [
      { text: "Programar 1–5 V/cm entre eletrodos; conferir os cabos (preto = cátodo junto aos poços; vermelho = ânodo).", basis: "referencia", refs: [LEE("§2")] },
    ],
  },
  {
    id: "computador",
    name: "Estação de análise",
    zone: "analise",
    function: "Acessar projetos, dados, gráficos, estruturas e referências.",
    steps: { planejamento: "Registro do plano e das referências.", interpretacao: "Registro e associação dos resultados ao projeto." },
    simple: "Ponto de acesso às informações do projeto. Abre os painéis 2D de dados, estruturas e fontes.",
    interaction: "Abrir projetos, dados e estruturas",
    technical: [{ text: "Visualizações de dados usam somente arquivos enviados ao projeto.", basis: "ilustracao", refs: [] }],
  },
];

export function getLabObject(id: string): LabObject | undefined {
  return LAB_OBJECTS.find((o) => o.id === id);
}

/** Pontos de vista da câmera (visão geral, zonas e equipamentos). Coordenadas em metros. */
export type ViewId = "geral" | ZoneId | string;
export type CameraView = { position: [number, number, number]; target: [number, number, number] };
