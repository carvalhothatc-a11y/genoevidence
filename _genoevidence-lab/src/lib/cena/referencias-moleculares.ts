import type { ObjetoId } from "@/lib/cena/biblioteca";

/**
 * A molécula REAL por trás de um objeto da cena.
 *
 * A cena 3D usa um vocabulário genérico: “DNA”, “polimerase”, “anticorpo”. Cada um desses tem uma
 * molécula de verdade por trás, com estrutura depositada — e é isso que este mapa liga.
 *
 * A regra que vale para tudo aqui: **genérico não vira específico em silêncio.** Quando a cena diz
 * “DNA”, o que podemos mostrar é um *exemplo* de dupla-hélice resolvida por cristalografia, não a
 * sequência do experimento de quem está olhando. Isso é dito na interface, sempre, e é o campo
 * `exemplo` que obriga a dizer.
 *
 * Quando não existe estrutura — célula, bactéria, precipitado, uma amostra — o mapa diz **por que**
 * não existe, em vez de mostrar algo parecido.
 *
 * Todas as entradas foram conferidas nas bases em 15/10/2026 (RCSB PDB e PubChem).
 */

export type AlvoMolecular =
  | { tipo: "estrutura"; pdb: string; titulo: string }
  | { tipo: "composto"; cid: number; nome: string };

export type RefMolecular =
  | {
      estado: "tem";
      alvos: AlvoMolecular[];
      /** true = representante do TIPO de molécula, não a molécula deste experimento. */
      exemplo: boolean;
      /** Frase obrigatória na interface, explicando o que a estrutura é e o que não é. */
      nota: string;
    }
  | { estado: "sem"; motivo: string };

/** Objetos que são equipamento ou recipiente não entram no painel: devolvem null. */
const SEM_PAINEL = new Set<ObjetoId>([
  "micropipeta", "termociclador", "centrifuga", "cuba_eletroforese", "transiluminador", "banho_maria",
  "incubadora", "agitador", "espectrofotometro", "cabine_fluxo", "balanca", "agitador_magnetico",
  "estufa", "ph_metro", "microtubo", "tubo_conico", "placa_petri", "placa_pocos", "frasco", "coluna",
  "balao_volumetrico", "proveta",
]);

const MAPA: Partial<Record<ObjetoId, RefMolecular>> = {
  dna: {
    estado: "tem",
    alvos: [{ tipo: "estrutura", pdb: "1BNA", titulo: "Dodecâmero de B-DNA (Drew–Dickerson)" }],
    exemplo: true,
    nota: "Exemplo de dupla-hélice de DNA resolvida por cristalografia. Não é a sequência do seu experimento — é a forma que o DNA assume.",
  },
  rna: {
    estado: "tem",
    alvos: [{ tipo: "estrutura", pdb: "1EHZ", titulo: "RNA transportador de fenilalanina (levedura)" }],
    exemplo: true,
    nota: "Exemplo de RNA dobrado, resolvido por cristalografia. O RNA do seu experimento é outra molécula; aqui aparece a forma que um RNA assume.",
  },
  polimerase: {
    estado: "tem",
    alvos: [{ tipo: "estrutura", pdb: "1TAQ", titulo: "DNA polimerase de Thermus aquaticus (Taq)" }],
    exemplo: true,
    nota: "A Taq polimerase, a mais usada em PCR. Se o seu experimento usou outra polimerase, a estrutura é diferente.",
  },
  ligase: {
    estado: "tem",
    alvos: [{ tipo: "estrutura", pdb: "6DT1", titulo: "DNA ligase do bacteriófago T4, com DNA" }],
    exemplo: true,
    nota: "A ligase do fago T4, a mais usada em clonagem. Outras ligases têm estrutura diferente.",
  },
  enzima_corte: {
    estado: "tem",
    alvos: [{ tipo: "estrutura", pdb: "1ERI", titulo: "Endonuclease EcoRI ligada ao DNA que reconhece" }],
    exemplo: true,
    nota: "A EcoRI, uma enzima de restrição, presa ao sítio que ela corta. Cada enzima de restrição reconhece uma sequência diferente e tem estrutura própria.",
  },
  cas9: {
    estado: "tem",
    alvos: [{ tipo: "estrutura", pdb: "4OO8", titulo: "Cas9 de Streptococcus pyogenes com RNA-guia" }],
    exemplo: true,
    nota: "A Cas9 de S. pyogenes, a mais usada. Variantes e outras nucleases (Cas12, Cas13) têm estrutura diferente.",
  },
  anticorpo: {
    estado: "tem",
    alvos: [{ tipo: "estrutura", pdb: "1IGT", titulo: "Imunoglobulina G inteira" }],
    exemplo: true,
    nota: "Exemplo de anticorpo IgG completo. O anticorpo do seu experimento reconhece outro alvo e difere na ponta que se liga.",
  },
  ribossomo: {
    estado: "tem",
    alvos: [{ tipo: "estrutura", pdb: "4V6X", titulo: "Ribossomo 80S humano (microscopia eletrônica)" }],
    exemplo: true,
    nota: "O ribossomo humano, obtido por microscopia eletrônica (5,0 Å). Em resolução baixa aparece a forma geral, não os átomos.",
  },
  nucleotideos: {
    estado: "tem",
    alvos: [
      { tipo: "composto", cid: 15993, nome: "dATP" },
      { tipo: "composto", cid: 65091, nome: "dCTP" },
      { tipo: "composto", cid: 135398599, nome: "dGTP" },
      { tipo: "composto", cid: 64968, nome: "dTTP" },
    ],
    exemplo: false,
    nota: "Os quatro desoxirribonucleotídeos que a polimerase usa. São exatamente estes — aqui não há aproximação.",
  },

  // --- sem estrutura, com o motivo
  primer: { estado: "sem", motivo: "Um primer é uma fita curta de DNA desenhada para a sua sequência. Não existe estrutura depositada dele — o que existe é a forma geral do DNA." },
  produto_pcr: { estado: "sem", motivo: "O produto da PCR é a sua sequência amplificada. Nenhum banco tem a estrutura dela; o que existe é a forma geral do DNA." },
  plasmideo: { estado: "sem", motivo: "Um plasmídeo tem milhares de pares de bases e é circular. O PDB guarda estruturas resolvidas átomo a átomo, e a sua construção não está lá." },
  proteina: { estado: "sem", motivo: "“Proteína” é genérico demais para buscar. Escreva o nome dela no texto (ex.: p53, GAPDH) e ela aparece no painel de moléculas citadas, com a estrutura real." },
  antibiotico: { estado: "sem", motivo: "Depende de qual antibiótico. Escreva o nome no texto (ex.: ampicilina, canamicina) e ele aparece no painel de moléculas citadas." },
  tampao: { estado: "sem", motivo: "Um tampão é uma mistura, não uma molécula. Escreva os componentes (ex.: Tris, EDTA) e cada um é procurado no PubChem." },
  master_mix: { estado: "sem", motivo: "A master mix é uma mistura de vários reagentes. Cada componente escrito no texto é procurado separadamente." },
  gel_agarose: { estado: "sem", motivo: "A agarose é um polímero de cadeia longa e variável: o PubChem não a indexa como composto único, e não vou mostrar outro açúcar no lugar." },
  acido: { estado: "sem", motivo: "Escreva qual ácido (ex.: ácido clorídrico, ácido cítrico) e ele é reconhecido no painel de moléculas citadas." },
  solvente: { estado: "sem", motivo: "Escreva qual solvente (ex.: etanol) e ele é reconhecido no painel de moléculas citadas." },
  sal_precursor: { estado: "sem", motivo: "Escreva qual sal (ex.: tiossulfato de sódio, CaCl₂) e ele é reconhecido no painel de moléculas citadas." },
  precipitado: { estado: "sem", motivo: "O precipitado é o que se formou no seu experimento. Só análise (difração, espectroscopia) diz o que ele é — a cena não tem como saber." },
  nanoparticula: { estado: "sem", motivo: "Nanopartículas não são moléculas únicas: são agregados de tamanho e forma variáveis. O PDB e o PubChem não guardam isso." },
  extrato_vegetal: { estado: "sem", motivo: "Um extrato tem centenas de compostos diferentes, e a composição muda com a planta e o preparo." },
  amostra: { estado: "sem", motivo: "“Amostra” é o que você levou para a bancada, não uma molécula definida." },
  celula: { estado: "sem", motivo: "Uma célula é um organismo ou um pedaço dele, feito de milhões de moléculas. Não existe estrutura 3D de uma célula inteira no PDB." },
  bacteria: { estado: "sem", motivo: "Uma bactéria é um organismo inteiro. Proteínas dela têm estrutura; a bactéria, não." },
  virus: { estado: "sem", motivo: "Alguns capsídeos virais têm estrutura no PDB, mas depende do vírus. Escreva qual no texto." },
};

/**
 * A referência molecular de um objeto da cena.
 * `null` = o objeto não é matéria (equipamento, recipiente): nem entra no painel.
 */
export function referenciaDoObjeto(id: ObjetoId): RefMolecular | null {
  if (SEM_PAINEL.has(id)) return null;
  return MAPA[id] ?? { estado: "sem", motivo: "Ainda não há uma estrutura de referência ligada a este item." };
}

/** Quantos objetos da cena têm estrutura ou composto real para mostrar. */
export function quantosTemEstrutura(ids: ObjetoId[]): number {
  return ids.filter((i) => referenciaDoObjeto(i)?.estado === "tem").length;
}
