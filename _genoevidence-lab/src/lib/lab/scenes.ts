import type { MolecularPhase } from "@/lib/modules/contract";
import type { TubeLocation } from "@/store/lab";

/**
 * Cenas montadas a partir da descrição do pesquisador ("o que estou fazendo").
 * A interpretação é LOCAL (regras e palavras-chave, sem enviar o texto a nenhum serviço) e só
 * escolhe entre cenas pré-definidas do laboratório: não cria equipamentos, resultados nem dados.
 */
export type ReagentId = "agua" | "tampao" | "dntps" | "mgcl2" | "primer-f" | "primer-r" | "molde" | "polimerase";

export type LabScene = {
  id: string;
  title: string;
  /** O que a cena mostra (texto exibido junto à imagem). */
  shows: string;
  /** Objeto em foco (id de LAB_OBJECTS). */
  focus: string;
  part?: ReagentId;
  state: {
    tubes?: TubeLocation;
    thermocyclerOpen?: boolean;
    programRunning?: boolean;
    centrifugeOpen?: boolean;
    rotorSlots?: number[];
    spinning?: boolean;
    highlightReagent?: ReagentId | null;
  };
  /** Abre a escala molecular nesta fase (ilustração didática). */
  phase?: MolecularPhase;
  /** Etapa correspondente no módulo guiado de PCR. */
  moduleStep: string;
};

type Rule = { scene: Omit<LabScene, "part">; terms: string[]; weight?: number };

export const REAGENT_TERMS: Record<ReagentId, { name: string; terms: string[] }> = {
  agua: { name: "água livre de nuclease", terms: ["agua", "h2o"] },
  tampao: { name: "tampão de reação", terms: ["tampao", "buffer"] },
  dntps: { name: "dNTPs", terms: ["dntp*", "nucleotideo*"] },
  mgcl2: { name: "MgCl₂", terms: ["mgcl*", "magnesio", "cloreto de magnesio"] },
  "primer-f": { name: "primer forward", terms: ["primer forward", "primer f", "forward", "primer senso", "iniciador senso", "primer direto"] },
  "primer-r": { name: "primer reverse", terms: ["primer reverse", "primer r", "reverse", "antissenso", "anti-senso", "primer reverso"] },
  molde: { name: "DNA molde", terms: ["molde", "template", "cdna", "amostra de dna", "dna genomico", "dna alvo"] },
  polimerase: { name: "DNA polimerase", terms: ["polimerase", "taq", "enzima"] },
};

const RULES: Rule[] = [
  {
    terms: ["desnatur*", "95 graus", "95 °c", "95°c", "separar as fitas", "abrir a dupla fita"],
    weight: 3,
    scene: {
      id: "fase-desnaturacao",
      title: "Desnaturação no termociclador",
      shows: "Tubos no bloco do termociclador e a escala molecular na fase de desnaturação: as fitas do DNA se separam.",
      focus: "termociclador",
      state: { tubes: "termociclador", thermocyclerOpen: false, programRunning: false },
      phase: "desnaturacao",
      moduleStep: "ciclo_molecular",
    },
  },
  {
    terms: ["anelamento", "anelar", "hibridiza*", "pareamento dos primers", "primers se ligam"],
    weight: 3,
    scene: {
      id: "fase-anelamento",
      title: "Anelamento dos primers",
      shows: "Escala molecular na fase de anelamento: os primers pareiam com as regiões complementares do molde.",
      focus: "termociclador",
      state: { tubes: "termociclador", thermocyclerOpen: false, programRunning: false },
      phase: "anelamento",
      moduleStep: "ciclo_molecular",
    },
  },
  {
    terms: ["extensao", "alongamento", "72 graus", "72 °c", "72°c", "sintese da nova fita", "polimerase estende"],
    weight: 3,
    scene: {
      id: "fase-extensao",
      title: "Extensão pela polimerase",
      shows: "Escala molecular na fase de extensão: a polimerase sintetiza a nova fita a partir dos primers.",
      focus: "termociclador",
      state: { tubes: "termociclador", thermocyclerOpen: false, programRunning: false },
      phase: "extensao",
      moduleStep: "ciclo_molecular",
    },
  },
  {
    terms: ["iniciar o programa", "iniciei o programa", "rodar a pcr", "rodando a pcr", "ciclagem", "ciclando", "ciclos", "amplificando", "amplificacao", "programa do termociclador", "rodar o programa"],
    weight: 2,
    scene: {
      id: "programa",
      title: "Programa de PCR em execução",
      shows: "Termociclador fechado, com os tubos no bloco e o programa de três etapas em andamento.",
      focus: "termociclador",
      state: { tubes: "termociclador", thermocyclerOpen: false, programRunning: true },
      moduleStep: "termociclador",
    },
  },
  {
    terms: ["termociclador", "ciclador", "colocar os tubos no bloco", "colocando os tubos no bloco", "bloco termico", "tampa aquecida"],
    scene: {
      id: "carregar-termociclador",
      title: "Tubos no termociclador",
      shows: "Tampa do termociclador aberta e tubos posicionados no bloco, antes de iniciar o programa.",
      focus: "termociclador",
      state: { tubes: "termociclador", thermocyclerOpen: true, programRunning: false },
      moduleStep: "termociclador",
    },
  },
  {
    terms: ["centrifug*", "spin", "rotor", "balance*", "girar os tubos", "dar um pulso"],
    scene: {
      id: "centrifugar",
      title: "Centrifugação rápida",
      shows: "Tubos em posições opostas do rotor (balanceado) e a microcentrífuga girando para juntar o líquido no fundo.",
      focus: "microcentrifuga",
      state: { tubes: "centrifuga", centrifugeOpen: false, rotorSlots: [0, 4], spinning: true },
      moduleStep: "centrifugacao",
    },
  },
  {
    terms: ["master mix", "mastermix", "mistura mae", "mistura de reacao", "misturar os reagentes", "homogeneiz*"],
    scene: {
      id: "master-mix",
      title: "Preparo do master mix",
      shows: "Tubo do master mix na estante da bancada de preparo, onde os reagentes comuns às reações são combinados.",
      focus: "tubo-master-mix",
      state: { tubes: "gelo", highlightReagent: null },
      moduleStep: "master_mix",
    },
  },
  {
    terms: ["tubos de pcr", "tubo de pcr", "aliquot*", "distribu*", "dividir nos tubos", "fita de tubos", "strip"],
    scene: {
      id: "aliquotar",
      title: "Distribuição nos tubos de PCR",
      shows: "Fita de tubos de PCR no gelo, onde o master mix é distribuído antes de adicionar o molde.",
      focus: "tubos-pcr",
      state: { tubes: "gelo" },
      moduleStep: "preparo",
    },
  },
  {
    terms: ["ponteira*", "trocar a ponteira", "descartar a ponteira"],
    scene: {
      id: "ponteiras",
      title: "Troca de ponteiras",
      shows: "Caixas de ponteiras de 10, 200 e 1000 µL na bancada de preparo.",
      focus: "ponteiras",
      state: {},
      moduleStep: "preparo",
    },
  },
  {
    terms: ["gelo", "descongel*", "balde"],
    scene: {
      id: "gelo",
      title: "Reagentes no gelo",
      shows: "Balde de gelo com os reagentes e os tubos mantidos frios durante o preparo.",
      focus: "balde-gelo",
      state: { tubes: "gelo" },
      moduleStep: "preparo",
    },
  },
  {
    terms: ["pipet*", "micropipeta*", "adicion*", "acrescent*", "colocar o", "colocando o", "colocar a", "colocando a", "transfer*"],
    scene: {
      id: "pipetar",
      title: "Pipetagem na bancada de preparo",
      shows: "Micropipetas no suporte da bancada de preparo, usadas para medir e transferir microlitros.",
      focus: "micropipetas",
      state: { tubes: "gelo" },
      moduleStep: "master_mix",
    },
  },
  {
    terms: ["fonte", "voltagem", "volts", "ligar a corrente", "correr o gel", "corrida do gel", "rodar o gel"],
    weight: 2,
    scene: {
      id: "fonte",
      title: "Corrida da eletroforese",
      shows: "Fonte de eletroforese ligada à cuba pelos cabos (polo negativo e positivo).",
      focus: "fonte-eletroforese",
      state: {},
      moduleStep: "eletroforese",
    },
  },
  {
    terms: ["no gel", "nos pocos", "aplicar as amostras", "aplicando as amostras", "aplicar amostra*", "aplicando amostra*", "carregar o gel", "carregando o gel", "pocos", "marcador de peso*", "ladder", "corante de corrida", "loading"],
    weight: 2,
    scene: {
      id: "aplicar-gel",
      title: "Aplicação das amostras no gel",
      shows: "Pipeta dedicada da área pós-PCR e o produto amplificado prontos para a aplicação nos poços do gel.",
      focus: "micropipeta-pos",
      state: {},
      moduleStep: "eletroforese",
    },
  },
  {
    terms: ["eletrofor*", "gel de agarose", "agarose", "cuba", "gel"],
    scene: {
      id: "eletroforese",
      title: "Eletroforese em gel de agarose",
      shows: "Cuba de eletroforese na bancada pós-PCR, onde os produtos são separados por tamanho.",
      focus: "cuba-eletroforese",
      state: {},
      moduleStep: "eletroforese",
    },
  },
  {
    terms: ["analis*", "computador", "planilha*", "grafico*", "resultado*", "dados", "fotodocument*", "imagem do gel", "quantific*", "expressao"],
    scene: {
      id: "analise",
      title: "Análise dos dados",
      shows: "Computador da bancada de análise, com acesso às tabelas, gráficos e imagens do projeto.",
      focus: "computador",
      state: {},
      moduleStep: "interpretacao",
    },
  },
];

/** Termo terminado em "*" casa como prefixo de palavra; os demais, como palavra/expressão inteira. */
function termRegex(term: string): RegExp {
  const prefix = term.endsWith("*");
  const body = (prefix ? term.slice(0, -1) : term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${body}${prefix ? "" : "(?![a-z0-9])"}`);
}

function findTerm(t: string, term: string): number {
  const m = termRegex(term).exec(t);
  return m ? m.index : -1;
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectReagent(t: string): ReagentId | undefined {
  let best: { id: ReagentId; at: number } | undefined;
  for (const [id, r] of Object.entries(REAGENT_TERMS) as [ReagentId, (typeof REAGENT_TERMS)[ReagentId]][]) {
    for (const term of r.terms) {
      const at = findTerm(t, term);
      if (at >= 0 && (!best || at < best.at)) best = { id, at };
    }
  }
  return best?.id;
}

export type Interpretation = { scene: LabScene; matched: string[] } | null;

/** Escolhe a cena que melhor corresponde à descrição. Retorna null quando nada é reconhecido. */
export function interpretAction(text: string): Interpretation {
  const t = normalize(text);
  if (t.length < 3) return null;
  let best: { rule: Rule; score: number; matched: string[] } | null = null;
  for (const rule of RULES) {
    const matched = rule.terms.filter((term) => findTerm(t, term) >= 0).map((term) => term.replace(/\*$/, ""));
    if (!matched.length) continue;
    const score = matched.length * (rule.weight ?? 1);
    if (!best || score > best.score) best = { rule, score, matched };
  }
  const reagent = detectReagent(t);
  // Pipetar/adicionar + reagente identificado → reagente em destaque no balde de gelo.
  if (reagent && (!best || best.rule.scene.id === "pipetar" || best.rule.scene.id === "gelo" || best.rule.scene.id === "master-mix")) {
    const name = REAGENT_TERMS[reagent].name;
    return {
      matched: [...(best?.matched ?? []), name],
      scene: {
        id: `reagente-${reagent}`,
        title: `Pipetando ${name}`,
        shows: `Reagente em destaque no balde de gelo (${name}), na ordem de montagem da reação na bancada de preparo.`,
        focus: "reagentes",
        part: reagent,
        state: { tubes: "gelo", highlightReagent: reagent },
        moduleStep: "master_mix",
      },
    };
  }
  return best ? { scene: { ...best.rule.scene }, matched: best.matched } : null;
}

/** Exemplos exibidos ao pesquisador (todos reconhecidos pelas regras acima). */
export const SCENE_EXAMPLES = [
  "Estou pipetando o primer forward no master mix",
  "Coloquei os tubos no termociclador",
  "Agora é a etapa de anelamento",
  "Vou centrifugar os tubos rapidamente",
  "Estou aplicando as amostras no gel",
  "Analisando os resultados no computador",
];
