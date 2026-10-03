import type { SourceRef } from "@/lib/sources/catalog";
import { extensionRule } from "@/lib/models/pcr";
import type { Campo, Cenario } from "./schema";
import { TECNICA_NOME } from "./parse";

/**
 * Avaliação fundamentada (nível 2). Cada item diz qual condição foi analisada, qual fonte ou regra
 * sustenta a conclusão, a consequência possível, o que permanece incerto e o que verificar.
 * NÃO há probabilidade de sucesso: os estados são qualitativos e a ausência de problema
 * identificado não é garantia de sucesso.
 *
 * Fontes: somente afirmações já registradas no módulo de PCR (Lorenz 2012, texto completo;
 * Lee et al. 2012, texto completo; Kwok & Higuchi 1989, resumo). Quando um limiar numérico é da
 * plataforma (e não da fonte), isso aparece em `regraPlataforma`.
 */
export type Estado = "compativel" | "possivel_problema" | "insuficiente" | "fora_do_alcance";

export const ESTADO_INFO: Record<Estado, { rotulo: string; icone: string }> = {
  compativel: { rotulo: "Compatível com as referências consultadas", icone: "✓" },
  possivel_problema: { rotulo: "Possível problema identificado", icone: "!" },
  insuficiente: { rotulo: "Informações insuficientes", icone: "?" },
  fora_do_alcance: { rotulo: "Fora do alcance do modelo disponível", icone: "∅" },
};

export type EtapaId =
  | "planejamento"
  | "preparo"
  | "master_mix"
  | "distribuicao"
  | "centrifugacao"
  | "carregar"
  | "desnat_inicial"
  | "ciclagem"
  | "ext_final"
  | "eletroforese"
  | "analise";

export type ItemAvaliacao = {
  id: string;
  etapa: EtapaId;
  estado: Estado;
  titulo: string;
  condicao: string;
  fundamento: string;
  refs: SourceRef[];
  regraPlataforma?: string;
  consequencia: string;
  incerto: string;
  verificar: string;
  campos: Campo[];
};

export type Avaliacao = {
  itens: ItemAvaliacao[];
  conjunto: { contagem: Record<Estado, number>; foraDoAlcance: string[]; aviso: string };
};

const L = (locator: string): SourceRef => ({ id: "lorenz2012", locator });
const LEE = (locator: string): SourceRef => ({ id: "lee2012", locator });

export const fmt = (n: number, max = 2) => n.toLocaleString("pt-BR", { maximumFractionDigits: max });

/** O que a plataforma NÃO avalia em PCR (vale para todo cenário). */
export const FORA_DO_ALCANCE_PCR = [
  "Rendimento (quantidade de produto) e intensidade de banda.",
  "Especificidade dos primers: as sequências não são analisadas (BLAST, dímeros, estruturas secundárias, conteúdo GC).",
  "Presença ou ausência de banda no gel: não há modelo que preveja o resultado da reação.",
  "Qualidade e pureza do DNA molde, inibidores e desempenho do equipamento.",
];

export function avaliarCenario(c: Cenario): Avaliacao {
  const itens: ItemAvaliacao[] = [];
  const push = (i: ItemAvaliacao) => itens.push(i);

  if (c.tecnica !== "pcr") {
    push({
      id: "tecnica",
      etapa: "planejamento",
      estado: "fora_do_alcance",
      titulo: "Técnica sem módulo de avaliação",
      condicao: `Técnica identificada: ${TECNICA_NOME[c.tecnica]}.`,
      fundamento: "Somente o módulo educativo de PCR convencional está implementado nesta versão.",
      refs: [],
      consequencia: "O procedimento é organizado como roteiro, sem animação específica nem avaliação de condições.",
      incerto: "Toda a avaliação técnica deste procedimento.",
      verificar: "Protocolos validados da técnica e orientação do laboratório.",
      campos: ["tecnica"],
    });
    return fechar(itens, []);
  }

  const p = c.programa;
  const r = c.reacao;

  // ---------------------------------------------------------------- reação (master mix)
  if (r.mgcl2mM === null) {
    push({
      id: "mg",
      etapa: "master_mix",
      estado: "insuficiente",
      titulo: "Concentração de Mg²⁺",
      condicao: "Concentração final de MgCl₂ não informada.",
      fundamento: "A referência cita a faixa de 0,5 a 5,0 mM na reação final e mostra que, sem Mg²⁺ suficiente, a reação não procede.",
      refs: [L("§8 Magnesium salt")],
      consequencia: "Não é possível comparar a condição com a faixa citada.",
      incerto: "Se o tampão já contém MgCl₂ e em que concentração.",
      verificar: "A concentração final de Mg²⁺, somando o que vem no tampão do fabricante.",
      campos: ["reacao.mgcl2mM"],
    });
  } else if (r.mgcl2mM < 0.5 || r.mgcl2mM > 5) {
    const baixo = r.mgcl2mM < 0.5;
    push({
      id: "mg",
      etapa: "master_mix",
      estado: "possivel_problema",
      titulo: "Concentração de Mg²⁺",
      condicao: `MgCl₂ final de ${fmt(r.mgcl2mM)} mM, ${baixo ? "abaixo" : "acima"} da faixa citada (0,5–5,0 mM).`,
      fundamento: baixo
        ? "Sem Mg²⁺ suficiente a reação não procede e não há produto."
        : "Em concentração alta, o rendimento tende a aumentar, mas especificidade e fidelidade diminuem; excesso pode dificultar a desnaturação completa e estabilizar anelamentos incorretos.",
      refs: [L("§8 Magnesium salt"), ...(baixo ? [L("§13 Representative Results")] : [])],
      consequencia: baixo ? "Ausência de produto." : "Produtos inespecíficos e menor fidelidade.",
      incerto: "O valor ótimo para esta reação não pode ser previsto; é determinado por titulação.",
      verificar: r.mgcl2mM > 100 ? "A unidade: um valor tão alto costuma indicar M no lugar de mM." : "A concentração final e a recomendação do fabricante.",
      campos: ["reacao.mgcl2mM"],
    });
  } else {
    push({
      id: "mg",
      etapa: "master_mix",
      estado: "compativel",
      titulo: "Concentração de Mg²⁺",
      condicao: `MgCl₂ final de ${fmt(r.mgcl2mM)} mM, dentro da faixa citada (0,5–5,0 mM).`,
      fundamento: "Faixa citada pela referência; muitos tampões 10X fornecem 1,5 mM final.",
      refs: [L("§8 Magnesium salt")],
      consequencia: "Nenhuma incompatibilidade identificada com a faixa citada.",
      incerto: "No exemplo da referência o ótimo (4,0 mM) ficou acima do recomendado pelo fabricante (1,5 mM): o valor ótimo desta reação é desconhecido.",
      verificar: "Se houver falha ou inespecificidade, titular o Mg²⁺.",
      campos: ["reacao.mgcl2mM"],
    });
  }

  if (r.dntpsUM !== null) {
    const dentro = r.dntpsUM >= 50 && r.dntpsUM <= 200;
    push({
      id: "dntps",
      etapa: "master_mix",
      estado: dentro ? "compativel" : "insuficiente",
      titulo: "dNTPs",
      condicao: `${fmt(r.dntpsUM)} µM de cada dNTP.`,
      fundamento: "A própria fonte traz dois valores: 50 µM de cada dNTP no texto (§8) e 200 µM na Tabela 1. O sistema não escolhe entre eles.",
      refs: [L("§8 Manipulating PCR Reagents"), L("Tabela 1")],
      consequencia: dentro ? "Dentro dos valores citados." : "Valor fora dos citados; as seções lidas não descrevem a consequência desta concentração.",
      incerto: dentro ? "O efeito de usar 50 ou 200 µM nesta reação." : "O efeito desta concentração não é descrito nas fontes consultadas.",
      verificar: "A recomendação do fabricante da polimerase.",
      campos: ["reacao.dntpsUM"],
    });
  }

  if (r.primerUM !== null || r.polimeraseU !== null) {
    const partes = [r.primerUM !== null ? `primers a ${fmt(r.primerUM)} µM cada` : null, r.polimeraseU !== null ? `${fmt(r.polimeraseU)} U de polimerase` : null].filter(Boolean).join(" e ");
    push({
      id: "primers_enzima",
      etapa: "master_mix",
      estado: "insuficiente",
      titulo: "Primers e polimerase",
      condicao: `Informado: ${partes}${r.volumeUl ? ` em ${fmt(r.volumeUl)} µL` : ""}.`,
      fundamento: "A referência traz apenas uma composição de exemplo (50 µL com 20 pmol de cada primer, ≈ 0,4 µM, e 2,5 U de Taq), sem faixa de valores; as unidades variam entre fabricantes.",
      refs: [L("Tabela 1")],
      consequencia: "Sem faixa citada, a plataforma não classifica estes valores.",
      incerto: "A adequação destes valores para a sua polimerase e o seu par de primers.",
      verificar: "A recomendação do fabricante.",
      campos: ["reacao.primerUM", "reacao.polimeraseU"],
    });
  }

  // ---------------------------------------------------------------- controles
  const negativo = c.controles.negativo;
  push({
    id: "controle_negativo",
    etapa: "distribuicao",
    estado: negativo === true ? "compativel" : negativo === false ? "possivel_problema" : "insuficiente",
    titulo: "Controle negativo (sem molde)",
    condicao: negativo === true ? "Controle negativo incluído." : negativo === false ? "Controle negativo não será incluído." : "Não foi informado se haverá controle negativo.",
    fundamento: "A referência recomenda incluir um controle negativo; falsos positivos podem resultar de contaminação por produtos de outra PCR, e o controle negativo ajuda a reconhecê-los.",
    refs: [L("§2 Materials and Reagents"), L("§4, Notas"), { id: "kwok1989", locator: "Resumo" }],
    consequencia: negativo === false ? "Uma contaminação não poderia ser reconhecida: uma banda nas amostras não distinguiria produto verdadeiro de contaminação." : negativo === true ? "Uma banda no controle negativo indicaria contaminação." : "Não é possível avaliar a capacidade de reconhecer contaminação.",
    incerto: "A ocorrência de contaminação não pode ser prevista.",
    verificar: negativo === true ? "Que o controle receba todos os reagentes exceto o molde, com água para completar o volume." : "Incluir o controle negativo.",
    campos: ["controles.negativo"],
  });
  push({
    id: "controle_positivo",
    etapa: "distribuicao",
    estado: c.controles.positivo === true ? "compativel" : "insuficiente",
    titulo: "Controle positivo",
    condicao: c.controles.positivo === true ? "Controle positivo incluído." : c.controles.positivo === false ? "Controle positivo não será incluído." : "Não foi informado se haverá controle positivo.",
    fundamento: "A referência recomenda, se possível, um controle positivo: molde e/ou primers que já amplificaram nas mesmas condições.",
    refs: [L("§2 Materials and Reagents"), L("§4 Basic PCR Protocol")],
    consequencia:
      c.controles.positivo === true
        ? "Espera-se produto no controle positivo se reagentes e ciclagem funcionarem."
        : "Sem controle positivo, a ausência de banda nas amostras não distingue falha da reação de ausência do alvo (inferência a partir da função do controle).",
    incerto: "Se existe um molde positivo disponível para estes primers.",
    verificar: "A disponibilidade de um controle positivo validado.",
    campos: ["controles.positivo"],
  });

  // ---------------------------------------------------------------- desnaturação inicial
  const di = p.desnatInicial;
  if (di.tempC === null && di.segundos === null) {
    push({
      id: "desnat_inicial",
      etapa: "desnat_inicial",
      estado: "insuficiente",
      titulo: "Desnaturação inicial",
      condicao: "Desnaturação inicial não informada.",
      fundamento: "Programa padrão da referência: 94–98 °C por 1 min.",
      refs: [L("Tabela 2"), L("§6")],
      consequencia: "Não avaliada.",
      incerto: "Se a sua polimerase exige ativação (hot start).",
      verificar: "A recomendação do fabricante da enzima.",
      campos: ["programa.desnatInicial.tempC", "programa.desnatInicial.segundos"],
    });
  } else if (di.segundos !== null && di.segundos > 180) {
    push({
      id: "desnat_inicial",
      etapa: "desnat_inicial",
      estado: "possivel_problema",
      titulo: "Desnaturação inicial",
      condicao: `Desnaturação inicial de ${fmt(di.segundos / 60)} min${di.tempC !== null ? ` a ${fmt(di.tempC)} °C` : ""}, acima de 3 min.`,
      fundamento: "Desnaturação inicial por mais de 3 minutos pode inativar a DNA polimerase, exceto em estratégias de hot start.",
      refs: [L("§6"), L("§12 Hot start")],
      consequencia: "Perda de atividade da polimerase e menos produto.",
      incerto: "Se a sua enzima é hot start (que exige ativação mais longa).",
      verificar: "O tipo de polimerase e o tempo de ativação indicado pelo fabricante.",
      campos: ["programa.desnatInicial.segundos"],
    });
  } else {
    const okT = di.tempC === null || (di.tempC >= 94 && di.tempC <= 98);
    push({
      id: "desnat_inicial",
      etapa: "desnat_inicial",
      estado: okT ? "compativel" : "insuficiente",
      titulo: "Desnaturação inicial",
      condicao: `${di.tempC !== null ? `${fmt(di.tempC)} °C` : "temperatura não informada"}${di.segundos !== null ? ` por ${fmt(di.segundos)} s` : ""}.`,
      fundamento: "Programa padrão da referência: 94–98 °C por 1 min; mais de 3 min pode inativar a enzima.",
      refs: [L("Tabela 2"), L("§6")],
      consequencia: okT ? "Dentro do programa padrão descrito." : "Temperatura fora da faixa do programa padrão; a consequência não é descrita nas seções lidas.",
      incerto: "A temperatura real da amostra depende do equipamento.",
      verificar: "A recomendação do fabricante da enzima.",
      campos: ["programa.desnatInicial.tempC", "programa.desnatInicial.segundos"],
    });
  }

  // ---------------------------------------------------------------- ciclos
  const n = p.ciclos;
  push({
    id: "ciclos",
    etapa: "ciclagem",
    estado: n === null ? "insuficiente" : n > 35 ? "possivel_problema" : n >= 25 ? "compativel" : "insuficiente",
    titulo: "Número de ciclos",
    condicao: n === null ? "Número de ciclos não informado." : `${n} ciclos (faixa usual citada: 25–35).`,
    fundamento: n !== null && n > 35 ? "Acima de 35 ciclos há mais produto, mas frequentemente enriquecimento de produtos secundários indesejados." : "Faixa usual de 25 a 35 ciclos.",
    refs: [L("§6")],
    consequencia: n === null ? "Não avaliado." : n > 35 ? "Mais produtos secundários." : n >= 25 ? "Dentro da faixa usual." : "Abaixo da faixa usual; as seções lidas não descrevem a consequência.",
    incerto: "A quantidade de produto em cada ciclo depende da eficiência real, que não é estimada.",
    verificar: n !== null && n > 35 ? "Se a quantidade de molde justifica tantos ciclos." : "Nada adicional.",
    campos: ["programa.ciclos"],
  });

  // ---------------------------------------------------------------- desnaturação no ciclo
  if (p.desnat.tempC !== null || p.desnat.segundos !== null) {
    const ok = (p.desnat.tempC === null || (p.desnat.tempC >= 94 && p.desnat.tempC <= 98)) && (p.desnat.segundos === null || (p.desnat.segundos >= 10 && p.desnat.segundos <= 60));
    push({
      id: "desnat",
      etapa: "ciclagem",
      estado: ok ? "compativel" : "insuficiente",
      titulo: "Desnaturação em cada ciclo",
      condicao: `${p.desnat.tempC !== null ? `${fmt(p.desnat.tempC)} °C` : "temperatura não informada"}${p.desnat.segundos !== null ? ` por ${fmt(p.desnat.segundos)} s` : ""}.`,
      fundamento: "Programa padrão: desnaturação a 94 °C por 10–60 s em cada ciclo.",
      refs: [L("Tabela 2"), L("§6")],
      regraPlataforma: "A plataforma aceita 94–98 °C como compatível, estendendo o valor citado (94 °C) até o limite da desnaturação inicial citada.",
      consequencia: ok ? "Dentro do programa padrão descrito." : "Diferente do programa padrão; a consequência não é descrita nas seções lidas.",
      incerto: "A temperatura real da amostra depende do equipamento.",
      verificar: "O manual do termociclador e da enzima.",
      campos: ["programa.desnat.tempC", "programa.desnat.segundos"],
    });
  } else {
    push({
      id: "desnat",
      etapa: "ciclagem",
      estado: "insuficiente",
      titulo: "Desnaturação em cada ciclo",
      condicao: "Temperatura e tempo de desnaturação não informados.",
      fundamento: "Programa padrão: 94 °C por 10–60 s.",
      refs: [L("Tabela 2"), L("§6")],
      consequencia: "Não avaliada.",
      incerto: "—",
      verificar: "Informar a desnaturação do ciclo.",
      campos: ["programa.desnat.tempC", "programa.desnat.segundos"],
    });
  }

  // ---------------------------------------------------------------- anelamento × Tm
  const ta = p.anel.tempC;
  const tm = c.primersTmC;
  if (ta === null || tm === null) {
    push({
      id: "anelamento",
      etapa: "ciclagem",
      estado: "insuficiente",
      titulo: "Temperatura de anelamento",
      condicao: ta === null ? "Temperatura de anelamento não informada." : `Anelamento a ${fmt(ta)} °C, sem a Tm dos primers.`,
      fundamento: "A referência recomenda partir de cerca de 5 °C abaixo da Tm aparente dos primers; a avaliação depende da Tm.",
      refs: [L("§6"), L("Tabela 2")],
      consequencia: "Não é possível avaliar a estringência do anelamento.",
      incerto: "A Tm calculada por qualquer ferramenta é uma estimativa.",
      verificar: ta === null ? "Informar a temperatura de anelamento." : "Informar a Tm estimada dos primers (ferramenta de vizinhos mais próximos, se possível).",
      campos: ["programa.anel.tempC", "primersTmC"],
    });
  } else {
    const d = tm - ta;
    const base = { id: "anelamento", etapa: "ciclagem" as const, titulo: "Temperatura de anelamento", campos: ["programa.anel.tempC", "primersTmC"] as Campo[] };
    const cond = `Anelamento a ${fmt(ta)} °C com Tm de ${fmt(tm)} °C (${d >= 0 ? `${fmt(d)} °C abaixo` : `${fmt(-d)} °C acima`} da Tm).`;
    if (d <= 0) {
      push({
        ...base,
        estado: "possivel_problema",
        condicao: cond,
        fundamento: "Condições estringentes demais podem resultar em ausência de produto.",
        refs: [L("§7 Troubleshooting")],
        consequencia: "Pouco ou nenhum produto.",
        incerto: "A Tm é uma estimativa; a temperatura efetiva de pareamento pode diferir.",
        verificar: "A Tm por outra ferramenta; considerar touchdown PCR.",
      });
    } else if (d >= 3 && d <= 7) {
      push({
        ...base,
        estado: "compativel",
        condicao: cond,
        fundamento: "A referência recomenda partir de cerca de 5 °C abaixo da Tm aparente, com anelamento de 30 s.",
        refs: [L("§6"), L("Tabela 2")],
        regraPlataforma: "“Cerca de 5 °C” foi interpretado como 3 a 7 °C abaixo da Tm.",
        consequencia: "Ponto de partida descrito na referência.",
        incerto: "A Tm é uma estimativa; pode ser necessário otimizar (por exemplo, por touchdown PCR).",
        verificar: "A especificidade dos primers (por exemplo, por BLAST); a plataforma não analisa sequências.",
      });
    } else if (d > 7) {
      push({
        ...base,
        estado: "possivel_problema",
        condicao: cond,
        fundamento: "Anelamento em temperatura baixa reduz a estringência, com maior chance de produtos inespecíficos (padrão em escada ou arraste no gel).",
        refs: [L("§7 Troubleshooting"), L("§13 Representative Results")],
        regraPlataforma: "A fonte não define a partir de quantos graus abaixo da Tm a especificidade cai; a plataforma sinaliza diferenças maiores que 7 °C.",
        consequencia: "Produtos inespecíficos de tamanhos variados.",
        incerto: "A quantidade e o tamanho de produtos inespecíficos não podem ser previstos.",
        verificar: "Aproximar o anelamento de cerca de 5 °C abaixo da Tm ou usar touchdown PCR.",
      });
    } else {
      push({
        ...base,
        estado: "insuficiente",
        condicao: cond,
        fundamento: "A referência recomenda partir de cerca de 5 °C abaixo da Tm; condições estringentes demais podem resultar em ausência de produto.",
        refs: [L("§6"), L("§7 Troubleshooting")],
        regraPlataforma: "Entre 0 e 3 °C abaixo da Tm a plataforma não classifica: a fonte não define esse intervalo.",
        consequencia: "Possível redução de produto por estringência alta, sem base para afirmar.",
        incerto: "O comportamento nesta faixa depende dos primers.",
        verificar: "A Tm por outra ferramenta.",
      });
    }
  }

  // ---------------------------------------------------------------- extensão
  const ext = p.ext;
  if (ext.segundos !== null && c.alvo.ampliconPb !== null && c.polimerase && c.polimerase !== "outra") {
    const regra = extensionRule(c.alvo.ampliconPb, c.polimerase);
    const curto = regra.seconds !== null && ext.segundos < regra.seconds;
    push({
      id: "extensao",
      etapa: "ciclagem",
      estado: curto ? "possivel_problema" : "compativel",
      titulo: "Tempo de extensão",
      condicao: `Extensão de ${fmt(ext.segundos)} s para amplicon de ${fmt(c.alvo.ampliconPb, 0)} pb com ${c.polimerase === "taq" ? "Taq" : "Pfu"} (regra da referência: ${regra.seconds !== null ? `${fmt(regra.seconds)} s` : "—"}).`,
      fundamento: regra.text,
      refs: [L(regra.locator)],
      consequencia: curto ? "Tempo menor que o indicado pela regra da referência." : "Atende à regra de tempo da referência.",
      incerto: curto ? "As seções lidas não descrevem o efeito de tempo menor; é plausível que fitas longas não sejam completadas (inferência)." : "A regra é aproximada; o fabricante pode indicar outro tempo.",
      verificar: "A recomendação do fabricante da sua enzima.",
      campos: ["programa.ext.segundos", "alvo.ampliconPb", "polimerase"],
    });
  } else {
    const falta = [ext.segundos === null ? "tempo de extensão" : null, c.alvo.ampliconPb === null ? "tamanho do amplicon" : null, !c.polimerase ? "tipo de polimerase" : c.polimerase === "outra" ? "regra para esta polimerase (só há regra para Taq e Pfu)" : null].filter(Boolean);
    push({
      id: "extensao",
      etapa: "ciclagem",
      estado: c.polimerase === "outra" && ext.segundos !== null && c.alvo.ampliconPb !== null ? "fora_do_alcance" : "insuficiente",
      titulo: "Tempo de extensão",
      condicao: `Falta: ${falta.join(", ")}.`,
      fundamento: "Regra da referência para Taq: cerca de 1 min para os primeiros 2 kb e 1 min adicional por kb; para Pfu, cerca de 2 min por kb.",
      refs: [L("§6")],
      consequencia: "Não avaliado.",
      incerto: "—",
      verificar: "Informar o que falta ou seguir o fabricante.",
      campos: ["programa.ext.segundos", "alvo.ampliconPb", "polimerase"],
    });
  }
  if (ext.tempC !== null) {
    const ok = ext.tempC >= 70 && ext.tempC <= 80;
    push({
      id: "extensao_temp",
      etapa: "ciclagem",
      estado: ok ? "compativel" : "insuficiente",
      titulo: "Temperatura de extensão",
      condicao: `Extensão a ${fmt(ext.tempC)} °C.`,
      fundamento: "Programa padrão para Taq: extensão de 70–80 °C.",
      refs: [L("Tabela 2"), L("§6")],
      consequencia: ok ? "Dentro da faixa descrita." : "Fora da faixa descrita para Taq; a consequência não é descrita nas seções lidas.",
      incerto: c.polimerase && c.polimerase !== "taq" ? "A faixa citada é para Taq." : "—",
      verificar: "A recomendação do fabricante da enzima.",
      campos: ["programa.ext.tempC"],
    });
  }

  // ---------------------------------------------------------------- extensão final
  push({
    id: "ext_final",
    etapa: "ext_final",
    estado: p.extFinal.segundos === null ? "insuficiente" : "compativel",
    titulo: "Extensão final",
    condicao: p.extFinal.segundos === null ? "Extensão final não informada." : `Extensão final de ${fmt(p.extFinal.segundos / 60)} min.`,
    fundamento: "A extensão final (5 min no programa padrão) permite completar amplicons inacabados e, no caso da Taq, adicionar um resíduo de adenina às extremidades 3'.",
    refs: [L("§6")],
    consequencia: p.extFinal.segundos === null ? "Não avaliada." : "Etapa prevista no programa.",
    incerto: "—",
    verificar: p.extFinal.segundos === null ? "Incluir a extensão final." : "Nada adicional.",
    campos: ["programa.extFinal.segundos"],
  });

  // ---------------------------------------------------------------- gel
  const g = c.gel;
  if (g.agarosePct !== null) {
    const ok = g.agarosePct >= 0.5 && g.agarosePct <= 2;
    push({
      id: "agarose",
      etapa: "eletroforese",
      estado: ok ? "compativel" : "insuficiente",
      titulo: "Concentração de agarose",
      condicao: `Gel de ${fmt(g.agarosePct)}% de agarose.`,
      fundamento: "A concentração (geralmente 0,5–2%) depende do tamanho dos fragmentos; quanto maior a concentração, menores os poros.",
      refs: [LEE("§1"), LEE("Discussão")],
      consequencia: ok ? "Dentro da faixa usual descrita." : "Fora da faixa usual descrita.",
      incerto: "A concentração ideal para o tamanho do seu amplicon não é calculada pela plataforma.",
      verificar: "Uma tabela de concentração × tamanho de fragmento do seu laboratório.",
      campos: ["gel.agarosePct"],
    });
  }
  if (g.marcador !== null || g.agarosePct !== null) {
    push({
      id: "marcador",
      etapa: "eletroforese",
      estado: g.marcador === true ? "compativel" : g.marcador === false ? "possivel_problema" : "insuficiente",
      titulo: "Marcador de tamanho",
      condicao: g.marcador === true ? "Marcador incluído." : g.marcador === false ? "Sem marcador de tamanho." : "Não foi informado se haverá marcador.",
      fundamento: "Um marcador de tamanho de DNA deve sempre ser aplicado junto; ele permite estimar o tamanho das bandas.",
      refs: [LEE("§2"), LEE("Discussão")],
      consequencia: g.marcador === false ? "Sem estimativa de tamanho das bandas." : "—",
      incerto: "—",
      verificar: "Incluir o marcador em uma canaleta.",
      campos: ["gel.marcador"],
    });
  }
  if (g.voltsTotal !== null && g.vPorCm === null) {
    push({
      id: "campo_eletrico",
      etapa: "eletroforese",
      estado: "insuficiente",
      titulo: "Campo elétrico",
      condicao: `Fonte a ${fmt(g.voltsTotal)} V, sem a distância entre os eletrodos.`,
      fundamento: "A fonte é programada em 1–5 V/cm entre os eletrodos.",
      refs: [LEE("§1"), LEE("§2")],
      consequencia: "Sem a distância, não é possível converter para V/cm e comparar.",
      incerto: "—",
      verificar: "A distância entre os eletrodos da sua cuba.",
      campos: ["gel.voltsTotal", "gel.vPorCm"],
    });
  } else if (g.vPorCm !== null) {
    const ok = g.vPorCm >= 1 && g.vPorCm <= 5;
    push({
      id: "campo_eletrico",
      etapa: "eletroforese",
      estado: ok ? "compativel" : "insuficiente",
      titulo: "Campo elétrico",
      condicao: `${fmt(g.vPorCm)} V/cm.`,
      fundamento: "A fonte é programada em 1–5 V/cm entre os eletrodos.",
      refs: [LEE("§1"), LEE("§2")],
      consequencia: ok ? "Dentro da faixa descrita." : "Fora da faixa descrita; a consequência não é descrita nas seções lidas.",
      incerto: "—",
      verificar: "As instruções da cuba e da fonte.",
      campos: ["gel.vPorCm"],
    });
  }

  // ---------------------------------------------------------------- resultado esperado
  push({
    id: "resultado",
    etapa: "analise",
    estado: "fora_do_alcance",
    titulo: "Resultado esperado",
    condicao: c.esperado ? `Expectativa informada: “${c.esperado}”.` : "Nenhuma expectativa de resultado informada.",
    fundamento: "Não há modelo validado que preveja presença, intensidade ou especificidade de bandas nesta versão.",
    refs: [],
    consequencia: "A plataforma não confirma nem descarta o resultado esperado.",
    incerto: "O resultado da reação.",
    verificar: "Comparar com o controle negativo e o marcador após o experimento real.",
    campos: ["esperado"],
  });

  return fechar(itens, FORA_DO_ALCANCE_PCR);
}

function fechar(itens: ItemAvaliacao[], foraDoAlcance: string[]): Avaliacao {
  const contagem: Record<Estado, number> = { compativel: 0, possivel_problema: 0, insuficiente: 0, fora_do_alcance: 0 };
  for (const i of itens) contagem[i.estado]++;
  return {
    itens,
    conjunto: {
      contagem,
      foraDoAlcance,
      aviso: "Ausência de problema identificado não significa garantia de sucesso. A avaliação compara as condições informadas com as referências consultadas; não estima probabilidade.",
    },
  };
}

/** Perguntas curtas: só quando a informação ausente muda materialmente a representação ou a avaliação. */
export type Pergunta = { campo: Campo; texto: string; tipo: "numero" | "sim_nao" | "opcoes"; unidade?: string; opcoes?: { valor: string; rotulo: string }[] };

export function perguntasPendentes(c: Cenario): Pergunta[] {
  if (c.tecnica !== "pcr") return [];
  const out: Pergunta[] = [];
  if (c.programa.anel.tempC === null) out.push({ campo: "programa.anel.tempC", texto: "Qual a temperatura de anelamento?", tipo: "numero", unidade: "°C" });
  else if (c.primersTmC === null) out.push({ campo: "primersTmC", texto: "Qual a Tm estimada dos primers? Sem ela o anelamento não é avaliado.", tipo: "numero", unidade: "°C" });
  if (c.programa.ciclos === null) out.push({ campo: "programa.ciclos", texto: "Quantos ciclos?", tipo: "numero" });
  if (c.controles.negativo === null) out.push({ campo: "controles.negativo", texto: "Haverá controle negativo (reação sem molde)?", tipo: "sim_nao" });
  if (c.reacao.mgcl2mM === null) out.push({ campo: "reacao.mgcl2mM", texto: "Qual a concentração final de MgCl₂?", tipo: "numero", unidade: "mM" });
  if (c.programa.ext.segundos !== null && c.alvo.ampliconPb === null) out.push({ campo: "alvo.ampliconPb", texto: "Qual o tamanho esperado do amplicon?", tipo: "numero", unidade: "pb" });
  if (c.programa.ext.segundos !== null && c.polimerase === null)
    out.push({
      campo: "polimerase",
      texto: "Qual polimerase?",
      tipo: "opcoes",
      opcoes: [
        { valor: "taq", rotulo: "Taq" },
        { valor: "pfu", rotulo: "Pfu" },
        { valor: "outra", rotulo: "Outra" },
      ],
    });
  return out.slice(0, 5);
}

/** Campos que faltam no plano (lista completa, sem perguntas). */
export function ausentes(c: Cenario): { campo: Campo; rotulo: string; critico: boolean }[] {
  if (c.tecnica !== "pcr") return [];
  const lista: [Campo, string, boolean][] = [
    ["objetivo", "Objetivo", false],
    ["alvo.gene", "Gene ou região-alvo", false],
    ["alvo.ampliconPb", "Tamanho do amplicon", false],
    ["polimerase", "Polimerase", false],
    ["primersTmC", "Tm dos primers", true],
    ["reacao.volumeUl", "Volume da reação", false],
    ["reacao.mgcl2mM", "MgCl₂ final", true],
    ["reacao.dntpsUM", "dNTPs", false],
    ["reacao.primerUM", "Concentração dos primers", false],
    ["reacao.polimeraseU", "Polimerase por reação", false],
    ["reacao.amostras", "Número de amostras", false],
    ["programa.desnatInicial.tempC", "Desnaturação inicial", false],
    ["programa.ciclos", "Número de ciclos", true],
    ["programa.desnat.tempC", "Desnaturação (ciclo)", true],
    ["programa.anel.tempC", "Anelamento", true],
    ["programa.ext.tempC", "Extensão — temperatura", true],
    ["programa.ext.segundos", "Extensão — tempo", false],
    ["programa.extFinal.segundos", "Extensão final", false],
    ["controles.negativo", "Controle negativo", true],
    ["controles.positivo", "Controle positivo", false],
    ["esperado", "Resultado esperado", false],
  ];
  const get = (campo: Campo) => campo.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], c);
  return lista.filter(([campo]) => get(campo) === null).map(([campo, rotulo, critico]) => ({ campo, rotulo, critico }));
}
