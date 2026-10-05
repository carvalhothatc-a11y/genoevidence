import type { Claim, SourceRef } from "@/lib/sources/catalog";
import type { ModelCard, ModuleStatus } from "../contract";
import type { Acao, Entidade, PassoVisual } from "@/lib/visual/roteiro";

/**
 * Conteúdo de um módulo de técnica, renderizado por um único motor (/modulos/[id]).
 * A interface só exibe este conteúdo: nenhum código é gerado a partir de documentos ou da fala.
 *
 * Fundamento de cada afirmação (Claim.basis):
 *   referencia   → descrita em fonte verificada (com seção)
 *   modelo       → resultado de um modelo identificado (lib/models/*)
 *   ilustracao   → inferência didática, não descrita explicitamente nas fontes
 *   imprevisivel → não pode ser prevista com as informações disponíveis
 *   sem_fonte    → prática comum sem fonte cadastrada neste módulo (conferir)
 */

/** Cena 3D/2D da etapa: reaproveita as ações do roteiro visual. É ILUSTRAÇÃO, não resultado. */
export type CenaEtapa = {
  acao: Acao;
  entidades: Entidade[];
  origem?: Entidade | null;
  destino?: Entidade | null;
  rotulos?: PassoVisual["rotulos"];
  /** O que a ilustração mostra e o que ela não representa. */
  legenda: string;
};

export type OpcaoExploravel = { valor: string; rotulo: string; consequencias: Claim[] };

export type ParametroExploravel = {
  id: string;
  rotulo: string;
  descricao: string;
  opcoes: OpcaoExploravel[];
  padrao: string;
};

export type Material = { nome: string; papel: string; refs: SourceRef[] };

export type EtapaTecnica = {
  id: string;
  titulo: string;
  resumo: string;
  cena: CenaEtapa;
  acontece: Claim[];
  porque: Claim[];
  materiais: Material[];
  controles: Claim[];
  observar: Claim[];
  limitacoes: string[];
  parametros?: ParametroExploravel[];
  /** Calculadora exibida junto desta etapa (quando houver). */
  calculadora?: CalculadoraId;
};

export type Problema = { sintoma: string; causas: Claim[] };

export type CalculadoraId = "ddct" | "volume_proteina" | "tpm" | "posicao_banda" | "frequencia_edicao";

export type TecnicaConteudo = {
  id: string;
  titulo: string;
  tecnica: string;
  versao: string;
  status: ModuleStatus;
  resumo: string;
  fontes: SourceRef[];
  etapas: EtapaTecnica[];
  modelos: ModelCard[];
  problemas: Problema[];
  limitacoes: string[];
  /** O que o módulo explicitamente NÃO faz. */
  naoFaz: string[];
  autoria: string;
};

export const AUTORIA =
  "Conteúdo redigido para o GenoLab a partir das fontes listadas, com o nível de leitura de cada uma. Revisão por especialista recomendada antes de uso em sala de aula.";

/** Atalhos para citar. */
export const ref = (id: string, locator?: string): SourceRef => (locator ? { id, locator } : { id });
export const R = (text: string, refs: SourceRef[], note?: string): Claim => ({ text, basis: "referencia", refs, ...(note ? { note } : {}) });
export const M = (text: string, refs: SourceRef[] = [], note?: string): Claim => ({ text, basis: "modelo", refs, ...(note ? { note } : {}) });
export const I = (text: string, refs: SourceRef[] = [], note?: string): Claim => ({ text, basis: "ilustracao", refs, ...(note ? { note } : {}) });
export const X = (text: string, refs: SourceRef[] = [], note?: string): Claim => ({ text, basis: "imprevisivel", refs, ...(note ? { note } : {}) });
export const S = (text: string, note?: string): Claim => ({ text, basis: "sem_fonte", refs: [], ...(note ? { note } : {}) });
