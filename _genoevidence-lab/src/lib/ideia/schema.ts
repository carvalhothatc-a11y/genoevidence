import { z } from "@/lib/zod";

/**
 * Plano estruturado de uma ideia experimental (cenário). É a ÚNICA estrutura que controla a
 * experiência visual: a descrição em texto/voz é convertida nela, conferida pelo pesquisador e
 * validada aqui. Nenhum código é gerado a partir da descrição.
 *
 * Unidades canônicas: °C, segundos, mM (Mg²⁺), µM (dNTPs, primers), U (polimerase), ng (molde),
 * µL (volume), pb (tamanho), % (agarose), V/cm (campo elétrico).
 */
const num = (min: number, max: number) => z.number().min(min).max(max).nullable();
const Patamar = z.object({ tempC: num(0, 120), segundos: num(0, 7200) });
export type Patamar = z.infer<typeof Patamar>;

export const TecnicaId = z.enum(["pcr", "qpcr", "rt_pcr", "western_blot", "crispr", "clonagem", "elisa", "sequenciamento", "cultura_celular", "desconhecida"]);
export type TecnicaId = z.infer<typeof TecnicaId>;

export const Cenario = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{4,64}$/),
  nome: z.string().max(80),
  versao: z.number().int().min(1),
  criadoEm: z.string(),
  entrada: z.object({ texto: z.string().max(8000), via: z.enum(["texto", "voz", "protocolo"]) }),
  objetivo: z.string().max(500).nullable(),
  tecnica: TecnicaId,
  alvo: z.object({ gene: z.string().max(80).nullable(), ampliconPb: num(20, 50000) }),
  polimerase: z.enum(["taq", "pfu", "outra"]).nullable(),
  primersTmC: num(30, 90),
  reacao: z.object({
    volumeUl: num(1, 1000),
    mgcl2mM: num(0, 2000),
    dntpsUM: num(0, 100000),
    primerUM: num(0, 100000),
    polimeraseU: num(0, 100),
    moldeNg: num(0, 100000),
    amostras: z.number().int().min(0).max(96).nullable(),
  }),
  programa: z.object({
    desnatInicial: Patamar,
    ciclos: z.number().int().min(0).max(100).nullable(),
    desnat: Patamar,
    anel: Patamar,
    ext: Patamar,
    extFinal: Patamar,
  }),
  gel: z.object({ agarosePct: num(0, 10), vPorCm: num(0, 50), voltsTotal: num(0, 1000), marcador: z.boolean().nullable() }),
  controles: z.object({ negativo: z.boolean().nullable(), positivo: z.boolean().nullable() }),
  esperado: z.string().max(500).nullable(),
  /** Etapas citadas na descrição para técnicas sem módulo (roteiro). */
  roteiro: z.array(z.string().max(300)).max(40),
  /** Referências associadas (ids de referências do projeto ou do catálogo). */
  referencias: z.array(z.string().max(64)).max(40),
  projetoId: z.string().max(64).nullable(),
});
export type Cenario = z.infer<typeof Cenario>;

/** Caminho de um campo editável do plano (usado em extrações, perguntas e comparação). */
export type Campo =
  | "objetivo"
  | "tecnica"
  | "alvo.gene"
  | "alvo.ampliconPb"
  | "polimerase"
  | "primersTmC"
  | "reacao.volumeUl"
  | "reacao.mgcl2mM"
  | "reacao.dntpsUM"
  | "reacao.primerUM"
  | "reacao.polimeraseU"
  | "reacao.moldeNg"
  | "reacao.amostras"
  | "programa.desnatInicial.tempC"
  | "programa.desnatInicial.segundos"
  | "programa.ciclos"
  | "programa.desnat.tempC"
  | "programa.desnat.segundos"
  | "programa.anel.tempC"
  | "programa.anel.segundos"
  | "programa.ext.tempC"
  | "programa.ext.segundos"
  | "programa.extFinal.tempC"
  | "programa.extFinal.segundos"
  | "gel.agarosePct"
  | "gel.vPorCm"
  | "gel.voltsTotal"
  | "gel.marcador"
  | "controles.negativo"
  | "controles.positivo"
  | "esperado";

export const CAMPO_INFO: Record<Campo, { rotulo: string; unidade?: string; etapas: string[] }> = {
  objetivo: { rotulo: "Objetivo", etapas: ["planejamento"] },
  tecnica: { rotulo: "Técnica", etapas: ["planejamento"] },
  "alvo.gene": { rotulo: "Gene/alvo", etapas: ["planejamento"] },
  "alvo.ampliconPb": { rotulo: "Tamanho do amplicon", unidade: "pb", etapas: ["ciclagem", "analise"] },
  polimerase: { rotulo: "Polimerase", etapas: ["master_mix", "ciclagem"] },
  primersTmC: { rotulo: "Tm dos primers", unidade: "°C", etapas: ["ciclagem"] },
  "reacao.volumeUl": { rotulo: "Volume da reação", unidade: "µL", etapas: ["master_mix"] },
  "reacao.mgcl2mM": { rotulo: "MgCl₂ (final)", unidade: "mM", etapas: ["master_mix"] },
  "reacao.dntpsUM": { rotulo: "dNTPs (cada, final)", unidade: "µM", etapas: ["master_mix"] },
  "reacao.primerUM": { rotulo: "Primers (cada, final)", unidade: "µM", etapas: ["master_mix"] },
  "reacao.polimeraseU": { rotulo: "Polimerase por reação", unidade: "U", etapas: ["master_mix"] },
  "reacao.moldeNg": { rotulo: "DNA molde por reação", unidade: "ng", etapas: ["distribuicao"] },
  "reacao.amostras": { rotulo: "Número de amostras", etapas: ["distribuicao"] },
  "programa.desnatInicial.tempC": { rotulo: "Desnaturação inicial — temperatura", unidade: "°C", etapas: ["desnat_inicial"] },
  "programa.desnatInicial.segundos": { rotulo: "Desnaturação inicial — tempo", unidade: "s", etapas: ["desnat_inicial"] },
  "programa.ciclos": { rotulo: "Número de ciclos", etapas: ["ciclagem"] },
  "programa.desnat.tempC": { rotulo: "Desnaturação — temperatura", unidade: "°C", etapas: ["ciclagem"] },
  "programa.desnat.segundos": { rotulo: "Desnaturação — tempo", unidade: "s", etapas: ["ciclagem"] },
  "programa.anel.tempC": { rotulo: "Anelamento — temperatura", unidade: "°C", etapas: ["ciclagem"] },
  "programa.anel.segundos": { rotulo: "Anelamento — tempo", unidade: "s", etapas: ["ciclagem"] },
  "programa.ext.tempC": { rotulo: "Extensão — temperatura", unidade: "°C", etapas: ["ciclagem"] },
  "programa.ext.segundos": { rotulo: "Extensão — tempo", unidade: "s", etapas: ["ciclagem"] },
  "programa.extFinal.tempC": { rotulo: "Extensão final — temperatura", unidade: "°C", etapas: ["ext_final"] },
  "programa.extFinal.segundos": { rotulo: "Extensão final — tempo", unidade: "s", etapas: ["ext_final"] },
  "gel.agarosePct": { rotulo: "Agarose", unidade: "%", etapas: ["eletroforese"] },
  "gel.vPorCm": { rotulo: "Campo elétrico", unidade: "V/cm", etapas: ["eletroforese"] },
  "gel.voltsTotal": { rotulo: "Tensão da fonte", unidade: "V", etapas: ["eletroforese"] },
  "gel.marcador": { rotulo: "Marcador de tamanho", etapas: ["eletroforese"] },
  "controles.negativo": { rotulo: "Controle negativo (sem molde)", etapas: ["distribuicao", "analise"] },
  "controles.positivo": { rotulo: "Controle positivo", etapas: ["distribuicao", "analise"] },
  esperado: { rotulo: "Resultado esperado", etapas: ["analise"] },
};

export type Valor = string | number | boolean | null;

export function getCampo(c: Cenario, campo: Campo): Valor {
  const parts = campo.split(".");
  let v: unknown = c;
  for (const p of parts) v = (v as Record<string, unknown>)?.[p];
  return (v ?? null) as Valor;
}

export function setCampo(c: Cenario, campo: Campo, valor: Valor): Cenario {
  const next = structuredClone(c);
  const parts = campo.split(".");
  let obj = next as unknown as Record<string, unknown>;
  for (const p of parts.slice(0, -1)) obj = obj[p] as Record<string, unknown>;
  obj[parts[parts.length - 1]] = valor;
  return next;
}

export const CAMPOS = Object.keys(CAMPO_INFO) as Campo[];

export function cenarioVazio(id: string, texto: string, via: Cenario["entrada"]["via"]): Cenario {
  const p = { tempC: null, segundos: null };
  return {
    id,
    nome: "Cenário A",
    versao: 1,
    criadoEm: new Date().toISOString(),
    entrada: { texto, via },
    objetivo: null,
    tecnica: "desconhecida",
    alvo: { gene: null, ampliconPb: null },
    polimerase: null,
    primersTmC: null,
    reacao: { volumeUl: null, mgcl2mM: null, dntpsUM: null, primerUM: null, polimeraseU: null, moldeNg: null, amostras: null },
    programa: { desnatInicial: { ...p }, ciclos: null, desnat: { ...p }, anel: { ...p }, ext: { ...p }, extFinal: { ...p } },
    gel: { agarosePct: null, vPorCm: null, voltsTotal: null, marcador: null },
    controles: { negativo: null, positivo: null },
    esperado: null,
    roteiro: [],
    referencias: [],
    projetoId: null,
  };
}
