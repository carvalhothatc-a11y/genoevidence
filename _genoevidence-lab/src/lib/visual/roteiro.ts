import type { SourceRef } from "@/lib/sources/catalog";
import { normalizar } from "@/lib/ideia/parse";

/**
 * ROTEIRO VISUAL a partir da descrição livre (qualquer técnica).
 * Converte o texto em etapas {ação, entidades, origem, destino} por regras locais e sempre gera
 * uma representação: o que não for reconhecido vira uma etapa genérica com o texto original,
 * marcada para conferência. A representação é ILUSTRAÇÃO DIDÁTICA: não é resultado nem previsão.
 */
export type Entidade =
  | "dna"
  | "primer"
  | "plasmideo"
  | "bacteria"
  | "enzima_corte"
  | "ligase"
  | "polimerase"
  | "rna"
  | "proteina"
  | "anticorpo"
  | "celula"
  | "gel"
  | "tubo"
  | "placa"
  | "cas9"
  | "virus"
  | "antibiotico"
  | "nucleotideos"
  | "produto_pcr";

export type Acao =
  | "pipetar"
  | "misturar"
  | "anelar"
  | "desnaturar"
  | "estender"
  | "amplificar"
  | "cortar"
  | "inserir_vetor"
  | "transformar"
  | "transfectar"
  | "cultivar"
  | "selecionar"
  | "expressar"
  | "transcrever"
  | "traduzir"
  | "extrair"
  | "purificar"
  | "eletroforese"
  | "centrifugar"
  | "incubar"
  | "sequenciar"
  | "editar_crispr"
  | "detectar"
  | "quantificar"
  | "generica";

export const ENTIDADE_NOME: Record<Entidade, string> = {
  dna: "DNA",
  primer: "Primer",
  plasmideo: "Plasmídeo",
  bacteria: "Bactéria",
  enzima_corte: "Enzima de restrição",
  ligase: "DNA ligase",
  polimerase: "DNA polimerase",
  rna: "RNA",
  proteina: "Proteína",
  anticorpo: "Anticorpo",
  celula: "Célula",
  gel: "Gel",
  tubo: "Tubo de reação",
  placa: "Placa de cultura",
  cas9: "Cas9 + RNA guia",
  virus: "Vetor viral",
  antibiotico: "Antibiótico de seleção",
  nucleotideos: "Nucleotídeos",
  produto_pcr: "Produto de PCR (inserto)",
};

export const ACAO_TITULO: Record<Acao, string> = {
  pipetar: "Retirar e transferir",
  misturar: "Adicionar à mistura",
  anelar: "Primer pareia com o DNA",
  desnaturar: "Separação das fitas",
  estender: "Síntese da nova fita",
  amplificar: "Amplificação por PCR",
  cortar: "Corte com enzima",
  inserir_vetor: "Inserção no plasmídeo",
  transformar: "Transformação da bactéria",
  transfectar: "Transfecção da célula",
  cultivar: "Cultivo em placa",
  selecionar: "Seleção de colônias",
  expressar: "Expressão da proteína",
  transcrever: "Transcrição (DNA → RNA)",
  traduzir: "Tradução (RNA → proteína)",
  extrair: "Extração",
  purificar: "Purificação",
  eletroforese: "Eletroforese em gel",
  centrifugar: "Centrifugação",
  incubar: "Incubação",
  sequenciar: "Sequenciamento",
  editar_crispr: "Edição por CRISPR-Cas9",
  detectar: "Detecção do sinal",
  quantificar: "Quantificação",
  generica: "Etapa descrita",
};

/** Entidades reconhecidas (texto normalizado, sem acentos). Ordem: mais específicas primeiro. */
const ENTIDADES: { e: Entidade; re: RegExp }[] = [
  { e: "produto_pcr", re: /produto (?:de|da) pcr|amplicon\w*|inserto|fragmento amplificado/ },
  { e: "plasmideo", re: /plasmide\w*|plasmidi\w*|\bvetor\b|\bpuc\d*|\bpet-?\d*|\bpgem\w*/ },
  { e: "bacteria", re: /bacteria\w*|e\.? ?coli|escherichia|colonia\w*|celulas competentes|competentes|\bdh5|\bbl21/ },
  { e: "virus", re: /lentivir\w*|adenovir\w*|retrovir\w*|vetor viral|\bvirus\b|fago\w*/ },
  { e: "cas9", re: /\bcas ?9\b|crispr|sgrna|rna guia|guia de rna/ },
  { e: "enzima_corte", re: /enzima de restricao|enzimas de restricao|restricao|\becori\b|\bbamhi\b|\bhindiii\b|\bxhoi\b|\bnoti\b|\bnde ?i\b|digest\w*/ },
  { e: "ligase", re: /ligase|t4 dna/ },
  { e: "polimerase", re: /polimerase|\btaq\b|\bpfu\b|phusion|\bq5\b/ },
  { e: "primer", re: /primers?\b|iniciador\w*|oligo\w*/ },
  { e: "nucleotideos", re: /dntp\w*|nucleotideo\w*/ },
  { e: "anticorpo", re: /anticorpo\w*/ },
  { e: "rna", re: /\bm?rna\b|\bcdna\b|transcrito\w*/ },
  { e: "proteina", re: /proteina\w*|enzima recombinante|peptide\w*/ },
  { e: "celula", re: /celula\w*|linhagem|\bhek\b|\bhela\b|levedura\w*|tecido\w*/ },
  { e: "antibiotico", re: /ampicilina|canamicina|cloranfenicol|tetraciclina|antibiotico\w*|\bamp\b|\bkan\b/ },
  { e: "placa", re: /\bplaca\w*|\bagar\b|meio solido|petri/ },
  { e: "gel", re: /\bgel\b|agarose|banda\w*/ },
  { e: "dna", re: /\bdna\b|genoma|genomic\w*|cromossom\w*|\bmolde\b|template|\bgene\b|sequencia alvo/ },
  { e: "tubo", re: /\btubo\w*|eppendorf|microtubo\w*|master mix|mistura|reacao/ },
];

/** Ações por verbos e termos de técnica. Ordem: mais específicas primeiro. */
const ACOES: { a: Acao; re: RegExp }[] = [
  { a: "editar_crispr", re: /crispr|cas ?9|editar o genoma|edicao genica|nocaute|knock ?out/ },
  { a: "transfectar", re: /transfect\w*|lipofect\w*|transduz\w*|transducao/ },
  { a: "transformar", re: /transform\w*|choque termico|eletropora\w*|(?:inserir|colocar|introduzir|por|inseri|coloquei|vou inserir|vou colocar)[^,.;]{0,40}(?:bacteria|e\.? ?coli|competentes|celulas competentes)/ },
  { a: "inserir_vetor", re: /clon\w*|ligacao|ligar\b|ligad\w*|subclon\w*|(?:inserir|colocar|inseri|coloquei|acrescentar|acrescentei|foi|vai|entrar|entrou)[^,.;]{0,30}(?:plasmide\w*|plasmidi\w*|vetor)/ },
  { a: "cortar", re: /cort\w*|digest\w*|clivag\w*|clivar|restricao/ },
  { a: "amplificar", re: /amplific\w*|\bpcr\b|ciclagem|termociclador/ },
  { a: "desnaturar", re: /desnatur\w*|separar as fitas|abrir a dupla fita/ },
  { a: "anelar", re: /anela\w*|hibridiz\w*|parear|pareia|(?:acrescent|adicion|coloc|junt)\w*[^,.;]{0,25}primer[^,.;]{0,20}(?:dna|molde)|(?:acrescent|adicion|coloc|junt)\w*[^,.;]{0,15}(?:no|ao|na) (?:dna|molde)/ },
  { a: "estender", re: /extensao|estender|alongamento|sintese da (?:nova )?fita/ },
  { a: "transcrever", re: /transcri\w*(?! reversa)/ },
  { a: "traduzir", re: /traduz\w*|traducao|ribossomo\w*/ },
  { a: "expressar", re: /express\w*|induz\w*|iptg|produzir (?:a )?proteina|superexpress\w*/ },
  { a: "selecionar", re: /selecion\w*|triag\w*|azul.?branc\w*|screening|escolher (?:as )?colonias/ },
  { a: "cultivar", re: /cultiv\w*|plaque\w*|semear|crescer|crescimento|incubar a placa|espalhar na placa/ },
  { a: "extrair", re: /extra\w*|isolar|lis\w*|romper as celulas|miniprep|midiprep|maxiprep/ },
  { a: "purificar", re: /purific\w*|coluna|limpar o produto/ },
  { a: "eletroforese", re: /eletrofor\w*|correr (?:o )?gel|corrida|\bgel\b|banda\w*/ },
  { a: "centrifugar", re: /centrifug\w*|\bspin\b|precipit\w*/ },
  { a: "sequenciar", re: /sequenci\w*|sanger|\bngs\b/ },
  { a: "detectar", re: /qpcr|tempo real|sybr|taqman|western|elisa|fluoresc\w*|detect\w*|revelar|sinal/ },
  { a: "quantificar", re: /quantific\w*|nanodrop|espectrofot\w*|absorbancia|\ba260\b|concentracao do dna/ },
  { a: "incubar", re: /incub\w*|aquec\w*|banho.?maria|°c|graus/ },
  { a: "pipetar", re: /pipet\w*|\btir\w*|retir\w*|pegar|pego|peguei|transferir|transferi/ },
  { a: "misturar", re: /mistur\w*|acrescent\w*|adicion\w*|coloc\w*|junt\w*|homogeneiz\w*/ },
];

/** Entidade “produzida” por cada ação (carregada como sujeito implícito da próxima frase). */
const PRODUZ: Partial<Record<Acao, Entidade>> = {
  amplificar: "produto_pcr",
  inserir_vetor: "plasmideo",
  transformar: "bacteria",
  transfectar: "celula",
  cultivar: "placa",
  selecionar: "bacteria",
  expressar: "proteina",
  transcrever: "rna",
  traduzir: "proteina",
  extrair: "dna",
  purificar: "dna",
  anelar: "dna",
  estender: "dna",
};

export type Atencao = { texto: string; base: "referencia" | "geral"; refs: SourceRef[] };
export type Variavel = { nome: string; efeito: string; base: "referencia" | "geral"; refs: SourceRef[] };

export type PassoVisual = {
  id: string;
  ordem: number;
  texto: string;
  acao: Acao;
  titulo: string;
  entidades: Entidade[];
  origem: Entidade | null;
  destino: Entidade | null;
  /** Rótulos do texto: gene, organismo, enzima, antibiótico, temperatura… */
  rotulos: { gene?: string; organismo?: string; enzima?: string; antibiotico?: string; temperatura?: string; volume?: string; ciclos?: string };
  /** Integração no cromossomo citada (“no DNA da bactéria”). */
  integracao: boolean;
  confianca: "alta" | "conferir";
  mostra: string;
  refs: SourceRef[];
  atencao: Atencao[];
  variaveis: Variavel[];
};

const L = (locator: string): SourceRef => ({ id: "lorenz2012", locator });
const LEE = (locator: string): SourceRef => ({ id: "lee2012", locator });

/** Referências do catálogo verificadas para cada ação (somente onde existem). */
const REFS: Partial<Record<Acao, SourceRef[]>> = {
  amplificar: [L("§6"), { id: "saiki1988", locator: "Resumo" }],
  anelar: [L("§6")],
  desnaturar: [L("§6")],
  estender: [L("§6")],
  eletroforese: [LEE("§2"), LEE("Discussão")],
  detectar: [{ id: "bustin2009", locator: "Resumo" }],
  pipetar: [L("§4 Basic PCR Protocol")],
  misturar: [L("§4 Basic PCR Protocol")],
};

/** O que dá para mudar em cada ação. Com fonte quando há; senão “orientação geral, sem fonte cadastrada”. */
const VARIAVEIS: Partial<Record<Acao, Variavel[]>> = {
  amplificar: [
    { nome: "Temperatura de anelamento", efeito: "Baixa demais reduz a especificidade (produtos inespecíficos); alta demais pode impedir o produto.", base: "referencia", refs: [L("§7 Troubleshooting")] },
    { nome: "Mg²⁺ (0,5–5,0 mM)", efeito: "Mais Mg²⁺ tende a aumentar rendimento, mas reduz especificidade e fidelidade.", base: "referencia", refs: [L("§8 Magnesium salt")] },
    { nome: "Número de ciclos (25–35)", efeito: "Acima de 35 ciclos, enriquecimento frequente de produtos secundários.", base: "referencia", refs: [L("§6")] },
    { nome: "Tempo de extensão", efeito: "Taq: cerca de 1 min até 2 kb e +1 min por kb.", base: "referencia", refs: [L("§6")] },
  ],
  anelar: [{ nome: "Temperatura de anelamento", efeito: "Ponto de partida: cerca de 5 °C abaixo da Tm aparente dos primers.", base: "referencia", refs: [L("§6")] }],
  eletroforese: [
    { nome: "Concentração de agarose (0,5–2%)", efeito: "Depende do tamanho dos fragmentos; mais agarose, poros menores.", base: "referencia", refs: [LEE("§1"), LEE("Discussão")] },
    { nome: "Campo elétrico (1–5 V/cm)", efeito: "Programado entre os eletrodos.", base: "referencia", refs: [LEE("§1"), LEE("§2")] },
    { nome: "Marcador de tamanho", efeito: "Deve ser aplicado junto para estimar o tamanho das bandas.", base: "referencia", refs: [LEE("§2")] },
  ],
  cortar: [
    { nome: "Escolha das enzimas", efeito: "Sítios presentes no vetor e ausentes no inserto; extremidades compatíveis.", base: "geral", refs: [] },
    { nome: "Tempo e tampão da digestão", efeito: "Seguir as condições do fabricante da enzima.", base: "geral", refs: [] },
  ],
  inserir_vetor: [
    { nome: "Razão inserto : vetor", efeito: "Altera a proporção de ligações com inserto.", base: "geral", refs: [] },
    { nome: "Estratégia de inserção", efeito: "Restrição + ligase, recombinação ou montagem (ex.: Gibson); muda as etapas necessárias.", base: "geral", refs: [] },
    { nome: "Desfosforilação do vetor", efeito: "Reduz o religamento do vetor vazio.", base: "geral", refs: [] },
  ],
  transformar: [
    { nome: "Método", efeito: "Choque térmico ou eletroporação, com células competentes adequadas.", base: "geral", refs: [] },
    { nome: "Quantidade de DNA e volume de células", efeito: "Seguir o protocolo das células competentes.", base: "geral", refs: [] },
    { nome: "Antibiótico de seleção", efeito: "Deve corresponder à resistência do plasmídeo.", base: "geral", refs: [] },
  ],
  cultivar: [
    { nome: "Antibiótico e temperatura de incubação", efeito: "Definem quais células crescem e em quanto tempo.", base: "geral", refs: [] },
  ],
  selecionar: [{ nome: "Método de triagem", efeito: "PCR de colônia, digestão de miniprep, azul/branco ou sequenciamento.", base: "geral", refs: [] }],
  expressar: [
    { nome: "Indução (ex.: IPTG), temperatura e tempo", efeito: "Alteram a quantidade e a solubilidade da proteína.", base: "geral", refs: [] },
  ],
  editar_crispr: [{ nome: "Desenho do RNA guia", efeito: "Determina o sítio de corte e o risco de cortes fora do alvo.", base: "geral", refs: [] }],
  extrair: [{ nome: "Método de lise e purificação", efeito: "Afeta rendimento e pureza do material extraído.", base: "geral", refs: [] }],
};

function slug(n: number) {
  return `pv_${n.toString(36)}`;
}

/**
 * Divide em frases e, dentro delas, em ações encadeadas: separa por vírgulas, “e”, “depois”,
 * “então”, “daí”… e junta de volta os pedaços que não têm verbo de ação (ex.: “EcoRI e BamHI”).
 */
export function fragmentar(texto: string): string[] {
  const protegido = texto.replace(/\s+/g, " ").replace(/\bE\. ?coli\b/gi, "E.coli");
  const frases = protegido
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((f) => f.trim())
    .filter(Boolean);
  const out: string[] = [];
  const sep = /(,\s+(?:e\s+)?(?:depois\s+|daí\s+|dai\s+|então\s+|entao\s+|em seguida\s+|por fim\s+|aí\s+)?|\s+e\s+(?:depois\s+|daí\s+|dai\s+|então\s+|entao\s+|em seguida\s+)?|\s+(?:depois|daí|então|em seguida|por fim|finalmente)\s+)/i;
  const temAcao = (x: string) => ACOES.some((a) => a.re.test(normalizar(x)));
  // conectivos sozinhos (“Por fim”, “Depois”) não são etapas: vão para o começo da peça seguinte
  const conectivo = (x: string) => /^(?:e\s+)?(?:por fim|depois|entao|em seguida|finalmente|ai|dai|logo|primeiro|antes|enfim|apos isso|em seguida a isso)$/.test(normalizar(x).trim());
  for (const f of frases) {
    const bruto = f.split(sep);
    const pecas: string[] = [];
    let prefixo = "";
    for (let i = 0; i < bruto.length; i += 2) {
      const p = bruto[i].replace(/^[,;\s]+|[,;.\s]+$/g, "");
      if (!p) continue;
      if (conectivo(p)) {
        prefixo = `${prefixo}${p}, `;
        continue;
      }
      const peca = prefixo + p;
      prefixo = "";
      if (pecas.length && !temAcao(peca)) pecas[pecas.length - 1] += (bruto[i - 1] ?? " ") + peca;
      else pecas.push(peca);
    }
    out.push(...(pecas.length ? pecas : [f]));
  }
  return out.map((x) => x.replace(/E\.coli/g, "E. coli")).slice(0, 16);
}

const PREP_DESTINO = /\b(?:no|na|nos|nas|em|ao|a|para o|para a|dentro do|dentro da|pro|pra)\s+(?:(?:o|a|um|uma|meu|minha|esse|essa)\s+)?([a-z.\s]{2,40})/g;

function entidadesEm(t: string): { e: Entidade; at: number }[] {
  const out: { e: Entidade; at: number }[] = [];
  const usados: [number, number][] = [];
  for (const { e, re } of ENTIDADES) {
    const g = new RegExp(re.source, "g");
    let m: RegExpExecArray | null;
    while ((m = g.exec(t))) {
      const a = m.index;
      const b = a + m[0].length;
      if (usados.some(([x, y]) => a < y && b > x)) continue;
      usados.push([a, b]);
      out.push({ e, at: a });
    }
  }
  return out.sort((x, y) => x.at - y.at);
}

export function interpretarRoteiro(texto: string): PassoVisual[] {
  const partes = fragmentar(texto);
  const passos: PassoVisual[] = [];
  let ultimo: Entidade | null = null;
  partes.forEach((parte, i) => {
    const t = normalizar(parte);
    const acaoM = ACOES.find((x) => x.re.test(t));
    let acao: Acao = acaoM?.a ?? "generica";
    const ents = entidadesEm(t);
    const lista = [...new Set(ents.map((x) => x.e))];

    // destino: entidade após preposição de lugar (“no plasmídeo”, “na bactéria”, “no DNA da bactéria”)
    let destino: Entidade | null = null;
    PREP_DESTINO.lastIndex = 0;
    let pm: RegExpExecArray | null;
    while ((pm = PREP_DESTINO.exec(t))) {
      const alvo = entidadesEm(pm[1])[0];
      if (alvo) destino = alvo.e;
    }
    const integracao = /dna (?:da|de|do) (?:bacteria|e\.? ?coli|celula)|genoma (?:da|de|do)|cromossom/.test(t);
    if (integracao && /bacteria|coli/.test(t)) destino = "bacteria";

    // ajustes por destino: “colocar X no plasmídeo” é inserção; “na bactéria” é transformação
    if ((acao === "misturar" || acao === "pipetar" || acao === "generica") && destino === "plasmideo") acao = "inserir_vetor";
    if ((acao === "misturar" || acao === "pipetar" || acao === "generica" || acao === "inserir_vetor") && destino === "bacteria") acao = "transformar";
    if ((acao === "misturar" || acao === "generica") && lista.includes("primer") && (destino === "dna" || lista.includes("dna"))) acao = "anelar";

    // origem/sujeito: primeira entidade que não é o destino; senão o que veio da etapa anterior
    let origem: Entidade | null = ents.find((x) => x.e !== destino)?.e ?? null;
    let confianca: PassoVisual["confianca"] = acaoM ? "alta" : "conferir";
    if (!origem && ultimo && acao !== "generica") {
      origem = ultimo;
      confianca = "conferir";
    }
    if (acao === "inserir_vetor" && (!origem || origem === "primer" || origem === "ligase" || origem === "enzima_corte" || origem === "plasmideo")) origem = ultimo && ultimo !== "plasmideo" ? ultimo : "produto_pcr";
    if (acao === "inserir_vetor") destino = "plasmideo";
    if (acao === "cortar" && (!origem || origem === "enzima_corte")) origem = ultimo ?? "dna";
    if (acao === "transformar" && (!origem || origem === "dna" || origem === "bacteria")) origem = ultimo === "plasmideo" || lista.includes("plasmideo") ? "plasmideo" : (ultimo ?? "plasmideo");

    // rótulos do texto (preservando a grafia original)
    const rotulos: PassoVisual["rotulos"] = {};
    const NAO_GENE = /^(PCR|DNA|RNA|ATP|IPTG|NTC|LB|SOC|TAE|TBE|HEK\d*|SDS|EDTA|PBS|UV|T4|DH5\w*|BL21\w*|PUC\d*|PET\d*|CRISPR|CAS9|EcoRI|BamHI|HindIII|XhoI|NotI|NdeI)$/i;
    const gm = /\bgene\s+(?:da |do |de )?([A-Za-z0-9-]{2,15})/i.exec(parte) ?? /\b([A-Z][A-Z0-9]{2,9})\b/.exec(parte);
    if (gm && !NAO_GENE.test(gm[1])) rotulos.gene = gm[1];
    const org = /\b(E\.? ?coli|Escherichia coli|DH5α|DH5a|BL21|levedura|HEK ?293|HeLa)\b/i.exec(parte);
    if (org) rotulos.organismo = org[1];
    const enz = /\b(EcoRI|BamHI|HindIII|XhoI|NotI|NdeI|XbaI|SalI)\b/i.exec(parte);
    if (enz) rotulos.enzima = enz[1];
    const ab = /\b(ampicilina|canamicina|cloranfenicol|tetraciclina)\b/i.exec(parte);
    if (ab) rotulos.antibiotico = ab[1];
    const temp = /(\d{1,3}(?:[.,]\d)?)\s?(?:°|º)\s?c|(\d{1,3})\s?graus/i.exec(parte);
    if (temp) rotulos.temperatura = `${temp[1] ?? temp[2]} °C`;

    const entidades = [...new Set([origem, destino, ...lista].filter(Boolean) as Entidade[])].slice(0, 5);
    const atencao: Atencao[] = [];
    if (acao === "transformar" && integracao)
      atencao.push({
        texto: "Foi descrita inserção “no DNA da bactéria”. Em geral um plasmídeo se mantém separado do cromossomo; a integração no genoma exige uma estratégia específica (por exemplo, recombinação). A imagem mostra as duas possibilidades: confirme qual é a intenção.",
        base: "geral",
        refs: [],
      });
    if (acao === "inserir_vetor" && !passos.some((p) => p.acao === "cortar") && !/ligase|gibson|recombin|golden|topo|restricao|digest/.test(normalizar(texto)))
      atencao.push({ texto: "Não foi dito como o inserto entra no plasmídeo (enzimas de restrição e ligase, recombinação, montagem…). A imagem mostra uma inserção genérica.", base: "geral", refs: [] });
    if (acao === "transformar" && !/ampicilina|canamicina|cloranfenicol|tetraciclina|antibiotico|selec/.test(normalizar(texto)))
      atencao.push({ texto: "Não foi citado o antibiótico de seleção. Sem seleção, células sem o plasmídeo também crescem.", base: "geral", refs: [] });
    if (acao === "anelar" && !/tm|anelamento|°c|graus/.test(normalizar(texto)))
      atencao.push({ texto: "A temperatura de anelamento e a Tm dos primers não foram informadas; elas definem a especificidade do pareamento.", base: "referencia", refs: [L("§6")] });
    if (acao === "generica") atencao.push({ texto: "Etapa sem ação reconhecida: a imagem mostra os materiais citados. Reescreva com o verbo da etapa (ex.: cortar, inserir, transformar) para uma representação específica.", base: "geral", refs: [] });

    const passo: PassoVisual = {
      id: slug(i + 1),
      ordem: i + 1,
      texto: parte,
      acao,
      titulo: ACAO_TITULO[acao],
      entidades,
      origem,
      destino,
      rotulos,
      integracao,
      confianca,
      mostra: descreverCena(acao, origem, destino, rotulos, integracao),
      refs: REFS[acao] ?? [],
      atencao,
      variaveis: VARIAVEIS[acao] ?? [],
    };
    passos.push(passo);
    ultimo = PRODUZ[acao] ?? destino ?? origem ?? ultimo;
  });
  return passos;
}

function nome(e: Entidade | null) {
  if (!e) return "material";
  const n = ENTIDADE_NOME[e];
  // preserva siglas (DNA, RNA) e minúscula só a primeira palavra comum
  return n.replace(/^([A-ZÀ-Ú])([a-zà-ú])/, (_, a: string, b: string) => a.toLowerCase() + b);
}

export function descreverCena(acao: Acao, origem: Entidade | null, destino: Entidade | null, r: PassoVisual["rotulos"], integracao: boolean): string {
  const g = r.gene ? ` (${r.gene})` : "";
  switch (acao) {
    case "pipetar":
      return `O ${nome(origem)}${g} é retirado do tubo de estoque com a micropipeta${destino ? ` e levado ao ${nome(destino)}` : ""}.`;
    case "misturar":
      return `O ${nome(origem)}${g} é adicionado${destino ? ` ao ${nome(destino)}` : " à mistura de reação"}.`;
    case "anelar":
      return "As fitas do DNA molde se separam e os primers pareiam com as sequências complementares de cada fita.";
    case "desnaturar":
      return "Com o aquecimento, as duas fitas do DNA se separam.";
    case "estender":
      return "A polimerase estende cada primer, copiando a fita-molde.";
    case "amplificar":
      return `A região-alvo${g} é copiada a cada ciclo: 1 → 2 → 4 → 8 cópias (ilustração do crescimento; quantidades reais não são calculadas).`;
    case "cortar":
      return `A enzima de restrição${r.enzima ? ` ${r.enzima}` : ""} corta o ${nome(origem === "enzima_corte" ? destino : origem)} no sítio de reconhecimento.`;
    case "inserir_vetor":
      return `O ${nome(origem)}${g} entra no plasmídeo aberto e as extremidades são unidas, formando o plasmídeo recombinante.`;
    case "transformar":
      return integracao
        ? "O plasmídeo entra na bactéria. A imagem mostra o plasmídeo separado do cromossomo e, tracejada, a integração no cromossomo descrita no texto."
        : `O ${nome(origem)} entra na bactéria${r.organismo ? ` (${r.organismo})` : ""} e passa a ser mantido dentro dela.`;
    case "transfectar":
      return `O ${nome(origem)} entra na célula${r.organismo ? ` ${r.organismo}` : ""}.`;
    case "cultivar":
      return `As células crescem na placa${r.antibiotico ? ` com ${r.antibiotico}` : ""} e formam colônias.`;
    case "selecionar":
      return `Só as colônias com o plasmídeo${r.antibiotico ? ` (resistentes a ${r.antibiotico})` : ""} são escolhidas.`;
    case "expressar":
      return `A célula usa o gene${g} para produzir a proteína.`;
    case "transcrever":
      return `O gene${g} é copiado em RNA mensageiro.`;
    case "traduzir":
      return "O ribossomo lê o RNA mensageiro e monta a cadeia de aminoácidos.";
    case "extrair":
      return `As células são rompidas e o ${nome(origem && origem !== "celula" && origem !== "bacteria" ? origem : "dna")} é separado das proteínas e de outros componentes.`;
    case "purificar":
      return `O ${nome(origem)} é separado de contaminantes e recolhido limpo.`;
    case "eletroforese":
      return "As amostras migram no gel em direção ao polo positivo e se separam por tamanho (posições ilustrativas, não resultado).";
    case "centrifugar":
      return "Os tubos giram na centrífuga e o conteúdo se acumula no fundo.";
    case "incubar":
      return `A reação é mantida${r.temperatura ? ` a ${r.temperatura}` : " na temperatura indicada"}.`;
    case "sequenciar":
      return "A sequência de bases do DNA é lida.";
    case "editar_crispr":
      return "A Cas9, guiada pelo RNA guia, encontra o alvo no genoma e corta as duas fitas; a célula repara o corte.";
    case "detectar":
      return "O sinal da detecção aparece (ilustração; intensidade e valores não são previstos).";
    case "quantificar":
      return "A concentração do material é medida.";
    default:
      return "Os materiais citados nesta etapa, com o texto original.";
  }
}

// ---------------------------------------------------------------- o que pode acontecer (por ação)

export type Possibilidade = { texto: string; base: "referencia" | "geral"; refs: SourceRef[] };

/** Desfechos possíveis de cada ação. Com fonte quando há; “geral” = orientação sem fonte cadastrada. */
export const POSSIBILIDADES: Partial<Record<Acao, Possibilidade[]>> = {
  amplificar: [
    { texto: "Produto do tamanho esperado.", base: "referencia", refs: [LEE("Discussão")] },
    { texto: "Produtos inespecíficos (bandas extras, escada ou arraste).", base: "referencia", refs: [L("§7 Troubleshooting")] },
    { texto: "Dímeros de primers (< 100 pb).", base: "referencia", refs: [L("§7 Troubleshooting")] },
    { texto: "Ausência de produto (condições estringentes demais ou reagente faltando).", base: "referencia", refs: [L("§7 Troubleshooting")] },
  ],
  anelar: [
    { texto: "Pareamento específico no alvo.", base: "referencia", refs: [L("§6")] },
    { texto: "Pareamento inespecífico se a temperatura estiver baixa demais.", base: "referencia", refs: [L("§7 Troubleshooting")] },
  ],
  eletroforese: [
    { texto: "Banda no tamanho esperado, estimado pelo marcador.", base: "referencia", refs: [LEE("Discussão")] },
    { texto: "Banda no controle negativo indica contaminação.", base: "referencia", refs: [L("§4, Notas")] },
  ],
  cortar: [
    { texto: "Corte completo nos dois sítios.", base: "geral", refs: [] },
    { texto: "Corte parcial (parte das moléculas sem cortar).", base: "geral", refs: [] },
  ],
  inserir_vetor: [
    { texto: "Plasmídeo recombinante com o inserto.", base: "geral", refs: [] },
    { texto: "Vetor religado sem inserto.", base: "geral", refs: [] },
    { texto: "Inserto em orientação invertida (quando as extremidades permitem).", base: "geral", refs: [] },
  ],
  transformar: [
    { texto: "Bactérias que recebem o plasmídeo passam a carregar a resistência.", base: "geral", refs: [] },
    { texto: "Poucas ou nenhuma colônia (baixa eficiência ou células pouco competentes).", base: "geral", refs: [] },
    { texto: "Colônias com vetor sem inserto.", base: "geral", refs: [] },
  ],
  cultivar: [
    { texto: "Colônias resistentes ao antibiótico.", base: "geral", refs: [] },
    { texto: "Colônias satélite ao redor das resistentes (comum com ampicilina).", base: "geral", refs: [] },
  ],
  selecionar: [
    { texto: "Colônia com o inserto correto confirmada.", base: "geral", refs: [] },
    { texto: "Colônia sem inserto ou com inserto incorreto.", base: "geral", refs: [] },
  ],
  expressar: [
    { texto: "Proteína solúvel.", base: "geral", refs: [] },
    { texto: "Proteína em corpos de inclusão (insolúvel).", base: "geral", refs: [] },
    { texto: "Expressão baixa ou ausente.", base: "geral", refs: [] },
  ],
  extrair: [
    { texto: "DNA íntegro e puro.", base: "geral", refs: [] },
    { texto: "DNA degradado ou contaminado por proteínas ou RNA.", base: "geral", refs: [] },
  ],
  editar_crispr: [
    { texto: "Corte no alvo e reparo com pequenas inserções/deleções.", base: "geral", refs: [] },
    { texto: "Cortes fora do alvo.", base: "geral", refs: [] },
    { texto: "Parte das células sem edição (mosaico).", base: "geral", refs: [] },
  ],
};

/** Termos de busca em inglês por ação (para a busca opcional no PubMed; nenhum texto do usuário é enviado). */
export const TERMOS_PUBMED: Record<Acao, string> = {
  pipetar: "PCR reaction setup pipetting",
  misturar: "PCR master mix preparation",
  anelar: "primer annealing temperature PCR",
  desnaturar: "PCR denaturation step",
  estender: "PCR extension time polymerase",
  amplificar: "polymerase chain reaction optimization",
  cortar: "restriction enzyme digestion DNA cloning",
  inserir_vetor: "DNA ligation vector insert cloning",
  transformar: "bacterial transformation plasmid Escherichia coli competent cells",
  transfectar: "plasmid transfection mammalian cells",
  cultivar: "bacterial colony antibiotic selection plate",
  selecionar: "colony screening recombinant clones",
  expressar: "recombinant protein expression Escherichia coli induction",
  transcrever: "in vitro transcription",
  traduzir: "protein translation ribosome",
  extrair: "DNA extraction method",
  purificar: "DNA purification method",
  eletroforese: "agarose gel electrophoresis DNA",
  centrifugar: "centrifugation nucleic acid precipitation",
  incubar: "incubation temperature enzyme reaction",
  sequenciar: "DNA sequencing Sanger",
  editar_crispr: "CRISPR Cas9 genome editing guide RNA",
  detectar: "quantitative PCR detection",
  quantificar: "nucleic acid quantification spectrophotometry",
  generica: "molecular biology laboratory protocol",
};

/** Corrige a ação de uma etapa (conferência pelo pesquisador) e recalcula o que depende dela. */
export function reconstruirPasso(p: PassoVisual, acao: Acao): PassoVisual {
  return {
    ...p,
    acao,
    titulo: ACAO_TITULO[acao],
    confianca: "alta",
    mostra: descreverCena(acao, p.origem, p.destino, p.rotulos, p.integracao),
    refs: REFS[acao] ?? [],
    variaveis: VARIAVEIS[acao] ?? [],
    atencao: p.atencao.filter((a) => !a.texto.startsWith("Etapa sem ação reconhecida")),
  };
}

export const ACOES_DISPONIVEIS = Object.keys(ACAO_TITULO) as Acao[];
