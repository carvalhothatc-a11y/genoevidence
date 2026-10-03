import type { Claim } from "@/lib/sources/catalog";
import type { MolecularPhase } from "@/lib/modules/contract";
import { formatDuration, thermalProfile, type CyclingProgram } from "@/lib/models/pcr";
import type { LabScene, ReagentId } from "@/lib/lab/scenes";
import type { EtapaId } from "./avaliar";
import { fmt } from "./avaliar";
import type { Cenario } from "./schema";

/**
 * Sequência visual (nível 1: representação do procedimento) montada a partir do plano validado.
 * Só usa objetos, estados e fases JÁ implementados no laboratório 3D. Cada etapa traz a explicação
 * sincronizada (afirmações com fonte do módulo de PCR) e os parâmetros do plano.
 */
export type Nivel = "procedimento" | "simulacao" | "ilustracao";

export type Subpasso = { rotulo: string; foco?: string; part?: ReagentId; destaque?: ReagentId | null; fase?: MolecularPhase };

export type EtapaProcedimento = {
  id: EtapaId;
  titulo: string;
  resumo: string;
  foco: string;
  estado: LabScene["state"];
  fase?: MolecularPhase;
  subpassos: Subpasso[];
  parametros: { rotulo: string; valor: string }[];
  explicacao: Claim[];
  nivel: Nivel;
  /** Resultado calculado por modelo (nível 3), quando houver. */
  calculo?: { titulo: string; valor: string; modelo: string; pressupostos: string[] };
};

const L = (locator: string) => ({ id: "lorenz2012", locator });
const LEE = (locator: string) => ({ id: "lee2012", locator });

const REAGENTES: { id: ReagentId; rotulo: string; presente: (c: Cenario) => boolean }[] = [
  { id: "agua", rotulo: "Água livre de nuclease", presente: () => true },
  { id: "tampao", rotulo: "Tampão de reação", presente: () => true },
  { id: "dntps", rotulo: "dNTPs", presente: () => true },
  { id: "mgcl2", rotulo: "MgCl₂", presente: (c) => c.reacao.mgcl2mM !== 0 },
  { id: "primer-f", rotulo: "Primer forward", presente: () => true },
  { id: "primer-r", rotulo: "Primer reverse", presente: () => true },
  { id: "molde", rotulo: "DNA molde", presente: () => true },
  { id: "polimerase", rotulo: "DNA polimerase", presente: () => true },
];

const v = (n: number | null, unidade: string, digits = 2) => (n === null ? "não informado" : `${fmt(n, digits)} ${unidade}`.trim());
const pat = (t: number | null, s: number | null) => (t === null && s === null ? "não informado" : `${t === null ? "? °C" : `${fmt(t)} °C`} · ${s === null ? "? s" : formatDuration(s)}`);

/** Programa completo (todos os valores informados) para o modelo de perfil térmico; senão null. */
export function programaCompleto(c: Cenario): CyclingProgram | null {
  const p = c.programa;
  const ok = (x: { tempC: number | null; segundos: number | null }) => x.tempC !== null && x.segundos !== null;
  if (!ok(p.desnatInicial) || !ok(p.desnat) || !ok(p.anel) || !ok(p.ext) || !ok(p.extFinal) || p.ciclos === null) return null;
  const s = (x: { tempC: number | null; segundos: number | null }) => ({ tempC: x.tempC!, seconds: x.segundos! });
  return { initialDenaturation: s(p.desnatInicial), cycles: p.ciclos, denaturation: s(p.desnat), annealing: s(p.anel), extension: s(p.ext), finalExtension: s(p.extFinal), holdC: 4 };
}

export function reacoes(c: Cenario): { amostras: number | null; total: number | null; masterMix: number | null } {
  const a = c.reacao.amostras;
  if (a === null) return { amostras: null, total: null, masterMix: null };
  const total = a + (c.controles.negativo ? 1 : 0) + (c.controles.positivo ? 1 : 0);
  return { amostras: a, total, masterMix: Math.ceil(total * 1.1) };
}

export function montarProcedimento(c: Cenario): EtapaProcedimento[] {
  if (c.tecnica !== "pcr") return [];
  const r = reacoes(c);
  const prog = programaCompleto(c);
  const perfil = prog ? thermalProfile(prog) : null;

  return [
    {
      id: "preparo",
      titulo: "Reagentes no gelo",
      resumo: "Os reagentes são descongelados, identificados e mantidos no gelo; a reação é montada na ordem descrita pela referência.",
      foco: "balde-gelo",
      estado: { tubes: "gelo", thermocyclerOpen: false, programRunning: false, spinning: false, highlightReagent: null },
      subpassos: REAGENTES.filter((x) => x.presente(c)).map((x) => ({ rotulo: x.rotulo, foco: "reagentes", part: x.id, destaque: x.id })),
      parametros: [{ rotulo: "Ordem de adição", valor: "água → tampão → dNTPs → MgCl₂ → primers → molde → polimerase" }],
      explicacao: [
        { text: "Os reagentes são dispostos em um balde de gelo recém-preparado, descongelados completamente e mantidos no gelo durante todo o preparo.", basis: "referencia", refs: [L("§2 Materials and Reagents")] },
        { text: "A referência descreve a ordem de pipetagem: água estéril, tampão 10X, dNTPs, MgCl₂, primers e DNA molde.", basis: "referencia", refs: [L("§4 Basic PCR Protocol"), L("Tabela 1")] },
      ],
      nivel: "procedimento",
    },
    {
      id: "master_mix",
      titulo: "Master mix",
      resumo: "Os reagentes comuns às reações são reunidos em um único tubo.",
      foco: "tubo-master-mix",
      estado: { tubes: "gelo", highlightReagent: null },
      subpassos: [],
      parametros: [
        { rotulo: "Volume por reação", valor: v(c.reacao.volumeUl, "µL") },
        { rotulo: "MgCl₂ final", valor: v(c.reacao.mgcl2mM, "mM") },
        { rotulo: "dNTPs (cada)", valor: v(c.reacao.dntpsUM, "µM") },
        { rotulo: "Primers (cada)", valor: v(c.reacao.primerUM, "µM") },
        { rotulo: "Polimerase", valor: v(c.reacao.polimeraseU, "U") },
      ],
      explicacao: [
        { text: "Quando há várias reações, os reagentes comuns são reunidos em um master mix calculado para o número de reações mais cerca de 10% de excedente.", basis: "referencia", refs: [L("§4, Notas")] },
      ],
      nivel: r.masterMix !== null ? "simulacao" : "procedimento",
      calculo:
        r.masterMix !== null
          ? {
              titulo: "Reações no master mix",
              valor: `${r.masterMix} (para ${r.total} reações: ${r.amostras} amostra(s)${c.controles.negativo ? " + controle negativo" : ""}${c.controles.positivo ? " + controle positivo" : ""})`,
              modelo: "Aritmética: reações × 1,1, arredondado para cima (Lorenz 2012, §4, Notas).",
              pressupostos: ["Excedente de 10% como na referência.", "Volumes por componente exigem a concentração dos estoques, não informada."],
            }
          : undefined,
    },
    {
      id: "distribuicao",
      titulo: "Distribuição e controles",
      resumo: "Cada tubo recebe uma alíquota do master mix e, em seguida, o DNA molde; o controle negativo recebe água no lugar do molde.",
      foco: "tubos-pcr",
      estado: { tubes: "gelo", highlightReagent: null },
      subpassos: [],
      parametros: [
        { rotulo: "Amostras", valor: r.amostras === null ? "não informado" : String(r.amostras) },
        { rotulo: "Controle negativo", valor: c.controles.negativo === null ? "não informado" : c.controles.negativo ? "sim" : "não" },
        { rotulo: "Controle positivo", valor: c.controles.positivo === null ? "não informado" : c.controles.positivo ? "sim" : "não" },
        { rotulo: "Molde por reação", valor: v(c.reacao.moldeNg, "ng") },
      ],
      explicacao: [
        { text: "Cada tubo recebe uma alíquota do master mix e, em seguida, o DNA molde e reagentes específicos da reação.", basis: "referencia", refs: [L("§4 Basic PCR Protocol")] },
        { text: "O controle negativo recebe todos os reagentes exceto o DNA molde, com água para completar o volume.", basis: "referencia", refs: [L("§4 Basic PCR Protocol")] },
      ],
      nivel: "procedimento",
    },
    {
      id: "centrifugacao",
      titulo: "Centrifugação rápida",
      resumo: "Um pulso na microcentrífuga reúne o líquido no fundo dos tubos; posições opostas mantêm o rotor balanceado.",
      foco: "microcentrifuga",
      estado: { tubes: "centrifuga", centrifugeOpen: false, rotorSlots: [0, 4], spinning: true },
      subpassos: [],
      parametros: [],
      explicacao: [{ text: "Uma centrifugação rápida reúne no fundo do tubo gotas que ficaram na parede ou na tampa.", basis: "sem_fonte", refs: [] }],
      nivel: "procedimento",
    },
    {
      id: "carregar",
      titulo: "Tubos no termociclador",
      resumo: "Os tubos fechados são posicionados no bloco; a tampa aquecida é fechada antes do programa.",
      foco: "termociclador",
      estado: { tubes: "termociclador", thermocyclerOpen: true, programRunning: false, spinning: false },
      subpassos: [],
      parametros: [],
      explicacao: [{ text: "Controles negativo e positivo seguem exatamente o mesmo programa das amostras.", basis: "referencia", refs: [L("§4")] }],
      nivel: "procedimento",
    },
    {
      id: "desnat_inicial",
      titulo: "Desnaturação inicial",
      resumo: "Aquecimento inicial para separar completamente as fitas do molde.",
      foco: "termociclador",
      estado: { tubes: "termociclador", thermocyclerOpen: false, programRunning: false },
      fase: "desnaturacao",
      subpassos: [],
      parametros: [{ rotulo: "Desnaturação inicial", valor: pat(c.programa.desnatInicial.tempC, c.programa.desnatInicial.segundos) }],
      explicacao: [
        { text: "Desnaturação inicial por mais de 3 minutos pode inativar a DNA polimerase (exceto em estratégias de hot start).", basis: "referencia", refs: [L("§6"), L("§12 Hot start")] },
      ],
      nivel: "procedimento",
    },
    {
      id: "ciclagem",
      titulo: `Ciclagem${c.programa.ciclos !== null ? ` (${c.programa.ciclos} ciclos)` : ""}`,
      resumo: "Cada ciclo alterna desnaturação, anelamento dos primers e extensão pela polimerase.",
      foco: "termociclador",
      estado: { tubes: "termociclador", thermocyclerOpen: false, programRunning: true },
      fase: "desnaturacao",
      subpassos: [
        { rotulo: `Desnaturação · ${pat(c.programa.desnat.tempC, c.programa.desnat.segundos)}`, fase: "desnaturacao" },
        { rotulo: `Anelamento · ${pat(c.programa.anel.tempC, c.programa.anel.segundos)}`, fase: "anelamento" },
        { rotulo: `Extensão · ${pat(c.programa.ext.tempC, c.programa.ext.segundos)}`, fase: "extensao" },
      ],
      parametros: [
        { rotulo: "Ciclos", valor: c.programa.ciclos === null ? "não informado" : String(c.programa.ciclos) },
        { rotulo: "Tm dos primers", valor: v(c.primersTmC, "°C") },
      ],
      explicacao: [
        { text: "1) Desnaturação: as fitas se separam. 2) Anelamento: os primers pareiam com sequências complementares. 3) Extensão: a DNA polimerase sintetiza a nova fita a partir do primer.", basis: "referencia", refs: [L("§6"), L("legenda da figura sobre ciclagem de 3 etapas, painel c")] },
        { text: "A animação molecular é uma ilustração didática: escala, velocidade, forma e número de moléculas não correspondem a valores reais.", basis: "ilustracao", refs: [] },
      ],
      nivel: perfil ? "simulacao" : "procedimento",
      calculo: perfil
        ? {
            titulo: "Duração do programa",
            valor: formatDuration(perfil.totalSeconds),
            modelo: "Perfil térmico: soma dos patamares × repetições (src/lib/models/pcr.ts → thermalProfile).",
            pressupostos: ["Transições instantâneas: as rampas reais do equipamento aumentam o tempo total.", "Não é medição do equipamento."],
          }
        : undefined,
    },
    {
      id: "ext_final",
      titulo: "Extensão final e manutenção",
      resumo: "Extensão final para completar os produtos; depois, manutenção a baixa temperatura.",
      foco: "termociclador",
      estado: { tubes: "termociclador", thermocyclerOpen: false, programRunning: false },
      fase: "produtos",
      subpassos: [],
      parametros: [{ rotulo: "Extensão final", valor: pat(c.programa.extFinal.tempC, c.programa.extFinal.segundos) }],
      explicacao: [{ text: "A extensão final permite completar amplicons inacabados e, no caso da Taq, adicionar um resíduo de adenina às extremidades 3'.", basis: "referencia", refs: [L("§6")] }],
      nivel: "procedimento",
    },
    {
      id: "eletroforese",
      titulo: "Eletroforese em gel de agarose",
      resumo: "Alíquotas com corante de carregamento são aplicadas nos poços, junto com o marcador; o DNA migra em direção ao polo positivo.",
      foco: "cuba-eletroforese",
      estado: {},
      subpassos: [
        { rotulo: "Aplicação das amostras e do marcador", foco: "micropipeta-pos" },
        { rotulo: "Cuba com o gel", foco: "cuba-eletroforese" },
        { rotulo: "Fonte ligada", foco: "fonte-eletroforese" },
      ],
      parametros: [
        { rotulo: "Agarose", valor: v(c.gel.agarosePct, "%") },
        { rotulo: "Marcador", valor: c.gel.marcador === null ? "não informado" : c.gel.marcador ? "sim" : "não" },
        { rotulo: "Fonte", valor: c.gel.vPorCm !== null ? `${fmt(c.gel.vPorCm)} V/cm` : v(c.gel.voltsTotal, "V") },
      ],
      explicacao: [
        { text: "Alíquotas das reações recebem corante de carregamento e são aplicadas nos poços do gel; um marcador de tamanho de DNA deve sempre ser aplicado junto.", basis: "referencia", refs: [LEE("§2")] },
        { text: "O DNA tem carga negativa e migra em direção ao ânodo (positivo).", basis: "referencia", refs: [LEE("Resumo"), LEE("§2")] },
      ],
      nivel: "procedimento",
    },
    {
      id: "analise",
      titulo: "Análise",
      resumo: "O resultado do gel NÃO é previsto: não há modelo que estime presença, intensidade ou especificidade de bandas.",
      foco: "computador",
      estado: {},
      subpassos: [],
      parametros: [
        { rotulo: "Resultado esperado (pelo pesquisador)", valor: c.esperado ?? "não informado" },
        { rotulo: "Tamanho do amplicon", valor: v(c.alvo.ampliconPb, "pb", 0) },
      ],
      explicacao: [
        { text: "O tamanho de uma banda é estimado comparando sua migração à do marcador: a distância percorrida é inversamente proporcional ao logaritmo do tamanho, dentro da faixa de resolução do gel.", basis: "referencia", refs: [LEE("Resumo"), LEE("Discussão")] },
        { text: "Banda no controle negativo sugere contaminação, que precisa ser investigada antes de interpretar as amostras.", basis: "referencia", refs: [L("§4, Notas")] },
      ],
      nivel: "procedimento",
    },
  ];
}
