import type { SourceRef } from "@/lib/sources/catalog";
import { ACAO_TITULO, type Acao, type Entidade } from "@/lib/visual/roteiro";

/**
 * BIBLIOTECA DA CENA: vocabulário fechado de objetos e ações que a visualização sabe representar.
 * A interpretação (regras locais ou IA) só pode escolher itens daqui; a composição da cena nunca
 * executa código vindo de texto, fala ou arquivos. Para ampliar o sistema, acrescente itens aqui e
 * a forma correspondente em src/components/holo/.
 */
export const OBJETO_IDS = [
  // equipamentos
  "micropipeta",
  "termociclador",
  "centrifuga",
  "cuba_eletroforese",
  "transiluminador",
  "banho_maria",
  "incubadora",
  "agitador",
  "espectrofotometro",
  "cabine_fluxo",
  "balanca",
  "agitador_magnetico",
  "estufa",
  "ph_metro",
  // recipientes
  "microtubo",
  "tubo_conico",
  "placa_petri",
  "placa_pocos",
  "frasco",
  "coluna",
  "balao_volumetrico",
  "proveta",
  // materiais e moléculas
  "dna",
  "primer",
  "plasmideo",
  "produto_pcr",
  "rna",
  "proteina",
  "anticorpo",
  "enzima_corte",
  "ligase",
  "polimerase",
  "nucleotideos",
  "cas9",
  "master_mix",
  "antibiotico",
  "gel_agarose",
  "tampao",
  "ribossomo",
  "sal_precursor",
  "acido",
  "solvente",
  "precipitado",
  "nanoparticula",
  "extrato_vegetal",
  // células e amostras
  "bacteria",
  "celula",
  "virus",
  "amostra",
] as const;
export type ObjetoId = (typeof OBJETO_IDS)[number];

export type Categoria = "equipamento" | "recipiente" | "material" | "celula" | "amostra";

export type ObjetoBiblioteca = {
  id: ObjetoId;
  nome: string;
  categoria: Categoria;
  funcao: string;
  /** Explicação breve exibida ao selecionar o elemento. */
  explicacao: string;
  /** Termos que reconhecem o objeto no texto normalizado (sem acentos, minúsculas). */
  termos?: RegExp;
  refs?: SourceRef[];
  /** Representação disponível no 3D (false = aparece só como rótulo). */
  forma3d: boolean;
};

const L = (locator: string): SourceRef => ({ id: "lorenz2012", locator });
const LEE = (locator: string): SourceRef => ({ id: "lee2012", locator });

export const OBJETOS: Record<ObjetoId, ObjetoBiblioteca> = {
  micropipeta: { id: "micropipeta", nome: "Micropipeta", categoria: "equipamento", funcao: "Mede e transfere volumes pequenos de líquido.", explicacao: "Aspira um volume definido com a ponteira e o dispensa no recipiente de destino.", termos: /micropipet\w*|\bpipet\w*|ponteira\w*/, forma3d: true },
  termociclador: { id: "termociclador", nome: "Termociclador", categoria: "equipamento", funcao: "Repete ciclos programados de temperatura.", explicacao: "Aquece e resfria o bloco com os tubos para alternar desnaturação, anelamento e extensão.", termos: /termociclador\w*|ciclador\w*|\bthermocycler\b|maquina de pcr/, refs: [L("§6")], forma3d: true },
  centrifuga: { id: "centrifuga", nome: "Centrífuga", categoria: "equipamento", funcao: "Gira os tubos em alta velocidade.", explicacao: "A força centrífuga acumula o material mais denso no fundo do tubo.", termos: /centrifug\w*|\bspin\b/, forma3d: true },
  cuba_eletroforese: { id: "cuba_eletroforese", nome: "Cuba de eletroforese", categoria: "equipamento", funcao: "Aplica um campo elétrico através do gel.", explicacao: "Com o campo elétrico, o DNA (carregado negativamente) migra em direção ao polo positivo.", termos: /cuba\w*|eletrofor\w*|fonte de tensao/, refs: [LEE("§2")], forma3d: true },
  transiluminador: { id: "transiluminador", nome: "Transiluminador", categoria: "equipamento", funcao: "Ilumina o gel para ver as bandas coradas.", explicacao: "A luz excita o corante ligado ao DNA e as bandas ficam visíveis.", termos: /transiluminador\w*|fotodocument\w*|\buv\b|luz azul/, refs: [LEE("§2")], forma3d: false },
  banho_maria: { id: "banho_maria", nome: "Banho-maria", categoria: "equipamento", funcao: "Mantém amostras em temperatura constante.", explicacao: "A água aquecida transfere calor de forma uniforme aos tubos.", termos: /banho.?maria|bloco (?:de )?aquec\w*|heat ?block|termobloco/, forma3d: false },
  incubadora: { id: "incubadora", nome: "Incubadora", categoria: "equipamento", funcao: "Mantém culturas em temperatura controlada.", explicacao: "Mantém as condições de temperatura (e, em alguns modelos, agitação ou CO₂) para o crescimento.", termos: /incubador\w*|estufa(?! a vacuo| de secagem| a vacuo)\w*|shaker|agitador orbital/, forma3d: false },
  agitador: { id: "agitador", nome: "Agitador (vórtex)", categoria: "equipamento", funcao: "Mistura o conteúdo do tubo.", explicacao: "Movimentos rápidos homogeneízam a solução.", termos: /vortex\w*|vortéx|agitador\w*|homogeneiz\w*/, forma3d: false },
  espectrofotometro: { id: "espectrofotometro", nome: "Espectrofotômetro", categoria: "equipamento", funcao: "Mede a absorbância da amostra.", explicacao: "A absorbância (por exemplo, a 260 nm) permite estimar a concentração de ácidos nucleicos.", termos: /espectrofot\w*|nanodrop|absorbancia|\ba260\b|leitor de placa\w*/, forma3d: false },
  cabine_fluxo: { id: "cabine_fluxo", nome: "Cabine de fluxo laminar", categoria: "equipamento", funcao: "Área de trabalho com ar filtrado.", explicacao: "Reduz a contaminação das amostras durante a manipulação.", termos: /fluxo laminar|cabine de seguranca|capela/, forma3d: false },
  balanca: { id: "balanca", nome: "Balança analítica", categoria: "equipamento", funcao: "Mede a massa do sólido.", explicacao: "A massa pesada define a quantidade de reagente que entra na solução.", termos: /balanca\w*|pesagem|\bpese\b/, forma3d: true },
  agitador_magnetico: { id: "agitador_magnetico", nome: "Agitador magnético", categoria: "equipamento", funcao: "Mantém a solução em movimento.", explicacao: "Uma barra magnética gira no fundo do recipiente e mantém a mistura homogênea durante a reação.", termos: /agitacao magnetica|agitador magnetico|placa de agitacao|\bturrax\b/, forma3d: true },
  estufa: { id: "estufa", nome: "Estufa de secagem", categoria: "equipamento", funcao: "Seca o material com calor.", explicacao: "Mantém o sólido aquecido para evaporar o líquido residual; a vácuo, a evaporação ocorre em temperatura mais baixa.", termos: /estufa a vacuo|estufa de secagem|secagem a vacuo|dessecador/, forma3d: false },
  ph_metro: { id: "ph_metro", nome: "pHmetro", categoria: "equipamento", funcao: "Mede o pH da solução.", explicacao: "O pH influencia a formação e a estabilidade do sólido na reação.", termos: /phmetro|ph-metro|medidor de ph|fita de ph/, forma3d: false },

  microtubo: { id: "microtubo", nome: "Microtubo", categoria: "recipiente", funcao: "Recebe pequenos volumes de reação.", explicacao: "Tubo de 0,2 a 2 mL usado para reações, amostras e misturas.", termos: /microtubo\w*|eppendorf\w*|\btubo\w*(?! conico| falcon)|tubinho\w*/, forma3d: true },
  tubo_conico: { id: "tubo_conico", nome: "Tubo cônico", categoria: "recipiente", funcao: "Recebe volumes maiores.", explicacao: "Tubo de 15 ou 50 mL, comum para culturas e soluções.", termos: /tubo conico|falcon/, forma3d: true },
  placa_petri: { id: "placa_petri", nome: "Placa de Petri", categoria: "recipiente", funcao: "Suporte com meio sólido para cultivo.", explicacao: "O meio com ágar permite que as células formem colônias visíveis.", termos: /placa de petri|\bpetri\b|placa\w* (?:de |com )?agar|\bagar\b/, forma3d: true },
  placa_pocos: { id: "placa_pocos", nome: "Placa de poços", categoria: "recipiente", funcao: "Muitas reações lado a lado.", explicacao: "Placas de 96 ou 384 poços para ensaios em paralelo (por exemplo, qPCR ou ELISA).", termos: /placa de (?:96|384|24|12|6) pocos|placa de pocos|\b96 pocos|microplaca/, forma3d: false },
  frasco: { id: "frasco", nome: "Frasco", categoria: "recipiente", funcao: "Contém meio de cultura ou solução.", explicacao: "Frascos e erlenmeyers armazenam soluções e culturas líquidas.", termos: /\bfrasco\w*|erlenmeyer|garrafa de cultura/, forma3d: false },
  balao_volumetrico: { id: "balao_volumetrico", nome: "Balão volumétrico", categoria: "recipiente", funcao: "Prepara um volume exato de solução.", explicacao: "O volume é completado até a marca do balão, fixando a concentração final.", termos: /balao volumetrico|balao de \d/, forma3d: false },
  proveta: { id: "proveta", nome: "Proveta", categoria: "recipiente", funcao: "Mede volumes de líquido.", explicacao: "Mede volumes maiores que os da micropipeta, com menos exatidão.", termos: /\bproveta\w*|\bbequer\w*|\bbecker\w*|erlenmeyer/, forma3d: false },
  coluna: { id: "coluna", nome: "Coluna de purificação", categoria: "recipiente", funcao: "Retém o material a purificar.", explicacao: "A membrana da coluna retém o ácido nucleico enquanto os contaminantes são lavados.", termos: /\bcoluna\w*|kit de purificacao|spin column/, forma3d: false },

  dna: { id: "dna", nome: "DNA", categoria: "material", funcao: "Molde com a sequência de interesse.", explicacao: "Dupla fita de nucleotídeos; nas reações, serve de molde para cópia ou leitura.", forma3d: true },
  primer: { id: "primer", nome: "Primers", categoria: "material", funcao: "Delimitam a região a copiar.", explicacao: "Oligonucleotídeos curtos que pareiam com sequências complementares do molde.", refs: [L("§6")], forma3d: true },
  plasmideo: { id: "plasmideo", nome: "Plasmídeo", categoria: "material", funcao: "Vetor circular de DNA.", explicacao: "Molécula circular que carrega o gene de interesse e um gene de seleção.", forma3d: true },
  produto_pcr: { id: "produto_pcr", nome: "Produto de PCR", categoria: "material", funcao: "Fragmento amplificado.", explicacao: "Cópias da região delimitada pelos primers.", forma3d: true },
  rna: { id: "rna", nome: "RNA", categoria: "material", funcao: "Cópia de uma das fitas do gene.", explicacao: "Fita simples transcrita a partir do DNA.", forma3d: true },
  proteina: { id: "proteina", nome: "Proteína", categoria: "material", funcao: "Produto da tradução.", explicacao: "Cadeia de aminoácidos dobrada.", forma3d: true },
  anticorpo: { id: "anticorpo", nome: "Anticorpo", categoria: "material", funcao: "Reconhece um alvo específico.", explicacao: "Liga-se ao antígeno; em ensaios, sinaliza a presença do alvo.", forma3d: false },
  enzima_corte: { id: "enzima_corte", nome: "Enzima de restrição", categoria: "material", funcao: "Corta o DNA em sítios específicos.", explicacao: "Reconhece uma sequência curta e corta as duas fitas nesse ponto.", forma3d: true },
  ligase: { id: "ligase", nome: "DNA ligase", categoria: "material", funcao: "Une extremidades de DNA.", explicacao: "Forma as ligações que fecham o plasmídeo com o inserto.", forma3d: false },
  polimerase: { id: "polimerase", nome: "DNA polimerase", categoria: "material", funcao: "Sintetiza a nova fita.", explicacao: "Estende o primer copiando a fita-molde.", refs: [L("§6")], forma3d: true },
  nucleotideos: { id: "nucleotideos", nome: "dNTPs", categoria: "material", funcao: "Blocos da nova fita.", explicacao: "Nucleotídeos incorporados pela polimerase.", refs: [L("§8")], forma3d: false },
  cas9: { id: "cas9", nome: "Cas9 + RNA guia", categoria: "material", funcao: "Corta o DNA no alvo do guia.", explicacao: "O RNA guia leva a Cas9 até a sequência complementar, onde ela corta a dupla fita.", forma3d: true },
  master_mix: { id: "master_mix", nome: "Master mix", categoria: "material", funcao: "Mistura comum às reações.", explicacao: "Tampão, sais, dNTPs e polimerase preparados juntos para várias reações.", termos: /master ?mix|mix de reacao|mistura de reacao/, refs: [L("§4 Basic PCR Protocol")], forma3d: true },
  antibiotico: { id: "antibiotico", nome: "Antibiótico de seleção", categoria: "material", funcao: "Seleciona as células com o vetor.", explicacao: "Só crescem as células com o gene de resistência.", forma3d: false },
  gel_agarose: { id: "gel_agarose", nome: "Gel de agarose", categoria: "material", funcao: "Separa fragmentos por tamanho.", explicacao: "Fragmentos menores atravessam os poros do gel mais depressa.", refs: [LEE("§1")], forma3d: true },
  tampao: { id: "tampao", nome: "Tampão", categoria: "material", funcao: "Mantém pH e sais da reação.", explicacao: "Solução que mantém as condições químicas da reação.", termos: /\btampao\b|\bbuffer\b|\btae\b|\btbe\b|\bpbs\b/, forma3d: false },
  ribossomo: { id: "ribossomo", nome: "Ribossomo", categoria: "material", funcao: "Lê o RNA mensageiro.", explicacao: "Monta a cadeia de aminoácidos lendo os códons.", forma3d: true },
  sal_precursor: { id: "sal_precursor", nome: "Sal precursor", categoria: "material", funcao: "Fornece o elemento que formará o sólido.", explicacao: "Sal dissolvido na solução; a reação o converte no material de interesse. A massa pesada define a concentração.", termos: /tiossulfato\w*|na2s2o3|\bcacl2\b|\(nh4\)2so4|\bcaso4\b|sulfato de (?:amonio|calcio)|cloreto de calcio|gipsita|precursor\w*/, forma3d: true },
  acido: { id: "acido", nome: "Ácido", categoria: "material", funcao: "Muda o pH e desencadeia a formação do sólido.", explicacao: "Adicionado gota a gota, altera as condições da solução até o sólido começar a se formar.", termos: /\bhcl\b|acido clorid\w*|acido citrico/, forma3d: true },
  solvente: { id: "solvente", nome: "Solvente", categoria: "material", funcao: "Dissolve, lava ou dispersa o material.", explicacao: "Água ou etanol usados para dissolver os reagentes e lavar o sólido.", termos: /agua deionizada|agua destilada|agua ultrapura|\betanol\b/, forma3d: false },
  precipitado: { id: "precipitado", nome: "Precipitado", categoria: "material", funcao: "Sólido formado na reação.", explicacao: "Material que sai da solução e se acumula no fundo do tubo após a centrifugação.", termos: /precipitado\w*|\bpellet\w*|turvacao|turbidez/, forma3d: true },
  nanoparticula: { id: "nanoparticula", nome: "Nanopartículas", categoria: "material", funcao: "Produto final da síntese.", explicacao: "Partículas muito pequenas obtidas ao final. Tamanho, forma e pureza só são conhecidos por caracterização; a cena não os representa.", termos: /nanoparticula\w*|\bsnps?\b|nanomaterial\w*/, forma3d: true },
  extrato_vegetal: { id: "extrato_vegetal", nome: "Extrato ou filtrado", categoria: "material", funcao: "Meio biológico da síntese.", explicacao: "Extrato, filtrado ou hidrolato usado como meio da reação. Sua participação química só é demonstrada com controles sem extrato.", termos: /extrato\w*|filtrado\w*|hidrolato\w*|metabolito\w*/, forma3d: false },

  bacteria: { id: "bacteria", nome: "Bactéria", categoria: "celula", funcao: "Célula hospedeira.", explicacao: "Mantém e replica o plasmídeo; forma colônias em meio sólido.", forma3d: true },
  celula: { id: "celula", nome: "Célula", categoria: "celula", funcao: "Célula eucariótica.", explicacao: "Possui núcleo; recebe material por transfecção ou transdução.", forma3d: true },
  virus: { id: "virus", nome: "Vetor viral", categoria: "celula", funcao: "Leva material genético à célula.", explicacao: "Partícula viral modificada para entregar o gene de interesse.", forma3d: false },
  amostra: { id: "amostra", nome: "Amostra", categoria: "amostra", funcao: "Material de partida.", explicacao: "Material biológico de origem (por exemplo, tecido, sangue ou cultura).", termos: /\bamostra\w*|\btecido\w*|sangue|saliva|swab/, forma3d: true },
};

/** Entidade do roteiro → objeto da biblioteca. */
export const OBJETO_DA_ENTIDADE: Record<Entidade, ObjetoId> = {
  dna: "dna",
  primer: "primer",
  plasmideo: "plasmideo",
  bacteria: "bacteria",
  enzima_corte: "enzima_corte",
  ligase: "ligase",
  polimerase: "polimerase",
  rna: "rna",
  proteina: "proteina",
  anticorpo: "anticorpo",
  celula: "celula",
  gel: "gel_agarose",
  tubo: "microtubo",
  placa: "placa_petri",
  cas9: "cas9",
  virus: "virus",
  antibiotico: "antibiotico",
  nucleotideos: "nucleotideos",
  produto_pcr: "produto_pcr",
  sal_precursor: "sal_precursor",
  extrato_vegetal: "extrato_vegetal",
  acido: "acido",
  solvente: "solvente",
  precipitado: "precipitado",
  nanoparticula: "nanoparticula",
};

export type Papel = "origem" | "destino" | "equipamento" | "recipiente" | "material" | "agente";

export type AcaoBiblioteca = {
  id: Acao;
  nome: string;
  /** Equipamento usado na representação quando a descrição não cita outro. */
  equipamento?: ObjetoId;
  /** Grandezas que costumam definir a ação (para listar o que foi informado). */
  grandezas: Grandeza[];
  /** Grandezas sem as quais a AVALIAÇÃO não é possível (a ilustração continua possível). */
  criticas?: Grandeza[];
};

export type Grandeza = "temperatura" | "tempo" | "volume" | "massa" | "concentracao" | "ciclos" | "rotacao" | "tensao" | "tamanho" | "unidades" | "porcentagem";

const A = (id: Acao, grandezas: Grandeza[], equipamento?: ObjetoId, criticas?: Grandeza[]): AcaoBiblioteca => ({ id, nome: ACAO_TITULO[id], grandezas, equipamento, criticas });

export const ACOES_BIBLIOTECA: Record<Acao, AcaoBiblioteca> = {
  pipetar: A("pipetar", ["volume", "concentracao", "massa"], "micropipeta"),
  misturar: A("misturar", ["volume", "concentracao", "massa", "unidades"], "micropipeta"),
  anelar: A("anelar", ["temperatura", "tempo"], undefined, ["temperatura"]),
  desnaturar: A("desnaturar", ["temperatura", "tempo"], undefined, ["temperatura"]),
  estender: A("estender", ["temperatura", "tempo", "tamanho"], undefined, ["tempo"]),
  amplificar: A("amplificar", ["ciclos", "temperatura", "tempo", "tamanho", "concentracao", "volume", "unidades"], "termociclador", ["ciclos", "temperatura", "tempo"]),
  cortar: A("cortar", ["temperatura", "tempo", "unidades"]),
  inserir_vetor: A("inserir_vetor", ["temperatura", "tempo", "massa"]),
  transformar: A("transformar", ["temperatura", "tempo", "volume", "tensao"]),
  transfectar: A("transfectar", ["massa", "volume"]),
  cultivar: A("cultivar", ["temperatura", "tempo", "concentracao"], "incubadora"),
  selecionar: A("selecionar", ["concentracao"]),
  expressar: A("expressar", ["temperatura", "tempo", "concentracao"]),
  transcrever: A("transcrever", ["temperatura", "tempo"]),
  traduzir: A("traduzir", []),
  extrair: A("extrair", ["volume", "rotacao", "tempo"]),
  purificar: A("purificar", ["volume", "rotacao"], "coluna"),
  eletroforese: A("eletroforese", ["porcentagem", "tensao", "tempo", "tamanho", "volume"], "cuba_eletroforese", ["porcentagem"]),
  centrifugar: A("centrifugar", ["rotacao", "tempo", "temperatura"], "centrifuga", ["rotacao"]),
  incubar: A("incubar", ["temperatura", "tempo"], "banho_maria", ["temperatura"]),
  sequenciar: A("sequenciar", []),
  editar_crispr: A("editar_crispr", ["concentracao"]),
  detectar: A("detectar", ["ciclos", "temperatura"]),
  quantificar: A("quantificar", ["concentracao", "volume"], "espectrofotometro"),
  pesar: A("pesar", ["massa"], "balanca", ["massa"]),
  dissolver: A("dissolver", ["massa", "volume", "concentracao"], undefined, ["concentracao"]),
  agitar: A("agitar", ["tempo", "temperatura"], "agitador_magnetico"),
  acidificar: A("acidificar", ["volume", "porcentagem", "concentracao"], undefined, ["concentracao"]),
  precipitar: A("precipitar", ["tempo", "temperatura"]),
  lavar: A("lavar", ["volume", "rotacao", "tempo"], "centrifuga"),
  ressuspender: A("ressuspender", ["volume"]),
  secar: A("secar", ["temperatura", "tempo"], "estufa", ["temperatura"]),
  filtrar: A("filtrar", ["volume", "tamanho"]),
  medir_ph: A("medir_ph", []), 
  generica: A("generica", []),
};

/** Objetos citados no trecho por termos da biblioteca (equipamentos e recipientes). */
export function objetosPorTermos(textoNormalizado: string): ObjetoId[] {
  const out: ObjetoId[] = [];
  for (const o of Object.values(OBJETOS)) if (o.termos && o.termos.test(textoNormalizado)) out.push(o.id);
  // “tubo cônico” não é microtubo
  if (out.includes("tubo_conico")) return out.filter((x) => x !== "microtubo");
  return out;
}

export const OBJETOS_POR_CATEGORIA: Record<Categoria, ObjetoBiblioteca[]> = {
  equipamento: Object.values(OBJETOS).filter((o) => o.categoria === "equipamento"),
  recipiente: Object.values(OBJETOS).filter((o) => o.categoria === "recipiente"),
  material: Object.values(OBJETOS).filter((o) => o.categoria === "material"),
  celula: Object.values(OBJETOS).filter((o) => o.categoria === "celula"),
  amostra: Object.values(OBJETOS).filter((o) => o.categoria === "amostra"),
};

export const CATEGORIA_NOME: Record<Categoria, string> = {
  equipamento: "Equipamentos",
  recipiente: "Recipientes",
  material: "Materiais e moléculas",
  celula: "Células",
  amostra: "Amostras",
};
