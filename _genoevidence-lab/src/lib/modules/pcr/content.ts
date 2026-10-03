import type { ModuleContract } from "../contract";

const L = (locator: string) => ({ id: "lorenz2012", locator });
const LEE = (locator: string) => ({ id: "lee2012", locator });

/**
 * Módulo A — Bancada educativa de PCR convencional (ponto final, análise em gel de agarose).
 *
 * Toda afirmação traz o fundamento:
 *   referencia   → descrita em fonte verificada (com seção)
 *   modelo       → calculada por um modelo identificado (lib/models/pcr.ts)
 *   ilustracao   → inferência qualitativa do mecanismo didático, não descrita explicitamente nas fontes analisadas
 *   imprevisivel → não pode ser prevista com as informações disponíveis
 *   sem_fonte    → prática comum, mas sem fonte cadastrada neste módulo (conferir)
 */
export const PCR_MODULE: ModuleContract = {
  id: "pcr",
  title: "Bancada educativa de PCR",
  technique: "PCR convencional (ponto final) com análise por eletroforese em gel de agarose",
  version: "0.1.0",
  status: "implementado",
  summary:
    "Percorra a montagem de uma reação de PCR, a ciclagem térmica e a análise em gel, alternando entre a bancada, a representação molecular e os resultados.",
  acceptedInputs: [
    "Parâmetros do programa de ciclagem (temperaturas, tempos, número de ciclos)",
    "Tamanho esperado do amplicon (pb) e tipo de polimerase",
    "Tm aparente dos primers (informado pelo pesquisador; não calculado aqui)",
    "Imagem de gel do projeto (opcional, exibida como dado do pesquisador)",
  ],
  requiredFields: ["Nenhum para o modo guiado", "Tm e tamanho do amplicon para os cálculos do modo exploratório"],
  sources: [L(""), LEE(""), { id: "saiki1988" }, { id: "chien1976" }, { id: "kwok1989" }, { id: "mullis1987" }],
  visualObjects: [
    "bancada-pre-pcr",
    "micropipetas",
    "ponteiras",
    "balde-gelo",
    "reagentes",
    "tubo-master-mix",
    "tubos-pcr",
    "microcentrifuga",
    "termociclador",
    "cuba-eletroforese",
    "fonte-eletroforese",
    "computador",
  ],
  interactions: [
    "Selecionar os reagentes na ordem de montagem descrita na referência",
    "Distribuir a reação e montar os controles (NTC e positivo)",
    "Posicionar tubos na microcentrífuga conferindo o balanceamento",
    "Abrir o termociclador, posicionar os tubos e iniciar o programa",
    "Definir a ordem das canaletas no gel (marcador, amostras, controles)",
  ],
  steps: [
    {
      id: "planejamento",
      order: 1,
      title: "Planejar a reação e os controles",
      short: "Defina alvo, primers e controles antes de pipetar.",
      benchObjects: ["computador", "bancada-pre-pcr"],
      molecularPhase: "inicio",
      whatHappens: [
        {
          text: "Antes de montar a reação, definem-se a região-alvo, o par de primers (um para cada fita) e quais controles serão incluídos.",
          basis: "referencia",
          refs: [L("§1 Designing Primers"), L("§2 Materials and Reagents")],
        },
      ],
      why: [
        {
          text: "Problemas comuns de desenho de primers incluem autoanelamento (estruturas em grampo), dímeros de primers e Tm muito diferentes entre os dois primers, o que dificulta escolher uma temperatura de anelamento única.",
          basis: "referencia",
          refs: [L("§1 Designing Primers")],
        },
        {
          text: "A referência recomenda verificar a especificidade dos primers (por exemplo, por BLAST) para evitar amplificar pseudogenes ou homólogos.",
          basis: "referencia",
          refs: [L("§1, Notas")],
        },
      ],
      materials: [{ objectId: "computador", role: "Registro do plano, desenho de primers em ferramentas externas e consulta às referências." }],
      controls: [
        {
          text: "Incluir um controle negativo e, se possível, um controle positivo.",
          basis: "referencia",
          refs: [L("§2 Materials and Reagents")],
        },
      ],
      observe: [
        {
          text: "A Tm calculada por qualquer ferramenta é uma estimativa; modelos de vizinhos mais próximos são preferíveis à regra simples baseada em contagem de bases.",
          basis: "referencia",
          refs: [L("§5 Calculating Melting Temperature")],
        },
      ],
      limitations: [
        "Este módulo não desenha nem avalia primers; a Tm deve ser informada a partir da ferramenta usada pelo pesquisador.",
      ],
    },
    {
      id: "preparo",
      order: 2,
      title: "Preparar a bancada pré-PCR e os reagentes",
      short: "Luvas, reagentes descongelados e mantidos no gelo.",
      benchObjects: ["bancada-pre-pcr", "balde-gelo", "reagentes", "placa-zona-pre"],
      molecularPhase: "inicio",
      whatHappens: [
        {
          text: "Os reagentes são dispostos em um balde de gelo recém-preparado, descongelados completamente e mantidos no gelo durante todo o preparo.",
          basis: "referencia",
          refs: [L("§2 Materials and Reagents")],
        },
        {
          text: "Uma placa de 96 poços apoiada no gelo pode servir de suporte para os tubos de 0,2 mL.",
          basis: "referencia",
          refs: [L("§4 Basic PCR Protocol")],
        },
      ],
      why: [
        {
          text: "Adicionar os reagentes em tubos frios ajuda a prevenir atividade de nucleases e anelamento inespecífico.",
          basis: "referencia",
          refs: [L("§4 Basic PCR Protocol")],
        },
        {
          text: "Usar luvas evita contaminar a mistura de reação ou os reagentes.",
          basis: "referencia",
          refs: [L("§2 Materials and Reagents")],
        },
        {
          text: "A alta sensibilidade da PCR torna a contaminação por DNA um risco importante; organização e protocolos rígidos ajudam a evitá-la.",
          basis: "referencia",
          refs: [{ id: "kwok1989", locator: "Resumo" }],
        },
      ],
      materials: [
        { objectId: "balde-gelo", role: "Mantém reagentes e tubos resfriados." },
        { objectId: "reagentes", role: "Componentes da reação, descongelados por completo antes do uso." },
      ],
      controls: [
        {
          text: "A separação física entre a área de preparo (pré-PCR) e a área de análise de produtos (pós-PCR) é uma prática comum para reduzir contaminação por produtos amplificados. O arranjo deste laboratório virtual ilustra essa separação.",
          basis: "sem_fonte",
          refs: [{ id: "kwok1989", locator: "Resumo (tema: contaminação)" }],
          note: "As fontes analisadas descrevem o risco de contaminação, mas o texto que detalha o arranjo das áreas não foi lido pelo sistema.",
        },
      ],
      observe: [
        {
          text: "Verifique se todos os reagentes estão totalmente descongelados e identificados antes de iniciar.",
          basis: "referencia",
          refs: [L("§2 Materials and Reagents")],
        },
      ],
      limitations: ["Não há simulação de temperatura dos reagentes; o gelo é representado apenas visualmente."],
    },
    {
      id: "master_mix",
      order: 3,
      title: "Montar o master mix",
      short: "Reagentes comuns em uma única mistura, na ordem indicada.",
      benchObjects: ["reagentes", "micropipetas", "ponteiras", "tubo-master-mix", "rack-microtubos"],
      molecularPhase: "inicio",
      whatHappens: [
        {
          text: "A referência descreve a ordem de pipetagem: água estéril, tampão 10X, dNTPs, MgCl₂, primers e DNA molde.",
          basis: "referencia",
          refs: [L("§4 Basic PCR Protocol"), L("Tabela 1")],
        },
        {
          text: "Quando há várias reações, os reagentes comuns são reunidos em um master mix em tubo de 1,8 mL, calculado para o número de reações mais cerca de 10% de excedente.",
          basis: "referencia",
          refs: [L("§4, Notas")],
        },
      ],
      why: [
        {
          text: "O master mix reduz o número de pipetagens e garante que todas as reações recebam a mesma mistura de base.",
          basis: "referencia",
          refs: [L("§4, Notas")],
        },
        {
          text: "A DNA polimerase costuma ser armazenada em glicerol 50% e precisa de homogeneização suave (pipetar para cima e para baixo cerca de 20 vezes, com a pipeta ajustada a cerca de metade do volume, evitando bolhas).",
          basis: "referencia",
          refs: [L("§4 Basic PCR Protocol")],
        },
      ],
      materials: [
        { objectId: "micropipetas", role: "Transferência de volumes; a referência ilustra P-10, P-20, P-200 e P-1000." },
        { objectId: "ponteiras", role: "Descartáveis; troca entre reagentes evita contaminação cruzada." },
        { objectId: "tubo-master-mix", role: "Recebe os reagentes comuns a todas as reações." },
        { objectId: "reagentes", role: "Cada componente tem uma função (ver painel de cada tubo)." },
      ],
      controls: [
        {
          text: "Reagentes que serão titulados ou variam entre reações devem ficar fora do master mix.",
          basis: "referencia",
          refs: [L("Tabela 1, nota **")],
        },
      ],
      observe: [
        {
          text: "Composição típica de 50 µL na referência: tampão 1X; dNTPs 200 µM; MgCl₂ 1,5 mM; 20 pmol de cada primer; 2,5 U de Taq. As unidades podem variar entre fabricantes.",
          basis: "referencia",
          refs: [L("Tabela 1")],
        },
        {
          text: "Divergência na própria fonte: o texto (§8) cita 50 µM de cada dNTP como concentração usual, enquanto a Tabela 1 usa 200 µM. O sistema preserva as duas informações e não escolhe uma delas.",
          basis: "referencia",
          refs: [L("§8 Manipulating PCR Reagents"), L("Tabela 1")],
        },
      ],
      limitations: [
        "Os volumes dependem das concentrações dos estoques do laboratório; o módulo não calcula volumes de pipetagem.",
        "A técnica de pipetagem (paradas do êmbolo, ângulo) não é ensinada aqui por falta de fonte cadastrada.",
      ],
    },
    {
      id: "controles",
      order: 4,
      title: "Distribuir as reações e montar os controles",
      short: "Amostras, controle negativo (sem molde) e controle positivo.",
      benchObjects: ["tubos-pcr", "rack-pcr", "micropipetas"],
      molecularPhase: "inicio",
      whatHappens: [
        {
          text: "Cada tubo recebe uma alíquota do master mix e, em seguida, o DNA molde e reagentes específicos da reação.",
          basis: "referencia",
          refs: [L("§4, Notas")],
        },
        {
          text: "O controle negativo recebe todos os reagentes exceto o DNA molde, com água para completar o volume.",
          basis: "referencia",
          refs: [L("§4 Basic PCR Protocol")],
        },
        {
          text: "O controle positivo usa molde e/ou primers que já amplificaram nas mesmas condições.",
          basis: "referencia",
          refs: [L("§4 Basic PCR Protocol")],
        },
      ],
      why: [
        {
          text: "Falsos positivos podem resultar de contaminação por produtos de outra PCR; o controle negativo ajuda a reconhecê-los.",
          basis: "referencia",
          refs: [L("§4, Notas")],
        },
      ],
      materials: [
        { objectId: "tubos-pcr", role: "Tubos de 0,2 mL de parede fina, compatíveis com a maioria dos termocicladores." },
        { objectId: "rack-pcr", role: "Suporte para os tubos durante a distribuição." },
      ],
      controls: [
        {
          text: "Controle negativo (sem molde): espera-se ausência do produto. Controle positivo: espera-se o produto se reagentes e ciclagem funcionarem.",
          basis: "referencia",
          refs: [L("§4"), L("§13 Representative Results (canaleta 12)")],
        },
      ],
      observe: [
        {
          text: "Alguns termocicladores exigem tubos de 0,5 mL; conferir o manual do equipamento.",
          basis: "referencia",
          refs: [L("§4, Notas")],
        },
      ],
      limitations: ["O número de réplicas e de amostras é definido pelo pesquisador; o módulo não sugere desenho experimental."],
    },
    {
      id: "centrifugacao",
      order: 5,
      title: "Fechar e centrifugar brevemente",
      short: "Reunir o líquido no fundo dos tubos; rotor balanceado.",
      benchObjects: ["microcentrifuga", "tubos-pcr"],
      molecularPhase: "inicio",
      whatHappens: [
        {
          text: "Uma centrifugação rápida reúne no fundo do tubo gotas que ficaram na parede ou na tampa.",
          basis: "sem_fonte",
          refs: [],
          note: "Prática comum não descrita nas fontes analisadas. Confira o protocolo do seu laboratório.",
        },
      ],
      why: [
        {
          text: "Os tubos devem ser distribuídos de forma balanceada no rotor (posições opostas com massas equivalentes).",
          basis: "sem_fonte",
          refs: [],
          note: "Orientação geral de segurança; confira o manual do fabricante da centrífuga.",
        },
      ],
      materials: [{ objectId: "microcentrifuga", role: "Centrifugação breve de microtubos ou tiras." }],
      controls: [],
      observe: [
        {
          text: "O balanceamento verificado aqui é geométrico (posições opostas ocupadas). Massa e volume reais não são simulados.",
          basis: "ilustracao",
          refs: [],
        },
      ],
      limitations: ["Etapa sem fonte cadastrada no módulo. Mantida porque é recorrente na prática, mas sinalizada para conferência."],
    },
    {
      id: "termociclador",
      order: 6,
      title: "Programar e iniciar o termociclador",
      short: "Desnaturação inicial, 25–35 ciclos de três etapas, extensão final.",
      benchObjects: ["termociclador", "tubos-pcr"],
      molecularPhase: "desnaturacao",
      resultOutput: "perfil_termico",
      whatHappens: [
        {
          text: "O termociclador aquece e resfria a mistura rapidamente, alternando desnaturação, anelamento dos primers e extensão.",
          basis: "referencia",
          refs: [L("§6 Setting Up Thermal Cycling Conditions")],
        },
        {
          text: "Programa padrão de 3 etapas na referência: desnaturação inicial de 94–98 °C por 1 min; 25–35 ciclos com desnaturação a 94 °C por 10–60 s, anelamento por 30 s a cerca de 5 °C abaixo da Tm e extensão de 70–80 °C (para Taq); extensão final de 5 min; manutenção a 4 °C.",
          basis: "referencia",
          refs: [L("Tabela 2"), L("§6")],
        },
      ],
      why: [
        {
          text: "Desnaturação inicial por mais de 3 minutos pode inativar a DNA polimerase (exceto em estratégias de hot start, em que a enzima é adicionada ou ativada depois).",
          basis: "referencia",
          refs: [L("§6"), L("§12 Hot start")],
        },
        {
          text: "Para Taq, a referência indica cerca de 1 min para os primeiros 2 kb e 1 min adicional por kb; para Pfu, cerca de 2 min por kb. Confira sempre a recomendação do fabricante da sua enzima.",
          basis: "referencia",
          refs: [L("§6")],
        },
        {
          text: "A extensão final permite completar amplicons inacabados e, no caso da Taq, adicionar um resíduo de adenina às extremidades 3'.",
          basis: "referencia",
          refs: [L("§6")],
        },
      ],
      materials: [
        { objectId: "termociclador", role: "Executa o programa de temperaturas; tampa aquecida fechada antes de iniciar." },
        { objectId: "tubos-pcr", role: "Posicionados no bloco do termociclador, tampados." },
      ],
      controls: [
        { text: "Controles negativo e positivo seguem exatamente o mesmo programa das amostras.", basis: "referencia", refs: [L("§4")] },
      ],
      observe: [
        {
          text: "Mais de 35 ciclos aumenta a quantidade de produto, mas frequentemente enriquece produtos secundários indesejados.",
          basis: "referencia",
          refs: [L("§6")],
        },
      ],
      limitations: [
        "Rampas de temperatura (velocidade de aquecimento e resfriamento do equipamento) não são modeladas; o perfil térmico mostra apenas os patamares programados.",
      ],
    },
    {
      id: "ciclo_molecular",
      order: 7,
      title: "O que acontece em cada ciclo",
      short: "Desnaturação, anelamento e extensão, na escala molecular.",
      benchObjects: ["termociclador"],
      molecularPhase: "extensao",
      resultOutput: "modelo_idealizado",
      whatHappens: [
        {
          text: "1) Desnaturação: as fitas do molde (e, nos ciclos seguintes, dos amplicons) se separam. 2) Anelamento: os primers pareiam com sequências complementares. 3) Extensão: a DNA polimerase sintetiza a nova fita a partir do primer.",
          basis: "referencia",
          refs: [L("§6"), L("legenda da figura sobre ciclagem de 3 etapas, painel c")],
        },
        {
          text: "A animação é uma ilustração didática: escala, velocidade, forma das moléculas e número de moléculas não correspondem a valores reais.",
          basis: "ilustracao",
          refs: [],
        },
      ],
      why: [
        {
          text: "A DNA polimerase termoestável de Thermus aquaticus permitiu realizar a reação em temperaturas mais altas, melhorando especificidade e rendimento em relação ao procedimento anterior.",
          basis: "referencia",
          refs: [{ id: "saiki1988", locator: "Resumo" }],
        },
        {
          text: "A polimerase de T. aquaticus foi descrita com temperatura ótima de 80 °C, requerendo um cátion divalente (Mg²⁺ ou, em menor grau, Mn²⁺) e os quatro desoxirribonucleotídeos para atividade máxima.",
          basis: "referencia",
          refs: [{ id: "chien1976", locator: "Resumo" }],
        },
        {
          text: "Em um modelo idealizado com eficiência de 100%, moléculas de fita dupla com exatamente o tamanho do alvo surgem a partir do 3º ciclo (2ⁿ − 2n por molécula-molde).",
          basis: "modelo",
          refs: [],
          note: "Ver cartão do modelo 'contagem idealizada de fitas'.",
        },
      ],
      materials: [
        { objectId: "reagentes", role: "dNTPs são os substratos; Mg²⁺ é cofator da polimerase; primers definem as extremidades do produto." },
      ],
      controls: [],
      observe: [
        {
          text: "O Mg²⁺ não é consumido na reação, mas a reação não ocorre sem ele.",
          basis: "referencia",
          refs: [L("§8 Magnesium salt")],
        },
      ],
      limitations: [
        "A ilustração não representa cinética, fidelidade, estrutura tridimensional da polimerase nem competição entre produtos.",
        "Uma animação não comprova um mecanismo.",
      ],
    },
    {
      id: "eletroforese",
      order: 8,
      title: "Analisar por eletroforese em gel de agarose",
      short: "Gel, tampão, corante de carregamento, marcador e polaridade.",
      benchObjects: ["cuba-eletroforese", "fonte-eletroforese", "micropipeta-pos", "placa-zona-pos"],
      molecularPhase: "produtos",
      resultOutput: "gel_esperado",
      whatHappens: [
        {
          text: "Alíquotas das reações recebem corante de carregamento e são aplicadas nos poços do gel; um marcador de tamanho de DNA deve sempre ser aplicado junto.",
          basis: "referencia",
          refs: [LEE("§2")],
        },
        {
          text: "O DNA tem carga negativa e migra em direção ao ânodo (positivo). O cátodo (cabo preto) fica mais próximo dos poços do que o ânodo (cabo vermelho).",
          basis: "referencia",
          refs: [LEE("Resumo"), LEE("§2")],
        },
      ],
      why: [
        {
          text: "A concentração de agarose (geralmente 0,5–2%) depende do tamanho dos fragmentos; quanto maior a concentração, menores os poros.",
          basis: "referencia",
          refs: [LEE("§1"), LEE("Discussão")],
        },
        {
          text: "O corante de carregamento adiciona densidade (a amostra afunda no poço), dá cor para facilitar a aplicação e permite acompanhar a migração.",
          basis: "referencia",
          refs: [LEE("Discussão")],
        },
        {
          text: "O tampão de corrida deve ser o mesmo usado para preparar o gel (TAE ou TBE são os mais comuns). A fonte é programada em 1–5 V/cm entre os eletrodos.",
          basis: "referencia",
          refs: [LEE("§1"), LEE("§2")],
        },
      ],
      materials: [
        { objectId: "cuba-eletroforese", role: "Contém o gel imerso em tampão, com eletrodos nas extremidades." },
        { objectId: "fonte-eletroforese", role: "Aplica a diferença de potencial; conectar cabos às polaridades corretas." },
        { objectId: "micropipeta-pos", role: "Pipeta dedicada à área pós-PCR." },
      ],
      controls: [
        {
          text: "O marcador de tamanho permite estimar o tamanho das bandas das amostras.",
          basis: "referencia",
          refs: [LEE("§2"), LEE("Discussão")],
        },
      ],
      observe: [
        {
          text: "A visualização exige um corante de DNA e iluminação adequada (por exemplo, brometo de etídio sob luz UV em um sistema de fotodocumentação). O brometo de etídio é suspeito de ser carcinogênico: use luvas e descarte conforme as normas da instituição.",
          basis: "referencia",
          refs: [LEE("§1, Nota"), LEE("§3"), LEE("Discussão")],
        },
        {
          text: "O sistema de fotodocumentação não está representado nesta versão do laboratório virtual.",
          basis: "ilustracao",
          refs: [],
        },
      ],
      limitations: ["Tempo e voltagem de corrida não são simulados."],
    },
    {
      id: "interpretacao",
      order: 9,
      title: "Interpretar e registrar",
      short: "Comparar com o marcador e conferir os controles.",
      benchObjects: ["computador"],
      molecularPhase: "produtos",
      resultOutput: "gel_esperado",
      whatHappens: [
        {
          text: "O tamanho de uma banda é estimado comparando sua migração à do marcador: a distância percorrida é inversamente proporcional ao logaritmo do tamanho, dentro da faixa de resolução do gel.",
          basis: "referencia",
          refs: [LEE("Resumo"), LEE("Discussão")],
        },
      ],
      why: [
        {
          text: "Dímeros de primers aparecem como bandas pequenas (< 100 pb) perto da base da canaleta; produtos inespecíficos aparecem como bandas de tamanhos diferentes do esperado ou como arraste.",
          basis: "referencia",
          refs: [L("§7 Troubleshooting")],
        },
        {
          text: "Ausência de produto pode indicar condições estringentes demais ou falta de algum reagente; a referência sugere primeiro confirmar que todos os reagentes foram adicionados e não estavam contaminados.",
          basis: "referencia",
          refs: [L("§7 Troubleshooting")],
        },
      ],
      materials: [{ objectId: "computador", role: "Registro do resultado e associação com o projeto." }],
      controls: [
        {
          text: "Banda no controle negativo sugere contaminação, que precisa ser investigada antes de interpretar as amostras.",
          basis: "referencia",
          refs: [L("§4, Notas")],
        },
      ],
      observe: [
        {
          text: "A intensidade da banda depende do corante; com brometo de etídio, a intensidade permite apenas uma estimativa da quantidade de DNA.",
          basis: "referencia",
          refs: [LEE("Discussão")],
        },
        {
          text: "A PCR convencional de ponto final, analisada em gel, não fornece quantificação do molde inicial. Para isso existem métodos como qPCR, que não está implementado nesta versão.",
          basis: "referencia",
          refs: [{ id: "livak2001", locator: "Resumo (contexto de quantificação em qPCR)" }],
        },
      ],
      limitations: [
        "O padrão de gel exibido na escala de resultados é uma ilustração da posição ESPERADA, não um resultado.",
        "Resultados reais só aparecem quando o pesquisador envia a imagem do gel ao projeto.",
      ],
    },
  ],
  parameters: [
    {
      id: "anelamento",
      label: "Temperatura de anelamento (em relação à Tm aparente dos primers)",
      stepId: "termociclador",
      description: "A referência recomenda partir de cerca de 5 °C abaixo da Tm aparente.",
      defaultValue: "tm_menos_5",
      options: [
        {
          value: "muito_abaixo",
          label: "Bem abaixo da Tm (≈ 10 °C ou mais)",
          consequences: [
            {
              text: "Estringência reduzida: maior chance de produtos inespecíficos de tamanhos variados (padrão em escada ou arraste no gel).",
              basis: "referencia",
              refs: [L("§7 Troubleshooting")],
            },
            {
              text: "No exemplo da referência, reduzir o anelamento de 61 °C para 58 °C foi combinado com mais ciclos (35) e extensão mais longa, resultando em arraste. O efeito isolado do anelamento não foi separado no experimento.",
              basis: "referencia",
              refs: [L("§13 Representative Results")],
            },
            {
              text: "A quantidade e o tamanho exatos de produtos inespecíficos na sua reação não podem ser previstos.",
              basis: "imprevisivel",
              refs: [],
            },
          ],
        },
        {
          value: "tm_menos_5",
          label: "Cerca de 5 °C abaixo da Tm (ponto de partida da referência)",
          consequences: [
            {
              text: "Condição de partida descrita na referência, com anelamento de 30 s.",
              basis: "referencia",
              refs: [L("§6"), L("Tabela 2")],
            },
            {
              text: "A Tm é uma estimativa; pode ser necessário otimizar (por exemplo, por touchdown PCR).",
              basis: "referencia",
              refs: [L("§5"), L("§12 Touchdown PCR")],
            },
          ],
        },
        {
          value: "acima_tm",
          label: "Acima da Tm",
          consequences: [
            {
              text: "Condições estringentes demais podem resultar em ausência de produto.",
              basis: "referencia",
              refs: [L("§7 Troubleshooting")],
            },
            {
              text: "Com os primers pareando menos ao molde, espera-se menos iniciação da síntese.",
              basis: "ilustracao",
              refs: [],
            },
          ],
        },
      ],
    },
    {
      id: "magnesio",
      label: "Concentração de Mg²⁺",
      stepId: "master_mix",
      description: "Faixa citada na referência: 0,5 a 5,0 mM na reação final.",
      defaultValue: "padrao",
      options: [
        {
          value: "ausente",
          label: "Ausente ou insuficiente",
          consequences: [
            {
              text: "Sem Mg²⁺ suficiente a reação não procede e não há produto.",
              basis: "referencia",
              refs: [L("§8 Magnesium salt"), L("§13 Representative Results")],
            },
          ],
        },
        {
          value: "padrao",
          label: "Concentração do tampão padrão (ex.: 1,5 mM)",
          consequences: [
            {
              text: "Muitos tampões 10X fornecem MgCl₂ suficiente para uma reação típica (1,5 mM final).",
              basis: "referencia",
              refs: [L("§8 Magnesium salt")],
            },
            {
              text: "No exemplo da referência, o ótimo (4,0 mM) ficou acima do recomendado pelo fabricante (1,5 mM). O valor ótimo para a sua reação não pode ser previsto; ele é determinado por titulação.",
              basis: "imprevisivel",
              refs: [L("§13 Representative Results")],
            },
          ],
        },
        {
          value: "alto",
          label: "Alta (próxima do limite superior)",
          consequences: [
            {
              text: "O rendimento tende a aumentar, mas especificidade e fidelidade da polimerase diminuem.",
              basis: "referencia",
              refs: [L("§8 Magnesium salt")],
            },
            {
              text: "Excesso de Mg²⁺ pode dificultar a desnaturação completa e estabilizar anelamentos incorretos.",
              basis: "referencia",
              refs: [L("§8 Magnesium salt")],
            },
          ],
        },
      ],
    },
    {
      id: "ciclos",
      label: "Número de ciclos",
      stepId: "termociclador",
      description: "Faixa usual na referência: 25 a 35 ciclos.",
      defaultValue: "30",
      options: [
        {
          value: "25",
          label: "25 ciclos",
          consequences: [
            { text: "Dentro da faixa usual descrita.", basis: "referencia", refs: [L("§6")] },
            {
              text: "O modelo idealizado calcula o número máximo teórico de cópias (ver resultados), que não é uma previsão de rendimento.",
              basis: "modelo",
              refs: [],
            },
          ],
        },
        {
          value: "30",
          label: "30 ciclos",
          consequences: [
            { text: "Dentro da faixa usual descrita.", basis: "referencia", refs: [L("§6")] },
            { text: "O modelo idealizado calcula o máximo teórico de cópias.", basis: "modelo", refs: [] },
          ],
        },
        {
          value: "35",
          label: "35 ciclos",
          consequences: [
            { text: "Limite superior da faixa usual descrita.", basis: "referencia", refs: [L("§6")] },
            { text: "O modelo idealizado calcula o máximo teórico de cópias.", basis: "modelo", refs: [] },
          ],
        },
        {
          value: "40",
          label: "40 ciclos",
          consequences: [
            {
              text: "Acima de 35 ciclos há mais produto, mas frequentemente enriquecimento de produtos secundários indesejados.",
              basis: "referencia",
              refs: [L("§6")],
            },
            {
              text: "O modelo exponencial idealizado deixa de ser informativo neste regime, pois ignora o esgotamento de reagentes.",
              basis: "modelo",
              refs: [],
            },
          ],
        },
      ],
    },
    {
      id: "omissao",
      label: "Componente omitido (teste de controle)",
      stepId: "controles",
      description: "Explore o que se espera quando um componente essencial falta.",
      defaultValue: "nenhum",
      options: [
        {
          value: "nenhum",
          label: "Nenhum (reação completa)",
          consequences: [
            {
              text: "Reação completa: o resultado depende das condições e não pode ser previsto sem dados experimentais.",
              basis: "imprevisivel",
              refs: [],
            },
          ],
        },
        {
          value: "molde",
          label: "DNA molde (controle negativo)",
          consequences: [
            { text: "Espera-se ausência do produto. Uma banda indica contaminação.", basis: "referencia", refs: [L("§4, Notas"), L("§13 (canaleta 12)")] },
          ],
        },
        {
          value: "polimerase",
          label: "DNA polimerase",
          consequences: [
            {
              text: "Sem a enzima não há síntese de novas fitas, portanto não há produto.",
              basis: "ilustracao",
              refs: [],
              note: "Inferência do mecanismo; não descrita como experimento nas fontes analisadas.",
            },
            {
              text: "A referência sugere, diante de falhas, confirmar primeiro se todos os reagentes foram adicionados.",
              basis: "referencia",
              refs: [L("§7 Troubleshooting")],
            },
          ],
        },
        {
          value: "primers",
          label: "Primers",
          consequences: [
            {
              text: "Sem primers não há iniciação específica da síntese no alvo; não se espera o produto.",
              basis: "ilustracao",
              refs: [],
              note: "Inferência do mecanismo; não descrita como experimento nas fontes analisadas.",
            },
          ],
        },
        {
          value: "magnesio",
          label: "MgCl₂ (Mg²⁺)",
          consequences: [{ text: "Sem Mg²⁺ a reação não procede.", basis: "referencia", refs: [L("§8 Magnesium salt")] }],
        },
        {
          value: "dntps",
          label: "dNTPs",
          consequences: [
            {
              text: "Sem desoxirribonucleotídeos não há substrato para a síntese.",
              basis: "ilustracao",
              refs: [{ id: "chien1976", locator: "Resumo (atividade máxima requer os quatro dNTPs)" }],
            },
          ],
        },
      ],
    },
  ],
  models: [
    {
      id: "exponencial_idealizado",
      name: "Modelo exponencial idealizado de cópias do alvo",
      equation: "N(n) = N₀ · (1 + E)ⁿ",
      parameters: [
        { id: "N0", label: "Moléculas-molde iniciais com o alvo (N₀)", range: "≥ 1", source: "usuario" },
        { id: "E", label: "Eficiência por ciclo (E)", range: "0 a 1 (1 = duplicação perfeita)", source: "usuario" },
        { id: "n", label: "Número de ciclos (n)", range: "1 a 45", source: "usuario" },
      ],
      assumptions: [
        "Eficiência constante em todos os ciclos.",
        "Reagentes não limitantes e ausência de inibidores.",
        "Nenhum produto inespecífico compete pelo uso dos reagentes.",
      ],
      validity: "Somente para os ciclos iniciais, em que os pressupostos podem ser aproximadamente válidos.",
      limitations: [
        "Não inclui esgotamento de reagentes; reações reais não crescem indefinidamente.",
        "Não prevê rendimento em massa, intensidade de banda nem sucesso da reação.",
        "E não é estimada pelo sistema: é um parâmetro escolhido pelo usuário.",
      ],
      implementation: "src/lib/models/pcr.ts → idealizedCopies()",
      doesNotPredict: ["Rendimento real", "Presença ou ausência de banda", "Especificidade", "Fase de platô"],
    },
    {
      id: "contagem_fitas",
      name: "Contagem idealizada de fitas por tipo (eficiência 100%)",
      equation: "fitas originais = 2; fitas longas = 2n; duplexes de tamanho exato = 2ⁿ − 2n (por molécula-molde de fita dupla)",
      parameters: [{ id: "n", label: "Ciclo (n)", range: "0 a 45", source: "usuario" }],
      assumptions: [
        "Cada fita existente serve de molde uma vez por ciclo.",
        "Os primers sempre anelam e a extensão sempre atinge o fim do molde ou do primer oposto.",
      ],
      validity: "Ilustra por que produtos de tamanho exato predominam após poucos ciclos; vale apenas sob os pressupostos acima.",
      limitations: ["Contagem combinatória; não representa cinética nem eficiência real."],
      implementation: "src/lib/models/pcr.ts → strandCounts()",
      doesNotPredict: ["Quantidades reais de produto"],
    },
    {
      id: "perfil_termico",
      name: "Perfil térmico do programa",
      equation: "tempo total = Σ (tempo de cada patamar × repetições); rampas excluídas",
      parameters: [
        { id: "programa", label: "Temperaturas e tempos de cada etapa", range: "Definidos pelo usuário", source: "usuario" },
      ],
      assumptions: ["Transições instantâneas entre temperaturas."],
      validity: "Aritmética do programa informado; não é medição do equipamento.",
      limitations: ["As rampas reais do equipamento aumentam o tempo total e não são incluídas."],
      implementation: "src/lib/models/pcr.ts → thermalProfile()",
      doesNotPredict: ["Temperatura real da amostra"],
    },
    {
      id: "posicao_banda",
      name: "Posição esperada de banda (relação semi-logarítmica)",
      equation: "distância ∝ −log₁₀(tamanho), interpolada entre bandas vizinhas do marcador",
      parameters: [
        { id: "tamanho", label: "Tamanho esperado do amplicon (pb)", range: "dentro da faixa do marcador", source: "usuario" },
        { id: "marcador", label: "Marcador ilustrativo (bandas de 100 a 3000 pb)", range: "fixo", source: "fixo" },
      ],
      assumptions: ["Relação linear entre distância e log do tamanho dentro da faixa de resolução (Lee et al., 2012)."],
      validity: "Ilustração da posição relativa; o marcador desenhado é genérico, não um produto comercial específico.",
      limitations: [
        "Não prevê presença, intensidade ou nitidez da banda.",
        "Conformação do DNA, concentração de agarose, corante e voltagem alteram a migração (Lee et al., 2012) e não são modelados.",
      ],
      implementation: "src/lib/models/pcr.ts → bandPosition()",
      doesNotPredict: ["Resultado do gel"],
    },
  ],
  outputs: [
    { id: "perfil_termico", label: "Perfil térmico do programa", kind: "simulacao", requires: "Programa de ciclagem" },
    { id: "modelo_idealizado", label: "Cópias teóricas (modelo idealizado)", kind: "simulacao", requires: "N₀, E e número de ciclos" },
    { id: "gel_esperado", label: "Posição esperada da banda (ilustração)", kind: "ilustracao", requires: "Tamanho do amplicon" },
    { id: "gel_projeto", label: "Imagem de gel enviada ao projeto", kind: "dados", requires: "Arquivo de imagem no projeto" },
  ],
  limitations: [
    "Não há previsão quantitativa de rendimento.",
    "Não há simulação de especificidade de primers, estruturas secundárias ou conteúdo GC.",
    "qPCR, RT-PCR, multiplex e outras variações não estão implementadas.",
    "A centrifugação breve e o balanceamento do rotor não têm fonte cadastrada no módulo.",
  ],
  authorship:
    "Texto didático redigido com assistência de IA (Claude) em 02/10/2026 a partir das seções indicadas das fontes verificadas no PubMed/PMC. Revisão por especialista humano: pendente.",
};
