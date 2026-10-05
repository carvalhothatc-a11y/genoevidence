import { AUTORIA, M, R, X, ref, type TecnicaConteudo } from "./tipos";

const LEE = (l: string) => ref("lee2012", l);

export const ELETROFORESE: TecnicaConteudo = {
  id: "eletroforese",
  titulo: "Eletroforese em gel de agarose",
  tecnica: "Separação de fragmentos de DNA por tamanho em gel de agarose, com marcador e visualização por corante",
  versao: "0.1.0",
  status: "implementado",
  resumo:
    "Do preparo do gel à leitura das bandas: por que o DNA migra, o que a concentração de agarose muda, e como estimar o tamanho de um fragmento pelo marcador.",
  fontes: [LEE("")],
  etapas: [
    {
      id: "preparo",
      titulo: "Preparar o gel",
      resumo: "Agarose dissolvida no tampão de corrida, com o corante, e vertida no molde.",
      cena: { acao: "generica", entidades: ["gel", "tubo"], legenda: "A fundição do gel não tem animação própria; a cena mostra só os materiais envolvidos." },
      acontece: [
        R("A agarose é pesada e dissolvida no tampão de corrida sob aquecimento (em micro-ondas, agitando a cada 30 s, até dissolver por completo). O gel é vertido no molde com o pente e deixado solidificar à temperatura ambiente.", [LEE("§1 Preparation of the Gel")]),
        R("O brometo de etídio pode ser acrescentado ao gel a 0,5 µg/mL; como alternativa, o gel pode ser corado após a corrida em tampão com o corante por 15–30 min, seguido de descoloração por tempo igual.", [LEE("§1")]),
        R("A agarose deve esfriar (na bancada ou em banho a 65 °C) antes de ser vertida, senão a bandeja empena.", [LEE("§1")]),
      ],
      porque: [
        R("A separação por peneiramento molecular depende do tamanho dos poros formados pelos feixes de agarose: quanto maior a concentração de agarose, menores os poros.", [LEE("Discussão")]),
        R("Géis de agarose comuns separam melhor fragmentos entre 100 pb e 25 kb. Acima de 25 kb é preciso eletroforese de campo pulsado; abaixo de 100 pb, gel de poliacrilamida separa melhor.", [LEE("Discussão")]),
      ],
      materiais: [
        { nome: "Agarose e tampão de corrida (TAE ou TBE)", papel: "Formam a matriz do gel; o tampão do gel deve ser o mesmo da corrida.", refs: [LEE("§1"), LEE("§2")] },
        { nome: "Molde, bandeja e pente", papel: "Dão forma ao gel e criam os poços.", refs: [LEE("§1")] },
        { nome: "Corante de DNA", papel: "Permite ver as bandas; o brometo de etídio se intercala no DNA.", refs: [LEE("§1"), LEE("Discussão")] },
      ],
      controles: [],
      observar: [
        R("O brometo de etídio é suspeito de ser mutagênico e carcinogênico, é resíduo perigoso e exige luvas e descarte conforme as normas da instituição. Existem alternativas (SYBR Gold, SYBR Green, violeta cristal, azul de metileno), com sensibilidades e custos diferentes.", [LEE("§1, Nota"), LEE("Discussão")]),
      ],
      limitacoes: ["O módulo não recomenda concentração de agarose: ela depende dos tamanhos que você precisa separar."],
      parametros: [
        {
          id: "agarose",
          rotulo: "Concentração de agarose",
          descricao: "A faixa usual descrita na referência é 0,5% a 2%, escolhida pelo tamanho dos fragmentos.",
          padrao: "media",
          opcoes: [
            { valor: "baixa", rotulo: "Mais baixa (perto de 0,5%)", consequencias: [R("Poros maiores. A alta resistência do gel de agarose permite manipular géis de baixa porcentagem, usados para separar fragmentos grandes.", [LEE("Discussão")])] },
            { valor: "media", rotulo: "Intermediária (cerca de 1–1,5%)", consequencias: [R("No resultado representativo da referência, fragmentos de 765, 880 e 1022 pb foram separados em gel de 1,5%.", [LEE("§4 Representative Results")])] },
            { valor: "alta", rotulo: "Mais alta (perto de 2%)", consequencias: [R("Quanto maior a concentração, menores os poros — o que favorece a separação de fragmentos menores.", [LEE("Discussão")])] },
          ],
        },
      ],
    },
    {
      id: "aplicacao",
      titulo: "Aplicar as amostras e o marcador",
      resumo: "Corante de carregamento nas amostras; marcador sempre junto.",
      cena: {
        acao: "pipetar",
        entidades: ["dna", "gel"],
        origem: "dna",
        destino: "gel",
        legenda: "Ilustração da aplicação com micropipeta. Volumes não são representados.",
      },
      acontece: [
        R("Acrescenta-se corante de carregamento às amostras e aplicam-se as amostras nos poços, devagar. Um marcador de tamanho apropriado deve sempre ser aplicado junto com as amostras.", [LEE("§2")]),
      ],
      porque: [
        R("O corante de carregamento serve a três propósitos: dá densidade para a amostra afundar no poço, dá cor para facilitar a aplicação e migra a velocidades conhecidas, permitindo acompanhar o quanto a corrida avançou.", [LEE("Discussão")]),
      ],
      materiais: [
        { nome: "Corante de carregamento", papel: "Densidade, cor e acompanhamento da corrida.", refs: [LEE("§2"), LEE("Discussão")] },
        { nome: "Marcador (escada) de tamanho", papel: "Mistura de fragmentos de tamanhos conhecidos para comparar com as amostras.", refs: [LEE("§2"), LEE("Discussão")] },
      ],
      controles: [R("Sem marcador na mesma corrida não há como estimar o tamanho das bandas das amostras.", [LEE("§2"), LEE("Discussão")])],
      observar: [],
      limitacoes: [],
    },
    {
      id: "corrida",
      titulo: "Correr o gel",
      resumo: "Tampão cobrindo o gel, cátodo perto dos poços, 1–5 V/cm.",
      cena: {
        acao: "eletroforese",
        entidades: ["dna", "gel"],
        legenda: "Gel ilustrativo: as posições das bandas são desenhadas para ensinar, não são resultado de uma corrida.",
      },
      acontece: [
        R("O tampão de corrida deve cobrir a superfície do gel e ser o mesmo usado para prepará-lo. A fonte é programada entre 1 e 5 V/cm entre os eletrodos. A tampa é recolocada com o cátodo (cabos pretos) mais perto dos poços do que o ânodo (cabos vermelhos). O gel corre até o corante migrar a uma distância adequada.", [LEE("§2")]),
      ],
      porque: [
        R("O esqueleto de fosfato do DNA (e do RNA) tem carga negativa; num campo elétrico, os fragmentos migram para o ânodo, carregado positivamente. Como a razão massa/carga é uniforme, a separação é por tamanho e a distância percorrida é inversamente proporcional ao logaritmo do peso molecular.", [LEE("Resumo")]),
        R("A velocidade de migração depende de: tamanho do fragmento, concentração de agarose, conformação do DNA, voltagem aplicada, presença de brometo de etídio, tipo de agarose e tampão.", [LEE("Resumo")]),
      ],
      materiais: [{ nome: "Cuba e fonte de energia", papel: "Aplicam o campo elétrico; conferir os eletrodos nas entradas certas.", refs: [LEE("§2")] }],
      controles: [],
      observar: [
        R("Formas diferentes do mesmo DNA migram de modo diferente: plasmídeo superenrolado é o mais rápido, por ser compacto; depois o linear de mesmo tamanho; o circular aberto é o mais lento.", [LEE("Discussão")]),
        R("O brometo de etídio, por ter carga positiva, reduz a velocidade de migração do DNA em cerca de 15%.", [LEE("Discussão")]),
        X("O tempo exato de corrida para o seu gel não é previsto aqui: acompanhe a frente do corante."),
      ],
      limitacoes: ["O módulo não simula a corrida nem calcula tempo."],
    },
    {
      id: "leitura",
      titulo: "Ver as bandas e estimar tamanhos",
      resumo: "Luz UV e comparação com o marcador.",
      cena: {
        acao: "detectar",
        entidades: ["dna", "gel"],
        legenda: "Brilho ilustrativo. A presença e a intensidade das bandas não são previstas.",
      },
      acontece: [
        R("Terminada a corrida, o gel é retirado, o excesso de tampão é drenado e o gel é exposto à luz ultravioleta, em geral num sistema de fotodocumentação; com brometo de etídio, as bandas aparecem como faixas fluorescentes alaranjadas. O gel e o tampão são descartados conforme as normas da instituição.", [LEE("§3")]),
        R("Os tamanhos são determinados construindo um gráfico do logaritmo do peso molecular das bandas do marcador contra a distância percorrida por cada uma.", [LEE("Discussão")]),
      ],
      porque: [
        R("Sob luz ultravioleta, elétrons do anel aromático do brometo de etídio são excitados e liberam energia como luz ao voltar ao estado fundamental. Como ele se intercala no DNA de forma dependente da concentração, a intensidade da banda permite uma estimativa da quantidade de DNA.", [LEE("Discussão")]),
      ],
      materiais: [{ nome: "Transiluminador ou sistema de fotodocumentação", papel: "Expor o gel à luz e registrar a imagem.", refs: [LEE("§3")] }],
      controles: [],
      observar: [
        M("A posição desenhada pela calculadora supõe distância proporcional ao logaritmo do tamanho, dentro da faixa do marcador ilustrativo; é uma estimativa de onde a banda apareceria, não um resultado."),
        X("Se haverá banda, com que intensidade, e se aparecerão bandas extras, não pode ser previsto."),
      ],
      limitacoes: ["O módulo não mede bandas em imagens de gel nem quantifica DNA."],
      calculadora: "posicao_banda",
    },
  ],
  modelos: [
    {
      id: "posicao_banda",
      name: "Posição estimada da banda no gel",
      equation: "fração percorrida = 0,1 + 0,8 · [log₁₀(maior do marcador) − log₁₀(tamanho)] ÷ [log₁₀(maior) − log₁₀(menor)]",
      parameters: [
        { id: "bp", label: "Tamanho do fragmento", unit: "pb", range: "dentro da faixa do marcador ilustrativo (100–3000 pb)", source: "usuario" },
        { id: "ladder", label: "Marcador ilustrativo", range: "100 a 3000 pb (genérico, não é um produto comercial)", source: "fixo" },
      ],
      assumptions: [
        "Distância percorrida proporcional ao logaritmo do tamanho, dentro da faixa do marcador.",
        "Todos os fragmentos na mesma conformação (linear) e na mesma corrida.",
      ],
      validity: "Só dentro da faixa do marcador; fora dela a posição não é desenhada.",
      limitations: [
        "A escala de 0,1 a 0,9 do gel é uma convenção de desenho, não uma medida.",
        "Não considera concentração de agarose, voltagem, tampão nem conformação do DNA — todos citados pela referência como fatores da migração.",
      ],
      implementation: "src/lib/models/pcr.ts → bandPosition()",
      doesNotPredict: ["Presença da banda", "Intensidade", "Bandas inespecíficas", "Tempo de corrida"],
      refs: [LEE("Resumo"), LEE("Discussão")],
    },
  ],
  problemas: [
    { sintoma: "A bandeja do gel empenou", causas: [R("A agarose foi vertida quente demais; deixe esfriar na bancada ou em banho a 65 °C.", [LEE("§1")])] },
    { sintoma: "Fragmentos grandes não se separam", causas: [R("Géis comuns resolvem bem de 100 pb a 25 kb; acima disso é preciso campo pulsado.", [LEE("Discussão")])] },
    { sintoma: "Fragmentos muito pequenos não se separam", causas: [R("Abaixo de 100 pb, gel de poliacrilamida separa melhor.", [LEE("Discussão")])] },
    { sintoma: "Tamanho estimado não bate com o esperado", causas: [R("A conformação muda a migração: superenrolado, linear e circular aberto de mesmo tamanho correm a velocidades diferentes.", [LEE("Discussão")])] },
  ],
  limitacoes: [
    "Educativo: não analisa fotos de gel nem mede distâncias reais.",
    "O marcador usado nos desenhos é genérico e ilustrativo.",
  ],
  naoFaz: ["Prever presença ou intensidade de bandas", "Medir bandas em imagens", "Recomendar concentração de agarose ou voltagem"],
  autoria: AUTORIA,
};
