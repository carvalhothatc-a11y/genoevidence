import { AUTORIA, R, X, ref, type TecnicaConteudo } from "./tipos";

const MY = (l: string) => ref("mahmood2012", l);
const TOW = ref("towbin1979", "Resumo");

export const WESTERN: TecnicaConteudo = {
  id: "western",
  titulo: "Western blot",
  tecnica: "Separação de proteínas por tamanho, transferência para membrana e detecção com anticorpos",
  versao: "0.1.0",
  status: "implementado",
  resumo:
    "Da lise das células à detecção do sinal: veja por que cada etapa existe, calcule o volume de extrato a aplicar e entenda por que o resultado é semiquantitativo.",
  fontes: [MY(""), TOW, ref("laemmli1970")],
  etapas: [
    {
      id: "lise",
      titulo: "Extrair as proteínas (lise)",
      resumo: "Células lavadas e rompidas no frio, com inibidores de protease.",
      cena: {
        acao: "extrair",
        entidades: ["celula", "proteina"],
        origem: "proteina",
        legenda: "Ilustração da lise e da separação de componentes. As formas e quantidades não são reais.",
      },
      acontece: [
        R("Células aderentes são lavadas com PBS frio, soltas com raspador e centrifugadas; o sedimento recebe tampão de lise gelado com coquetel de inibidores de protease e fica 30 min no gelo. O lisado é clarificado por centrifugação a 4 °C e o sobrenadante (as proteínas) vai para um tubo novo, no gelo ou congelado.", [MY("Technique — Cell lysis")]),
        R("Tecidos têm mais estrutura e exigem ruptura mecânica, como homogeneização ou sonicação.", [MY("Theory — Sample preparation")]),
      ],
      porque: [
        R("A extração é feita no frio e com inibidores de protease.", [MY("Theory — Sample preparation")]),
        R("Degradação por proteases pode gerar bandas em posições inesperadas; nesse caso a referência sugere usar amostra fresca mantida no gelo.", [MY("Troubleshooting")]),
      ],
      materiais: [
        { nome: "PBS frio e raspador de células", papel: "Lavar e soltar as células aderentes.", refs: [MY("Technique — Cell lysis")] },
        { nome: "Tampão de lise com inibidores de protease", papel: "Romper as células preservando as proteínas.", refs: [MY("Technique — Cell lysis")] },
        { nome: "Microcentrífuga refrigerada", papel: "Clarificar o lisado (4 °C).", refs: [MY("Technique — Cell lysis")] },
      ],
      controles: [],
      observar: [R("Se a concentração final de proteína for baixa, a referência sugere repetir com maior proporção do coquetel de inibidores.", [MY("Technique — Cell lysis")])],
      limitacoes: ["O rendimento da extração não é previsto."],
    },
    {
      id: "amostras",
      titulo: "Medir a concentração e preparar as amostras",
      resumo: "Mesma massa por poço, tampão de amostra e aquecimento.",
      cena: {
        acao: "pipetar",
        entidades: ["proteina", "tubo"],
        origem: "proteina",
        destino: "tubo",
        legenda: "Ilustração da transferência com micropipeta. Volumes não são representados.",
      },
      acontece: [
        R("Mede-se a concentração de proteína (por exemplo, em espectrofotômetro) e calcula-se o volume de extrato para 50 µg por poço; adicionam-se 5 µL de tampão de amostra e iguala-se o volume das canaletas com água (15 µL por canaleta sugeridos). As amostras são aquecidas por 5 min a 100 °C.", [MY("Technique — Sample preparation")]),
      ],
      porque: [
        R("Conhecer a concentração permite comparar as amostras em base equivalente: a massa aplicada sai da relação entre concentração, massa e volume.", [MY("Theory — Sample preparation")]),
        R("O tampão de amostra contém glicerol, para a amostra afundar no poço, e um corante (azul de bromofenol), para acompanhar a corrida. O aquecimento desfaz a estrutura de ordem superior da proteína.", [MY("Theory — Sample preparation")]),
      ],
      materiais: [
        { nome: "Espectrofotômetro", papel: "Medir a concentração de proteína do extrato.", refs: [MY("Technique — Cell lysis")] },
        { nome: "Tampão de amostra", papel: "Densidade e corante de acompanhamento.", refs: [MY("Theory — Sample preparation")] },
        { nome: "Bloco aquecedor", papel: "5 min a 100 °C.", refs: [MY("Technique — Sample preparation")] },
      ],
      controles: [
        R("Controle positivo: uma fonte conhecida da proteína-alvo, como proteína purificada ou um lisado controle, confirma a identidade da proteína e a atividade do anticorpo.", [MY("Theory — Sample preparation")]),
      ],
      observar: [],
      limitacoes: ["Os volumes do protocolo da referência são exemplos; ajuste ao seu gel e ao seu protocolo."],
      calculadora: "volume_proteina",
    },
    {
      id: "gel",
      titulo: "Separar por tamanho no gel",
      resumo: "Gel de empilhamento e gel de separação; proteínas menores migram mais rápido.",
      cena: {
        acao: "eletroforese",
        entidades: ["proteina", "gel"],
        rotulos: { material: "as proteínas" },
        legenda: "Gel ilustrativo: posições de banda não são resultado. A cena é genérica e não distingue gel de proteína de gel de DNA.",
      },
      acontece: [
        R("O gel de empilhamento (pH 6,8, menos acrilamida, poros maiores) separa pouco, mas concentra as proteínas em bandas finas e nítidas; o gel de separação (pH 8,8, mais acrilamida, poros menores) separa por tamanho — as proteínas menores atravessam com mais facilidade e mais rápido.", [MY("Theory — Gel electrophoresis")]),
        R("Aplicam-se o marcador e as amostras; a corrida dura cerca de uma hora, ou até a frente de corante sair pelo fim do gel.", [MY("Technique — Electrophoresis")]),
      ],
      porque: [R("Na amostra preparada, as proteínas têm carga negativa e migram em direção ao eletrodo positivo quando a tensão é aplicada.", [MY("Theory — Gel electrophoresis")])],
      materiais: [
        { nome: "Gel de poliacrilamida (empilhamento + separação)", papel: "Matriz que separa por tamanho.", refs: [MY("Theory — Gel electrophoresis")] },
        { nome: "Marcador de massa molecular", papel: "Referência de tamanho aplicada no gel.", refs: [MY("Technique — Electrophoresis")] },
        { nome: "Cuba e fonte", papel: "Conectar vermelho com vermelho e preto com preto.", refs: [MY("Technique — Electrophoresis")] },
      ],
      controles: [],
      observar: [R("Tensão alta pode superaquecer o gel e distorcer as bandas.", [MY("Theory — Gel electrophoresis")])],
      limitacoes: ["Concentrações de acrilamida e tensões não são recomendadas pelo módulo."],
    },
    {
      id: "transferencia",
      titulo: "Transferir as proteínas para a membrana",
      resumo: "Sanduíche sem bolhas, com a membrana do lado do polo positivo.",
      cena: {
        acao: "generica",
        entidades: ["gel", "proteina"],
        legenda: "A transferência não tem animação própria; a cena mostra só os materiais envolvidos.",
      },
      acontece: [
        R("Monta-se o sanduíche esponja / papéis de filtro / gel / membrana / papéis de filtro / esponja, sem bolhas entre o gel e a membrana. A membrana de PVDF é umedecida em metanol. A transferência é feita no gelo (4 °C) por 90 min; o tempo deve ser proporcional à espessura do gel (cerca de 45 min para géis de 0,75 mm).", [MY("Technique — Electrotransfer")]),
        R("O método original transferiu proteínas de géis de poliacrilamida para folhas de nitrocelulose; em géis com SDS o padrão de bandas foi preservado, mas a transferência não foi quantitativa.", [TOW]),
      ],
      porque: [
        R("Um campo elétrico perpendicular ao gel tira as proteínas, carregadas negativamente, do gel para a membrana; por isso a membrana fica entre o gel e o eletrodo positivo. Contato íntimo entre gel e membrana é essencial para uma imagem nítida.", [MY("Theory — Blotting")]),
      ],
      materiais: [
        { nome: "Membrana (PVDF ou nitrocelulose)", papel: "Suporte sólido onde as proteínas ficam presas.", refs: [MY("Theory — Blotting"), TOW] },
        { nome: "Papéis de filtro e esponjas", papel: "Protegem o gel e a membrana no sanduíche.", refs: [MY("Theory — Blotting")] },
      ],
      controles: [],
      observar: [R("Bolhas de ar entre o gel e a membrana aparecem como manchas no resultado.", [MY("Troubleshooting")])],
      limitacoes: ["A eficiência da transferência não é prevista."],
      parametros: [
        {
          id: "membrana",
          rotulo: "Tipo de membrana",
          descricao: "Consequências descritas na referência para cada membrana.",
          padrao: "pvdf",
          opcoes: [
            {
              valor: "nitrocelulose",
              rotulo: "Nitrocelulose",
              consequencias: [R("Alta afinidade e retenção de proteínas, mas é quebradiça e não permite nova sondagem.", [MY("Theory — Blotting")])],
            },
            {
              valor: "pvdf",
              rotulo: "PVDF",
              consequencias: [R("Mais resistente, permite nova sondagem e armazenamento; o fundo é maior, então a lavagem cuidadosa é muito importante.", [MY("Theory — Blotting")])],
            },
          ],
        },
        {
          id: "modo",
          rotulo: "Modo de transferência",
          descricao: "Úmida ou semisseca.",
          padrao: "umida",
          opcoes: [
            { valor: "umida", rotulo: "Úmida", consequencias: [R("Em geral mais confiável, com menor risco de o gel secar; preferida para proteínas maiores.", [MY("Theory — Blotting")])] },
            { valor: "semisseca", rotulo: "Semisseca", consequencias: [R("A referência cita a semisseca como alternativa; a úmida costuma ser mais confiável por ter menor risco de secar o gel.", [MY("Theory — Blotting")])] },
          ],
        },
      ],
    },
    {
      id: "anticorpos",
      titulo: "Bloquear e incubar com os anticorpos",
      resumo: "Bloqueio, anticorpo primário, lavagens, anticorpo secundário, lavagens.",
      cena: {
        acao: "generica",
        entidades: ["anticorpo", "proteina"],
        legenda: "A ligação do anticorpo não tem animação própria; a cena mostra só os componentes envolvidos.",
      },
      acontece: [
        R("Bloqueio com leite desnatado 5% em TBST por 1 h; anticorpo primário em BSA 5% durante a noite a 4 °C, em agitação; três lavagens de 5 min com TBST; anticorpo secundário por 1 h; mais três lavagens de 5 min.", [MY("Technique — Blocking and antibody incubation")]),
        R("Toda a capacidade de ligação restante da membrana é bloqueada com excesso de proteína; liga-se então o anticorpo específico e, depois, um segundo anticorpo dirigido contra o primeiro.", [TOW]),
      ],
      porque: [
        R("O bloqueio impede que os anticorpos se liguem à membrana de forma inespecífica.", [MY("Theory — Washing, blocking and antibody incubation")]),
        R("A lavagem reduz o fundo e remove anticorpo não ligado, mas lavar tempo demais também reduz o sinal.", [MY("Theory — Washing, blocking and antibody incubation")]),
      ],
      materiais: [
        { nome: "Agente de bloqueio (leite desnatado ou BSA) em TBST", papel: "Ocupar os sítios livres da membrana.", refs: [MY("Theory — Washing, blocking and antibody incubation")] },
        { nome: "Anticorpos primário e secundário", papel: "Reconhecer a proteína-alvo e marcar o primário para detecção.", refs: [TOW, MY("Technique — Blocking and antibody incubation")] },
        { nome: "Agitador", papel: "Agitação uniforme nas incubações e lavagens.", refs: [MY("Technique — Blocking and antibody incubation")] },
      ],
      controles: [],
      observar: [R("A concentração de anticorpo segue a instrução do fabricante.", [MY("Theory — Washing, blocking and antibody incubation")])],
      limitacoes: ["Diluições de anticorpo não são sugeridas pelo módulo."],
      parametros: [
        {
          id: "bloqueio",
          rotulo: "Agente de bloqueio",
          descricao: "Leite desnatado ou BSA.",
          padrao: "leite",
          opcoes: [
            { valor: "leite", rotulo: "Leite desnatado", consequencias: [R("Barato e disponível, mas não é compatível com todos os marcadores: contém caseína (uma fosfoproteína) e biotina, que interferem em alguns ensaios. Também pode mascarar o antígeno e enfraquecer o sinal.", [MY("Theory — Washing, blocking and antibody incubation"), MY("Troubleshooting")])] },
            { valor: "bsa", rotulo: "BSA", consequencias: [R("Preferida com marcadores biotina e fosfatase alcalina e com anticorpos contra fosfoproteínas; incubar o primário em BSA permite reaproveitá-lo.", [MY("Theory — Washing, blocking and antibody incubation")])] },
          ],
        },
      ],
    },
    {
      id: "deteccao",
      titulo: "Detectar o sinal e interpretar",
      resumo: "Sinal na posição da proteína-alvo; leitura semiquantitativa.",
      cena: {
        acao: "detectar",
        entidades: ["anticorpo", "proteina"],
        legenda: "Brilho ilustrativo em tubos genéricos (não é uma membrana). Intensidades não são previstas.",
      },
      acontece: [
        R("A membrana é incubada por 1–2 min com a mistura ECL e o resultado é visualizado em filme na câmara escura; se o fundo estiver forte, reduz-se o tempo de exposição.", [MY("Technique — Blocking and antibody incubation")]),
        R("O anticorpo marcado com uma enzima, como a peroxidase (HRP), gera sinal na posição da proteína-alvo.", [MY("Theory — Washing, blocking and antibody incubation")]),
        R("No trabalho original, o segundo anticorpo era radioativo, fluorescente ou conjugado à peroxidase; com a peroxidase, 100 pg de proteína foram claramente detectáveis.", [TOW]),
      ],
      porque: [
        R("O Western blot é tipicamente semiquantitativo: compara níveis relativos, mas não mede quantidade absoluta, porque a aplicação e a transferência variam entre canaletas e o sinal não é linear ao longo da faixa de concentrações.", [MY("Theory — Quantification")]),
      ],
      materiais: [{ nome: "Reagente ECL e filme (ou sistema de imagem)", papel: "Revelar o sinal da enzima ligada ao anticorpo.", refs: [MY("Technique — Blocking and antibody incubation")] }],
      controles: [],
      observar: [
        R("Como o sinal não é linear, ele não deve ser usado para modelar a concentração.", [MY("Theory — Quantification")]),
        X("Se haverá banda, sua intensidade ou bandas extras não podem ser previstas pelo módulo."),
      ],
      limitacoes: ["O módulo não quantifica bandas nem analisa imagens de membrana."],
    },
  ],
  modelos: [
    {
      id: "volume_proteina",
      name: "Volume de extrato para a massa desejada",
      equation: "volume (µL) = massa (µg) ÷ concentração (µg/µL);  água = total − tampão − volume",
      parameters: [
        { id: "m", label: "Massa por poço", unit: "µg", range: "> 0 (o protocolo da referência usa 50 µg)", source: "usuario" },
        { id: "c", label: "Concentração medida do extrato", unit: "µg/µL", range: "> 0", source: "usuario" },
        { id: "t", label: "Volume total por canaleta e volume de tampão", unit: "µL", range: "15 e 5 no protocolo da referência", source: "referencia" },
      ],
      assumptions: ["A concentração medida representa o extrato aplicado."],
      validity: "Cálculo de proporção; vale para qualquer valor positivo.",
      limitations: ["Não verifica a capacidade do poço do seu gel.", "Erros na medida da concentração se propagam para a massa aplicada."],
      implementation: "src/lib/models/proteina.ts → volumeParaMassa()",
      doesNotPredict: ["Intensidade do sinal", "Linearidade da detecção"],
      refs: [MY("Technique — Sample preparation"), MY("Theory — Sample preparation")],
    },
  ],
  problemas: [
    { sintoma: "Bandas inesperadas ou borradas", causas: [R("Degradação por proteases (bandas em posições inesperadas), tensão alta ou bolhas na transferência (bandas borradas); bandas brancas (negativas) indicam proteína ou anticorpo em excesso.", [MY("Troubleshooting")])] },
    { sintoma: "Nenhuma banda", causas: [R("Anticorpo inadequado ou muito diluído (alguns anticorpos não servem para Western), antígeno ausente ou muito escasso, lavagem prolongada ou tampões contaminados — azida sódica inativa a HRP.", [MY("Troubleshooting")])] },
    { sintoma: "Sinal fraco", causas: [R("Pouco anticorpo ou antígeno; o leite pode mascarar o antígeno (use BSA ou menos leite); aumentar a exposição pode ajudar.", [MY("Troubleshooting")])] },
    { sintoma: "Fundo alto", causas: [R("Anticorpo concentrado demais, tampões velhos, lavagem curta ou exposição longa.", [MY("Troubleshooting")])] },
    { sintoma: "Manchas irregulares", causas: [R("Transferência inadequada (bolhas aparecem mais escuras), agitação desigual, anticorpo ligado ao agente de bloqueio ou agregados do secundário.", [MY("Troubleshooting")])] },
  ],
  limitacoes: [
    "Educativo: não analisa imagens de membrana nem quantifica bandas.",
    "A referência principal tem imprecisões conhecidas (registradas no catálogo); elas não foram reproduzidas.",
  ],
  naoFaz: ["Prever presença ou intensidade de bandas", "Quantificar proteína pelo sinal", "Sugerir diluições de anticorpo"],
  autoria: AUTORIA,
};

