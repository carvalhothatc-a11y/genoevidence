import { z } from "@/lib/zod";
import { OBJETO_IDS } from "@/lib/cena/biblioteca";

/**
 * DESCRIÇÃO ESTRUTURADA DO EXPERIMENTO. É a única estrutura que define a cena: texto, fala,
 * imagens, tabelas, relatórios e referências são convertidos nela, conferidos pelo pesquisador e
 * validados aqui. Todo item guarda a ORIGEM (de qual material veio e o trecho correspondente).
 */
const Id = z.string().regex(/^[A-Za-z0-9_-]{2,64}$/);

export const ACAO_IDS = [
  "pipetar", "misturar", "anelar", "desnaturar", "estender", "amplificar", "cortar", "inserir_vetor", "transformar", "transfectar",
  "cultivar", "selecionar", "expressar", "transcrever", "traduzir", "extrair", "purificar", "eletroforese", "centrifugar", "incubar",
  "sequenciar", "editar_crispr", "detectar", "quantificar",
  "pesar", "dissolver", "agitar", "acidificar", "precipitar", "lavar", "ressuspender", "secar", "filtrar", "medir_ph",
  "generica",
] as const;

export const TipoOrigem = z.enum(["texto", "voz", "imagem", "relatorio", "tabela", "referencia", "biblioteca", "ia", "usuario"]);
export type TipoOrigem = z.infer<typeof TipoOrigem>;

export const Origem = z.object({
  tipo: TipoOrigem,
  /** Material de onde veio (imagem, tabela, relatório, referência). */
  materialId: Id.optional(),
  /** Trecho original (texto, transcrição ou extração), para conferência. */
  trecho: z.string().max(400).optional(),
  /** Local no material: página, coluna, linha… */
  local: z.string().max(80).optional(),
});
export type Origem = z.infer<typeof Origem>;

export const Participante = z.object({
  id: Id,
  objeto: z.enum(OBJETO_IDS),
  /** Nome no material do pesquisador (ex.: “Taq”, “GAPDH”, “DH5α”). */
  rotulo: z.string().max(80),
  detalhe: z.string().max(200).optional(),
  origens: z.array(Origem).max(12),
  /** Representação padrão da ação, sem menção nos materiais. */
  inferido: z.boolean().default(false),
});
export type Participante = z.infer<typeof Participante>;

export const Grandeza = z.enum(["temperatura", "tempo", "volume", "massa", "concentracao", "ciclos", "rotacao", "tensao", "tamanho", "unidades", "porcentagem"]);

export const Parametro = z.object({
  id: Id,
  /** Chave estável “ação|grandeza:contexto” (para correções e comparação entre versões). */
  chave: z.string().max(160),
  acaoId: Id.nullable(),
  grandeza: Grandeza,
  /** Nome legível: “Temperatura de anelamento”, “Volume transferido”… */
  nome: z.string().max(80),
  valor: z.number(),
  unidade: z.string().max(16),
  /** Valor em unidade canônica (°C, s, µL, ng, mM, ciclos, rpm, V, pb, U, %) para comparação. */
  valorCanonico: z.number(),
  unidadeCanonica: z.string().max(16),
  origens: z.array(Origem).min(1).max(8),
  /** Conferido pelo pesquisador (unidades e valores). */
  conferido: z.boolean().default(false),
});
export type Parametro = z.infer<typeof Parametro>;

export const PapelNaAcao = z.enum(["origem", "destino", "equipamento", "recipiente", "material", "agente"]);

export const AcaoExp = z.object({
  id: Id,
  ordem: z.number().int().min(1),
  tipo: z.enum(ACAO_IDS),
  titulo: z.string().max(80),
  /** Trecho que descreve a ação. */
  texto: z.string().max(400),
  participantes: z.array(z.object({ papel: PapelNaAcao, participanteId: Id })).max(12),
  origens: z.array(Origem).min(1).max(8),
  confianca: z.enum(["alta", "conferir"]),
  /** Rótulos herdados do roteiro (gene, organismo, enzima, antibiótico, temperatura). */
  rotulos: z.object({ gene: z.string().max(40).optional(), organismo: z.string().max(40).optional(), enzima: z.string().max(40).optional(), antibiotico: z.string().max(40).optional(), temperatura: z.string().max(20).optional() }),
  integracao: z.boolean().default(false),
});
export type AcaoExp = z.infer<typeof AcaoExp>;

export const PapelColuna = z.enum(["ignorar", "identificador", "amostra", "grupo", "replica", "condicao", "valor", "unidade", "tempo"]);
export type PapelColuna = z.infer<typeof PapelColuna>;

export const DadoObservado = z.object({
  id: Id,
  materialId: Id,
  titulo: z.string().max(160),
  /** Nome da coluna de valor e unidade informada. */
  variavel: z.string().max(80),
  unidade: z.string().max(24).nullable(),
  /** Grupos (ou amostras) com os valores exatamente como enviados; null = ausente. */
  grupos: z.array(z.object({ nome: z.string().max(80), valores: z.array(z.number().nullable()).max(2000), replicas: z.array(z.string().max(40)).max(2000).optional() })).max(200),
  ausentes: z.number().int().min(0),
  /** Há uma coluna de tempo medida (só então a cena pode mostrar evolução temporal). */
  temTempo: z.boolean(),
  linhas: z.number().int().min(0),
});
export type DadoObservado = z.infer<typeof DadoObservado>;

export const EstadoFonte = z.enum(["enviado", "cadastrada", "analisado", "indisponivel", "catalogo"]);
export type EstadoFonte = z.infer<typeof EstadoFonte>;

export const Fonte = z.object({
  id: Id,
  tipo: z.enum(["arquivo", "referencia", "catalogo"]),
  estado: EstadoFonte,
  titulo: z.string().max(300),
  materialId: Id.optional(),
  doi: z.string().max(200).optional(),
  url: z.string().max(500).optional(),
  observacao: z.string().max(300).optional(),
});
export type Fonte = z.infer<typeof Fonte>;

export const Pendencia = z.object({
  id: Id,
  texto: z.string().max(400),
  /** “representacao”: muda a cena (vira pergunta). “avaliacao”: só limita a avaliação. */
  impacto: z.enum(["representacao", "avaliacao"]),
  acaoId: Id.nullable(),
  base: z.enum(["referencia", "geral"]),
});
export type Pendencia = z.infer<typeof Pendencia>;

export const Conflito = z.object({
  id: Id,
  chave: z.string().max(120),
  nome: z.string().max(120),
  acaoId: Id.nullable(),
  valores: z.array(z.object({ valor: z.number(), unidade: z.string().max(16), valorCanonico: z.number(), origem: Origem })).min(2).max(6),
  /** Índice do valor escolhido pelo pesquisador (null = ainda não resolvido). */
  escolhido: z.number().int().min(0).nullable(),
});
export type Conflito = z.infer<typeof Conflito>;

export const Experimento = z.object({
  id: Id,
  versao: z.number().int().min(1),
  criadoEm: z.string(),
  /** O que mudou em relação à versão anterior (preenchido ao atualizar). */
  mudancas: z.array(z.string().max(200)).max(40).default([]),
  objetivo: z.object({ texto: z.string().max(500), origens: z.array(Origem).max(4) }).nullable(),
  participantes: z.array(Participante).max(60),
  acoes: z.array(AcaoExp).max(40),
  parametros: z.array(Parametro).max(200),
  dados: z.array(DadoObservado).max(20),
  fontes: z.array(Fonte).max(60),
  ausentes: z.array(Pendencia).max(60),
  conflitos: z.array(Conflito).max(40),
  /** De onde vieram as etapas mostradas. */
  etapasDe: z.enum(["descricao", "relatorio", "ambos"]),
});
export type Experimento = z.infer<typeof Experimento>;
