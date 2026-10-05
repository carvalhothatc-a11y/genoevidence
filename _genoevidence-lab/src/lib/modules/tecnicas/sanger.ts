import { AUTORIA, R, S, X, ref, type TecnicaConteudo } from "./tipos";

const SAN = ref("sanger1977", "Resumo");
const RAN = (l: string) => ref("ran2013", l);
const LEE = (l: string) => ref("lee2012", l);

export const SANGER: TecnicaConteudo = {
  id: "sequenciamento",
  titulo: "Sequenciamento de Sanger",
  tecnica: "Leitura da sequência de bases pelo método dos terminadores de cadeia (didesoxi)",
  versao: "0.1.0",
  status: "parcial",
  resumo:
    "O princípio do método didesoxi e o caminho prático mais comum hoje: amplificar a região, subclonar quando necessário e conferir a leitura contra a sequência esperada.",
  fontes: [SAN, RAN(""), LEE("")],
  etapas: [
    {
      id: "principio",
      titulo: "O princípio: terminadores de cadeia",
      resumo: "Análogos didesoxi interrompem a síntese da nova fita.",
      cena: { acao: "sequenciar", entidades: ["dna"], legenda: "Sequência ilustrativa: não é a do seu material." },
      acontece: [
        R("O método usa os análogos 2′,3′-didesoxi e arabinonucleosídeo dos desoxinucleosídeos trifosfato normais, que agem como inibidores terminadores de cadeia específicos da DNA polimerase.", [SAN]),
      ],
      porque: [
        R("Quando o trabalho foi publicado, a técnica foi aplicada ao DNA do bacteriófago φX174 e se mostrou mais rápida e mais exata que os métodos anteriores (“mais e menos”).", [SAN]),
      ],
      materiais: [
        { nome: "DNA molde", papel: "A região cuja sequência será lida.", refs: [SAN] },
        { nome: "DNA polimerase e nucleotídeos, com os terminadores", papel: "Sintetizam fitas que param em posições diferentes.", refs: [SAN] },
      ],
      controles: [],
      observar: [
        S("Os equipamentos atuais usam terminadores marcados com fluorescência e separação por capilar, que não estão descritos no artigo original de 1977.", "Diferença conhecida entre o método original e a prática atual; sem fonte cadastrada neste módulo para os equipamentos modernos."),
      ],
      limitacoes: ["O módulo não simula cromatogramas nem a leitura de bases."],
    },
    {
      id: "preparo",
      titulo: "Preparar a região a sequenciar",
      resumo: "Amplificar por PCR e conferir que há um produto único.",
      cena: {
        acao: "amplificar",
        entidades: ["dna", "primer", "polimerase"],
        legenda: "Duplicação ilustrativa da região. Quantidades não são calculadas.",
      },
      acontece: [
        R("A região de interesse é amplificada a partir do DNA genômico; roda-se parte do produto em gel de agarose para conferir uma banda única antes de seguir. Primers podem precisar de ajuste na concentração de molde, de MgCl₂ ou na temperatura de anelamento.", [RAN("Procedure — Step 100")]),
        R("O produto é purificado em coluna antes das etapas seguintes.", [RAN("Procedure — Step 101")]),
      ],
      porque: [R("Um produto único evita misturar sequências diferentes na mesma leitura.", [RAN("Experimental design — Functional testing")])],
      materiais: [
        { nome: "Primers da região", papel: "Delimitam o trecho amplificado.", refs: [RAN("Experimental design — Functional testing")] },
        { nome: "Gel de agarose", papel: "Conferir que há um só produto, do tamanho esperado.", refs: [RAN("Procedure — Step 100"), LEE("§4 Representative Results")] },
      ],
      controles: [R("Incluir uma amostra não tratada (ou não transfectada) como controle negativo na amplificação.", [RAN("Procedure — Step 98")])],
      observar: [X("Se a amplificação dará banda única não pode ser previsto; confira no gel.")],
      limitacoes: ["Condições de PCR não são fornecidas pelo módulo; veja o módulo de PCR."],
    },
    {
      id: "subclonagem",
      titulo: "Subclonar quando a amostra tem mais de uma sequência",
      resumo: "Cada colônia carrega uma única versão da região.",
      cena: {
        acao: "selecionar",
        entidades: ["plasmideo", "bacteria", "placa"],
        legenda: "Colônias ilustrativas: cada uma vem de uma célula. O número de colônias não é previsto.",
      },
      acontece: [
        R("O amplicon pode ser clonado num plasmídeo (por exemplo, pUC19) e um conjunto de colônias é preparado para sequenciamento, revelando o genótipo de cada clone. Sítios de restrição apropriados podem ser acrescentados aos primers — por exemplo, EcoRI no direto e HindIII no reverso.", [RAN("Procedure — Sanger sequencing (Steps 109–117)")]),
        R("O DNA plasmidial é isolado com kit de miniprep e cada colônia é sequenciada a partir de um primer do vetor; o resultado é comparado com a sequência esperada.", [RAN("Procedure — Step 116"), RAN("Procedure — Step 117")]),
      ],
      porque: [
        R("Numa amostra com mais de uma versão da região, a leitura direta mistura as sequências; cada colônia isola uma versão.", [RAN("Experimental design — Detection of indels or HDR by sequencing")]),
      ],
      materiais: [
        { nome: "Vetor de clonagem (ex.: pUC19)", papel: "Carrega uma cópia do amplicon por colônia.", refs: [RAN("Procedure — Sanger sequencing (Steps 109–117)")] },
        { nome: "Primer do vetor", papel: "Ponto de partida da leitura.", refs: [RAN("Procedure — Step 117")] },
      ],
      controles: [],
      observar: [
        R("Quando se quer estimar a proporção de clones com determinada alteração, a referência recomenda analisar mais de 24 clones para uma aproximação razoável.", [RAN("Procedure — Step 117")]),
      ],
      limitacoes: ["Este módulo não calcula proporções entre clones."],
    },
    {
      id: "leitura",
      titulo: "Conferir a leitura",
      resumo: "Comparar a sequência obtida com a esperada.",
      cena: { acao: "sequenciar", entidades: ["dna", "plasmideo"], legenda: "Sequência ilustrativa: não é a do seu material." },
      acontece: [
        R("A sequência de cada colônia é conferida contra a sequência esperada da região.", [RAN("Procedure — Step 117")]),
      ],
      porque: [],
      materiais: [],
      controles: [],
      observar: [
        X("A qualidade da leitura (ruído, bases ambíguas, início e fim ruins) não é prevista pelo módulo."),
        S("Programas de alinhamento são usados para comparar leituras com a referência.", "Prática comum; as ferramentas específicas não estão descritas nos trechos lidos das fontes."),
      ],
      limitacoes: ["O módulo não lê arquivos de sequenciamento nem alinha sequências."],
    },
  ],
  modelos: [],
  problemas: [
    { sintoma: "Mais de uma banda na amplificação", causas: [R("Ajustar concentração de molde, de MgCl₂ ou a temperatura de anelamento dos primers.", [RAN("Procedure — Step 100")])] },
    { sintoma: "Leitura misturada", causas: [R("A amostra tem mais de uma versão da região; subclonar e sequenciar colônias separadas.", [RAN("Experimental design — Detection of indels or HDR by sequencing")])] },
  ],
  limitacoes: [
    "Parcial: do artigo de 1977 só o resumo foi lido, e ele não descreve equipamentos atuais (fluorescência, capilar).",
    "Sem calculadora: não há modelo validado aqui para qualidade de leitura.",
  ],
  naoFaz: ["Ler cromatogramas", "Alinhar ou comparar sequências", "Prever qualidade da leitura"],
  autoria: AUTORIA,
};
