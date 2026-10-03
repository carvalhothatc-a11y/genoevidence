import { formatDuration, thermalProfile } from "@/lib/models/pcr";
import { extensionRule } from "@/lib/models/pcr";
import { avaliarCenario, ESTADO_INFO, FORA_DO_ALCANCE_PCR, fmt, type EtapaId, type ItemAvaliacao } from "./avaliar";
import { programaCompleto, reacoes } from "./procedimento";
import { CAMPO_INFO, CAMPOS, getCampo, type Campo, type Cenario, type Valor } from "./schema";
import { TECNICA_NOME } from "./parse";

/**
 * Comparação entre dois cenários (ou duas versões do mesmo cenário). Separa:
 *  - o que foi alterado;
 *  - as etapas afetadas;
 *  - as consequências sustentadas por fontes (itens da avaliação que mudaram);
 *  - as diferenças CALCULADAS (somente por modelos/aritmética existentes);
 *  - o que permanece desconhecido.
 */
export type Diferenca = { campo: Campo; rotulo: string; antes: string; depois: string };
export type MudancaAvaliacao = { id: string; titulo: string; antes: ItemAvaliacao | null; depois: ItemAvaliacao | null; comFonte: boolean };
export type DiferencaCalculada = { titulo: string; antes: string; depois: string; modelo: string };

export type Comparacao = {
  alterados: Diferenca[];
  etapasAfetadas: EtapaId[];
  consequencias: MudancaAvaliacao[];
  calculadas: DiferencaCalculada[];
  desconhecidas: string[];
};

export function formatarValor(campo: Campo, valor: Valor): string {
  if (valor === null || valor === "") return "não informado";
  if (typeof valor === "boolean") return valor ? "sim" : "não";
  if (campo === "tecnica") return TECNICA_NOME[valor as Cenario["tecnica"]] ?? String(valor);
  if (campo === "polimerase") return valor === "taq" ? "Taq" : valor === "pfu" ? "Pfu" : "outra";
  const u = CAMPO_INFO[campo].unidade;
  if (typeof valor === "number") {
    if (u === "s") return formatDuration(valor);
    return `${fmt(valor)}${u ? ` ${u}` : ""}`;
  }
  return String(valor);
}

const ORDEM_ETAPAS: EtapaId[] = ["planejamento", "preparo", "master_mix", "distribuicao", "centrifugacao", "carregar", "desnat_inicial", "ciclagem", "ext_final", "eletroforese", "analise"];

export function compararCenarios(a: Cenario, b: Cenario): Comparacao {
  const alterados: Diferenca[] = [];
  for (const campo of CAMPOS) {
    const va = getCampo(a, campo);
    const vb = getCampo(b, campo);
    if (va !== vb) alterados.push({ campo, rotulo: CAMPO_INFO[campo].rotulo, antes: formatarValor(campo, va), depois: formatarValor(campo, vb) });
  }
  const etapas = new Set<EtapaId>();
  for (const d of alterados) for (const e of CAMPO_INFO[d.campo].etapas) etapas.add(e as EtapaId);

  const ea = avaliarCenario(a).itens;
  const eb = avaliarCenario(b).itens;
  const ids = [...new Set([...ea.map((i) => i.id), ...eb.map((i) => i.id)])];
  const consequencias: MudancaAvaliacao[] = [];
  for (const id of ids) {
    const x = ea.find((i) => i.id === id) ?? null;
    const y = eb.find((i) => i.id === id) ?? null;
    if (x && y && x.estado === y.estado && x.condicao === y.condicao) continue;
    const ref = y ?? x!;
    consequencias.push({ id, titulo: ref.titulo, antes: x, depois: y, comFonte: (y?.refs.length ?? 0) > 0 || (x?.refs.length ?? 0) > 0 });
  }

  const calculadas: DiferencaCalculada[] = [];
  const pa = programaCompleto(a);
  const pb = programaCompleto(b);
  const da = pa ? thermalProfile(pa).totalSeconds : null;
  const db = pb ? thermalProfile(pb).totalSeconds : null;
  if (da !== db)
    calculadas.push({
      titulo: "Duração do programa (sem rampas)",
      antes: da === null ? "não calculável (programa incompleto)" : formatDuration(da),
      depois: db === null ? "não calculável (programa incompleto)" : formatDuration(db),
      modelo: "Perfil térmico: soma dos patamares × repetições; rampas excluídas.",
    });
  const ra = reacoes(a).masterMix;
  const rb = reacoes(b).masterMix;
  if (ra !== rb)
    calculadas.push({
      titulo: "Reações no master mix",
      antes: ra === null ? "não calculável" : String(ra),
      depois: rb === null ? "não calculável" : String(rb),
      modelo: "Reações × 1,1, arredondado para cima (Lorenz 2012, §4, Notas).",
    });
  const ext = (c: Cenario) => (c.alvo.ampliconPb !== null && (c.polimerase === "taq" || c.polimerase === "pfu") ? extensionRule(c.alvo.ampliconPb, c.polimerase).seconds : null);
  const xa = ext(a);
  const xb = ext(b);
  if (xa !== xb)
    calculadas.push({
      titulo: "Tempo de extensão indicado pela regra da referência",
      antes: xa === null ? "não calculável" : formatDuration(xa),
      depois: xb === null ? "não calculável" : formatDuration(xb),
      modelo: "Regra de tempo por kb da referência (Lorenz 2012, §6).",
    });
  const tma = a.primersTmC !== null && a.programa.anel.tempC !== null ? a.primersTmC - a.programa.anel.tempC : null;
  const tmb = b.primersTmC !== null && b.programa.anel.tempC !== null ? b.primersTmC - b.programa.anel.tempC : null;
  if (tma !== tmb)
    calculadas.push({
      titulo: "Diferença Tm − anelamento",
      antes: tma === null ? "não calculável" : `${fmt(tma)} °C`,
      depois: tmb === null ? "não calculável" : `${fmt(tmb)} °C`,
      modelo: "Subtração dos valores informados.",
    });

  return {
    alterados,
    etapasAfetadas: ORDEM_ETAPAS.filter((e) => etapas.has(e)),
    consequencias,
    calculadas,
    desconhecidas: [
      "O efeito das alterações sobre o rendimento e sobre a presença de banda: não há modelo que o estime.",
      ...(alterados.length > 1 ? ["O efeito combinado de várias alterações simultâneas: as fontes descrevem efeitos isolados."] : []),
      ...FORA_DO_ALCANCE_PCR.slice(1),
    ],
  };
}

export function resumoEstado(i: ItemAvaliacao | null): string {
  return i ? ESTADO_INFO[i.estado].rotulo : "não avaliado";
}
